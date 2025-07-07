import { and, eq, desc, sql, count, or, isNull } from "drizzle-orm";
import { db } from "../db.js";
import {
  emailAccounts,
  emailThreads,
  emailMessages,
  emailFolders,
  emailAttachments,
  users,
  projects,
  type EmailAccount,
  type InsertEmailMessage,
  type EmailMessage,
  type EmailThread,
  type InsertEmailThread,
} from "../../shared/schema.js";
import { sendEmail } from "./sendgridService.js";

export class StandaloneEmailService {
  /**
   * Send an email within the BackstageOS system
   */
  async sendInternalEmail(
    fromAccountId: number,
    toAddresses: string[],
    subject: string,
    content: string,
    htmlContent?: string,
    ccAddresses?: string[],
    bccAddresses?: string[],
    replyToMessageId?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Get sender account info
      const fromAccount = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, fromAccountId))
        .limit(1);

      if (!fromAccount.length) {
        return { success: false, error: "Sender account not found" };
      }

      const sender = fromAccount[0];

      // Find or create thread
      let threadId: number;
      if (replyToMessageId) {
        // Find existing thread from the replied message
        const replyMessage = await db
          .select({ threadId: emailMessages.threadId })
          .from(emailMessages)
          .where(eq(emailMessages.id, parseInt(replyToMessageId)))
          .limit(1);

        if (replyMessage.length && replyMessage[0].threadId) {
          threadId = replyMessage[0].threadId;
        } else {
          // Create new thread if reply message doesn't have one
          threadId = await this.createThread(subject, [sender.emailAddress, ...toAddresses], sender.id);
        }
      } else {
        // Create new thread for new conversation
        threadId = await this.createThread(subject, [sender.emailAddress, ...toAddresses], sender.id);
      }

      // Generate unique message ID
      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@backstageos.com`;

      // Create the outgoing message for sender
      const outgoingMessage: InsertEmailMessage = {
        accountId: fromAccountId,
        threadId,
        messageId,
        subject,
        fromAddress: sender.emailAddress,
        toAddresses: toAddresses,
        ccAddresses: ccAddresses || [],
        bccAddresses: bccAddresses || [],
        content,
        htmlContent: content,
        isRead: true, // Sender's copy is automatically read
        isDraft: false,
        isSent: true,
        dateSent: new Date(),
      };

      const [sentMessage] = await db.insert(emailMessages).values(outgoingMessage).returning();

      // Send to external recipients via SendGrid if they're not @backstageos.com addresses
      console.log('📤 Processing recipients for external delivery:', toAddresses);
      for (const toAddress of toAddresses) {
        if (!toAddress.endsWith('@backstageos.com')) {
          console.log(`🌐 Sending external email to: ${toAddress}`);
          try {
            await sendEmail({
              to: [toAddress],
              subject,
              html: htmlContent || content,
              text: content,
              from: {
                email: sender.emailAddress,
                name: sender.displayName
              }
            });
            console.log(`✅ Successfully queued external email to: ${toAddress}`);
          } catch (error) {
            console.error(`❌ Failed to send external email to ${toAddress}:`, error);
            throw error;
          }
        } else {
          console.log(`🏠 Internal BackstageOS recipient: ${toAddress} (will handle internally)`);
        }
      }

      // Handle CC addresses
      if (ccAddresses) {
        for (const ccAddress of ccAddresses) {
          if (!ccAddress.endsWith('@backstageos.com')) {
            await sendEmail({
              to: [ccAddress],
              subject,
              html: htmlContent || content,
              text: content,
              from: {
                email: sender.emailAddress,
                name: sender.displayName
              }
            });
          }
        }
      }

      // Create incoming messages for BackstageOS recipients
      const backstageRecipients = [
        ...toAddresses.filter(addr => addr.endsWith('@backstageos.com')),
        ...(ccAddresses || []).filter(addr => addr.endsWith('@backstageos.com'))
      ];

      for (const recipientAddress of backstageRecipients) {
        // Find recipient account
        const recipientAccount = await db
          .select()
          .from(emailAccounts)
          .where(eq(emailAccounts.emailAddress, recipientAddress))
          .limit(1);

        if (recipientAccount.length) {
          const recipient = recipientAccount[0];
          
          // Get inbox folder for recipient
          const inboxFolder = await db
            .select()
            .from(emailFolders)
            .where(
              and(
                eq(emailFolders.accountId, recipient.id),
                eq(emailFolders.name, 'Inbox')
              )
            )
            .limit(1);

          const incomingMessage: InsertEmailMessage = {
            accountId: recipient.id,
            threadId,
            messageId: `${messageId}-to-${recipient.id}`,
            subject,
            fromAddress: sender.emailAddress,
            toAddresses: [recipientAddress],
            ccAddresses: ccAddresses || [],
            bccAddresses: bccAddresses || [],
            content,
            htmlContent: content,
            isRead: false,
            isDraft: false,
            isSent: false,
            dateSent: new Date(),
            folderId: inboxFolder.length ? inboxFolder[0].id : null,
          };

          await db.insert(emailMessages).values(incomingMessage);
        }
      }

      return { success: true, messageId: sentMessage.id };
    } catch (error) {
      console.error('Error sending internal email:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  /**
   * Create a new email thread
   */
  private async createThread(subject: string, participants: string[], accountId: number): Promise<number> {
    const threadData: InsertEmailThread = {
      accountId,
      subject,
      participants,
      lastMessageAt: new Date(),
      messageCount: 1,
      isRead: false,
    };

    const [thread] = await db.insert(emailThreads).values(threadData).returning();
    return thread.id;
  }

  /**
   * Get inbox messages for an account
   */
  async getInboxMessages(accountId: number, limit = 50, offset = 0): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.isDraft, false),
          or(
            isNull(emailMessages.folderId),
            sql`EXISTS (SELECT 1 FROM ${emailFolders} WHERE ${emailFolders.id} = ${emailMessages.folderId} AND ${emailFolders.name} = 'Inbox')`
          )
        )
      )
      .orderBy(desc(emailMessages.dateSent))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get sent messages for an account
   */
  async getSentMessages(accountId: number, limit = 50, offset = 0): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.isSent, true)
        )
      )
      .orderBy(desc(emailMessages.dateSent))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get draft messages for an account
   */
  async getDraftMessages(accountId: number): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.isDraft, true)
        )
      )
      .orderBy(desc(emailMessages.updatedAt));
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: number, accountId: number): Promise<boolean> {
    try {
      await db
        .update(emailMessages)
        .set({ isRead: true, updatedAt: new Date() })
        .where(
          and(
            eq(emailMessages.id, messageId),
            eq(emailMessages.accountId, accountId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: number, accountId: number): Promise<boolean> {
    try {
      await db
        .delete(emailMessages)
        .where(
          and(
            eq(emailMessages.id, messageId),
            eq(emailMessages.accountId, accountId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Save draft message
   */
  async saveDraft(
    accountId: number,
    toAddresses: string[],
    subject: string,
    content: string,
    htmlContent?: string,
    ccAddresses?: string[],
    bccAddresses?: string[],
    draftId?: number
  ): Promise<{ success: boolean; draftId?: number }> {
    try {
      const messageId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@backstageos.com`;
      
      const draftData: InsertEmailMessage = {
        accountId,
        threadId: null, // Will be filled when sending
        messageId,
        subject,
        fromAddress: '', // Will be filled when sending
        toAddresses: toAddresses,
        ccAddresses: ccAddresses || [],
        bccAddresses: bccAddresses || [],
        content,
        isRead: true,
        isDraft: true,
        isSent: false,
        dateSent: new Date(),
      };

      if (draftId) {
        // Update existing draft
        await db
          .update(emailMessages)
          .set({ ...draftData, updatedAt: new Date() })
          .where(
            and(
              eq(emailMessages.id, draftId),
              eq(emailMessages.accountId, accountId),
              eq(emailMessages.isDraft, true)
            )
          );
        return { success: true, draftId };
      } else {
        // Create new draft
        const [draft] = await db.insert(emailMessages).values(draftData).returning();
        return { success: true, draftId: draft.id };
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      return { success: false };
    }
  }

  /**
   * Get thread messages
   */
  async getThreadMessages(threadId: number, accountId: number): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.threadId, threadId),
          eq(emailMessages.accountId, accountId)
        )
      )
      .orderBy(emailMessages.dateSent);
  }

  /**
   * Search messages
   */
  async searchMessages(
    accountId: number,
    query: string,
    limit = 50
  ): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          or(
            sql`${emailMessages.subject} ILIKE ${`%${query}%`}`,
            sql`${emailMessages.content} ILIKE ${`%${query}%`}`,
            sql`${emailMessages.fromAddress} ILIKE ${`%${query}%`}`
          )
        )
      )
      .orderBy(desc(emailMessages.dateSent))
      .limit(limit);
  }
}

export const standaloneEmailService = new StandaloneEmailService();