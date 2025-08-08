import net from 'net';
import crypto from 'crypto';
import { db } from '../db.js';
import { users, emailAccounts, emailMessages, emailThreads, emailFolders } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';

export interface SmtpSession {
  id: string;
  socket: net.Socket;
  state: 'GREETING' | 'EHLO' | 'AUTH' | 'MAIL' | 'RCPT' | 'DATA' | 'QUIT';
  user?: {
    id: number;
    email: string;
    accountId: number;
  };
  mailFrom?: string;
  rcptTo: string[];
  messageData?: string;
  authenticated: boolean;
}

export class SmtpServerService {
  private server: net.Server;
  private sessions: Map<string, SmtpSession> = new Map();
  private isStarted = false;

  constructor() {
    this.server = net.createServer(this.handleConnection.bind(this));
  }

  /**
   * Start the SMTP server on port 587
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.log('📧 SMTP server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      this.server.listen(587, '0.0.0.0', () => {
        this.isStarted = true;
        console.log('📤 SMTP server listening on port 587');
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('❌ SMTP server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the SMTP server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) return;

    return new Promise((resolve) => {
      // Close all active sessions
      for (const session of this.sessions.values()) {
        session.socket.destroy();
      }
      this.sessions.clear();

      this.server.close(() => {
        this.isStarted = false;
        console.log('📤 SMTP server stopped');
        resolve();
      });
    });
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isStarted,
      activeConnections: this.sessions.size,
      port: 587,
      type: 'SMTP'
    };
  }

  /**
   * Handle new SMTP connection
   */
  private handleConnection(socket: net.Socket): void {
    const sessionId = crypto.randomUUID();
    const session: SmtpSession = {
      id: sessionId,
      socket,
      state: 'GREETING',
      rcptTo: [],
      authenticated: false
    };

    this.sessions.set(sessionId, session);
    console.log(`📤 New SMTP connection: ${sessionId} from ${socket.remoteAddress}`);

    // Send SMTP greeting
    this.sendResponse(session, '220 backstageos.com ESMTP BackstageOS Mail Server');

    // Set up data handlers
    socket.on('data', (data) => this.handleData(session, data));
    socket.on('close', () => this.handleClose(session));
    socket.on('error', (error) => this.handleError(session, error));

    // Set timeout
    socket.setTimeout(300000); // 5 minutes
  }

  /**
   * Handle incoming data from client
   */
  private handleData(session: SmtpSession, data: Buffer): void {
    const lines = data.toString().trim().split('\r\n');
    
    for (const line of lines) {
      if (line.trim()) {
        this.processCommand(session, line.trim());
      }
    }
  }

  /**
   * Process SMTP command
   */
  private async processCommand(session: SmtpSession, command: string): Promise<void> {
    const parts = command.split(' ');
    const cmd = parts[0].toUpperCase();

    console.log(`📤 SMTP [${session.id}] ${session.state}: ${command}`);

    try {
      switch (cmd) {
        case 'EHLO':
        case 'HELO':
          await this.handleEhlo(session, parts);
          break;
        case 'AUTH':
          await this.handleAuth(session, parts);
          break;
        case 'MAIL':
          await this.handleMail(session, command);
          break;
        case 'RCPT':
          await this.handleRcpt(session, command);
          break;
        case 'DATA':
          await this.handleData2(session);
          break;
        case 'QUIT':
          await this.handleQuit(session);
          break;
        case 'RSET':
          await this.handleRset(session);
          break;
        case 'NOOP':
          this.sendResponse(session, '250 OK');
          break;
        default:
          if (session.state === 'DATA' && !cmd.startsWith('.')) {
            // Collecting message data
            if (!session.messageData) session.messageData = '';
            session.messageData += command + '\r\n';
          } else if (session.state === 'DATA' && command === '.') {
            // End of message data
            await this.handleEndOfData(session);
          } else {
            this.sendResponse(session, '502 Command not implemented');
          }
          break;
      }
    } catch (error) {
      console.error(`❌ SMTP command error [${session.id}]:`, error);
      this.sendResponse(session, '451 Requested action aborted: local error in processing');
    }
  }

