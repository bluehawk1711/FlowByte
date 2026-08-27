import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { SignedUrlOptions, StorageProvider, UploadResult } from './storage-provider.interface';

const SIGNING_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

/**
 * Local filesystem storage for development. Files live under
 * {root}/{audio,artwork,lyrics}/... Signed URLs point back at the API proxy
 * (/storage/stream) which streams with HTTP Range support.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider, OnModuleInit {
  readonly name = 'local';
  private readonly logger = new Logger(LocalStorageProvider.name);

  constructor(private readonly root: string) {}

  async onModuleInit(): Promise<void> {
    for (const dir of ['audio', 'artwork', 'lyrics', 'playlists']) {
      await fs.mkdir(path.join(this.root, dir), { recursive: true });
    }
    this.logger.log(`Local storage root: ${this.root}`);
  }

  private resolvePath(key: string): string {
    const safe = key.replace(/^[/\\]+/, '');
    const resolved = path.resolve(this.root, safe);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return resolved;
  }

  async upload(key: string, data: Buffer, _contentType: string): Promise<UploadResult> {
    const target = this.resolvePath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return { key, size: data.byteLength };
  }

  async uploadStream(key: string, stream: Readable, _contentType: string): Promise<UploadResult> {
    const target = this.resolvePath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const write = createWriteStream(target);
    await new Promise<void>((resolve, reject) => {
      stream.pipe(write);
      write.on('finish', resolve);
      write.on('error', reject);
      stream.on('error', reject);
    });
    const stat = await fs.stat(target);
    return { key, size: stat.size };
  }

  async download(key: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolvePath(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string> {
    const exp = Date.now() + (opts?.expiresIn ?? 3600) * 1000;
    const sig = createHmac('sha256', SIGNING_SECRET)
      .update(`${key}:${exp}`)
      .digest('base64url');
    const token = encodeURIComponent(
      Buffer.from(JSON.stringify({ key, exp, sig })).toString('base64url'),
    );
    const base = process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    return `${base}/storage/stream/${encodeURIComponent(key)}?token=${token}`;
  }

  async getLocalPath(key: string): Promise<string | null> {
    const target = this.resolvePath(key);
    try {
      await fs.access(target);
      return target;
    } catch {
      return null;
    }
  }

  /** Helper: create a random key for an upload category. */
  static makeKey(category: 'audio' | 'artwork' | 'lyrics', ext: string, id?: string): string {
    const base = id ?? randomUUID();
    return `${category}/${base}.${ext}`;
  }
}

export { createReadStream };