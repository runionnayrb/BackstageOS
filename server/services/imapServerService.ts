import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
import { db } from '../db.js';
import { emailAccounts, emailMessages, emailThreads, emailFolders, users } from '../../shared/schema.js';
import { eq, and, desc, count, sql, gte } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export interface ImapSession {
  id: string;
  socket: net.Socket;
  state: 'GREETING' | 'NOT_AUTHENTICATED' | 'AUTHENTICATED' | 'SELECTED' | 'LOGOUT';
  user?: {
    id: number;
    email: string;
    accountId: number;
  };
  selectedMailbox?: string;
  selectedMailboxId?: number;
  tag: number;
  capabilities: string[];
}

export interface ImapFolder {
  id: number;
  name: string;
  displayName: string;
  messageCount: number;
  unseenCount: number;
  flags: string[];
}

export class ImapServerService {
  private server: net.Server;
  private tlsServer: net.Server;
  private sessions: Map<string, ImapSession> = new Map();
  private isStarted = false;

  constructor() {
    this.server = net.createServer(this.handleConnection.bind(this));
    
    // Create TLS server for secure connections (port 993)
    // For development, we'll skip TLS certificates to avoid SSL issues
    this.tlsServer = net.createServer(this.handleTlsConnection.bind(this));
  }



  /**
   * Start the IMAP server on specified ports
   */
  async start(port = 143, tlsPort = 993): Promise<void> {
    if (this.isStarted) {
      console.log('IMAP server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      let serversStarted = 0;

      // Start regular IMAP server
      this.server.listen(port, '0.0.0.0', () => {
        console.log(`🔧 IMAP server listening on port ${port}`);
        serversStarted++;
        if (serversStarted === 2) {
          this.isStarted = true;
          resolve();
        }
      });

      // Start TLS IMAP server  
      this.tlsServer.listen(tlsPort, '0.0.0.0', () => {
        console.log(`🔒 IMAP TLS server listening on port ${tlsPort}`);
        serversStarted++;
        if (serversStarted === 2) {
          this.isStarted = true;
          resolve();
        }
      });

      this.server.on('error', reject);
      this.tlsServer.on('error', reject);
    });
  }

  /**
   * Stop the IMAP server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) return;

    return new Promise((resolve) => {
      let serversClosed = 0;

      this.server.close(() => {
        serversClosed++;
        if (serversClosed === 2) {
          this.isStarted = false;
          resolve();
        }
      });

      this.tlsServer.close(() => {
        serversClosed++;
        if (serversClosed === 2) {
          this.isStarted = false;
          resolve();
        }
      });

      // Close all active sessions
      for (const session of this.sessions.values()) {
        session.socket.destroy();
      }
      this.sessions.clear();
    });
  }

  /**
   * Handle new IMAP connection (plain text)
   */
  private handleConnection(socket: net.Socket): void {
    const sessionId = crypto.randomUUID();
    const session: ImapSession = {
      id: sessionId,
      socket,
      state: 'GREETING',
      tag: 1,
      capabilities: [
        'IMAP4rev1',
        'STARTTLS',
        'IDLE',
        'NAMESPACE',
        'CHILDREN',
        'UNSELECT',
        'UIDPLUS',
        'CONDSTORE',
        'QRESYNC'
      ]
    };

    this.sessions.set(sessionId, session);
    console.log(`📧 New IMAP connection: ${sessionId}`);

    // Send greeting
    this.sendResponse(session, '* OK [CAPABILITY ' + session.capabilities.join(' ') + '] BackstageOS IMAP Server ready');

    // Set up data handlers
    socket.on('data', (data) => this.handleData(sessionId, data));
    socket.on('end', () => this.handleDisconnect(sessionId));
    socket.on('error', (error) => this.handleError(sessionId, error));

    session.state = 'NOT_AUTHENTICATED';
  }