  /**
   * Handle EHLO/HELO command
   */
  private async handleEhlo(session: SmtpSession, parts: string[]): Promise<void> {
    session.state = 'EHLO';
    
    if (parts[0] === 'EHLO') {
      this.sendResponse(session, '250-backstageos.com Hello ' + (parts[1] || 'client'));
      this.sendResponse(session, '250-AUTH PLAIN LOGIN');
      this.sendResponse(session, '250-STARTTLS');
      this.sendResponse(session, '250 8BITMIME');
    } else {
      this.sendResponse(session, '250 backstageos.com Hello ' + (parts[1] || 'client'));
    }
  }

  /**
   * Handle AUTH command
   */
  private async handleAuth(session: SmtpSession, parts: string[]): Promise<void> {
    if (parts.length < 2) {
      this.sendResponse(session, '501 Syntax error in parameters');
      return;
    }

    const authType = parts[1].toUpperCase();
    
    if (authType === 'PLAIN') {
      if (parts.length >= 3) {
        // AUTH PLAIN with credentials in one line
        const credentials = Buffer.from(parts[2], 'base64').toString();
        const [, username, password] = credentials.split('\0');
        
        const authenticated = await this.authenticateUser(username, password);
        if (authenticated) {
          session.user = authenticated;
          session.authenticated = true;
          session.state = 'AUTH';
          this.sendResponse(session, '235 Authentication successful');
        } else {
          this.sendResponse(session, '535 Authentication failed');
        }
      } else {
        // AUTH PLAIN without credentials - request them
        this.sendResponse(session, '334 ');
        // Wait for credentials in next command
      }
    } else if (authType === 'LOGIN') {
      this.sendResponse(session, '334 VXNlcm5hbWU6'); // "Username:" in base64
      // Will handle username/password in subsequent commands
    } else {
      this.sendResponse(session, '504 Authentication mechanism not supported');
    }
  }

  /**
   * Handle MAIL FROM command
   */
  private async handleMail(session: SmtpSession, command: string): Promise<void> {
    if (!session.authenticated) {
      this.sendResponse(session, '530 Authentication required');
      return;
    }

    const match = command.match(/MAIL FROM:\s*<(.+?)>/i);
    if (!match) {
      this.sendResponse(session, '501 Syntax error in MAIL FROM command');
      return;
    }

    session.mailFrom = match[1];
    session.state = 'MAIL';
    this.sendResponse(session, '250 OK');
  }

  /**
   * Handle RCPT TO command
   */
  private async handleRcpt(session: SmtpSession, command: string): Promise<void> {
    if (session.state !== 'MAIL' && session.state !== 'RCPT') {
      this.sendResponse(session, '503 Bad sequence of commands');
      return;
    }

    const match = command.match(/RCPT TO:\s*<(.+?)>/i);
    if (!match) {
      this.sendResponse(session, '501 Syntax error in RCPT TO command');
      return;
    }

    session.rcptTo.push(match[1]);
    session.state = 'RCPT';
    this.sendResponse(session, '250 OK');
  }

  /**
   * Handle DATA command
   */
  private async handleData2(session: SmtpSession): Promise<void> {
    if (session.state !== 'RCPT') {
      this.sendResponse(session, '503 Bad sequence of commands');
      return;
    }

    session.state = 'DATA';
    session.messageData = '';
    this.sendResponse(session, '354 Start mail input; end with <CRLF>.<CRLF>');
  }

  /**
   * Handle end of message data
   */
  private async handleEndOfData(session: SmtpSession): Promise<void> {
    if (!session.messageData || !session.mailFrom || !session.rcptTo.length) {
      this.sendResponse(session, '451 Requested action aborted: local error in processing');
      return;
    }

    try {
      // Parse message headers and body
      const messageParts = session.messageData.split('\r\n\r\n');
      const headers = messageParts[0];
      const body = messageParts.slice(1).join('\r\n\r\n');

      // Extract subject from headers
      const subjectMatch = headers.match(/^Subject:\s*(.+)$/im);
      const subject = subjectMatch ? subjectMatch[1].trim() : '(No Subject)';

      // Store the email in the database
      await this.storeOutgoingEmail(session, subject, body, headers);

      this.sendResponse(session, '250 OK: Message accepted for delivery');
      
      // Reset for next message
      session.state = 'AUTH';
      session.mailFrom = undefined;
      session.rcptTo = [];
      session.messageData = undefined;

    } catch (error) {
      console.error('❌ Error storing outgoing email:', error);
      this.sendResponse(session, '451 Requested action aborted: local error in processing');
    }
  }

