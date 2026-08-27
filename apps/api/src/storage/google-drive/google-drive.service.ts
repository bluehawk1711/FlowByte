import { Inject, Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { DATABASE, type Database } from '../../db/db.module';
import { cloudTokens, userStoragePreferences } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID ?? '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI ?? 'http://localhost:3001/api/storage/google-drive/callback';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export interface CloudConnectionStatus {
  connected: boolean;
  provider: string;
  expiresAt: string | null;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * Generate the OAuth consent URL for Google Drive.
   */
  getAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: userId, // Pass userId as state to identify user in callback
      prompt: 'consent', // Force consent to get refresh_token
    });
  }

  /**
   * Exchange authorization code for tokens and store them.
   */
  async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) throw new Error('No access_token received');

    // Upsert cloud tokens
    const existing = await this.db
      .select()
      .from(cloudTokens)
      .where(and(eq(cloudTokens.userId, userId), eq(cloudTokens.provider, 'google-drive')))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(cloudTokens)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? existing[0].refreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope ?? SCOPES.join(' '),
          updatedAt: new Date(),
        })
        .where(eq(cloudTokens.id, existing[0].id));
    } else {
      await this.db.insert(cloudTokens).values({
        userId,
        provider: 'google-drive',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope ?? SCOPES.join(' '),
      });
    }

    // Set as default storage provider if first cloud connection
    const pref = await this.db
      .select()
      .from(userStoragePreferences)
      .where(eq(userStoragePreferences.userId, userId))
      .limit(1);

    if (pref.length === 0) {
      await this.db.insert(userStoragePreferences).values({
        userId,
        defaultProvider: 'google-drive',
      });
    }

    this.logger.log(`Google Drive connected for user ${userId}`);
  }

  /**
   * Get the stored tokens for a user, refreshing if needed.
   */
  async getTokens(userId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const [row] = await this.db
      .select()
      .from(cloudTokens)
      .where(and(eq(cloudTokens.userId, userId), eq(cloudTokens.provider, 'google-drive')))
      .limit(1);

    if (!row) return null;

    // Check if token is expired (with 5min buffer)
    if (row.expiresAt && row.expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return { accessToken: row.accessToken, refreshToken: row.refreshToken ?? '' };
    }

    // Refresh the token
    if (!row.refreshToken) return null;

    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: row.refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        await this.db
          .update(cloudTokens)
          .set({
            accessToken: credentials.access_token,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
            updatedAt: new Date(),
          })
          .where(eq(cloudTokens.id, row.id));

        return {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token ?? row.refreshToken,
        };
      }
    } catch (err) {
      this.logger.error(`Failed to refresh Google Drive token: ${err}`);
    }

    return null;
  }

  /**
   * Get connection status for a user.
   */
  async getStatus(userId: string): Promise<CloudConnectionStatus> {
    const [row] = await this.db
      .select()
      .from(cloudTokens)
      .where(and(eq(cloudTokens.userId, userId), eq(cloudTokens.provider, 'google-drive')))
      .limit(1);

    return {
      connected: !!row,
      provider: 'google-drive',
      expiresAt: row?.expiresAt?.toISOString() ?? null,
    };
  }

  /**
   * Disconnect Google Drive for a user.
   */
  async disconnect(userId: string): Promise<void> {
    await this.db
      .delete(cloudTokens)
      .where(and(eq(cloudTokens.userId, userId), eq(cloudTokens.provider, 'google-drive')));

    // Reset default provider to local
    await this.db
      .update(userStoragePreferences)
      .set({ defaultProvider: 'local', updatedAt: new Date() })
      .where(eq(userStoragePreferences.userId, userId));

    this.logger.log(`Google Drive disconnected for user ${userId}`);
  }

  /**
   * Get or set the default storage provider for a user.
   */
  async getDefaultProvider(userId: string): Promise<string> {
    const [row] = await this.db
      .select()
      .from(userStoragePreferences)
      .where(eq(userStoragePreferences.userId, userId))
      .limit(1);

    return row?.defaultProvider ?? 'local';
  }

  async setDefaultProvider(userId: string, provider: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(userStoragePreferences)
      .where(eq(userStoragePreferences.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(userStoragePreferences)
        .set({ defaultProvider: provider, updatedAt: new Date() })
        .where(eq(userStoragePreferences.userId, userId));
    } else {
      await this.db.insert(userStoragePreferences).values({
        userId,
        defaultProvider: provider,
      });
    }
  }
}
