import { storage } from '../storage.js';
import { 
  emailMessages, 
  emailQueue,
  InsertEmailMessage,
  EmailMessage
} from '../../shared/schema.js';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';

interface DeliveryStats {
  total: number;
  delivered: number;
  bounced: number;
  failed: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface BounceReport {
  messageId: number;
  subject: string;
  recipient: string;
  bounceType: string;
  bounceReason: string;
  bouncedAt: Date;
}

interface WebhookEvent {
  sg_message_id: string;
  event: string;
  timestamp: number;
  email: string;
  reason?: string;
  url?: string;
  ip?: string;
  useragent?: string;
  category?: string[];
}

export class EmailDeliveryService {
  /**
   * Get detailed delivery statistics with bounce and open tracking
   */
  async getDetailedDeliveryStats(
    accountId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<DeliveryStats> {
    const baseQuery = storage.db
      .select({
        total: count(),
        delivered: sql<number>`COUNT(CASE WHEN ${emailMessages.dateSent} IS NOT NULL THEN 1 END)`,
        bounced: sql<number>`COUNT(CASE WHEN ${emailMessages.priority} = 'bounced' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN ${emailMessages.priority} = 'failed' THEN 1 END)`,
        opened: sql<number>`COUNT(CASE WHEN ${emailMessages.isRead} = true THEN 1 END)`,
        clicked: sql<number>`COUNT(CASE WHEN ${emailMessages.priority} = 'clicked' THEN 1 END)`
      })
      .from(emailMessages)
      .where(eq(emailMessages.accountId, accountId));

    if (startDate) {
      baseQuery.where(and(
        eq(emailMessages.accountId, accountId),
        gte(emailMessages.dateSent, startDate)
      ));
    }

    if (endDate) {
      baseQuery.where(and(
        eq(emailMessages.accountId, accountId),
        lte(emailMessages.dateSent, endDate)
      ));
    }

    const [stats] = await baseQuery;

    const deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;
    const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
    const clickRate = stats.delivered > 0 ? (stats.clicked / stats.delivered) * 100 : 0;
    const bounceRate = stats.total > 0 ? (stats.bounced / stats.total) * 100 : 0;

    return {
      total: stats.total,
      delivered: stats.delivered,
      bounced: stats.bounced,
      failed: stats.failed,
      opened: stats.opened,
      clicked: stats.clicked,
      unsubscribed: 0, // We can add this field later
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
    };
  }

  /**
   * Get bounce reports for troubleshooting delivery issues
   */
  async getBounceReports(
    accountId: number,
    limit: number = 50,
    offset: number = 0,
    bounceType?: string
  ): Promise<BounceReport[]> {
    const query = storage.db
      .select({
        messageId: emailMessages.id,
        subject: emailMessages.subject,
        recipient: emailMessages.toAddresses,
        bounceType: emailMessages.priority, // We'll use priority field to store bounce type temporarily
        bounceReason: emailMessages.content, // Store bounce reason in content
        bouncedAt: emailMessages.dateReceived,
      })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          eq(emailMessages.priority, 'bounced')
        )
      )
      .orderBy(desc(emailMessages.dateReceived))
      .limit(limit)
      .offset(offset);

    if (bounceType) {
      query.where(and(
        eq(emailMessages.accountId, accountId),
        eq(emailMessages.priority, bounceType)
      ));
    }

    const results = await query;

    return results.map(result => ({
      messageId: result.messageId,
      subject: result.subject || '',
      recipient: Array.isArray(result.recipient) ? result.recipient[0] || '' : result.recipient || '',
      bounceType: result.bounceType || 'unknown',
      bounceReason: result.bounceReason || 'No reason provided',
      bouncedAt: result.bouncedAt || new Date(),
    }));
  }

  /**
   * Track email opens using pixel tracking
   */
  async trackEmailOpen(messageId: number, ip?: string, userAgent?: string): Promise<void> {
    try {
      // Mark message as read and log the open event
      await storage.db
        .update(emailMessages)
        .set({ 
          isRead: true,
          // We could add open tracking fields to the schema later
        })
        .where(eq(emailMessages.id, messageId));

      console.log(`📧 Email open tracked: Message ${messageId} from IP ${ip}`);
    } catch (error) {
      console.error('Error tracking email open:', error);
    }
  }

  /**
   * Track email clicks
   */
  async trackEmailClick(messageId: number, url: string, ip?: string, userAgent?: string): Promise<void> {
    try {
      // Update message to indicate it was clicked and log the click
      await storage.db
        .update(emailMessages)
        .set({ 
          priority: 'clicked', // Using priority field temporarily
          isRead: true,
        })
        .where(eq(emailMessages.id, messageId));

      console.log(`🖱️ Email click tracked: Message ${messageId} clicked ${url} from IP ${ip}`);
    } catch (error) {
      console.error('Error tracking email click:', error);
    }
  }

