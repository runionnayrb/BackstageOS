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

      let rawMessage: string;

      if (params.attachments && params.attachments.length > 0) {
        rawMessage = this.buildMimeMessageWithAttachments(params);
      } else {
        const messageParts = [
          `To: ${params.to.join(', ')}`,
          params.cc && params.cc.length > 0 ? `Cc: ${params.cc.join(', ')}` : '',
          params.bcc && params.bcc.length > 0 ? `Bcc: ${params.bcc.join(', ')}` : '',
          `Subject: ${params.subject}`,
          params.isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8',
          '',
          params.body
        ].filter(Boolean);

        rawMessage = messageParts.join('\n');
      }

      const encodedMessage = Buffer.from(rawMessage)
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

  private buildMimeMessageWithAttachments(params: GmailSendEmailParams): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const headers = [
      `To: ${params.to.join(', ')}`,
      params.cc && params.cc.length > 0 ? `Cc: ${params.cc.join(', ')}` : '',
      params.bcc && params.bcc.length > 0 ? `Bcc: ${params.bcc.join(', ')}` : '',
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ].filter(Boolean).join('\r\n');

    const bodyPart = [
      `--${boundary}`,
      `Content-Type: ${params.isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
      'Content-Transfer-Encoding: 7bit',
      '',
      params.body,
    ].join('\r\n');

    const attachmentParts = (params.attachments || []).map(attachment => {
      const mimeType = this.getMimeType(attachment.filename);
      return [
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        attachment.content,
      ].join('\r\n');
    });

    return [
      headers,
      '',
      bodyPart,
      ...attachmentParts,
      `--${boundary}--`,
    ].join('\r\n');
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
    };
    return mimeTypes[ext] || 'application/octet-stream';
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
