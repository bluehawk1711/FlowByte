import { Injectable, Logger } from '@nestjs/common';
import { google, type drive_v3 } from 'googleapis';
import type { Readable } from 'node:stream';

const FLOWBYTE_FOLDER_NAME = 'Flowbyte Music';

/**
 * Google Drive storage helper. Not a StorageProvider itself — used by
 * UploadsService when the user's default provider is 'google-drive'.
 * Requires a valid OAuth access token (refreshed by GoogleDriveService).
 */
@Injectable()
export class GoogleDriveStorage {
  private readonly logger = new Logger(GoogleDriveStorage.name);

  private driveClient(accessToken: string, refreshToken: string): drive_v3.Drive {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  private async getOrCreateFolder(drive: drive_v3.Drive): Promise<string> {
    const res = await drive.files.list({
      q: `name='${FLOWBYTE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });
    if (res.data.files?.[0]?.id) return res.data.files[0].id;

    const created = await drive.files.create({
      requestBody: {
        name: FLOWBYTE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    const folderId = created.data.id;
    if (!folderId) throw new Error('Failed to create Flowbyte folder');
    return folderId;
  }

  private extractFileId(key: string): string {
    if (!key.startsWith('gdrive:')) throw new Error(`Invalid Google Drive key: ${key}`);
    return key.slice(7);
  }

  async upload(
    fileName: string,
    data: Buffer,
    contentType: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<{ key: string; size: number }> {
    const drive = this.driveClient(accessToken, refreshToken);
    const folderId = await this.getOrCreateFolder(drive);

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: contentType,
        body: Buffer.from(data) as unknown as Readable,
      },
      fields: 'id, size',
    });

    const fileId = file.data.id;
    if (!fileId) throw new Error('Failed to upload to Google Drive');

    return { key: `gdrive:${fileId}`, size: Number(file.data.size ?? data.byteLength) };
  }

  async download(key: string, accessToken: string, refreshToken: string): Promise<Buffer> {
    const drive = this.driveClient(accessToken, refreshToken);
    const fileId = this.extractFileId(key);

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );

    return Buffer.from(res.data as ArrayBuffer);
  }

  async delete(key: string, accessToken: string, refreshToken: string): Promise<void> {
    const drive = this.driveClient(accessToken, refreshToken);
    const fileId = this.extractFileId(key);
    await drive.files.delete({ fileId });
  }

  async exists(key: string, accessToken: string, refreshToken: string): Promise<boolean> {
    try {
      const drive = this.driveClient(accessToken, refreshToken);
      const fileId = this.extractFileId(key);
      await drive.files.get({ fileId, fields: 'id' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns a proxy URL that the API will handle with proper auth.
   */
  getStreamUrl(key: string): string {
    const baseUrl = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    return `${baseUrl}/api/storage/stream/${encodeURIComponent(key)}?provider=google-drive`;
  }
}
