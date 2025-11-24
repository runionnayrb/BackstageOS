import { google } from 'googleapis';
import { oauthTokenService } from './oauthTokenService';

export class GoogleOAuthService {
  private oauth2Client: any;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.REPL_HOME || 'http://localhost:5000'}/api/oauth/google/callback`;
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('⚠️  Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  getAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scopes: string;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. User may need to revoke access and reconnect.');
    }

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      scopes: (tokens.scope || '').toString(),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      expiresIn: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
    };
  }

  async getUserEmail(accessToken: string): Promise<string> {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    return profile.data.emailAddress || '';
  }

  async getValidAccessToken(userId: number): Promise<string | null> {
    const tokens = await oauthTokenService.getTokens(userId);
    
    if (!tokens) {
      return null;
    }

    if (oauthTokenService.isTokenExpired(tokens.expiry)) {
      try {
        const refreshed = await this.refreshAccessToken(tokens.refreshToken);
        await oauthTokenService.updateAccessToken(userId, refreshed.accessToken, refreshed.expiresIn);
        return refreshed.accessToken;
      } catch (error) {
        console.error('Failed to refresh Google access token:', error);
        return null;
      }
    }

    return tokens.accessToken;
  }

  async sendEmail(userId: number, params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      if (!accessToken) {
        return {
          success: false,
          error: 'No valid access token available',
        };
      }

      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

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
}

export const googleOAuthService = new GoogleOAuthService();
