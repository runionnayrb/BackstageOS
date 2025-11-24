import crypto from 'crypto';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class OAuthTokenService {
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptToken(encryptedToken: string): string {
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

  async storeTokens(
    userId: number,
    provider: 'gmail' | 'outlook',
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    scopes: string,
    emailAddress: string
  ): Promise<void> {
    const encryptedRefreshToken = this.encryptToken(refreshToken);
    const encryptedAccessToken = this.encryptToken(accessToken);
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    await db.update(users)
      .set({
        connectedEmailProvider: provider,
        connectedEmailAddress: emailAddress,
        emailProviderConnectedAt: new Date(),
        emailOAuthRefreshToken: encryptedRefreshToken,
        emailOAuthAccessToken: encryptedAccessToken,
        emailOAuthTokenExpiry: tokenExpiry,
        emailOAuthScopes: scopes,
      })
      .where(eq(users.id, userId));
  }

  async getTokens(userId: number): Promise<{
    accessToken: string;
    refreshToken: string;
    expiry: Date;
    provider: string;
  } | null> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.emailOAuthRefreshToken || !user.emailOAuthAccessToken) {
      return null;
    }

    return {
      accessToken: this.decryptToken(user.emailOAuthAccessToken),
      refreshToken: this.decryptToken(user.emailOAuthRefreshToken),
      expiry: user.emailOAuthTokenExpiry!,
      provider: user.connectedEmailProvider!,
    };
  }

  async updateAccessToken(userId: number, accessToken: string, expiresIn: number): Promise<void> {
    const encryptedAccessToken = this.encryptToken(accessToken);
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    await db.update(users)
      .set({
        emailOAuthAccessToken: encryptedAccessToken,
        emailOAuthTokenExpiry: tokenExpiry,
      })
      .where(eq(users.id, userId));
  }

  async clearTokens(userId: number): Promise<void> {
    await db.update(users)
      .set({
        connectedEmailProvider: null,
        connectedEmailAddress: null,
        emailProviderConnectedAt: null,
        emailOAuthRefreshToken: null,
        emailOAuthAccessToken: null,
        emailOAuthTokenExpiry: null,
        emailOAuthScopes: null,
      })
      .where(eq(users.id, userId));
  }

  isTokenExpired(expiry: Date): boolean {
    return new Date() >= new Date(expiry);
  }
}

export const oauthTokenService = new OAuthTokenService();
