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
}