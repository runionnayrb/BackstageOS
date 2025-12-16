import Queue from 'bull';
import { EmailService } from './emailService.js';
import { cloudflareService } from './cloudflareService.js';

interface EmailJob {
  accountId: number;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  replyTo?: string;
  messageId?: number;
  threadId?: number;
  priority?: number;
  scheduledAt?: Date;
}

interface DeliveryResult {
  messageId: number;
  success: boolean;
  deliveredAt?: Date;
  errorMessage?: string;
  bounced?: boolean;
  retryCount?: number;
}

export class EmailQueueService {
  private emailQueue: Queue.Queue<EmailJob>;
  private emailService: EmailService;

  constructor() {
    // Initialize Bull queue with Redis connection
    this.emailQueue = new Queue('email processing', {
      redis: {
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        host: process.env.REDIS_HOST || '127.0.0.1',
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,     // Keep last 50 failed jobs
        attempts: 3,          // Retry failed jobs up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.emailService = new EmailService();
    this.setupJobProcessors();
  }

  private setupJobProcessors() {
    // Process email sending jobs
    this.emailQueue.process('send-email', async (job) => {
      const { accountId, to, cc, bcc, subject, message, replyTo, messageId, threadId } = job.data;
      
      try {
        console.log(`📧 Processing email job for account ${accountId}`);
        
        // Send email via SendGrid
        const result = await this.sendEmailViaSendGrid({
          accountId,
          to,
          cc,
          bcc,
          subject,
          message,
          replyTo,
        });

        // Update message status in database
        if (messageId) {
          await this.emailService.updateMessageDeliveryStatus(messageId, {
            success: true,
            deliveredAt: new Date(),
            sendGridMessageId: result.messageId,
          });
        }

        console.log(`✅ Email sent successfully for account ${accountId}`);
        return { success: true, messageId: result.messageId };

      } catch (error) {
        console.error(`❌ Email sending failed for account ${accountId}:`, error);
        
        // Update message status with error
        if (messageId) {
          await this.emailService.updateMessageDeliveryStatus(messageId, {
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            retryCount: job.attemptsMade,
          });
        }

        throw error; // Re-throw to trigger retry mechanism
      }
    });

    // Process bounce handling
    this.emailQueue.process('handle-bounce', async (job) => {
      const { messageId, bounceReason } = job.data;
      
      try {
        await this.emailService.updateMessageDeliveryStatus(messageId, {
          success: false,
          bounced: true,
          errorMessage: bounceReason,
        });
        
        console.log(`🔄 Bounce handled for message ${messageId}`);
      } catch (error) {
        console.error(`❌ Bounce handling failed for message ${messageId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Queue an email for background sending
   */
  async queueEmail(emailData: EmailJob): Promise<string> {
    const job = await this.emailQueue.add('send-email', emailData, {
      priority: emailData.priority || 5,
      delay: emailData.scheduledAt ? emailData.scheduledAt.getTime() - Date.now() : 0,
    });

    console.log(`📬 Email queued with job ID: ${job.id}`);
    return job.id as string;
  }

  /**
   * Queue a bounce notification
   */
  async queueBounceHandler(messageId: number, bounceReason: string): Promise<string> {
    const job = await this.emailQueue.add('handle-bounce', {
      messageId,
      bounceReason,
    });

    return job.id as string;
  }

  /**
   * Send email via SendGrid with enhanced headers and tracking
   */
  private async sendEmailViaSendGrid(emailData: {
    accountId: number;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message: string;
    replyTo?: string;
  }) {
    const { sendEmail } = await import('./sendgridService.js');

    // Get account details for sender information
    const account = await this.emailService.getEmailAccountById(emailData.accountId);
    if (!account) {
      throw new Error(`Email account ${emailData.accountId} not found`);
    }

    // Generate unique message ID for tracking
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@backstageos.com>`;

    await sendEmail({
      to: emailData.to,
      cc: emailData.cc || [],
      bcc: emailData.bcc || [],
      from: {
        email: account.emailAddress,
        name: account.displayName,
      },
      replyTo: emailData.replyTo || account.emailAddress,
      subject: emailData.subject,
      html: emailData.message,
    });
    
    return {
      messageId,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.emailQueue.getWaiting();
    const active = await this.emailQueue.getActive();
    const completed = await this.emailQueue.getCompleted();
    const failed = await this.emailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };
  }

  /**
   * Get failed jobs for debugging
   */
  async getFailedJobs(limit = 10) {
    const failedJobs = await this.emailQueue.getFailed(0, limit - 1);
    return failedJobs.map(job => ({
      id: job.id,
      data: job.data,
      error: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs() {
    const failedJobs = await this.emailQueue.getFailed();
    const retryPromises = failedJobs.map(job => job.retry());
    await Promise.all(retryPromises);
    
    console.log(`🔄 Retried ${failedJobs.length} failed email jobs`);
    return failedJobs.length;
  }

  /**
   * Clean up old completed jobs
   */
  async cleanQueue() {
    await this.emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Remove jobs older than 24 hours
    await this.emailQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Remove failed jobs older than 7 days
    
    console.log('🧹 Email queue cleaned');
  }
}

// Export singleton instance
export const emailQueueService = new EmailQueueService();