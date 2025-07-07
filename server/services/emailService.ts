import { and, eq, desc, sql, count, or } from "drizzle-orm";
import { db } from "../db.js";
import {
  emailAccounts,
  emailThreads,
  emailMessages,
  emailFolders,
  emailAttachments,
  emailRules,
  emailTemplates,
  emailSignatures,
  users,
  projects,
  type EmailAccount,
  type InsertEmailAccount,
  type EmailThread,
  type InsertEmailThread,
  type EmailMessage,
  type InsertEmailMessage,
  type EmailFolder,
  type InsertEmailFolder,
  type EmailRule,
  type InsertEmailRule,
  type EmailTemplate,
  type InsertEmailTemplate,
  type EmailSignature,
  type InsertEmailSignature,
} from "../../shared/schema.js";
import { cloudflareService } from "./cloudflareService.js";

export class EmailService {
  private cloudflareService: typeof cloudflareService;

  constructor() {
    this.cloudflareService = cloudflareService;
  }

  // ========== EMAIL ACCOUNT MANAGEMENT ==========

  /**
   * Get all email accounts for a user
   */
  async getUserEmailAccounts(userId: number): Promise<EmailAccount[]> {
    return await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId))
      .orderBy(desc(emailAccounts.isDefault), emailAccounts.emailAddress);
  }

  /**
   * Get email accounts for a specific project
   */
  async getProjectEmailAccounts(projectId: number): Promise<EmailAccount[]> {
    return await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.projectId, projectId))
      .orderBy(emailAccounts.emailAddress);
  }

  /**
   * Create a new email account
   */
  async createEmailAccount(accountData: InsertEmailAccount): Promise<EmailAccount> {
    // Generate email address if not provided
    if (!accountData.emailAddress) {
      accountData.emailAddress = await this.generateEmailAddress(accountData);
    }

    // Create Cloudflare email routing rule
    await this.createEmailRouting(accountData.emailAddress, accountData.userId);

    const [account] = await db
      .insert(emailAccounts)
      .values(accountData)
      .returning();

    // Create default folders for the account
    await this.createDefaultFolders(account.id);

    return account;
  }

  /**
   * Update an email account
   */
  async updateEmailAccount(accountId: number, updates: Partial<Pick<EmailAccount, 'displayName'>>): Promise<EmailAccount> {
    const [updatedAccount] = await db
      .update(emailAccounts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId))
      .returning();

    return updatedAccount;
  }

  /**
   * Generate email address based on account type
   */
  private async generateEmailAddress(accountData: InsertEmailAccount): Promise<string> {
    const user = await db.select().from(users).where(eq(users.id, accountData.userId)).limit(1);
    if (!user.length) throw new Error("User not found");

    const { firstName, lastName } = user[0];

    switch (accountData.accountType) {
      case 'personal':
        return `${firstName?.toLowerCase()}.${lastName?.toLowerCase()}@backstageos.com`;
      
      case 'show':
        if (accountData.projectId) {
          const project = await db.select().from(projects).where(eq(projects.id, accountData.projectId)).limit(1);
          if (project.length) {
            const showName = project[0].name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return `${showName}@backstageos.com`;
          }
        }
        break;
      
      case 'role':
        return `stage.manager@backstageos.com`;
    }

    // Fallback
    return `${firstName?.toLowerCase()}.${lastName?.toLowerCase()}@backstageos.com`;
  }

  /**
   * Create email routing rule in Cloudflare
   */
  private async createEmailRouting(emailAddress: string, userId: number): Promise<void> {
    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user.length) throw new Error("User not found");

      const destinationEmail = user[0].defaultReplyToEmail || user[0].email;
      
      await this.cloudflareService.createEmailRule({
        matchers: [{ type: "literal", field: "to", value: emailAddress }],
        actions: [{ type: "forward", value: [destinationEmail] }],
        enabled: true,
        name: `Forward ${emailAddress} to ${destinationEmail}`
      });

      console.log(`✅ Created email routing rule: ${emailAddress} → ${destinationEmail}`);
    } catch (error) {
      console.error(`❌ Failed to create email routing rule for ${emailAddress}:`, error);
      // Don't throw - continue with account creation
    }
  }

  /**
   * Create default folders for a new email account
   */
  private async createDefaultFolders(accountId: number): Promise<void> {
    const defaultFolders = [
      { name: "Inbox", folderType: "system", color: "#3b82f6" },
      { name: "Sent", folderType: "system", color: "#10b981" },
      { name: "Drafts", folderType: "system", color: "#f59e0b" },
      { name: "Trash", folderType: "system", color: "#ef4444" },
      { name: "Archive", folderType: "system", color: "#6b7280" },
    ];

    for (const folder of defaultFolders) {
      await db.insert(emailFolders).values({
        accountId,
        ...folder,
      });
    }
  }

  // ========== EMAIL THREADING ==========

  /**
   * Get email threads for an account
   */
  async getEmailThreads(accountId: number, folderId?: number): Promise<EmailThread[]> {
    let query = db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.accountId, accountId));

    if (folderId) {
      // Filter by folder through messages
      query = query
        .innerJoin(emailMessages, eq(emailThreads.id, emailMessages.threadId))
        .where(and(
          eq(emailThreads.accountId, accountId),
          eq(emailMessages.folderId, folderId)
        ));
    }

    return await query
      .orderBy(desc(emailThreads.lastMessageAt))
      .limit(50);
  }

  /**
   * Create a new email thread
   */
  async createEmailThread(threadData: InsertEmailThread): Promise<EmailThread> {
    const [thread] = await db
      .insert(emailThreads)
      .values(threadData)
      .returning();

    return thread;
  }

  // ========== EMAIL MESSAGES ==========

  /**
   * Get messages in a thread
   */
  async getThreadMessages(threadId: number): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.threadId, threadId))
      .orderBy(emailMessages.createdAt);
  }

  /**
   * Create a new email message
   */
  async createEmailMessage(messageData: InsertEmailMessage): Promise<EmailMessage> {
    const [message] = await db
      .insert(emailMessages)
      .values(messageData)
      .returning();

    // Update thread with latest message info
    await db
      .update(emailThreads)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${emailThreads.messageCount} + 1`,
      })
      .where(eq(emailThreads.id, messageData.threadId));

    return message;
  }

  /**
   * Send an email message
   */
  async sendEmailMessage(messageId: number): Promise<void> {
    const message = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message.length) throw new Error("Message not found");

    // TODO: Implement actual email sending via SendGrid
    // For now, just mark as sent
    await db
      .update(emailMessages)
      .set({
        isSent: true,
        sentAt: new Date(),
      })
      .where(eq(emailMessages.id, messageId));
  }

  // ========== EMAIL FOLDERS ==========

  /**
   * Get folders for an account
   */
  async getAccountFolders(accountId: number): Promise<EmailFolder[]> {
    return await db
      .select()
      .from(emailFolders)
      .where(eq(emailFolders.accountId, accountId))
      .orderBy(emailFolders.sortOrder, emailFolders.name);
  }

  /**
   * Create a custom folder
   */
  async createEmailFolder(folderData: InsertEmailFolder): Promise<EmailFolder> {
    const [folder] = await db
      .insert(emailFolders)
      .values(folderData)
      .returning();

    return folder;
  }

  // ========== EMAIL RULES ==========

  /**
   * Get email rules for an account
   */
  async getEmailRules(accountId: number): Promise<EmailRule[]> {
    return await db
      .select()
      .from(emailRules)
      .where(eq(emailRules.accountId, accountId))
      .orderBy(emailRules.priority, emailRules.name);
  }

  /**
   * Create an email rule
   */
  async createEmailRule(ruleData: InsertEmailRule): Promise<EmailRule> {
    const [rule] = await db
      .insert(emailRules)
      .values(ruleData)
      .returning();

    return rule;
  }

  // ========== EMAIL TEMPLATES ==========

  /**
   * Get email templates for a user/project
   */
  async getEmailTemplates(userId: number, projectId?: number): Promise<EmailTemplate[]> {
    let whereClause = eq(emailTemplates.userId, userId);
    
    if (projectId) {
      whereClause = and(whereClause, eq(emailTemplates.projectId, projectId));
    }

    return await db
      .select()
      .from(emailTemplates)
      .where(whereClause)
      .orderBy(emailTemplates.name);
  }

  /**
   * Create an email template
   */
  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values(templateData)
      .returning();

    return template;
  }

  // ========== EMAIL SIGNATURES ==========

  /**
   * Get email signatures for a user
   */
  async getEmailSignatures(userId: number): Promise<EmailSignature[]> {
    return await db
      .select()
      .from(emailSignatures)
      .where(eq(emailSignatures.userId, userId))
      .orderBy(desc(emailSignatures.isDefault), emailSignatures.name);
  }

  /**
   * Create an email signature
   */
  async createEmailSignature(signatureData: InsertEmailSignature): Promise<EmailSignature> {
    // If this is marked as default, unset any existing defaults
    if (signatureData.isDefault) {
      await db
        .update(emailSignatures)
        .set({ isDefault: false })
        .where(eq(emailSignatures.userId, signatureData.userId));
    }

    const [signature] = await db
      .insert(emailSignatures)
      .values(signatureData)
      .returning();

    return signature;
  }

  // ========== STATISTICS ==========

  /**
   * Get email statistics for an account
   */
  async getEmailStats(accountId: number): Promise<{
    totalMessages: number;
    unreadMessages: number;
    threadsCount: number;
    draftCount: number;
  }> {
    const [stats] = await db
      .select({
        totalMessages: count(emailMessages.id),
        unreadMessages: count(sql`CASE WHEN ${emailMessages.isRead} = false THEN 1 END`),
        threadsCount: count(sql`DISTINCT ${emailMessages.threadId}`),
        draftCount: count(sql`CASE WHEN ${emailMessages.isDraft} = true THEN 1 END`),
      })
      .from(emailMessages)
      .where(eq(emailMessages.accountId, accountId));

    return stats;
  }

  // ========== IMAP SYNCHRONIZATION ==========

  /**
   * Configure IMAP settings for an email account
   */
  async configureImapSettings(
    accountId: number,
    imapConfig: {
      host: string;
      port: number;
      username: string;
      password: string;
      sslEnabled?: boolean;
    }
  ): Promise<void> {
    await db
      .update(emailAccounts)
      .set({
        imapHost: imapConfig.host,
        imapPort: imapConfig.port,
        imapUsername: imapConfig.username,
        imapPassword: imapConfig.password, // In production, encrypt this
        imapSslEnabled: imapConfig.sslEnabled ?? true,
        imapEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));
  }

  /**
   * Configure SMTP settings for an email account
   */
  async configureSmtpSettings(
    accountId: number,
    smtpConfig: {
      host: string;
      port: number;
      username: string;
      password: string;
      sslEnabled?: boolean;
    }
  ): Promise<void> {
    await db
      .update(emailAccounts)
      .set({
        smtpHost: smtpConfig.host,
        smtpPort: smtpConfig.port,
        smtpUsername: smtpConfig.username,
        smtpPassword: smtpConfig.password, // In production, encrypt this
        smtpSslEnabled: smtpConfig.sslEnabled ?? true,
        smtpEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));
  }

  /**
   * Test IMAP connection for an account
   */
  async testImapConnection(accountId: number): Promise<boolean> {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account || !account.imapEnabled) {
      throw new Error('IMAP not configured for this account');
    }

    const { ImapService } = await import('./imapService.js');
    const imapService = new ImapService();

    return await imapService.testConnection({
      host: account.imapHost!,
      port: account.imapPort!,
      secure: account.imapSslEnabled!,
      auth: {
        user: account.imapUsername!,
        pass: account.imapPassword!, // In production, decrypt this
      },
    });
  }

  /**
   * Test SMTP connection for an account
   */
  async testSmtpConnection(accountId: number): Promise<boolean> {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account || !account.smtpEnabled) {
      throw new Error('SMTP not configured for this account');
    }

    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    return await smtpService.testConnection({
      host: account.smtpHost!,
      port: account.smtpPort!,
      secure: account.smtpSslEnabled!,
      auth: {
        user: account.smtpUsername!,
        pass: account.smtpPassword!, // In production, decrypt this
      },
    });
  }

  /**
   * Sync emails from IMAP for an account
   */
  async syncEmailsFromImap(accountId: number, folderName = 'INBOX', isFullSync = false): Promise<any> {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account || !account.imapEnabled) {
      throw new Error('IMAP not configured for this account');
    }

    const { ImapService } = await import('./imapService.js');
    const imapService = new ImapService();

    // Connect to IMAP
    await imapService.connect({
      host: account.imapHost!,
      port: account.imapPort!,
      secure: account.imapSslEnabled!,
      auth: {
        user: account.imapUsername!,
        pass: account.imapPassword!, // In production, decrypt this
      },
    });

    try {
      // Sync the folder
      const result = await imapService.syncFolder(accountId, folderName, isFullSync);
      return result;
    } finally {
      await imapService.disconnect();
    }
  }

  /**
   * Get IMAP folders for an account
   */
  async getImapFolders(accountId: number): Promise<any[]> {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account || !account.imapEnabled) {
      throw new Error('IMAP not configured for this account');
    }

    const { ImapService } = await import('./imapService.js');
    const imapService = new ImapService();

    await imapService.connect({
      host: account.imapHost!,
      port: account.imapPort!,
      secure: account.imapSslEnabled!,
      auth: {
        user: account.imapUsername!,
        pass: account.imapPassword!,
      },
    });

    try {
      const folders = await imapService.getFolders();
      return folders;
    } finally {
      await imapService.disconnect();
    }
  }

  // ========== EMAIL SENDING ==========

  /**
   * Send email via SMTP
   */
  async sendEmail(accountId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: any[];
  }): Promise<any> {
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    if (!account || !account.smtpEnabled) {
      throw new Error('SMTP not configured for this account');
    }

    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    await smtpService.createTransporter({
      host: account.smtpHost!,
      port: account.smtpPort!,
      secure: account.smtpSslEnabled!,
      auth: {
        user: account.smtpUsername!,
        pass: account.smtpPassword!,
      },
    });

    return await smtpService.sendEmail(accountId, emailData);
  }

  /**
   * Queue email for background sending
   */
  async queueEmail(accountId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: any[];
  }, priority = 5, scheduledAt?: Date): Promise<number> {
    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    return await smtpService.queueEmail(accountId, emailData, priority, scheduledAt);
  }

  /**
   * Process email queue
   */
  async processEmailQueue(accountId?: number): Promise<number> {
    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    return await smtpService.processQueue(accountId);
  }

  /**
   * Get email queue statistics
   */
  async getQueueStats(accountId?: number): Promise<any> {
    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    return await smtpService.getQueueStats(accountId);
  }

  /**
   * Create draft email
   */
  async createDraft(accountId: number, draftData: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    html?: string;
    text?: string;
  }): Promise<number> {
    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    return await smtpService.createDraft(accountId, draftData);
  }

  /**
   * Send draft email
   */
  async sendDraft(messageId: number, priority = 5): Promise<number> {
    const { SmtpService } = await import('./smtpService.js');
    const smtpService = new SmtpService();

    return await smtpService.sendDraft(messageId, priority);
  }

  // ========== ENHANCED EMAIL PROCESSING & DELIVERY TRACKING ==========

  /**
   * Get email account by ID
   */
  async getEmailAccountById(accountId: number): Promise<EmailAccount | null> {
    const accounts = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.id, accountId))
      .limit(1);

    return accounts[0] || null;
  }

  /**
   * Update message delivery status
   */
  async updateMessageDeliveryStatus(messageId: number, status: {
    success: boolean;
    deliveredAt?: Date;
    sendGridMessageId?: string;
    errorMessage?: string;
    bounced?: boolean;
    retryCount?: number;
  }): Promise<void> {
    const updateData: any = {
      deliveryStatus: status.success ? 'delivered' : 'failed',
      updatedAt: new Date(),
    };

    if (status.deliveredAt) updateData.deliveredAt = status.deliveredAt;
    if (status.sendGridMessageId) updateData.sendGridMessageId = status.sendGridMessageId;
    if (status.errorMessage) updateData.deliveryError = status.errorMessage;
    if (status.bounced !== undefined) updateData.bounced = status.bounced;
    if (status.retryCount !== undefined) updateData.retryCount = status.retryCount;

    await db
      .update(emailMessages)
      .set(updateData)
      .where(eq(emailMessages.id, messageId));
  }

  /**
   * Enhanced send email with queue integration
   */
  async sendEmailWithQueue(accountId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message: string;
    replyTo?: string;
    threadId?: number;
    priority?: number;
    scheduledAt?: Date;
  }): Promise<{ messageId: number; jobId: string }> {
    try {
      console.log("🔍 sendEmailWithQueue called with accountId:", accountId);
      console.log("🔍 emailData:", emailData);
      // Create email thread if not provided
      let threadId = emailData.threadId;
      console.log("🔍 Initial threadId:", threadId);
      if (!threadId) {
        console.log("🔍 Creating new email thread...");
        const thread = await this.createEmailThread({
          accountId,
          subject: emailData.subject,
          lastMessageAt: new Date(),
          messageCount: 1,
          isRead: false,
        });
        threadId = thread.id;
        console.log("✅ Email thread created with ID:", threadId);
      }

      // Get account details for fromAddress
      const account = await this.getEmailAccountById(accountId);
      if (!account) {
        throw new Error(`Email account ${accountId} not found`);
      }

      // Generate unique Message-ID for email
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      const messageId = `<${timestamp}.${randomId}@backstageos.com>`;

      // Create email message record
      const messageData: InsertEmailMessage = {
        accountId,
        threadId,
        messageId,
        subject: emailData.subject,
        fromAddress: account.emailAddress,
        toAddresses: emailData.to,
        ccAddresses: emailData.cc || [],
        bccAddresses: emailData.bcc || [],
        htmlContent: emailData.message,
        isDraft: false,
        isSent: true,
        dateSent: new Date(),
        replyTo: emailData.replyTo,
        deliveryStatus: 'pending',
      };

      console.log("🔍 About to insert email message into database...");
      const messages = await db
        .insert(emailMessages)
        .values(messageData)
        .returning();

      const message = messages[0];
      console.log("✅ Email message inserted successfully:", { id: message.id, messageId: message.messageId });

      // Queue email for background processing
      console.log("🔍 Importing emailQueueService...");
      const { emailQueueService } = await import('./emailQueueService.js');
      const jobId = await emailQueueService.queueEmail({
        accountId,
        to: emailData.to,
        cc: emailData.cc,
        bcc: emailData.bcc,
        subject: emailData.subject,
        message: emailData.message,
        replyTo: emailData.replyTo,
        messageId: message.id,
        threadId,
        priority: emailData.priority,
        scheduledAt: emailData.scheduledAt,
      });

      console.log(`📬 Email queued: Message ID ${message.id}, Job ID ${jobId}`);

      return {
        messageId: message.id,
        jobId,
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  /**
   * Move email to folder
   */
  async moveEmailToFolder(messageId: number, folderId: number): Promise<void> {
    await db
      .update(emailMessages)
      .set({
        folderId,
        updatedAt: new Date(),
      })
      .where(eq(emailMessages.id, messageId));

    console.log(`📁 Moved message ${messageId} to folder ${folderId}`);
  }

  /**
   * Archive email
   */
  async archiveEmail(messageId: number): Promise<void> {
    // Get archive folder for the account
    const message = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message[0]) {
      throw new Error('Message not found');
    }

    const archiveFolders = await db
      .select()
      .from(emailFolders)
      .where(
        and(
          eq(emailFolders.accountId, message[0].accountId),
          eq(emailFolders.name, 'Archive')
        )
      )
      .limit(1);

    if (archiveFolders[0]) {
      await this.moveEmailToFolder(messageId, archiveFolders[0].id);
    }
  }

  /**
   * Delete email (move to trash)
   */
  async deleteEmail(messageId: number): Promise<void> {
    // Get trash folder for the account
    const message = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message[0]) {
      throw new Error('Message not found');
    }

    const trashFolders = await db
      .select()
      .from(emailFolders)
      .where(
        and(
          eq(emailFolders.accountId, message[0].accountId),
          eq(emailFolders.name, 'Trash')
        )
      )
      .limit(1);

    if (trashFolders[0]) {
      await this.moveEmailToFolder(messageId, trashFolders[0].id);
    }
  }

  /**
   * Mark email as read/unread
   */
  async markEmailAsRead(messageId: number, isRead = true): Promise<void> {
    await db
      .update(emailMessages)
      .set({
        isRead,
        updatedAt: new Date(),
      })
      .where(eq(emailMessages.id, messageId));
  }

  /**
   * Get delivery statistics for an account
   */
  async getDeliveryStats(accountId: number): Promise<{
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    bounced: number;
  }> {
    const stats = await db
      .select({
        status: emailMessages.deliveryStatus,
        bounced: emailMessages.bounced,
        count: count(),
      })
      .from(emailMessages)
      .where(eq(emailMessages.accountId, accountId))
      .groupBy(emailMessages.deliveryStatus, emailMessages.bounced);

    const result = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      bounced: 0,
    };

    stats.forEach(stat => {
      const countValue = parseInt(stat.count.toString());
      result.total += countValue;

      if (stat.bounced) {
        result.bounced += countValue;
      } else {
        switch (stat.status) {
          case 'delivered':
            result.delivered += countValue;
            break;
          case 'failed':
            result.failed += countValue;
            break;
          case 'pending':
            result.pending += countValue;
            break;
        }
      }
    });

    return result;
  }

  /**
   * Get enhanced queue statistics
   */
  async getEnhancedQueueStats(): Promise<any> {
    const { emailQueueService } = await import('./emailQueueService.js');
    return await emailQueueService.getQueueStats();
  }

  /**
   * Retry failed email deliveries
   */
  async retryFailedEmails(): Promise<number> {
    const { emailQueueService } = await import('./emailQueueService.js');
    return await emailQueueService.retryFailedJobs();
  }
}