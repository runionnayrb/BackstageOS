import { Client } from '@microsoft/microsoft-graph-client';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

async function getUncachableOutlookClient() {
  const accessToken = await getAccessToken();

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export interface OutlookSendEmailParams {
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

export class OutlookIntegrationService {
  async getUserEmail(): Promise<string> {
    try {
      const client = await getUncachableOutlookClient();
      const user = await client.api('/me').get();
      return user.mail || user.userPrincipalName || '';
    } catch (error) {
      console.error('Error getting Outlook user profile:', error);
      throw new Error('Failed to get Outlook user email address');
    }
  }

  async sendEmail(params: OutlookSendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const client = await getUncachableOutlookClient();

      const message: any = {
        subject: params.subject,
        body: {
          contentType: params.isHtml ? 'HTML' : 'Text',
          content: params.body,
        },
        toRecipients: params.to.map(email => ({
          emailAddress: { address: email },
        })),
        ccRecipients: params.cc?.map(email => ({
          emailAddress: { address: email },
        })),
        bccRecipients: params.bcc?.map(email => ({
          emailAddress: { address: email },
        })),
      };

      if (params.attachments && params.attachments.length > 0) {
        message.attachments = params.attachments.map(attachment => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: attachment.filename,
          contentType: this.getMimeType(attachment.filename),
          contentBytes: attachment.content,
        }));
      }

      const response = await client
        .api('/me/sendMail')
        .post({
          message,
          saveToSentItems: true,
        });

      return {
        success: true,
        messageId: response?.id || 'sent',
      };
    } catch (error: any) {
      console.error('Error sending email via Outlook:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Outlook',
      };
    }
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
      const client = await getUncachableOutlookClient();
      await client.api('/me').get();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Map folder names to Outlook folder paths
  private getFolderPath(folder: string): string {
    const folderMap: Record<string, string> = {
      'inbox': 'inbox',
      'sent': 'sentItems',
      'drafts': 'drafts',
      'trash': 'deletedItems',
      'archive': 'archive',
      'junk': 'junkemail',
    };
    return folderMap[folder] || 'inbox';
  }

  async getEmails(folder: string = 'inbox', limit: number = 50, skip: number = 0): Promise<{
    messages: any[];
    nextLink?: string;
  }> {
    try {
      const client = await getUncachableOutlookClient();
      
      const folderPath = this.getFolderPath(folder);
      
      const response = await client
        .api(`/me/mailFolders/${folderPath}/messages`)
        .top(limit)
        .skip(skip)
        .orderby('receivedDateTime desc')
        .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,body,isRead,hasAttachments,importance,flag')
        .get();

      const messages = (response.value || []).map((msg: any) => this.parseOutlookMessage(msg));

      return {
        messages,
        nextLink: response['@odata.nextLink'],
      };
    } catch (error: any) {
      console.error('Error fetching Outlook emails:', error);
      throw new Error(error.message || 'Failed to fetch emails from Outlook');
    }
  }

  async getEmail(messageId: string): Promise<any> {
    try {
      const client = await getUncachableOutlookClient();
      
      const response = await client
        .api(`/me/messages/${messageId}`)
        .select('id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,body,isRead,hasAttachments,importance,flag,attachments')
        .expand('attachments')
        .get();

      return this.parseOutlookMessage(response);
    } catch (error: any) {
      console.error('Error fetching Outlook email:', error);
      throw new Error(error.message || 'Failed to fetch email from Outlook');
    }
  }

  private parseOutlookMessage(message: any): any {
    const from = message.from?.emailAddress;
    const toRecipients = message.toRecipients || [];
    const ccRecipients = message.ccRecipients || [];
    const bccRecipients = message.bccRecipients || [];

    return {
      id: message.id,
      subject: message.subject || '(No Subject)',
      from: from ? `${from.name || ''} <${from.address}>`.trim() : '',
      to: toRecipients.map((r: any) => `${r.emailAddress?.name || ''} <${r.emailAddress?.address}>`.trim()).join(', '),
      cc: ccRecipients.map((r: any) => `${r.emailAddress?.name || ''} <${r.emailAddress?.address}>`.trim()).join(', '),
      bcc: bccRecipients.map((r: any) => `${r.emailAddress?.name || ''} <${r.emailAddress?.address}>`.trim()).join(', '),
      date: message.receivedDateTime,
      snippet: message.bodyPreview || '',
      body: message.body?.content || '',
      isHtml: message.body?.contentType === 'html',
      isUnread: !message.isRead,
      isStarred: message.flag?.flagStatus === 'flagged',
      importance: message.importance,
      hasAttachments: message.hasAttachments,
      attachments: (message.attachments || []).map((att: any) => ({
        id: att.id,
        filename: att.name,
        mimeType: att.contentType,
        size: att.size,
      })),
      internalDate: new Date(message.receivedDateTime).getTime().toString(),
    };
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const client = await getUncachableOutlookClient();
      await client
        .api(`/me/messages/${messageId}`)
        .patch({ isRead: true });
    } catch (error: any) {
      console.error('Error marking email as read:', error);
      throw new Error(error.message || 'Failed to mark email as read');
    }
  }

  async markAsUnread(messageId: string): Promise<void> {
    try {
      const client = await getUncachableOutlookClient();
      await client
        .api(`/me/messages/${messageId}`)
        .patch({ isRead: false });
    } catch (error: any) {
      console.error('Error marking email as unread:', error);
      throw new Error(error.message || 'Failed to mark email as unread');
    }
  }

  async moveToTrash(messageId: string): Promise<void> {
    try {
      const client = await getUncachableOutlookClient();
      await client
        .api(`/me/messages/${messageId}/move`)
        .post({ destinationId: 'deletedItems' });
    } catch (error: any) {
      console.error('Error moving email to trash:', error);
      throw new Error(error.message || 'Failed to move email to trash');
    }
  }

  async archiveEmail(messageId: string): Promise<void> {
    try {
      const client = await getUncachableOutlookClient();
      await client
        .api(`/me/messages/${messageId}/move`)
        .post({ destinationId: 'archive' });
    } catch (error: any) {
      console.error('Error archiving email:', error);
      throw new Error(error.message || 'Failed to archive email');
    }
  }
}

export const outlookIntegrationService = new OutlookIntegrationService();