  /**
   * Process delivery webhooks from SendGrid
   */
  async processDeliveryWebhook(event: WebhookEvent): Promise<void> {
    try {
      const { sg_message_id, event: eventType, timestamp, email, reason, url } = event;

      // Find message by SendGrid message ID (we'd need to store this during sending)
      // For now, we'll try to find by recipient email and approximate time
      const eventDate = new Date(timestamp * 1000);
      const searchStart = new Date(eventDate.getTime() - 60000); // 1 minute before
      const searchEnd = new Date(eventDate.getTime() + 60000);   // 1 minute after

      const messages = await storage.db
        .select()
        .from(emailMessages)
        .where(
          and(
            sql`${emailMessages.toAddresses} @> ${JSON.stringify([email])}`,
            gte(emailMessages.dateSent, searchStart),
            lte(emailMessages.dateSent, searchEnd)
          )
        )
        .limit(1);

      if (messages.length === 0) {
        console.log(`⚠️ No message found for webhook event: ${eventType} for ${email}`);
        return;
      }

      const message = messages[0];
      const updates: Partial<EmailMessage> = {};

      switch (eventType) {
        case 'delivered':
          // Message was successfully delivered
          updates.dateReceived = eventDate;
          break;

        case 'bounce':
        case 'dropped':
          updates.priority = 'bounced';
          updates.content = reason || 'Message bounced';
          break;

        case 'open':
          updates.isRead = true;
          break;

        case 'click':
          updates.priority = 'clicked';
          updates.isRead = true;
          break;

        case 'unsubscribe':
          // Handle unsubscribe
          updates.priority = 'unsubscribed';
          break;

        case 'spamreport':
          updates.priority = 'spam';
          break;
      }

      if (Object.keys(updates).length > 0) {
        await storage.db
          .update(emailMessages)
          .set(updates)
          .where(eq(emailMessages.id, message.id));

        console.log(`📬 Webhook processed: ${eventType} for message ${message.id}`);
      }

    } catch (error) {
      console.error('Error processing delivery webhook:', error);
    }
  }

  /**
   * Sync message status across multiple clients
   */
  async syncMessageStatus(
    messageId: number, 
    status: { isRead?: boolean; isStarred?: boolean; isImportant?: boolean }
  ): Promise<void> {
    const updates: Partial<EmailMessage> = {};

    if (status.isRead !== undefined) {
      updates.isRead = status.isRead;
    }
    if (status.isStarred !== undefined) {
      updates.isStarred = status.isStarred;
    }
    if (status.isImportant !== undefined) {
      updates.isImportant = status.isImportant;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(emailMessages)
        .set(updates)
        .where(eq(emailMessages.id, messageId));

      console.log(`🔄 Message status synced: ${messageId}`, updates);
    }
  }

  /**
   * Get delivery timeline for a specific message
   */
  async getMessageDeliveryTimeline(messageId: number): Promise<any[]> {
    const message = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message[0]) {
      return [];
    }

    const timeline = [];
    const msg = message[0];

    if (msg.dateSent) {
      timeline.push({
        event: 'sent',
        timestamp: msg.dateSent,
        description: 'Email sent successfully'
      });
    }

    if (msg.dateReceived) {
      timeline.push({
        event: 'delivered',
        timestamp: msg.dateReceived,
        description: 'Email delivered to recipient'
      });
    }

    if (msg.isRead) {
      timeline.push({
        event: 'opened',
        timestamp: msg.dateReceived, // We'd want a separate openedAt field
        description: 'Email opened by recipient'
      });
    }

    if (msg.priority === 'clicked') {
      timeline.push({
        event: 'clicked',
        timestamp: msg.dateReceived,
        description: 'Recipient clicked a link in the email'
      });
    }

    if (msg.priority === 'bounced') {
      timeline.push({
        event: 'bounced',
        timestamp: msg.dateReceived,
        description: `Email bounced: ${msg.content}`
      });
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate delivery health score for an account
   */
  async getDeliveryHealthScore(accountId: number, days: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.getDetailedDeliveryStats(accountId, startDate);

    // Calculate health score based on delivery metrics
    let score = 100;

    // Penalize high bounce rate
    if (stats.bounceRate > 10) score -= 30;
    else if (stats.bounceRate > 5) score -= 15;
    else if (stats.bounceRate > 2) score -= 5;

    // Penalize low delivery rate
    if (stats.deliveryRate < 90) score -= 20;
    else if (stats.deliveryRate < 95) score -= 10;

    // Reward good open rates
    if (stats.openRate > 25) score += 10;
    else if (stats.openRate < 10) score -= 10;

    // Ensure score stays within bounds
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get recommendations for improving email deliverability
   */
  async getDeliverabilityRecommendations(accountId: number): Promise<string[]> {
    const stats = await this.getDetailedDeliveryStats(accountId);
    const recommendations = [];

    if (stats.bounceRate > 5) {
      recommendations.push('High bounce rate detected. Review and clean your email list.');
    }

    if (stats.openRate < 15) {
      recommendations.push('Low open rate. Consider improving subject lines and send times.');
    }

    if (stats.deliveryRate < 95) {
      recommendations.push('Poor delivery rate. Check your domain reputation and authentication settings.');
    }

    if (stats.clickRate < 2) {
      recommendations.push('Low click rate. Review email content and call-to-action placement.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your email delivery performance looks good! Keep up the good work.');
    }

    return recommendations;
  }
}