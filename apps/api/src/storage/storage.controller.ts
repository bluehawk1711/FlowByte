import { Controller, Get, Inject, Logger, Param, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { STORAGE_PROVIDER, type StorageProvider } from './storage-provider.interface';
import { Public } from '../common/decorators/public.decorator';

const SIGNING_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

/**
 * Local-dev media proxy: serves files with HTTP Range support for providers
 * backed by a local filesystem. The URL is produced by
 * LocalStorageProvider.getSignedUrl and contains a self-validating token.
 * Not used when STORAGE_PROVIDER=backblaze (clients stream presigned URLs).
 */
@ApiTags('storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  @Public()
  @Get('stream/:key')
  @ApiOperation({ summary: 'Stream a file locally (token-protected, range-capable)' })
  async stream(
    @Param('key') keyParam: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const key = decodeURIComponent(keyParam);
    const valid = this.verifyToken(token, key);
    if (!valid) throw new UnauthorizedException('Invalid or expired stream token');

    const localPath = (await this.storage.getLocalPath?.(key)) ?? null;
    if (localPath) {
      res.setHeader('Content-Type', this.contentType(key));
      res.setHeader('Accept-Ranges', 'bytes');
      return void res.sendFile(localPath);
    }

    const data = await this.storage.download(key);
    res.setHeader('Content-Type', this.contentType(key));
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const m = range.match(/bytes=(\d+)-(\d*)/);
      if (m) {
        const start = parseInt(m[1]!, 10);
        const end = m[2] ? parseInt(m[2], 10) : data.byteLength - 1;
        const chunk = data.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${data.byteLength}`);
        res.setHeader('Content-Length', String(chunk.byteLength));
        return void res.send(chunk);
      }
    }
    res.setHeader('Content-Length', String(data.byteLength));
    res.send(data);
  }

  private verifyToken(token: string | undefined, key: string): boolean {
    if (!token) return false;
    try {
      const decoded = JSON.parse(Buffer.from(decodeURIComponent(token), 'base64url').toString('utf8')) as {
        key: string;
        exp: number;
        sig: string;
      };
      if (decoded.exp <= Date.now()) return false;
      if (decoded.key !== key) return false;
      const expectedSig = createHmac('sha256', SIGNING_SECRET)
        .update(`${decoded.key}:${decoded.exp}`)
        .digest('base64url');
      const sigBuf = Buffer.from(decoded.sig, 'base64url');
      const expectedBuf = Buffer.from(expectedSig, 'base64url');
      if (sigBuf.length !== expectedBuf.length) return false;
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  private contentType(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'opus':
        return 'audio/opus';
      case 'mp3':
        return 'audio/mpeg';
      case 'm4a':
      case 'mp4':
        return 'audio/mp4';
      case 'ogg':
        return 'audio/ogg';
      case 'wav':
        return 'audio/wav';
      case 'webp':
        return 'image/webp';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }
}