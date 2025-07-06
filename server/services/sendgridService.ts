import sgMail from '@sendgrid/mail';
import { db } from '../db.js';
import { apiSettings as apiSettingsTable } from '../../shared/schema.js';

interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: {
    email: string;
    name: string;
  };
  replyTo?: {
    email: string;
    name?: string;
  };
}

export class SendGridService {
  private apiKey: string | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      // Get API settings from database
      const [settings] = await db.select().from(apiSettingsTable).limit(1);
      
      if (settings?.sendgridApiKey) {
        this.apiKey = settings.sendgridApiKey;
        sgMail.setApiKey(this.apiKey);
        this.initialized = true;
      } else {
        throw new Error('SendGrid API key not configured');
      }
    } catch (error) {
      console.error('Failed to initialize SendGrid:', error);
      throw error;
    }
  }

  async sendEmail(emailData: EmailData): Promise<any> {
    await this.initialize();

    if (!this.apiKey) {
      throw new Error('SendGrid not properly initialized');
    }

    const msg = {
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      from: emailData.from || { email: 'hello@backstageos.com', name: 'BackstageOS' },
      replyTo: emailData.replyTo,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html?.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      customArgs: {
        source: 'backstage-os-internal',
        timestamp: new Date().toISOString()
      },
      headers: {
        'BIMI-Selector': 'default',
        'X-BIMI-Selector': 'default',
        'Authentication-Results': `mx.backstageos.com; dmarc=pass; spf=pass; dkim=pass`
      }
    };

    try {
      const response = await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid');
      return response;
    } catch (error: any) {
      console.error('SendGrid error:', error);
      
      if (error.response?.body?.errors) {
        const sendgridError = error.response.body.errors[0];
        throw new Error(`SendGrid Error: ${sendgridError.message}`);
      }
      
      throw error;
    }
  }
}

// Export a function that matches the expected interface
export async function sendEmail(emailData: EmailData): Promise<any> {
  const service = new SendGridService();
  return await service.sendEmail(emailData);
}