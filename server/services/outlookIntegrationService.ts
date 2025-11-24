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

      const message = {
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

  async checkConnection(): Promise<boolean> {
    try {
      const client = await getUncachableOutlookClient();
      await client.api('/me').get();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const outlookIntegrationService = new OutlookIntegrationService();
