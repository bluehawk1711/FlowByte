import type { Readable } from 'node:stream';

export interface UploadResult {
  key: string;
  size: number;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  filename?: string; // content-disposition hint
  contentType?: string;
}

export interface StorageProvider {
  readonly name: string;

  upload(key: string, data: Buffer, contentType: string): Promise<UploadResult>;
  /** Upload from a stream (used by raw-body uploads without buffering first). */
  uploadStream?(key: string, stream: Readable, contentType: string): Promise<UploadResult>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string>;

  /**
   * Optional — only implemented by providers with a real local filesystem.
   * When present, the API can stream directly from disk (with HTTP Range
   * support) instead of buffering. Never used by cloud providers.
   */
  getLocalPath?(key: string): Promise<string | null>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');