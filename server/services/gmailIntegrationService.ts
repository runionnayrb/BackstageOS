import { google } from 'googleapis';
import { oauthTokenService } from './oauthTokenService';

// Store current user ID for the request context
let currentUserId: string | null = null;

export function setCurrentUserId(userId: string) {
  currentUserId = userId;
}

async function getAccessToken(): Promise<string> {
  if (!currentUserId) {
    throw new Error('No user context set for Gmail access');
  }
  
  const accessToken = await oauthTokenService.getValidGmailAccessToken(currentUserId);
  
  if (!accessToken) {
    throw new Error('Gmail not connected or token expired');
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

  // Map folder names to Gmail label IDs
  private getFolderQuery(folder: string): string {
    const folderMap: Record<string, string> = {
      'inbox': 'in:inbox',
      'sent': 'in:sent',
      'drafts': 'in:drafts',
      'trash': 'in:trash',
      'archive': '-in:inbox -in:sent -in:drafts -in:trash -in:spam',
      'starred': 'is:starred',
      'spam': 'in:spam',
    };
    return folderMap[folder] || 'in:inbox';
  }

  async getEmails(folder: string = 'inbox', limit: number = 50, pageToken?: string): Promise<{
    messages: any[];
    nextPageToken?: string;
  }> {
    try {
      const gmail = await getUncachableGmailClient();
      
      const query = this.getFolderQuery(folder);
      
      // List messages
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: limit,
        pageToken: pageToken,
      });

      const messages = listResponse.data.messages || [];
      const nextPageToken = listResponse.data.nextPageToken;

      // Fetch full details for each message
      const fullMessages = await Promise.all(
        messages.map(async (msg) => {
          try {
            const fullMessage = await gmail.users.messages.get({
              userId: 'me',
              id: msg.id!,
              format: 'full',
            });
            return this.parseGmailMessage(fullMessage.data);
          } catch (error) {
            console.error(`Error fetching message ${msg.id}:`, error);
            return null;
          }
        })
      );

      return {
        messages: fullMessages.filter(m => m !== null),
        nextPageToken,
      };
    } catch (error: any) {
      console.error('Error fetching Gmail emails:', error);
      throw new Error(error.message || 'Failed to fetch emails from Gmail');
    }
  }

  async getEmail(messageId: string): Promise<any> {
    try {
      const gmail = await getUncachableGmailClient();
      
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return this.parseGmailMessage(response.data);
    } catch (error: any) {
      console.error('Error fetching Gmail email:', error);
      throw new Error(error.message || 'Failed to fetch email from Gmail');
    }
  }

  private parseGmailMessage(message: any): any {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body content
    let body = '';
    let htmlBody = '';
    
    const extractBody = (part: any): void => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        part.parts.forEach(extractBody);
      }
    };

    if (message.payload) {
      extractBody(message.payload);
    }

    // Extract attachments info
    const attachments: any[] = [];
    const extractAttachments = (part: any): void => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size,
        });
      }
      if (part.parts) {
        part.parts.forEach(extractAttachments);
      }
    };

    if (message.payload) {
      extractAttachments(message.payload);
    }

    const labelIds = message.labelIds || [];
    const isUnread = labelIds.includes('UNREAD');
    const isStarred = labelIds.includes('STARRED');

    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      bcc: getHeader('Bcc'),
      date: getHeader('Date'),
      snippet: message.snippet,
      body: htmlBody || body,
      isHtml: !!htmlBody,
      isUnread,
      isStarred,
      labelIds,
      attachments,
      internalDate: message.internalDate,
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const gmail = await getUncachableGmailClient();
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    } catch (error: any) {
      console.error('Error marking email as read:', error);
      throw new Error(error.message || 'Failed to mark email as read');
    }
  }

  async markAsUnread(messageId: string): Promise<void> {
    try {
      const gmail = await getUncachableGmailClient();
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });
    } catch (error: any) {
      console.error('Error marking email as unread:', error);
      throw new Error(error.message || 'Failed to mark email as unread');
    }
  }

  async moveToTrash(messageId: string): Promise<void> {
    try {
      const gmail = await getUncachableGmailClient();
      await gmail.users.messages.trash({
        userId: 'me',
        id: messageId,
      });
    } catch (error: any) {
      console.error('Error moving email to trash:', error);
      throw new Error(error.message || 'Failed to move email to trash');
    }
  }

  async archiveEmail(messageId: string): Promise<void> {
    try {
      const gmail = await getUncachableGmailClient();
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      });
    } catch (error: any) {
      console.error('Error archiving email:', error);
      throw new Error(error.message || 'Failed to archive email');
    }
  }
}

export const gmailIntegrationService = new GmailIntegrationService();
