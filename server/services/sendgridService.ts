import { sendEmailWithResend } from './resendService';

interface EmailData {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from?: string | { email: string; name?: string };
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: any[];
}

export async function sendEmail(emailData: EmailData): Promise<any> {
  const fromEmail = typeof emailData.from === 'object' ? emailData.from.email : emailData.from;
  const fromName = typeof emailData.from === 'object' ? emailData.from.name : undefined;
  
  return sendEmailWithResend({
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    from: fromEmail,
    fromName: fromName
  });
}
