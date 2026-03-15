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
    toAddressesInput: string | string[],
    subject: string,
    content: string,
    htmlContent?: string,
    ccAddressesInput?: string | string[],
    bccAddressesInput?: string | string[],
    replyToMessageId?: string
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Convert string inputs to arrays by splitting on commas
      const toAddresses = typeof toAddressesInput === 'string' 
        ? toAddressesInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
        : toAddressesInput;
      
      const ccAddresses = ccAddressesInput 
        ? (typeof ccAddressesInput === 'string' 
          ? ccAddressesInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
          : ccAddressesInput)
        : undefined;
        
      const bccAddresses = bccAddressesInput 
        ? (typeof bccAddressesInput === 'string' 
          ? bccAddressesInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
          : bccAddressesInput)
        : undefined;

      console.log('🔍 DEBUG - Processed email addresses:', {
        toAddressesInput,
        toAddresses,
        ccAddressesInput,
        ccAddresses,
        bccAddressesInput,
        bccAddresses
      });
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

      // Create the outgoing message for sender with safe array handling
      const safeOutgoingToAddresses = Array.isArray(toAddresses) ? toAddresses : [toAddresses];
      const safeOutgoingCcAddresses = ccAddresses ? (Array.isArray(ccAddresses) ? ccAddresses : [ccAddresses]) : [];
      const safeOutgoingBccAddresses = bccAddresses ? (Array.isArray(bccAddresses) ? bccAddresses : [bccAddresses]) : [];
      const safeOutgoingLabels = ['sent'];
      const safeOutgoingMessageReferences: string[] = [];

      const outgoingMessage: InsertEmailMessage = {
        accountId: fromAccountId,
        threadId,
        messageId,
        subject,
        fromAddress: sender.emailAddress,
        toAddresses: safeOutgoingToAddresses,
        ccAddresses: safeOutgoingCcAddresses,
        bccAddresses: safeOutgoingBccAddresses,
        content,
        htmlContent: content,
        isRead: true, // Sender's copy is automatically read
        isDraft: false,
        isSent: true,
        dateSent: new Date(),
        labels: safeOutgoingLabels,
        messageReferences: safeOutgoingMessageReferences,
      };

      console.log('DEBUG - Outgoing message data before database insert:', {
        toAddresses: outgoingMessage.toAddresses,
        toAddressesIsArray: Array.isArray(outgoingMessage.toAddresses),
        ccAddresses: outgoingMessage.ccAddresses,
        ccAddressesIsArray: Array.isArray(outgoingMessage.ccAddresses),
        bccAddresses: outgoingMessage.bccAddresses,
        bccAddressesIsArray: Array.isArray(outgoingMessage.bccAddresses),
        labels: outgoingMessage.labels,
        labelsIsArray: Array.isArray(outgoingMessage.labels),
        messageReferences: outgoingMessage.messageReferences,
        messageReferencesIsArray: Array.isArray(outgoingMessage.messageReferences)
      });

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

          // Ensure all array fields are properly formatted
          const safeToAddresses = [recipientAddress];
          const safeCcAddresses = ccAddresses ? (Array.isArray(ccAddresses) ? ccAddresses : [ccAddresses]) : [];
          const safeBccAddresses = bccAddresses ? (Array.isArray(bccAddresses) ? bccAddresses : [bccAddresses]) : [];
          const safeLabels = ['inbox'];
          const safeMessageReferences: string[] = [];

          const incomingMessage: InsertEmailMessage = {
            accountId: recipient.id,
            threadId,
            messageId: `${messageId}-to-${recipient.id}`,
            subject,
            fromAddress: sender.emailAddress,
            toAddresses: safeToAddresses,
            ccAddresses: safeCcAddresses,
            bccAddresses: safeBccAddresses,
            content,
            htmlContent: content,
            isRead: false,
            isDraft: false,
            isSent: false,
            dateSent: new Date(),
            folderId: inboxFolder.length ? inboxFolder[0].id : null,
            labels: safeLabels,
            messageReferences: safeMessageReferences,
          };

          console.log('DEBUG - Final message data before database insert:', {
            toAddresses: incomingMessage.toAddresses,
            toAddressesType: typeof incomingMessage.toAddresses,
            toAddressesIsArray: Array.isArray(incomingMessage.toAddresses),
            ccAddresses: incomingMessage.ccAddresses,
            ccAddressesType: typeof incomingMessage.ccAddresses,
            ccAddressesIsArray: Array.isArray(incomingMessage.ccAddresses),
            bccAddresses: incomingMessage.bccAddresses,
            labels: incomingMessage.labels,
            labelsType: typeof incomingMessage.labels,
            labelsIsArray: Array.isArray(incomingMessage.labels),
            messageReferences: incomingMessage.messageReferences,
            messageReferencesType: typeof incomingMessage.messageReferences,
            messageReferencesIsArray: Array.isArray(incomingMessage.messageReferences)
          });

          await db.insert(emailMessages).values(incomingMessage);
        }
      }

      return { success: true, messageId: sentMessage.id };
    } catch (error) {
      console.error('Error sending internal email:', error);
      
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      // Return specific error message for 400 status
      let errorMessage = 'Failed to send email';
      if (error instanceof Error) {
        if (error.message.includes('Invalid email')) {
          errorMessage = 'Invalid email address format';
        } else if (error.message.includes('unauthorized')) {
          errorMessage = 'Email service not authorized';
        } else if (error.message.includes('SendGrid')) {
          errorMessage = `Email delivery issue: ${error.message}`;
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send an email with file attachments within the BackstageOS system
   */
  async sendInternalEmailWithAttachments(
    fromAccountId: number,
    toAddressesInput: string | string[],
    subject: string,
    content: string,
    htmlContent?: string,
    ccAddressesInput?: string | string[],
    bccAddressesInput?: string | string[],
    threadId?: number,
    attachments?: Array<{
      filename: string;
      path: string;
      size: number;
      mimetype: string;
    }>
  ): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      // Convert string inputs to arrays by splitting on commas
      const toAddresses = typeof toAddressesInput === 'string' 
        ? toAddressesInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
        : toAddressesInput;
      
      const ccAddresses = ccAddressesInput 
        ? (typeof ccAddressesInput === 'string' 
          ? ccAddressesInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
          : ccAddressesInput)
        : undefined;
        
      const bccAddresses = bccAddressesInput 
        ? (typeof bccAddressesInput === 'string' 
          ? bccAddressesInput.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
          : bccAddressesInput)
        : undefined;

      console.log('📎 DEBUG - Processing email with attachments:', {
        toAddresses,
        attachments: attachments?.length || 0,
        files: attachments?.map(a => ({ name: a.filename, size: a.size }))
      });

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

      // Use provided threadId or create new thread
      let finalThreadId: number;
      if (threadId) {
        finalThreadId = threadId;
      } else {
        // Create new thread for new conversation
        finalThreadId = await this.createThread(subject, [sender.emailAddress, ...toAddresses], sender.id);
      }

      // Generate unique message ID
      const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@backstageos.com`;

      // Create the outgoing message for sender with safe array handling
      const safeOutgoingToAddresses = Array.isArray(toAddresses) ? toAddresses : [toAddresses];
      const safeOutgoingCcAddresses = ccAddresses ? (Array.isArray(ccAddresses) ? ccAddresses : [ccAddresses]) : [];
      const safeOutgoingBccAddresses = bccAddresses ? (Array.isArray(bccAddresses) ? bccAddresses : [bccAddresses]) : [];
      const safeOutgoingLabels = ['sent'];
      const safeOutgoingMessageReferences: string[] = [];

      // Get sender's sent folder
      const sentFolder = await db
        .select()
        .from(emailFolders)
        .where(
          and(
            eq(emailFolders.accountId, sender.id),
            eq(emailFolders.name, 'Sent')
          )
        )
        .limit(1);

      const outgoingMessage: InsertEmailMessage = {
        accountId: sender.id,
        threadId: finalThreadId,
        messageId,
        subject,
        fromAddress: sender.emailAddress,
        toAddresses: safeOutgoingToAddresses,
        ccAddresses: safeOutgoingCcAddresses,
        bccAddresses: safeOutgoingBccAddresses,
        content,
        htmlContent: htmlContent || content,
        isRead: true,
        isDraft: false,
        isSent: true,
        dateSent: new Date(),
        folderId: sentFolder.length ? sentFolder[0].id : null,
        labels: safeOutgoingLabels,
        messageReferences: safeOutgoingMessageReferences,
      };

      const [sentMessage] = await db.insert(emailMessages).values(outgoingMessage).returning();

      // Store attachments in database if any
      if (attachments && attachments.length > 0) {
        const attachmentData = attachments.map(file => ({
          messageId: sentMessage.id,
          filename: file.filename,
          fileSize: file.size,
          contentType: file.mimetype,
          filePath: file.path // Store the file path for now
        }));

        await db.insert(emailAttachments).values(attachmentData);
        console.log('📎 Stored', attachments.length, 'attachments in database');
      }

      // Separate internal and external recipients
      const internalAddresses = [];
      const externalAddresses = [];

      for (const address of toAddresses) {
        if (address.endsWith('@backstageos.com')) {
          internalAddresses.push(address);
        } else {
          externalAddresses.push(address);
        }
      }

      console.log('📧 Delivery split:', { internal: internalAddresses.length, external: externalAddresses.length });

      // Handle internal delivery
      for (const recipientAddress of internalAddresses) {
        const recipient = await db
          .select()
          .from(emailAccounts)
          .where(eq(emailAccounts.emailAddress, recipientAddress))
          .limit(1);

        if (recipient.length) {
          // Get recipient's inbox folder
          const inboxFolder = await db
            .select()
            .from(emailFolders)
            .where(
              and(
                eq(emailFolders.accountId, recipient[0].id),
                eq(emailFolders.name, 'Inbox')
              )
            )
            .limit(1);

          const safeToAddresses = [recipientAddress];
          const safeCcAddresses = ccAddresses ? (Array.isArray(ccAddresses) ? ccAddresses : [ccAddresses]) : [];
          const safeBccAddresses = bccAddresses ? (Array.isArray(bccAddresses) ? bccAddresses : [bccAddresses]) : [];
          const safeLabels = ['inbox'];
          const safeMessageReferences: string[] = [];

          const incomingMessage: InsertEmailMessage = {
            accountId: recipient[0].id,
            threadId: finalThreadId,
            messageId: `${messageId}-to-${recipient[0].id}`,
            subject,
            fromAddress: sender.emailAddress,
            toAddresses: safeToAddresses,
            ccAddresses: safeCcAddresses,
            bccAddresses: safeBccAddresses,
            content,
            htmlContent: htmlContent || content,
            isRead: false,
            isDraft: false,
            isSent: false,
            dateSent: new Date(),
            folderId: inboxFolder.length ? inboxFolder[0].id : null,
            labels: safeLabels,
            messageReferences: safeMessageReferences,
          };

          const [incomingMsg] = await db.insert(emailMessages).values(incomingMessage).returning();

          // Copy attachments for the recipient
          if (attachments && attachments.length > 0) {
            const recipientAttachmentData = attachments.map(file => ({
              messageId: incomingMsg.id,
              filename: file.filename,
              fileSize: file.size,
              contentType: file.mimetype,
              filePath: file.path
            }));

            await db.insert(emailAttachments).values(recipientAttachmentData);
          }
        }
      }

      // Handle external delivery via SendGrid
      if (externalAddresses.length > 0) {
        console.log('📤 Sending to external addresses via SendGrid:', externalAddresses);
        
        // Prepare attachments for SendGrid
        const sendGridAttachments = attachments?.map(file => ({
          filename: file.filename,
          type: file.mimetype,
          content: require('fs').readFileSync(file.path).toString('base64')
        }));

        await sendEmail({
          to: externalAddresses,
          cc: ccAddresses,
          bcc: bccAddresses,
          from: sender.emailAddress,
          subject,
          text: content,
          html: htmlContent || content,
          attachments: sendGridAttachments
        });
        
        console.log('✅ External email sent via SendGrid with', sendGridAttachments?.length || 0, 'attachments');
      }

      return { success: true, messageId: sentMessage.id };
    } catch (error) {
      console.error('Error sending email with attachments:', error);
      return { success: false, error: 'Failed to send email with attachments' };
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
          eq(emailMessages.isSent, false), // Exclude sent messages from inbox
          // Only include emails that have 'inbox' in labels and NOT 'trash' or 'archived'
          sql`${emailMessages.labels} @> ARRAY['inbox']::text[]`,
          sql`NOT (${emailMessages.labels} @> ARRAY['trash']::text[])`,
          sql`NOT (${emailMessages.labels} @> ARRAY['archived']::text[])`
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
    const drafts = await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.isDraft, true)
        )
      )
      .orderBy(desc(emailMessages.updatedAt));
    
    // Log retrieved drafts to verify recipients are present
    console.log(`📨 getDraftMessages retrieved ${drafts.length} drafts for account ${accountId}`);
    drafts.forEach((draft, idx) => {
      console.log(`  Draft ${idx + 1}: to=${draft.toAddresses}, cc=${draft.ccAddresses}, bcc=${draft.bccAddresses}`);
    });
    
    return drafts;
  }

  /**
   * Get archived messages for an account
   */
  async getArchivedMessages(accountId: number, limit = 50, offset = 0): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.isDraft, false),
          // Only include emails that have 'archived' in labels
          sql`${emailMessages.labels} @> ARRAY['archived']::text[]`
        )
      )
      .orderBy(desc(emailMessages.dateSent))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get trash messages for an account
   */
  async getTrashMessages(accountId: number, limit = 50, offset = 0): Promise<EmailMessage[]> {
    return await db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.isDraft, false),
          // Only include emails that have 'trash' in labels
          sql`${emailMessages.labels} @> ARRAY['trash']::text[]`
        )
      )
      .orderBy(desc(emailMessages.dateSent))
      .limit(limit)
      .offset(offset);
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
   * Delete message - returns true only if a message was actually deleted
   */
  async deleteMessage(messageId: number, accountId: number): Promise<boolean> {
    try {
      // Check if the message exists first before trying to delete
      const existingMessage = await db
        .select({ id: emailMessages.id })
        .from(emailMessages)
        .where(
          and(
            eq(emailMessages.id, messageId),
            eq(emailMessages.accountId, accountId)
          )
        )
        .limit(1);
      
      if (existingMessage.length === 0) {
        return false; // Message doesn't exist locally, caller should try Gmail/Outlook
      }
      
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
    draftId?: number,
    userId?: number
  ): Promise<{ success: boolean; draftId?: number }> {
    try {
      console.log('💾 saveDraft called:', { accountId, subject, toCount: toAddresses?.length, hasHtmlContent: !!htmlContent, userId });
      
      // Ensure the virtual account exists for OAuth drafts
      if (accountId === -1) {
        const existingAccount = await db
          .select()
          .from(emailAccounts)
          .where(eq(emailAccounts.id, -1))
          .limit(1);
        
        if (!existingAccount.length) {
          console.log('📦 Creating virtual account for OAuth drafts with userId:', userId);
          await db.insert(emailAccounts).values({
            id: -1,
            userId: userId || 1, // Use provided userId or default to 1
            emailAddress: 'oauth-drafts@local',
            accountType: 'oauth',
            isActive: true,
            displayName: 'OAuth Drafts'
          });
        }
      }

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
        htmlContent: htmlContent || content, // Use htmlContent if provided, otherwise fallback to content
        isRead: true,
        isDraft: true,
        isSent: false,
        dateSent: new Date(),
        labels: ['drafts'], // Initialize with drafts label
        messageReferences: [], // Initialize as empty array
      };

      if (draftId) {
        // Update existing draft
        console.log('🔄 Updating existing draft with ID:', draftId);
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
        console.log('✅ Draft updated successfully');
        return { success: true, draftId };
      } else {
        // Create new draft
        console.log('📝 Creating new draft');
        const [draft] = await db.insert(emailMessages).values(draftData).returning();
        console.log('✅ Draft created with ID:', draft.id);
        return { success: true, draftId: draft.id };
      }
    } catch (error) {
      console.error('❌ Error saving draft:', error);
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

  /**
   * Extract original recipient from forwarded email
   */
  private extractOriginalRecipient(headers: any, subject: string, content: string): string | null {
    try {
      // Try to extract from common forwarding headers
      const originalTo = headers['x-original-to'] || headers['x-forwarded-to'] || headers['delivered-to'];
      
      if (originalTo && originalTo.includes('@backstageos.com')) {
        return originalTo;
      }
      
      // Try to extract from subject line (common forwarding patterns)
      const subjectPatterns = [
        /Fwd:\s*(.+@backstageos\.com)/i,
        /Forward:\s*(.+@backstageos\.com)/i,
        /\[(.+@backstageos\.com)\]/i,
        /To:\s*(.+@backstageos\.com)/i
      ];
      
      for (const pattern of subjectPatterns) {
        const match = subject.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // Try to extract from content (last resort)
      const contentPatterns = [
        /originally sent to[:\s]+(.+@backstageos\.com)/i,
        /to[:\s]+(.+@backstageos\.com)/i,
        /sent to[:\s]+(.+@backstageos\.com)/i
      ];
      
      for (const pattern of contentPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // Default fallback - assume it's for bryan@backstageos.com if no other recipient found
      console.log('⚠️ No original recipient found in forwarded email, defaulting to bryan@backstageos.com');
      return 'bryan@backstageos.com';
      
    } catch (error) {
      console.error('Error extracting original recipient:', error);
      return null;
    }
  }

  /**
   * Get total unread count across all user's email accounts
   */
  async getTotalUnreadCount(userId: number): Promise<number> {
    try {
      // First get all email accounts for this user
      const userAccounts = await db
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, userId));

      if (!userAccounts.length) {
        return 0;
      }

      const accountIds = userAccounts.map(account => account.id);
      
      // Count unread messages across all accounts (inbox only, not sent, not trash, not archived)
      const result = await db
        .select({ count: count() })
        .from(emailMessages)
        .where(
          and(
            sql`${emailMessages.accountId} IN (${sql.join(accountIds, sql`, `)})`,
            eq(emailMessages.isRead, false),
            eq(emailMessages.isSent, false), // Exclude sent messages
            eq(emailMessages.isDraft, false), // Exclude drafts
            sql`NOT (${emailMessages.labels} @> ${sql.raw("'{\"trash\"}'")})`, // Exclude trash messages
            sql`NOT (${emailMessages.labels} @> ${sql.raw("'{\"archived\"}'")})`, // Exclude archived messages
            sql`${emailMessages.labels} @> ${sql.raw("'{\"inbox\"}'")}`  // Only include inbox messages
          )
        );

      return result[0]?.count ? parseInt(result[0].count.toString()) : 0;
    } catch (error) {
      console.error('Error getting total unread count:', error);
      return 0;
    }
  }

  /**
   * Process incoming email from Cloudflare webhook
   */
  async processIncomingEmail(emailData: any): Promise<void> {
    try {
      console.log('📧 Processing incoming email:', emailData);
      
      // Extract email details from Cloudflare webhook payload
      const { 
        to, 
        from, 
        subject, 
        text, 
        html,
        content, 
        headers = {},
        message_id,
        date,
        timestamp 
      } = emailData;
      
      // Use text field from Cloudflare worker, fallback to content or html
      const emailContent = text || content || html || '';
      const emailHtml = html || content || text || '';
      
      // Handle internal webhook forwarding
      let recipientEmail = Array.isArray(to) ? to[0] : to;
      
      // Special handling for internal forwarding via webhook-trigger@backstageos.com
      if (recipientEmail === 'webhook-trigger@backstageos.com') {
        console.log('🔄 Processing internal webhook forwarding');
        
        // Extract original recipient from headers or subject
        const originalRecipient = this.extractOriginalRecipient(headers, subject, content);
        
        if (originalRecipient) {
          console.log(`📧 Routing to original recipient: ${originalRecipient}`);
          recipientEmail = originalRecipient;
        } else {
          console.log('❌ Could not determine original recipient from forwarded email');
          return;
        }
      }
      
      // Find the email account that should receive this email
      const [account] = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.emailAddress, recipientEmail))
        .limit(1);
      
      if (!account) {
        console.log(`❌ No account found for ${recipientEmail}`);
        return;
      }
      
      // Create or find thread for this email
      let thread;
      const threadSubject = subject || 'No Subject';
      const [existingThread] = await db
        .select()
        .from(emailThreads)
        .where(
          and(
            eq(emailThreads.accountId, account.id),
            eq(emailThreads.subject, threadSubject)
          )
        )
        .limit(1);
      
      if (existingThread) {
        thread = existingThread;
      } else {
        const [newThread] = await db
          .insert(emailThreads)
          .values({
            accountId: account.id,
            subject: threadSubject,
            participantCount: 1,
            messageCount: 1,
            lastMessageAt: new Date(date || Date.now()),
            isRead: false,
            isStarred: false,
            isImportant: false,
            labels: [],
            relatedShowId: null,
            relatedContactId: null,
          })
          .returning();
        thread = newThread;
      }
      
      // Create the email message with safe array handling
      const safeToAddresses = Array.isArray(to) ? to : [to];
      const safeCcAddresses = headers.cc ? (Array.isArray(headers.cc) ? headers.cc : [headers.cc]) : [];
      const safeBccAddresses: string[] = [];
      const safeLabels = ['inbox'];
      const safeMessageReferences: string[] = [];

      const messageData = {
        accountId: account.id,
        threadId: thread.id,
        messageId: message_id || `incoming-${Date.now()}`,
        subject: subject || 'No Subject',
        fromAddress: from,
        toAddresses: safeToAddresses,
        ccAddresses: safeCcAddresses,
        bccAddresses: safeBccAddresses,
        content: emailContent,
        htmlContent: emailHtml,
        isRead: false,
        isDraft: false,
        isSent: false,
        isStarred: false,
        isImportant: false,
        hasAttachments: false,
        dateSent: new Date(date || Date.now()),
        dateReceived: new Date(),
        folderId: null,
        labels: safeLabels,
        priority: 'normal',
        replyTo: from,
        inReplyTo: headers['in-reply-to'] || null,
        messageReferences: safeMessageReferences,
        sizeBytes: emailContent ? emailContent.length : 0,
        relatedShowId: null,
        relatedContactId: null,
      };
      
      await db.insert(emailMessages).values(messageData);
      
      // Update thread with latest message info
      await db
        .update(emailThreads)
        .set({
          messageCount: thread.messageCount + 1,
          lastMessageAt: new Date(),
          isRead: false,
        })
        .where(eq(emailThreads.id, thread.id));
      
      console.log(`✅ Email processed and stored for ${recipientEmail}`);
      
    } catch (error) {
      console.error('❌ Error processing incoming email:', error);
      throw error;
    }
  }

  /**
   * Bulk mark messages as read
   */
  async bulkMarkAsRead(messageIds: number[], accountId: number): Promise<{ updated: number }> {
    try {
      const result = await db
        .update(emailMessages)
        .set({ isRead: true })
        .where(
          and(
            sql`${emailMessages.id} IN (${sql.join(messageIds, sql`, `)})`,
            eq(emailMessages.accountId, accountId)
          )
        );
      
      return { updated: messageIds.length };
    } catch (error) {
      console.error('Error bulk marking as read:', error);
      throw error;
    }
  }

  /**
   * Bulk mark messages as unread
   */
  async bulkMarkAsUnread(messageIds: number[], accountId: number): Promise<{ updated: number }> {
    try {
      const result = await db
        .update(emailMessages)
        .set({ isRead: false })
        .where(
          and(
            sql`${emailMessages.id} IN (${sql.join(messageIds, sql`, `)})`,
            eq(emailMessages.accountId, accountId)
          )
        );
      
      return { updated: messageIds.length };
    } catch (error) {
      console.error('Error bulk marking as unread:', error);
      throw error;
    }
  }

  /**
   * Bulk delete messages (move to trash)
   */
  async bulkDelete(messageIds: number[], accountId: number): Promise<{ deleted: number }> {
    try {
      const result = await db
        .update(emailMessages)
        .set({ 
          labels: sql`ARRAY['trash']::text[]`
        })
        .where(
          and(
            sql`${emailMessages.id} IN (${sql.join(messageIds, sql`, `)})`,
            eq(emailMessages.accountId, accountId)
          )
        );
      
      return { deleted: messageIds.length };
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
      throw error;
    }
  }

  /**
   * Bulk archive messages
   */
  async bulkArchive(messageIds: number[], accountId: number): Promise<{ archived: number }> {
    try {
      const result = await db
        .update(emailMessages)
        .set({ 
          labels: sql`ARRAY['archived']::text[]`
        })
        .where(
          and(
            sql`${emailMessages.id} IN (${sql.join(messageIds, sql`, `)})`,
            eq(emailMessages.accountId, accountId)
          )
        );
      
      return { archived: messageIds.length };
    } catch (error) {
      console.error('Error bulk archiving messages:', error);
      throw error;
    }
  }

  /**
   * Bulk move messages to folder
   */
  async bulkMove(messageIds: number[], accountId: number, targetFolder: string): Promise<{ moved: number }> {
    try {
      const result = await db
        .update(emailMessages)
        .set({ 
          labels: sql`ARRAY[${targetFolder}]::text[]`
        })
        .where(
          and(
            sql`${emailMessages.id} IN (${sql.join(messageIds, sql`, `)})`,
            eq(emailMessages.accountId, accountId)
          )
        );
      
      return { moved: messageIds.length };
    } catch (error) {
      console.error('Error bulk moving messages:', error);
      throw error;
    }
  }
}

export const standaloneEmailService = new StandaloneEmailService();