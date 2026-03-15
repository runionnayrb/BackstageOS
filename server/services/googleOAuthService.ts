import { google } from 'googleapis';

export class GoogleOAuthService {
  private oauth2Client: any;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    
    // Priority: Custom domain > Production deployment > Dev domain > localhost
    let baseUrl: string;
    if (process.env.CUSTOM_DOMAIN) {
      baseUrl = `https://${process.env.CUSTOM_DOMAIN}`;
    } else if (process.env.REPLIT_DEPLOYMENT === '1' && process.env.REPLIT_DOMAINS) {
      // In production deployment, use the first production domain
      const domains = process.env.REPLIT_DOMAINS.split(',');
      baseUrl = `https://${domains[0]}`;
    } else if (process.env.REPLIT_DEV_DOMAIN) {
      baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else {
      baseUrl = 'http://localhost:5000';
    }
    this.redirectUri = `${baseUrl}/api/oauth/google/callback`;
    
    
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
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent',
    });
    
    console.log('🔐 Generated OAuth URL with scopes:', scopes.join(', '));
    console.log('🔐 Full auth URL:', authUrl);
    
    return authUrl;
  }

  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    console.log('🔐 Token exchange - received scopes:', tokens.scope);
    console.log('🔐 Token exchange - has refresh token:', !!tokens.refresh_token);
    
    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. User may need to revoke access and reconnect.');
    }

    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date ? Math.floor((tokens.expiry_date - Date.now()) / 1000) : 3600,
      scope: (tokens.scope || '').toString(),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      expires_in: credentials.expiry_date ? Math.floor((credentials.expiry_date - Date.now()) / 1000) : 3600,
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

  async sendEmail(accessToken: string, params: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    fromEmail?: string;
    fromName?: string;
    attachments?: Array<{ filename: string; content: string; encoding: string; contentType: string }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      const fromHeader = params.fromName && params.fromEmail 
        ? `From: "${params.fromName}" <${params.fromEmail}>`
        : params.fromEmail 
          ? `From: ${params.fromEmail}`
          : '';

      // Create unique boundary for multipart message
      const boundary = `---${Date.now()}_boundary`;
      
      const headers = [
        fromHeader,
        `To: ${params.to.join(', ')}`,
        params.cc && params.cc.length > 0 ? `Cc: ${params.cc.join(', ')}` : '',
        params.bcc && params.bcc.length > 0 ? `Bcc: ${params.bcc.join(', ')}` : '',
        `Subject: ${params.subject}`,
        'MIME-Version: 1.0',
      ].filter(Boolean);

      let messageBody = '';
      
      // If there are attachments, use multipart
      if (params.attachments && params.attachments.length > 0) {
        headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        messageBody = headers.join('\n') + '\n\n';
        
        // Add text body
        messageBody += `--${boundary}\n`;
        messageBody += `Content-Type: ${params.isHtml ? 'text/html' : 'text/plain'}; charset=utf-8\n`;
        messageBody += 'Content-Transfer-Encoding: 7bit\n\n';
        messageBody += params.body + '\n\n';
        
        // Add attachments
        for (const attachment of params.attachments) {
          messageBody += `--${boundary}\n`;
          messageBody += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\n`;
          messageBody += `Content-Disposition: attachment; filename="${attachment.filename}"\n`;
          messageBody += `Content-Transfer-Encoding: base64\n\n`;
          messageBody += attachment.content + '\n\n';
        }
        
        messageBody += `--${boundary}--`;
      } else {
        headers.push(params.isHtml ? 'Content-Type: text/html; charset=utf-8' : 'Content-Type: text/plain; charset=utf-8');
        messageBody = headers.join('\n') + '\n\n' + params.body;
      }

      const encodedMessage = Buffer.from(messageBody)
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
        messageId: response.data.id || undefined,
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
