import { EmailService } from './emailService.js';

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

export class SimpleEmailQueueService {
  private emailService: EmailService;
  private queue: EmailJob[] = [];
  private processing: boolean = false;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Queue an email for processing
   */
  async queueEmail(emailData: EmailJob): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add to queue
    this.queue.push(emailData);
    
    // Process immediately (or could be done in background)
    this.processQueue();
    
    return jobId;
  }

  /**
   * Process the email queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const emailJob = this.queue.shift();
      if (emailJob) {
        try {
          // Send the email using SendGrid directly (skip SMTP configuration)
          const { sendEmail } = await import('./sendgridService.js');
          
          // Get account details for from address
          const account = await this.emailService.getEmailAccountById(emailJob.accountId);
          if (!account) {
            throw new Error(`Email account ${emailJob.accountId} not found`);
          }
          
          await sendEmail({
            to: emailJob.to,
            cc: emailJob.cc,
            bcc: emailJob.bcc,
            subject: emailJob.subject,
            html: emailJob.message,
            from: account.emailAddress,
            replyTo: emailJob.replyTo,
          });
          
        } catch (error) {
          console.error(`Failed to send email: ${emailJob.subject}`, error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
  }> {
    return {
      pending: this.queue.length,
      processing: this.processing ? 1 : 0,
      sent: 0,
      failed: 0,
    };
  }
}

// Export singleton instance
export const simpleEmailQueueService = new SimpleEmailQueueService();