import { Client } from '@microsoft/microsoft-graph-client';

export class MicrosoftOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tenantId: string;

  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID?.trim() || '';
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim() || '';
    this.tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';
    this.redirectUri = `${baseUrl}/api/oauth/microsoft/callback`;
    
    console.log('Microsoft OAuth Config:', {
      clientId: this.clientId,
      clientSecretLength: this.clientSecret.length,
      clientSecretPrefix: this.clientSecret.substring(0, 8) + '...',
      redirectUri: this.redirectUri,
      tenantId: this.tenantId,
    });
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️  Microsoft OAuth credentials not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET');
    }
  }

  getAuthUrl(state: string): string {
    const scopes = [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: scopes.join(' '),
      state: state,
      prompt: 'consent',
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: code,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const data = await response.json();

    if (!data.refresh_token) {
      throw new Error('No refresh token received');
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in || 3600,
      scope: data.scope || '',
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    };
  }

  async getUserEmail(accessToken: string): Promise<string> {
    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => accessToken,
      },
    });

    const user = await client.api('/me').get();
    return user.mail || user.userPrincipalName || '';
  }

  async sendEmail(accessToken: string, params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const client = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => accessToken,
        },
      });

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

      await client
        .api('/me/sendMail')
        .post({
          message,
          saveToSentItems: true,
        });

      return {
        success: true,
        messageId: 'sent',
      };
    } catch (error: any) {
      console.error('Error sending email via Outlook:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email via Outlook',
      };
    }
  }
}

export const microsoftOAuthService = new MicrosoftOAuthService();
