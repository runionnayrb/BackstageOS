import nodemailer from 'nodemailer';
import { db } from '../db.js';
import { emailAccounts, emailMessages, emailQueue, emailThreads } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailContent {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: any[];
  inReplyTo?: string;
  references?: string[];
}

export interface SendResult {
  messageId: string;
  success: boolean;
  error?: string;
  deliveredAt?: Date;
}

export class SmtpService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {}

  /**
   * Create SMTP transporter with account configuration
   */
  async createTransporter(config: SmtpConfig): Promise<void> {
    this.transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass
      },
      // Additional SMTP options for reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10, // max 10 emails per second
      rateDelta: 1000
    });

    // Verify the connection
    try {
      await this.transporter.verify();
      console.log('SMTP transporter created and verified successfully');
    } catch (error) {
      console.error('SMTP verification failed:', error);
      throw new Error('Failed to verify SMTP configuration');
    }
  }

  /**
   * Send email directly
   */
  async sendEmail(accountId: number, content: EmailContent): Promise<SendResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    try {
      // Get account information
      const [account] = await db.select().from(emailAccounts)
        .where(eq(emailAccounts.id, accountId))
        .limit(1);

      if (!account) {
        throw new Error('Email account not found');
      }

      // Prepare email options
      const mailOptions = {
        from: `${account.displayName} <${account.emailAddress}>`,
        to: content.to.join(', '),
        cc: content.cc?.join(', '),
        bcc: content.bcc?.join(', '),
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments: content.attachments,
        inReplyTo: content.inReplyTo,
        references: content.references?.join(' ')
      };

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Update account statistics
      await this.updateAccountStats(accountId, 'sent');

      return {
        messageId: info.messageId,
        success: true,
        deliveredAt: new Date()
      };

    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        messageId: '',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Queue email for background sending
   */
  async queueEmail(
    accountId: number, 
    content: EmailContent, 
    priority = 5,
    scheduledAt?: Date
  ): Promise<number> {
    try {
      // Create or find thread for the email
      const threadId = await this.findOrCreateThread(accountId, content.subject, content);

      // Create message record
      const [message] = await db.insert(emailMessages).values({
        threadId,
        accountId,
        senderEmail: (await this.getAccountEmail(accountId)),
        recipients: content.to,
        ccRecipients: content.cc || [],
        bccRecipients: content.bcc || [],
        subject: content.subject,
        content: content.html || '',
        plainTextContent: content.text || '',
        isDraft: false,
        isSent: false,
        queueStatus: 'pending',
        queuedAt: new Date()
      }).returning();

      // Add to email queue
      const [queueItem] = await db.insert(emailQueue).values({
        accountId,
        messageId: message.id,
        priority,
        status: 'pending',
        scheduledAt: scheduledAt || new Date(),
        deliveryData: {
          to: content.to,
          cc: content.cc,
          bcc: content.bcc,
          subject: content.subject,
          html: content.html,
          text: content.text,
          attachments: content.attachments,
          inReplyTo: content.inReplyTo,
          references: content.references
        }
      }).returning();

      return queueItem.id;

    } catch (error) {
      console.error('Error queueing email:', error);
      throw error;
    }
  }

  /**
   * Process queued emails
   */
  async processQueue(accountId?: number): Promise<number> {
    let processed = 0;
    
    try {
      // Get pending queue items
      let query = db.select().from(emailQueue)
        .where(eq(emailQueue.status, 'pending'));
      
      if (accountId) {
        query = query.where(and(
          eq(emailQueue.status, 'pending'),
          eq(emailQueue.accountId, accountId)
        ));
      }

      const queueItems = await query
        .orderBy(emailQueue.priority, emailQueue.scheduledAt)
        .limit(10); // Process up to 10 emails at once

      for (const item of queueItems) {
        try {
          // Mark as processing
          await db.update(emailQueue)
            .set({ status: 'processing', processedAt: new Date() })
            .where(eq(emailQueue.id, item.id));

          // Get account SMTP configuration
          const [account] = await db.select().from(emailAccounts)
            .where(eq(emailAccounts.id, item.accountId))
            .limit(1);

          if (!account || !account.smtpEnabled) {
            throw new Error('SMTP not configured for this account');
          }

          // Create transporter for this account
          await this.createTransporter({
            host: account.smtpHost!,
            port: account.smtpPort!,
            secure: account.smtpSslEnabled!,
            auth: {
              user: account.smtpUsername!,
              pass: account.smtpPassword! // In production, this should be decrypted
            }
          });

          // Send the email
          const result = await this.sendEmail(item.accountId, item.deliveryData as EmailContent);
          
          if (result.success) {
            // Mark as sent
            await db.update(emailQueue)
              .set({ status: 'sent', processedAt: new Date() })
              .where(eq(emailQueue.id, item.id));

            // Update message status
            if (item.messageId) {
              await db.update(emailMessages)
                .set({
                  isSent: true,
                  queueStatus: 'sent',
                  sentAt: new Date(),
                  processedAt: new Date()
                })
                .where(eq(emailMessages.id, item.messageId));
            }

            processed++;
          } else {
            // Handle failure
            const newAttempts = item.attempts + 1;
            
            if (newAttempts >= item.maxAttempts) {
              // Mark as failed
              await db.update(emailQueue)
                .set({ 
                  status: 'failed', 
                  attempts: newAttempts,
                  errorMessage: result.error,
                  processedAt: new Date()
                })
                .where(eq(emailQueue.id, item.id));

              if (item.messageId) {
                await db.update(emailMessages)
                  .set({
                    queueStatus: 'failed',
                    lastError: result.error,
                    processedAt: new Date()
                  })
                  .where(eq(emailMessages.id, item.messageId));
              }
            } else {
              // Schedule for retry
              const retryDelay = Math.pow(2, newAttempts) * 60000; // Exponential backoff
              const nextAttempt = new Date(Date.now() + retryDelay);
              
              await db.update(emailQueue)
                .set({ 
                  status: 'retry',
                  attempts: newAttempts,
                  scheduledAt: nextAttempt,
                  errorMessage: result.error
                })
                .where(eq(emailQueue.id, item.id));

              if (item.messageId) {
                await db.update(emailMessages)
                  .set({
                    queueStatus: 'retry',
                    retryCount: newAttempts,
                    lastError: result.error
                  })
                  .where(eq(emailMessages.id, item.messageId));
              }
            }
          }

        } catch (error) {
          console.error(`Error processing queue item ${item.id}:`, error);
          
          // Mark as failed
          await db.update(emailQueue)
            .set({ 
              status: 'failed',
              attempts: item.attempts + 1,
              errorMessage: error.message,
              processedAt: new Date()
            })
            .where(eq(emailQueue.id, item.id));
        }
      }

    } catch (error) {
      console.error('Error processing email queue:', error);
    }

    return processed;
  }

  /**
   * Test SMTP connection
   */
  async testConnection(config: SmtpConfig): Promise<boolean> {
    try {
      const testTransporter = nodemailer.createTransporter({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass
        }
      });

      await testTransporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection test failed:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(accountId?: number): Promise<any> {
    let baseQuery = db.select().from(emailQueue);
    
    if (accountId) {
      baseQuery = baseQuery.where(eq(emailQueue.accountId, accountId));
    }

    const [pending, processing, sent, failed] = await Promise.all([
      db.select().from(emailQueue).where(eq(emailQueue.status, 'pending')),
      db.select().from(emailQueue).where(eq(emailQueue.status, 'processing')),
      db.select().from(emailQueue).where(eq(emailQueue.status, 'sent')),
      db.select().from(emailQueue).where(eq(emailQueue.status, 'failed'))
    ]);

    return {
      pending: pending.length,
      processing: processing.length,
      sent: sent.length,
      failed: failed.length,
      total: pending.length + processing.length + sent.length + failed.length
    };
  }

  /**
   * Find or create email thread
   */
  private async findOrCreateThread(accountId: number, subject: string, content: EmailContent): Promise<number> {
    const normalizedSubject = this.normalizeSubject(subject);
    
    // Look for existing thread
    const existingThread = await db.select().from(emailThreads)
      .where(and(
        eq(emailThreads.accountId, accountId),
        eq(emailThreads.subject, normalizedSubject)
      ))
      .orderBy(desc(emailThreads.lastMessageAt))
      .limit(1);

    if (existingThread.length > 0) {
      // Update thread
      await db.update(emailThreads)
        .set({
          lastMessageAt: new Date(),
          messageCount: existingThread[0].messageCount + 1,
          updatedAt: new Date()
        })
        .where(eq(emailThreads.id, existingThread[0].id));
      
      return existingThread[0].id;
    } else {
      // Create new thread
      const participants = [...content.to, ...(content.cc || [])];
      const [newThread] = await db.insert(emailThreads).values({
        accountId,
        subject: normalizedSubject,
        participants,
        lastMessageAt: new Date(),
        messageCount: 1
      }).returning();

      return newThread.id;
    }
  }

  /**
   * Normalize subject for threading
   */
  private normalizeSubject(subject: string): string {
    return subject
      .replace(/^(Re|RE|Fwd|FWD|Fw|FW):\s*/gi, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Get account email address
   */
  private async getAccountEmail(accountId: number): Promise<string> {
    const [account] = await db.select().from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);
    
    return account?.emailAddress || '';
  }

  /**
   * Update account sending statistics
   */
  private async updateAccountStats(accountId: number, type: 'sent' | 'received'): Promise<void> {
    const updateField = type === 'sent' ? 'sentCount' : 'receivedCount';
    
    await db.update(emailAccounts)
      .set({
        [updateField]: db.select().from(emailAccounts).where(eq(emailAccounts.id, accountId)),
        lastDeliveryStatus: 'success',
        lastDeliveryAt: new Date()
      })
      .where(eq(emailAccounts.id, accountId));
  }

  /**
   * Create draft email
   */
  async createDraft(accountId: number, content: Partial<EmailContent>): Promise<number> {
    const threadId = content.subject ? 
      await this.findOrCreateThread(accountId, content.subject, content as EmailContent) : 
      null;

    const [message] = await db.insert(emailMessages).values({
      threadId,
      accountId,
      senderEmail: await this.getAccountEmail(accountId),
      recipients: content.to || [],
      ccRecipients: content.cc || [],
      bccRecipients: content.bcc || [],
      subject: content.subject || 'Draft',
      content: content.html || '',
      plainTextContent: content.text || '',
      isDraft: true,
      isSent: false,
      queueStatus: 'none'
    }).returning();

    return message.id;
  }

  /**
   * Send draft email
   */
  async sendDraft(messageId: number, priority = 5): Promise<number> {
    // Get the draft message
    const [message] = await db.select().from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message || !message.isDraft) {
      throw new Error('Draft message not found');
    }

    // Convert to email content
    const content: EmailContent = {
      to: message.recipients,
      cc: message.ccRecipients || undefined,
      bcc: message.bccRecipients || undefined,
      subject: message.subject,
      html: message.content,
      text: message.plainTextContent || undefined
    };

    // Update message status
    await db.update(emailMessages)
      .set({
        isDraft: false,
        queueStatus: 'pending',
        queuedAt: new Date()
      })
      .where(eq(emailMessages.id, messageId));

    // Add to queue
    const [queueItem] = await db.insert(emailQueue).values({
      accountId: message.accountId,
      messageId: message.id,
      priority,
      status: 'pending',
      deliveryData: content
    }).returning();

    return queueItem.id;
  }
}