  /**
   * Handle new TLS IMAP connection (using plain socket for development)
   */
  private handleTlsConnection(socket: net.Socket): void {
    const sessionId = crypto.randomUUID();
    const session: ImapSession = {
      id: sessionId,
      socket,
      state: 'GREETING',
      tag: 1,
      capabilities: [
        'IMAP4rev1',
        'IDLE',
        'NAMESPACE', 
        'CHILDREN',
        'UNSELECT',
        'UIDPLUS',
        'CONDSTORE',
        'QRESYNC'
      ]
    };

    this.sessions.set(sessionId, session);
    console.log(`🔒 New IMAP TLS connection: ${sessionId}`);

    // Send greeting
    this.sendResponse(session, '* OK [CAPABILITY ' + session.capabilities.join(' ') + '] BackstageOS IMAP Server ready');

    // Set up data handlers
    socket.on('data', (data) => this.handleData(sessionId, data));
    socket.on('end', () => this.handleDisconnect(sessionId));
    socket.on('error', (error) => this.handleError(sessionId, error));

    session.state = 'NOT_AUTHENTICATED';
  }

  /**
   * Handle incoming IMAP data/commands
   */
  private handleData(sessionId: string, data: Buffer): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const lines = data.toString().trim().split('\r\n');

    for (const line of lines) {
      if (line.trim()) {
        this.processCommand(session, line.trim());
      }
    }
  }

  /**
   * Process IMAP command
   */
  private async processCommand(session: ImapSession, command: string): Promise<void> {
    console.log(`📨 IMAP Command [${session.id}]: ${command}`);

    const parts = command.split(' ');
    const tag = parts[0];
    const cmd = parts[1]?.toUpperCase();
    const args = parts.slice(2);

    try {
      switch (cmd) {
        case 'CAPABILITY':
          await this.handleCapability(session, tag);
          break;
        
        case 'LOGIN':
          await this.handleLogin(session, tag, args);
          break;
        
        case 'LIST':
          await this.handleList(session, tag, args);
          break;
        
        case 'SELECT':
          await this.handleSelect(session, tag, args);
          break;
        
        case 'FETCH':
          await this.handleFetch(session, tag, args);
          break;
        
        case 'SEARCH':
          await this.handleSearch(session, tag, args);
          break;
        
        case 'STORE':
          await this.handleStore(session, tag, args);
          break;
        
        case 'IDLE':
          await this.handleIdle(session, tag);
          break;
        
        case 'LOGOUT':
          await this.handleLogout(session, tag);
          break;
        
        default:
          this.sendResponse(session, `${tag} BAD Unknown command: ${cmd}`);
      }
    } catch (error) {
      console.error(`IMAP command error: ${error}`);
      this.sendResponse(session, `${tag} NO Internal server error`);
    }
  }

  /**
   * Handle CAPABILITY command
   */
  private async handleCapability(session: ImapSession, tag: string): Promise<void> {
    this.sendResponse(session, '* CAPABILITY ' + session.capabilities.join(' '));
    this.sendResponse(session, `${tag} OK CAPABILITY completed`);
  }

  /**
   * Handle LOGIN command
   */
  private async handleLogin(session: ImapSession, tag: string, args: string[]): Promise<void> {
    if (session.state !== 'NOT_AUTHENTICATED') {
      this.sendResponse(session, `${tag} BAD Already authenticated`);
      return;
    }

    if (args.length < 2) {
      this.sendResponse(session, `${tag} BAD LOGIN requires username and password`);
      return;
    }

    const username = args[0].replace(/"/g, '');
    const password = args[1].replace(/"/g, '');

    // Find user and email account
    const user = await this.authenticateUser(username, password);
    if (!user) {
      this.sendResponse(session, `${tag} NO LOGIN failed - invalid credentials`);
      return;
    }

    session.user = user;
    session.state = 'AUTHENTICATED';

    console.log(`✅ User authenticated: ${user.email}`);
    this.sendResponse(session, `${tag} OK LOGIN completed`);
  }

  /**
   * Authenticate user credentials
   */
  private async authenticateUser(username: string, password: string): Promise<{ id: number; email: string; accountId: number } | null> {
    try {
      // Find email account
      const [account] = await db
        .select({
          accountId: emailAccounts.id,
          userId: emailAccounts.userId,
          emailAddress: emailAccounts.emailAddress,
          userPassword: users.password
        })
        .from(emailAccounts)
        .innerJoin(users, eq(users.id, emailAccounts.userId))
        .where(eq(emailAccounts.emailAddress, username))
        .limit(1);

      if (!account) {
        console.log(`❌ No account found for: ${username}`);
        return null;
      }

      // Verify password (in production, use bcrypt)
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, account.userPassword);
      
      if (!isValid) {
        console.log(`❌ Invalid password for: ${username}`);
        return null;
      }

      return {
        id: account.userId,
        email: account.emailAddress,
        accountId: account.accountId
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  /**
   * Handle LIST command - show available mailboxes
   */
  private async handleList(session: ImapSession, tag: string, args: string[]): Promise<void> {
    if (session.state !== 'AUTHENTICATED' && session.state !== 'SELECTED') {
      this.sendResponse(session, `${tag} NO Must be authenticated`);
      return;
    }

    if (!session.user) {
      this.sendResponse(session, `${tag} NO Authentication required`);
      return;
    }

    try {
      // Get folders for this account
      const folders = await db
        .select({
          id: emailFolders.id,
          name: emailFolders.name,
          folderType: emailFolders.folderType
        })
        .from(emailFolders)
        .where(eq(emailFolders.accountId, session.user.accountId));

      // Default folders if none exist
      const defaultFolders = [
        { name: 'INBOX', folderType: 'system' },
        { name: 'Sent', folderType: 'system' },
        { name: 'Drafts', folderType: 'system' },
        { name: 'Trash', folderType: 'system' }
      ];

      const foldersToShow = folders.length > 0 ? folders : defaultFolders;

      for (const folder of foldersToShow) {
        const flags = folder.folderType === 'system' ? '\\HasNoChildren' : '';
        this.sendResponse(session, `* LIST (${flags}) "/" "${folder.name}"`);
      }

      this.sendResponse(session, `${tag} OK LIST completed`);
    } catch (error) {
      console.error('LIST error:', error);
      this.sendResponse(session, `${tag} NO LIST failed`);
    }
  }

  /**
   * Handle SELECT command - select a mailbox
   */
  private async handleSelect(session: ImapSession, tag: string, args: string[]): Promise<void> {
    if (session.state !== 'AUTHENTICATED' && session.state !== 'SELECTED') {
      this.sendResponse(session, `${tag} NO Must be authenticated`);
      return;
    }

    if (!session.user || args.length === 0) {
      this.sendResponse(session, `${tag} BAD SELECT requires mailbox name`);
      return;
    }

    const mailboxName = args[0].replace(/"/g, '');

    try {
      // Find or create the mailbox
      let folder = await db
        .select()
        .from(emailFolders)
        .where(and(
          eq(emailFolders.accountId, session.user.accountId),
          eq(emailFolders.name, mailboxName)
        ))
        .limit(1);

      if (folder.length === 0) {
        // Create default folder if it doesn't exist
        const [newFolder] = await db
          .insert(emailFolders)
          .values({
            accountId: session.user.accountId,
            name: mailboxName,
            folderType: 'system'
          })
          .returning();
        folder = [newFolder];
      }

      const folderId = folder[0].id;

      // Get message counts
      const [messageCount] = await db
        .select({ count: count() })
        .from(emailMessages)
        .where(eq(emailMessages.folderId, folderId));

      const [unseenCount] = await db
        .select({ count: count() })
        .from(emailMessages)
        .where(and(
          eq(emailMessages.folderId, folderId),
          eq(emailMessages.isRead, false)
        ));

      session.selectedMailbox = mailboxName;
      session.selectedMailboxId = folderId;
      session.state = 'SELECTED';

      // Send required responses
      this.sendResponse(session, `* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)`);
      this.sendResponse(session, `* OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft \\*)] Flags permitted`);
      this.sendResponse(session, `* ${messageCount.count} EXISTS`);
      this.sendResponse(session, `* ${unseenCount.count} RECENT`);
      this.sendResponse(session, `* OK [UIDVALIDITY ${Date.now()}] UIDs valid`);
      this.sendResponse(session, `* OK [UIDNEXT ${messageCount.count + 1}] Predicted next UID`);
      this.sendResponse(session, `${tag} OK [READ-WRITE] SELECT completed`);

    } catch (error) {
      console.error('SELECT error:', error);
      this.sendResponse(session, `${tag} NO SELECT failed`);
    }
  }

  /**
   * Handle FETCH command - retrieve message data
   */
  private async handleFetch(session: ImapSession, tag: string, args: string[]): Promise<void> {
    if (session.state !== 'SELECTED') {
      this.sendResponse(session, `${tag} NO Must select a mailbox first`);
      return;
    }

    if (!session.user || !session.selectedMailboxId) {
      this.sendResponse(session, `${tag} BAD Invalid session state`);
      return;
    }

    try {
      const sequenceSet = args[0];
      const items = args.slice(1).join(' ').replace(/[()]/g, '');

      // Get messages from selected folder
      const messages = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.folderId, session.selectedMailboxId))
        .orderBy(emailMessages.dateReceived);

      // Parse sequence set (simplified - just handle "1:*" for now)
      let messagesToFetch = messages;
      if (sequenceSet !== '1:*') {
        // Handle specific sequences (simplified implementation)
        const seqNum = parseInt(sequenceSet);
        if (!isNaN(seqNum) && seqNum <= messages.length) {
          messagesToFetch = [messages[seqNum - 1]];
        }
      }

      for (let i = 0; i < messagesToFetch.length; i++) {
        const message = messagesToFetch[i];
        const seqNum = messages.indexOf(message) + 1;

        let response = `* ${seqNum} FETCH (`;
        const responseItems = [];

        if (items.includes('FLAGS')) {
          const flags = [];
          if (message.isRead) flags.push('\\Seen');
          if (message.isStarred) flags.push('\\Flagged');
          if (message.isDraft) flags.push('\\Draft');
          responseItems.push(`FLAGS (${flags.join(' ')})`);
        }

        if (items.includes('ENVELOPE')) {
          const envelope = this.formatEnvelope(message);
          responseItems.push(`ENVELOPE ${envelope}`);
        }

        if (items.includes('BODYSTRUCTURE')) {
          const bodyStructure = this.formatBodyStructure(message);
          responseItems.push(`BODYSTRUCTURE ${bodyStructure}`);
        }

        if (items.includes('BODY[]') || items.includes('RFC822')) {
          const body = this.formatMessageBody(message);
          responseItems.push(`BODY[] {${body.length}}`);
        }

        response += responseItems.join(' ') + ')';
        this.sendResponse(session, response);

        // Send body data if requested
        if (items.includes('BODY[]') || items.includes('RFC822')) {
          const body = this.formatMessageBody(message);
          session.socket.write(body);
          session.socket.write('\r\n');
        }
      }

      this.sendResponse(session, `${tag} OK FETCH completed`);

    } catch (error) {
      console.error('FETCH error:', error);
      this.sendResponse(session, `${tag} NO FETCH failed`);
    }
  }

  /**
   * Handle SEARCH command
   */
  private async handleSearch(session: ImapSession, tag: string, args: string[]): Promise<void> {
    if (session.state !== 'SELECTED') {
      this.sendResponse(session, `${tag} NO Must select a mailbox first`);
      return;
    }

    if (!session.user || !session.selectedMailboxId) {
      this.sendResponse(session, `${tag} BAD Invalid session state`);
      return;
    }

    try {
      // Get messages from selected folder
      const messages = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.folderId, session.selectedMailboxId))
        .orderBy(emailMessages.dateReceived);

      // Simple search implementation (just return all message sequence numbers for now)
      const results = messages.map((_, index) => index + 1).join(' ');
      this.sendResponse(session, `* SEARCH ${results}`);
      this.sendResponse(session, `${tag} OK SEARCH completed`);

    } catch (error) {
      console.error('SEARCH error:', error);
      this.sendResponse(session, `${tag} NO SEARCH failed`);
    }
  }

  /**
   * Handle STORE command - update message flags
   */
  private async handleStore(session: ImapSession, tag: string, args: string[]): Promise<void> {
    if (session.state !== 'SELECTED') {
      this.sendResponse(session, `${tag} NO Must select a mailbox first`);
      return;
    }

    // Simple implementation - just acknowledge the command
    this.sendResponse(session, `${tag} OK STORE completed`);
  }

  /**
   * Handle IDLE command - keep connection alive
   */
  private async handleIdle(session: ImapSession, tag: string): Promise<void> {
    this.sendResponse(session, '+ idling');
    
    // Set up idle timeout (30 minutes)
    const idleTimeout = setTimeout(() => {
      this.sendResponse(session, '* BYE Idle timeout');
      session.socket.destroy();
    }, 30 * 60 * 1000);

    // Listen for DONE command to end idle
    const handleData = (data: Buffer) => {
      if (data.toString().trim().toUpperCase() === 'DONE') {
        clearTimeout(idleTimeout);
        session.socket.removeListener('data', handleData);
        this.sendResponse(session, `${tag} OK IDLE terminated`);
      }
    };

    session.socket.on('data', handleData);
  }

  /**
   * Handle LOGOUT command
   */
  private async handleLogout(session: ImapSession, tag: string): Promise<void> {
    this.sendResponse(session, '* BYE Logging out');
    this.sendResponse(session, `${tag} OK LOGOUT completed`);
    session.socket.end();
  }

  /**
   * Send response to client
   */
  private sendResponse(session: ImapSession, response: string): void {
    console.log(`📤 IMAP Response [${session.id}]: ${response}`);
    session.socket.write(response + '\r\n');
  }

  /**
   * Format message envelope for IMAP
   */
  private formatEnvelope(message: any): string {
    const date = message.dateReceived ? new Date(message.dateReceived).toUTCString() : 'NIL';
    const subject = message.subject ? `"${message.subject.replace(/"/g, '\\"')}"` : 'NIL';
    const from = message.fromAddress ? `(("" NIL "${message.fromAddress.split('@')[0]}" "${message.fromAddress.split('@')[1]}"))` : 'NIL';
    const to = message.toAddresses && message.toAddresses.length > 0 ? 
      `((${message.toAddresses.map(addr => `"" NIL "${addr.split('@')[0]}" "${addr.split('@')[1]}"`).join(' ')}))` : 'NIL';
    
    return `("${date}" ${subject} ${from} ${from} ${from} ${to} NIL NIL NIL "${message.messageId || ''}")`;
  }

  /**
   * Format body structure for IMAP
   */
  private formatBodyStructure(message: any): string {
    // Simplified body structure
    if (message.htmlContent) {
      return '("text" "html" ("charset" "utf-8") NIL NIL "quoted-printable" ' + 
             (message.htmlContent.length || 0) + ' ' + 
             (message.htmlContent.split('\n').length || 0) + ' NIL NIL NIL)';
    } else {
      return '("text" "plain" ("charset" "utf-8") NIL NIL "7bit" ' + 
             (message.content?.length || 0) + ' ' + 
             (message.content?.split('\n').length || 0) + ' NIL NIL NIL)';
    }
  }

  /**
   * Format message body for IMAP
   */
  private formatMessageBody(message: any): string {
    const headers = [
      `Message-ID: ${message.messageId || '<' + Date.now() + '@backstageos.com>'}`,
      `Date: ${message.dateReceived ? new Date(message.dateReceived).toUTCString() : new Date().toUTCString()}`,
      `From: ${message.fromAddress || 'noreply@backstageos.com'}`,
      `To: ${message.toAddresses?.join(', ') || ''}`,
      `Subject: ${message.subject || 'No Subject'}`,
      `Content-Type: ${message.htmlContent ? 'text/html' : 'text/plain'}; charset=utf-8`,
      ''
    ].join('\r\n');

    const body = message.htmlContent || message.content || '';
    return headers + body;
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(sessionId: string): void {
    console.log(`📪 IMAP connection closed: ${sessionId}`);
    this.sessions.delete(sessionId);
  }

  /**
   * Handle connection error
   */
  private handleError(sessionId: string, error: Error): void {
    console.error(`IMAP connection error [${sessionId}]:`, error);
    this.sessions.delete(sessionId);
  }

  /**
   * Get server status
   */
  getStatus(): { isRunning: boolean; activeConnections: number } {
    return {
      isRunning: this.isStarted,
      activeConnections: this.sessions.size
    };
  }
}

// Export singleton instance
export const imapServerService = new ImapServerService();