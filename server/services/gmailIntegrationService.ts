import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface GmailSendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
  }>;
}

export class GmailIntegrationService {
  async getUserEmail(): Promise<string> {
    try {
      const gmail = await getUncachableGmailClient();
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return profile.data.emailAddress || '';
    } catch (error) {
      console.error('Error getting Gmail user profile:', error);
      throw new Error('Failed to get Gmail user email address');
    }
  }

  async sendEmail(params: GmailSendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const gmail = await getUncachableGmailClient();

      const messageParts = [
        `To: ${params.to.join(', ')}`,
        params.cc && params.cc.length > 0 ? `Cc: ${params.cc.join(', ')}` : '',
        params.bcc && params.bcc.length > 0 ? `Bcc: ${params.bcc.join(', ')}` : '',
        `Subject: ${params.subject}`,
        params.isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
        '',
        params.body
      ].filter(Boolean);

      const message = messageParts.join('\n');
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        success: true,
        messageId: response.data.id,
      };
    } catch (error: any) {
      console.error('Error sending email via Gmail:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Gmail',
      };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const gmail = await getUncachableGmailClient();
      await gmail.users.getProfile({ userId: 'me' });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const gmailIntegrationService = new GmailIntegrationService();
