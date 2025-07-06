import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { db } from '../db.js';
import { emailAccounts, emailMessages, emailThreads, emailFolders, emailSyncJobs } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface SyncProgress {
  totalMessages: number;
  processedMessages: number;
  progress: number;
}

export class ImapService {
  private imap: Imap | null = null;
  private isConnected = false;

  constructor() {}

  /**
   * Connect to IMAP server with account credentials
   */
  async connect(config: ImapConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap(config);

      this.imap.once('ready', () => {
        console.log('IMAP connection ready');
        this.isConnected = true;
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        console.error('IMAP connection error:', err);
        this.isConnected = false;
        reject(err);
      });

      this.imap.once('end', () => {
        console.log('IMAP connection ended');
        this.isConnected = false;
      });

      this.imap.connect();
    });
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    if (this.imap && this.isConnected) {
      this.imap.end();
      this.isConnected = false;
    }
  }

  /**
   * Get list of available IMAP folders
   */
  async getFolders(): Promise<any[]> {
    if (!this.imap || !this.isConnected) {
      throw new Error('IMAP not connected');
    }

    return new Promise((resolve, reject) => {
      this.imap!.getBoxes((err, boxes) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.flattenBoxes(boxes));
      });
    });
  }

  /**
   * Flatten IMAP folder structure
   */
  private flattenBoxes(boxes: any, prefix = ''): any[] {
    const result: any[] = [];
    
    for (const [name, box] of Object.entries(boxes)) {
      const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name;
      result.push({
        name: fullName,
        displayName: name,
        delimiter: box.delimiter,
        parent: prefix || null,
        hasChildren: box.children && Object.keys(box.children).length > 0,
        attributes: box.attribs || []
      });

      if (box.children) {
        result.push(...this.flattenBoxes(box.children, fullName));
      }
    }

    return result;
  }

  /**
   * Synchronize emails from a specific folder
   */
  async syncFolder(accountId: number, folderName = 'INBOX', isFullSync = false): Promise<SyncProgress> {
    if (!this.imap || !this.isConnected) {
      throw new Error('IMAP not connected');
    }

    // Create sync job record
    const [syncJob] = await db.insert(emailSyncJobs).values({
      accountId,
      jobType: isFullSync ? 'full_sync' : 'incremental_sync',
      status: 'running',
      startedAt: new Date()
    }).returning();

    try {
      return new Promise((resolve, reject) => {
        this.imap!.openBox(folderName, true, async (err, box) => {
          if (err) {
            await this.updateSyncJob(syncJob.id, 'failed', err.message);
            reject(err);
            return;
          }

          try {
            const totalMessages = box.messages.total;
            let processedMessages = 0;

            // Update sync job with total count
            await this.updateSyncJob(syncJob.id, 'running', null, 0, totalMessages, 0);

            // Get the range of messages to sync
            let searchCriteria: any[] = ['ALL'];
            
            if (!isFullSync) {
              // For incremental sync, get messages since last sync
              const account = await db.select().from(emailAccounts)
                .where(eq(emailAccounts.id, accountId))
                .limit(1);
              
              if (account[0]?.lastSyncAt) {
                const sinceDate = account[0].lastSyncAt;
                searchCriteria = ['SINCE', sinceDate];
              }
            }

            this.imap!.search(searchCriteria, (err, results) => {
              if (err) {
                this.updateSyncJob(syncJob.id, 'failed', err.message);
                reject(err);
                return;
              }

              if (!results || results.length === 0) {
                this.updateSyncJob(syncJob.id, 'completed', null, 100, totalMessages, processedMessages);
                resolve({ totalMessages, processedMessages, progress: 100 });
                return;
              }

              const fetch = this.imap!.fetch(results, {
                bodies: '',
                markSeen: false,
                struct: true
              });

              fetch.on('message', (msg, seqno) => {
                let buffer = '';
                let attributes: any = {};

                msg.on('body', (stream) => {
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('ascii');
                  });
                });

                msg.once('attributes', (attrs) => {
                  attributes = attrs;
                });

                msg.once('end', async () => {
                  try {
                    // Parse the email message
                    const parsed = await simpleParser(buffer);
                    
                    // Create or find thread
                    const subject = this.normalizeSubject(parsed.subject || 'No Subject');
                    const threadId = await this.findOrCreateThread(accountId, subject, parsed);
                    
                    // Check if message already exists
                    const messageId = parsed.messageId || this.generateMessageId(parsed);
                    const existingMessage = await db.select().from(emailMessages)
                      .where(eq(emailMessages.messageId, messageId))
                      .limit(1);

                    if (existingMessage.length === 0) {
                      // Create new message record
                      await this.createMessage(accountId, threadId, parsed, attributes, folderName);
                    } else {
                      // Update sync information
                      await this.updateMessageSync(existingMessage[0].id, attributes.uid, folderName);
                    }

                    processedMessages++;
                    const progress = Math.round((processedMessages / totalMessages) * 100);
                    
                    // Update sync job progress
                    await this.updateSyncJob(syncJob.id, 'running', null, progress, totalMessages, processedMessages);

                  } catch (error) {
                    console.error('Error processing message:', error);
                  }
                });
              });

              fetch.once('error', async (err) => {
                await this.updateSyncJob(syncJob.id, 'failed', err.message);
                reject(err);
              });

              fetch.once('end', async () => {
                // Update account last sync time
                await db.update(emailAccounts)
                  .set({ 
                    lastSyncAt: new Date(),
                    nextSyncAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
                  })
                  .where(eq(emailAccounts.id, accountId));

                await this.updateSyncJob(syncJob.id, 'completed', null, 100, totalMessages, processedMessages);
                resolve({ totalMessages, processedMessages, progress: 100 });
              });
            });
          } catch (error) {
            await this.updateSyncJob(syncJob.id, 'failed', error.message);
            reject(error);
          }
        });
      });
    } catch (error) {
      await this.updateSyncJob(syncJob.id, 'failed', error.message);
      throw error;
    }
  }

  /**
   * Update sync job status and progress
   */
  private async updateSyncJob(
    jobId: number, 
    status: string, 
    errorMessage?: string | null, 
    progress?: number, 
    totalItems?: number, 
    processedItems?: number
  ): Promise<void> {
    const updateData: any = { status };
    
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (progress !== undefined) updateData.progress = progress;
    if (totalItems !== undefined) updateData.totalItems = totalItems;
    if (processedItems !== undefined) updateData.processedItems = processedItems;
    
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await db.update(emailSyncJobs)
      .set(updateData)
      .where(eq(emailSyncJobs.id, jobId));
  }

  /**
   * Normalize email subject for threading
   */
  private normalizeSubject(subject: string): string {
    // Remove common reply/forward prefixes and normalize for threading
    return subject
      .replace(/^(Re|RE|Fwd|FWD|Fw|FW):\s*/gi, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Find existing thread or create new one
   */
  private async findOrCreateThread(accountId: number, subject: string, parsed: any): Promise<number> {
    // Look for existing thread with same subject
    const existingThread = await db.select().from(emailThreads)
      .where(and(
        eq(emailThreads.accountId, accountId),
        eq(emailThreads.subject, subject)
      ))
      .orderBy(desc(emailThreads.lastMessageAt))
      .limit(1);

    if (existingThread.length > 0) {
      // Update thread with new message info
      await db.update(emailThreads)
        .set({
          lastMessageAt: parsed.date || new Date(),
          messageCount: existingThread[0].messageCount + 1,
          updatedAt: new Date()
        })
        .where(eq(emailThreads.id, existingThread[0].id));
      
      return existingThread[0].id;
    } else {
      // Create new thread
      const participants = this.extractParticipants(parsed);
      const [newThread] = await db.insert(emailThreads).values({
        accountId,
        subject,
        participants,
        lastMessageAt: parsed.date || new Date(),
        messageCount: 1
      }).returning();

      return newThread.id;
    }
  }

  /**
   * Extract email participants from parsed message
   */
  private extractParticipants(parsed: any): string[] {
    const participants: Set<string> = new Set();
    
    if (parsed.from?.value) {
      parsed.from.value.forEach((addr: any) => participants.add(addr.address));
    }
    
    if (parsed.to?.value) {
      parsed.to.value.forEach((addr: any) => participants.add(addr.address));
    }
    
    if (parsed.cc?.value) {
      parsed.cc.value.forEach((addr: any) => participants.add(addr.address));
    }

    return Array.from(participants);
  }

  /**
   * Generate message ID if not present
   */
  private generateMessageId(parsed: any): string {
    const content = `${parsed.subject || ''}${parsed.text || ''}${parsed.date || ''}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Create message record in database
   */
  private async createMessage(
    accountId: number, 
    threadId: number, 
    parsed: any, 
    attributes: any, 
    folderName: string
  ): Promise<void> {
    const recipients = this.extractRecipients(parsed.to);
    const ccRecipients = this.extractRecipients(parsed.cc);
    const bccRecipients = this.extractRecipients(parsed.bcc);

    await db.insert(emailMessages).values({
      threadId,
      accountId,
      messageId: parsed.messageId || this.generateMessageId(parsed),
      senderEmail: parsed.from?.value?.[0]?.address || 'unknown@unknown.com',
      senderName: parsed.from?.value?.[0]?.name || null,
      recipients,
      ccRecipients,
      bccRecipients,
      subject: parsed.subject || 'No Subject',
      content: parsed.html || parsed.textAsHtml || '',
      plainTextContent: parsed.text || '',
      isRead: attributes.flags?.includes('\\Seen') || false,
      isStarred: attributes.flags?.includes('\\Flagged') || false,
      imapUid: attributes.uid,
      imapFolder: folderName,
      syncedAt: new Date(),
      lastSeenAt: new Date(),
      sentAt: parsed.date
    });
  }

  /**
   * Update message sync information
   */
  private async updateMessageSync(messageId: number, uid: number, folderName: string): Promise<void> {
    await db.update(emailMessages)
      .set({
        imapUid: uid,
        imapFolder: folderName,
        syncedAt: new Date(),
        lastSeenAt: new Date()
      })
      .where(eq(emailMessages.id, messageId));
  }

  /**
   * Extract recipient email addresses
   */
  private extractRecipients(addressList: any): string[] {
    if (!addressList?.value) return [];
    return addressList.value.map((addr: any) => addr.address).filter(Boolean);
  }

  /**
   * Test IMAP connection
   */
  async testConnection(config: ImapConfig): Promise<boolean> {
    try {
      await this.connect(config);
      await this.disconnect();
      return true;
    } catch (error) {
      console.error('IMAP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(accountId: number): Promise<any> {
    const job = await db.select().from(emailSyncJobs)
      .where(eq(emailSyncJobs.accountId, accountId))
      .orderBy(desc(emailSyncJobs.createdAt))
      .limit(1);

    return job[0] || null;
  }
}