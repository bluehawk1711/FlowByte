import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UploadsService } from './uploads.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { Song } from '@flowbyte/types';

async function readBody(req: Request): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Post('audio')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload raw audio bytes → storage key (desktop pipeline)' })
  async audio(
    @Req() req: Request,
    @Query('ext') ext?: string,
  ): Promise<{ storageKey: string; fileSize: number }> {
    const buffer = await readBody(req);
    if (buffer.byteLength === 0) throw new UnprocessableEntityException('Empty body');
    return this.uploadsService.uploadAudio(buffer, ext);
  }

  @Post('artwork')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload raw artwork → optimized WebP storage key' })
  async artwork(@Req() req: Request): Promise<{ storageKey: string; fileSize: number }> {
    const buffer = await readBody(req);
    if (buffer.byteLength === 0) throw new UnprocessableEntityException('Empty body');
    return this.uploadsService.uploadArtwork(buffer);
  }

  @Post('lyrics')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload normalized lyrics JSON → storage key' })
  async lyrics(@Body() body: unknown): Promise<{ storageKey: string }> {
    return this.uploadsService.uploadLyrics(body);
  }

  @Post('complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Register metadata for uploaded files (creates song, dedupes by source)',
  })
  complete(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteUploadDto,
  ): Promise<{ song: Song; duplicate: boolean }> {
    return this.uploadsService.complete(user.id, dto);
  }
}