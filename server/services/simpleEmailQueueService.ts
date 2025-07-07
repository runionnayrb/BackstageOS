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
    
    console.log(`📬 Email queued with job ID: ${jobId}`);
    
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
    console.log(`🔄 Processing ${this.queue.length} emails in queue`);

    while (this.queue.length > 0) {
      const emailJob = this.queue.shift();
      if (emailJob) {
        try {
          console.log(`📤 Sending email: ${emailJob.subject} to ${emailJob.to.join(', ')}`);
          
          // Send the email using the email service
          await this.emailService.sendEmail(emailJob.accountId, {
            to: emailJob.to,
            cc: emailJob.cc,
            bcc: emailJob.bcc,
            subject: emailJob.subject,
            message: emailJob.message,
            replyTo: emailJob.replyTo,
          });
          
          console.log(`✅ Email sent successfully: ${emailJob.subject}`);
          
        } catch (error) {
          console.error(`❌ Failed to send email: ${emailJob.subject}`, error);
        }
      }
    }

    this.processing = false;
    console.log(`✅ Queue processing complete`);
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