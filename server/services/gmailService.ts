import { google } from 'googleapis';

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

let cachedConnectionSettings: any = null;
let cacheExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  
  // Check cache validity
  if (cachedConnectionSettings && cacheExpiry > now) {
    return cachedConnectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('Gmail connector not available in this environment');
  }

  if (!hostname) {
    throw new Error('REPLIT_CONNECTORS_HOSTNAME not set');
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Gmail connection: ${response.statusText}`);
    }

    const data = await response.json();
    cachedConnectionSettings = data.items?.[0];

    if (!cachedConnectionSettings) {
      throw new Error('Gmail not connected. Please connect Gmail in your project settings.');
    }

    const accessToken = 
      cachedConnectionSettings?.settings?.access_token || 
      cachedConnectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!accessToken) {
      throw new Error('No access token found for Gmail');
    }

    // Cache for 50 minutes (tokens typically valid for 1 hour)
    cacheExpiry = now + (50 * 60 * 1000);
    return accessToken;
  } catch (error: any) {
    console.error('Failed to get Gmail access token:', error.message);
    throw error;
  }
}

async function getGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function createMimeMessage(emailData: EmailData): string {
  const from = emailData.from?.name 
    ? `${emailData.from.name} <${emailData.from.email}>`
    : emailData.from?.email;

  const to = emailData.to.join(', ');
  const cc = emailData.cc?.join(', ') || '';
  const subject = emailData.subject;
  const textContent = emailData.text || emailData.html?.replace(/<[^>]*>/g, '') || '';
  const htmlContent = emailData.html || '';

  const boundary = 'boundary_' + Math.random().toString(36).substr(2, 9);

  console.log('📧 Creating MIME message with From:', from);
  
  let mime = `From: ${from}\r\n`;
  mime += `To: ${to}\r\n`;
  if (cc) mime += `Cc: ${cc}\r\n`;
  mime += `Subject: ${subject}\r\n`;
  mime += `MIME-Version: 1.0\r\n`;
  mime += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  mime += `--${boundary}\r\n`;
  mime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
  mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
  mime += `${textContent}\r\n\r\n`;
  mime += `--${boundary}\r\n`;
  mime += `Content-Type: text/html; charset="UTF-8"\r\n`;
  mime += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
  mime += `${htmlContent}\r\n\r\n`;
  mime += `--${boundary}--`;

  return mime;
}

export class GmailService {
  async sendEmail(emailData: EmailData): Promise<any> {
    try {
      console.log('🚀 Attempting to send email via Gmail to:', emailData.to);
      console.log('📧 Email subject:', emailData.subject);

      const gmail = await getGmailClient();
      const mimeMessage = createMimeMessage(emailData);
      const encodedMessage = Buffer.from(mimeMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log('✅ Email sent successfully via Gmail');
      console.log('📨 Gmail message ID:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Gmail error details:', {
        message: error.message,
        code: error.code,
        status: error.status
      });

      if (error.message.includes('not connected')) {
        throw new Error('Gmail not connected. Please set up Gmail integration in your project settings.');
      }

      throw new Error(`Gmail Error: ${error.message}`);
    }
  }
}

export async function sendEmail(emailData: EmailData): Promise<any> {
  const service = new GmailService();
  return await service.sendEmail(emailData);
}
