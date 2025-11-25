import crypto from 'crypto';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { googleOAuthService } from './googleOAuthService';
import { microsoftOAuthService } from './microsoftOAuthService';

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

export class OAuthTokenService {
  private encryptToken(token: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('OAUTH_ENCRYPTION_KEY is not configured');
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptToken(encryptedToken: string): string {
    if (!ENCRYPTION_KEY) {
      throw new Error('OAUTH_ENCRYPTION_KEY is not configured');
    }
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async saveGmailTokens(
    userId: string,
    tokens: { access_token: string; refresh_token: string; expires_in: number; scope: string },
    emailAddress: string
  ): Promise<void> {
    const encryptedRefreshToken = this.encryptToken(tokens.refresh_token);
    const encryptedAccessToken = this.encryptToken(tokens.access_token);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    await db.update(users)
      .set({
        emailOAuthAccessToken: encryptedAccessToken,
        emailOAuthRefreshToken: encryptedRefreshToken,
        emailOAuthTokenExpiry: tokenExpiry,
        emailOAuthScopes: tokens.scope,
        connectedEmailProvider: 'gmail',
        connectedEmailAddress: emailAddress,
        emailProviderConnectedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)));
  }

  async saveOutlookTokens(
    userId: string,
    tokens: { access_token: string; refresh_token: string; expires_in: number; scope: string },
    emailAddress: string
  ): Promise<void> {
    const encryptedRefreshToken = this.encryptToken(tokens.refresh_token);
    const encryptedAccessToken = this.encryptToken(tokens.access_token);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    await db.update(users)
      .set({
        emailOAuthAccessToken: encryptedAccessToken,
        emailOAuthRefreshToken: encryptedRefreshToken,
        emailOAuthTokenExpiry: tokenExpiry,
        emailOAuthScopes: tokens.scope,
        connectedEmailProvider: 'outlook',
        connectedEmailAddress: emailAddress,
        emailProviderConnectedAt: new Date(),
      })
      .where(eq(users.id, parseInt(userId)));
  }

  async getValidGmailAccessToken(userId: string): Promise<string | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!user || !user.emailOAuthAccessToken || !user.emailOAuthRefreshToken || user.connectedEmailProvider !== 'gmail') {
      return null;
    }

    const expiry = user.emailOAuthTokenExpiry;
    const isExpired = expiry ? new Date() >= new Date(expiry) : true;

    if (isExpired) {
      try {
        const refreshToken = this.decryptToken(user.emailOAuthRefreshToken);
        const refreshed = await googleOAuthService.refreshAccessToken(refreshToken);
        
        const encryptedAccessToken = this.encryptToken(refreshed.access_token);
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
        
        await db.update(users)
          .set({
            emailOAuthAccessToken: encryptedAccessToken,
            emailOAuthTokenExpiry: newExpiry,
          })
          .where(eq(users.id, parseInt(userId)));
        
        return refreshed.access_token;
      } catch (error) {
        console.error('Failed to refresh Gmail access token:', error);
        return null;
      }
    }

    return this.decryptToken(user.emailOAuthAccessToken);
  }

  async getValidOutlookAccessToken(userId: string): Promise<string | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (!user || !user.emailOAuthAccessToken || !user.emailOAuthRefreshToken || user.connectedEmailProvider !== 'outlook') {
      return null;
    }

    const expiry = user.emailOAuthTokenExpiry;
    const isExpired = expiry ? new Date() >= new Date(expiry) : true;

    if (isExpired) {
      try {
        const refreshToken = this.decryptToken(user.emailOAuthRefreshToken);
        const refreshed = await microsoftOAuthService.refreshAccessToken(refreshToken);
        
        const encryptedAccessToken = this.encryptToken(refreshed.access_token);
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
        
        await db.update(users)
          .set({
            emailOAuthAccessToken: encryptedAccessToken,
            emailOAuthTokenExpiry: newExpiry,
          })
          .where(eq(users.id, parseInt(userId)));
        
        return refreshed.access_token;
      } catch (error) {
        console.error('Failed to refresh Outlook access token:', error);
        return null;
      }
    }

    return this.decryptToken(user.emailOAuthAccessToken);
  }

  async clearGmailTokens(userId: string): Promise<void> {
    await db.update(users)
      .set({
        emailOAuthAccessToken: null,
        emailOAuthRefreshToken: null,
        emailOAuthTokenExpiry: null,
        emailOAuthScopes: null,
        connectedEmailProvider: null,
        connectedEmailAddress: null,
        emailProviderConnectedAt: null,
      })
      .where(eq(users.id, parseInt(userId)));
  }

  async clearOutlookTokens(userId: string): Promise<void> {
    await db.update(users)
      .set({
        emailOAuthAccessToken: null,
        emailOAuthRefreshToken: null,
        emailOAuthTokenExpiry: null,
        emailOAuthScopes: null,
        connectedEmailProvider: null,
        connectedEmailAddress: null,
        emailProviderConnectedAt: null,
      })
      .where(eq(users.id, parseInt(userId)));
  }
}

export const oauthTokenService = new OAuthTokenService();
