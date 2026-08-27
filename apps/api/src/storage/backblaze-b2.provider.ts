import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as s3Presign } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import type { SignedUrlOptions, StorageProvider, UploadResult } from './storage-provider.interface';

/**
 * Backblaze B2 via its S3-compatible API. Business logic never knows about B2 —
 * everything goes through the StorageProvider interface.
 */
@Injectable()
export class BackblazeB2Storage implements StorageProvider, OnModuleInit {
  readonly name = 'backblaze';
  private readonly logger = new Logger(BackblazeB2Storage.name);
  private client: S3Client;
  private bucket: string;

  constructor() {
    const endpoint = process.env.B2_ENDPOINT;
    const keyId = process.env.B2_KEY_ID;
    const appKey = process.env.B2_APPLICATION_KEY;
    this.bucket = process.env.B2_BUCKET ?? '';
    if (!endpoint || !keyId || !appKey || !this.bucket) {
      throw new Error(
        'BackblazeB2Storage requires B2_ENDPOINT, B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET',
      );
    }
    this.client = new S3Client({
      endpoint,
      region: process.env.B2_REGION ?? 'us-west-004',
      credentials: { accessKeyId: keyId, secretAccessKey: appKey },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Backblaze B2 storage ready (bucket: ${this.bucket})`);
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
    return { key, size: data.byteLength };
  }

  async uploadStream(key: string, stream: Readable, contentType: string): Promise<UploadResult> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);
    return this.upload(key, data, contentType);
  }

  async download(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as Readable) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, opts?: SignedUrlOptions): Promise<string> {
    return s3Presign(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: opts?.expiresIn ?? 3600 },
    );
  }
}