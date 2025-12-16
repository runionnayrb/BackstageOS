import { db } from '../db.js';
import { emailAccounts, emailMessages, emailForwardingRules, users } from '../../shared/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { sendEmail } from './sendgridService.js';

export interface ForwardingRule {
  id: number;
  userId: number;
  accountId: number;
  forwardToEmail: string;
  isActive: boolean;
  forwardIncoming: boolean;
  forwardOutgoing: boolean;
  keepOriginal: boolean;
}

export class EmailForwardingService {
  /**
   * Create a forwarding rule for a user's email account
   */
  async createForwardingRule(userId: number, accountId: number, forwardToEmail: string): Promise<void> {
    // Check if forwarding rule already exists
    const existingRule = await db
      .select()
      .from(emailForwardingRules)
      .where(and(
        eq(emailForwardingRules.userId, userId),
        eq(emailForwardingRules.accountId, accountId),
        eq(emailForwardingRules.forwardToEmail, forwardToEmail)
      ))
      .limit(1);

    if (existingRule.length > 0) {
      // Update existing rule to be active
      await db
        .update(emailForwardingRules)
        .set({ 
          isActive: true,
          forwardIncoming: true,
          forwardOutgoing: false, // Don't forward outgoing by default
          keepOriginal: true
        })
        .where(eq(emailForwardingRules.id, existingRule[0].id));
    } else {
      // Create new forwarding rule
      await db
        .insert(emailForwardingRules)
        .values({
          userId,
          accountId,
          forwardToEmail,
          isActive: true,
          forwardIncoming: true,
          forwardOutgoing: false,
          keepOriginal: true
        });
    }
  }

  /**
   * Forward an incoming email to user's external email client
   */
  async forwardIncomingEmail(messageId: number): Promise<void> {
    // Get message details
    const message = await db
      .select({
        id: emailMessages.id,
        accountId: emailMessages.accountId,
        subject: emailMessages.subject,
        fromAddress: emailMessages.fromAddress,
        toAddress: emailMessages.toAddress,
        body: emailMessages.body,
        headers: emailMessages.headers,
        receivedAt: emailMessages.receivedAt
      })
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message.length) return;

    const emailMessage = message[0];

    // Get forwarding rules for this account
    const forwardingRules = await db
      .select()
      .from(emailForwardingRules)
      .where(and(
        eq(emailForwardingRules.accountId, emailMessage.accountId),
        eq(emailForwardingRules.isActive, true),
        eq(emailForwardingRules.forwardIncoming, true)
      ));

    // Forward to each configured email
    for (const rule of forwardingRules) {
      await this.sendForwardedEmail(emailMessage, rule.forwardToEmail);
    }
  }

  /**
   * Send forwarded email to external email address
   */
  private async sendForwardedEmail(originalMessage: any, forwardToEmail: string): Promise<void> {
    try {
      // Get the BackstageOS account details
      const account = await db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.id, originalMessage.accountId))
        .limit(1);

      if (!account.length) return;

      const backstageAccount = account[0];

      // Create forwarded email content
      const forwardedSubject = `[BackstageOS] ${originalMessage.subject}`;
      const forwardedBody = `
--- Forwarded from ${backstageAccount.emailAddress} ---
From: ${originalMessage.fromAddress}
To: ${originalMessage.toAddress}
Subject: ${originalMessage.subject}
Date: ${originalMessage.receivedAt}

${originalMessage.body}

---
This email was automatically forwarded from your BackstageOS account.
Reply directly to this email, and it will be sent from your BackstageOS address.
      `.trim();

      // Send using Resend via sendEmail wrapper
      await sendEmail({
        to: [forwardToEmail],
        from: backstageAccount.emailAddress,
        subject: forwardedSubject,
        html: forwardedBody.replace(/\n/g, '<br>'),
        replyTo: backstageAccount.emailAddress
      });

      console.log(`📧 Forwarded email from ${originalMessage.fromAddress} to ${forwardToEmail}`);
    } catch (error) {
      console.error('❌ Error forwarding email:', error);
    }
  }

  /**
   * Handle reply from forwarded email - send it as BackstageOS user
   */
  async handleForwardedReply(
    fromEmail: string, 
    toEmail: string, 
    subject: string, 
    body: string
  ): Promise<void> {
    // Find the forwarding rule and BackstageOS account
    const forwardingRule = await db
      .select({
        userId: emailForwardingRules.userId,
        accountId: emailForwardingRules.accountId,
        backstageEmail: emailAccounts.emailAddress
      })
      .from(emailForwardingRules)
      .innerJoin(emailAccounts, eq(emailAccounts.id, emailForwardingRules.accountId))
      .where(and(
        eq(emailForwardingRules.forwardToEmail, fromEmail),
        eq(emailForwardingRules.isActive, true)
      ))
      .limit(1);

    if (!forwardingRule.length) return;

    const rule = forwardingRule[0];

    // Clean up subject (remove [BackstageOS] prefix if present)
    let cleanSubject = subject.replace(/^\[BackstageOS\]\s*/, '');
    if (!cleanSubject.startsWith('Re:')) {
      cleanSubject = `Re: ${cleanSubject}`;
    }

    // Send email as BackstageOS user using Resend
    await sendEmail({
      to: [toEmail],
      from: rule.backstageEmail,
      subject: cleanSubject,
      html: body.replace(/\n/g, '<br>')
    });

    console.log(`📧 Sent reply from ${rule.backstageEmail} to ${toEmail}`);
  }

  /**
   * Get forwarding rules for a user
   */
  async getForwardingRules(userId: number): Promise<ForwardingRule[]> {
    return await db
      .select()
      .from(emailForwardingRules)
      .where(eq(emailForwardingRules.userId, userId));
  }

  /**
   * Update forwarding rule
   */
  async updateForwardingRule(
    ruleId: number, 
    updates: Partial<{
      isActive: boolean;
      forwardIncoming: boolean;
      forwardOutgoing: boolean;
      keepOriginal: boolean;
    }>
  ): Promise<void> {
    await db
      .update(emailForwardingRules)
      .set(updates)
      .where(eq(emailForwardingRules.id, ruleId));
  }

  /**
   * Delete forwarding rule
   */
  async deleteForwardingRule(ruleId: number): Promise<void> {
    await db
      .delete(emailForwardingRules)
      .where(eq(emailForwardingRules.id, ruleId));
  }
}

export const emailForwardingService = new EmailForwardingService();