  /**
   * Handle RSET command
   */
  private async handleRset(session: SmtpSession): Promise<void> {
    session.state = session.authenticated ? 'AUTH' : 'EHLO';
    session.mailFrom = undefined;
    session.rcptTo = [];
    session.messageData = undefined;
    this.sendResponse(session, '250 OK');
  }

  /**
   * Handle QUIT command
   */
  private async handleQuit(session: SmtpSession): Promise<void> {
    this.sendResponse(session, '221 Goodbye');
    session.socket.end();
  }

  /**
   * Store outgoing email in database
   */
  private async storeOutgoingEmail(
    session: SmtpSession, 
    subject: string, 
    body: string, 
    headers: string
  ): Promise<void> {
    if (!session.user || !session.mailFrom) return;

    // Get the "Sent" folder for this account
    const [sentFolder] = await db
      .select()
      .from(emailFolders)
      .where(and(
        eq(emailFolders.accountId, session.user.accountId),
        eq(emailFolders.name, 'Sent')
      ))
      .limit(1);

    if (!sentFolder) {
      throw new Error('Sent folder not found');
    }

    // Create or find thread
    let thread;
    const [existingThread] = await db
      .select()
      .from(emailThreads)
      .where(and(
        eq(emailThreads.accountId, session.user.accountId),
        eq(emailThreads.subject, subject)
      ))
      .limit(1);

    if (existingThread) {
      thread = existingThread;
    } else {
      const [newThread] = await db
        .insert(emailThreads)
        .values({
          accountId: session.user.accountId,
          subject,
          lastMessageAt: new Date(),
          messageCount: 0
        })
        .returning();
      thread = newThread;
    }

    // Store the message
    await db
      .insert(emailMessages)
      .values({
        accountId: session.user.accountId,
        threadId: thread.id,
        folderId: sentFolder.id,
        subject,
        fromAddress: session.mailFrom,
        toAddress: session.rcptTo.join(', '),
        body,
        headers,
        isRead: true,
        isSent: true,
        sentAt: new Date(),
        createdAt: new Date()
      });

    // Update thread
    await db
      .update(emailThreads)
      .set({
        lastMessageAt: new Date(),
        messageCount: thread.messageCount + 1
      })
      .where(eq(emailThreads.id, thread.id));

    console.log(`📤 Email stored: From ${session.mailFrom} to ${session.rcptTo.join(', ')}`);

    // TODO: Actually send the email via SendGrid or another service
    // For now, we just store it as sent
  }

  /**
   * Authenticate user credentials
   */
  private async authenticateUser(email: string, password: string): Promise<{
    id: number;
    email: string;
    accountId: number;
  } | null> {
    try {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) return null;

      // For now, we'll use a simple password check
      // In production, you'd want to hash and compare properly
      // This is a simplified version for the SMTP server

      // Find the user's email account
      const [emailAccount] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, user.id))
        .limit(1);

      if (!emailAccount) return null;

      return {
        id: user.id,
        email: emailAccount.emailAddress,
        accountId: emailAccount.id
      };
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return null;
    }
  }

  /**
   * Send response to client
   */
  private sendResponse(session: SmtpSession, response: string): void {
    session.socket.write(response + '\r\n');
  }

  /**
   * Handle connection close
   */
  private handleClose(session: SmtpSession): void {
    console.log(`📤 SMTP connection closed: ${session.id}`);
    this.sessions.delete(session.id);
  }

  /**
   * Handle connection error
   */
  private handleError(session: SmtpSession, error: Error): void {
    console.error(`❌ SMTP connection error [${session.id}]:`, error);
    this.sessions.delete(session.id);
  }
}

// Export singleton instance
export const smtpServerService = new SmtpServerService();