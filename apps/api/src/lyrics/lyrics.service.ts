import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { songs } from '../db/schema';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { parseLyrics, type LyricsFormat } from './lyrics.parser';
import { randomUUID } from 'node:crypto';
import type { NormalizedLyrics } from '@flowbyte/types';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ImportLyricsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  content: string;

  @IsIn(['lrc', 'srt', 'vtt', 'json'])
  format: LyricsFormat;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  language?: string;
}

@Injectable()
export class LyricsService {
  private readonly logger = new Logger(LyricsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async getForSong(songId: string): Promise<NormalizedLyrics | null> {
    const [row] = await this.db.select().from(songs).where(eq(songs.id, songId)).limit(1);
    if (!row) throw new NotFoundException('Song not found');
    if (!row.lyricsStorageKey) return null;
    try {
      const raw = await this.storage.download(row.lyricsStorageKey);
      return JSON.parse(raw.toString('utf8')) as NormalizedLyrics;
    } catch (err) {
      this.logger.warn(`Lyrics download failed for ${songId}: ${(err as Error).message}`);
      return null;
    }
  }

  /** Import + normalize + store lyrics for a song, then update its metadata. */
  async importForSong(songId: string, dto: ImportLyricsDto): Promise<NormalizedLyrics> {
    const [row] = await this.db.select().from(songs).where(eq(songs.id, songId)).limit(1);
    if (!row) throw new NotFoundException('Song not found');

    const normalized = parseLyrics(dto.content, dto.format, dto.language ?? row.lyricsLanguage ?? 'en');
    const key = `lyrics/${row.id}/original.json`;
    await this.storage.upload(key, Buffer.from(JSON.stringify(normalized)), 'application/json');
    await this.db
      .update(songs)
      .set({
        lyricsStorageKey: key,
        lyricsLanguage: normalized.language,
        lyricsSynced: normalized.synced,
        updatedAt: new Date(),
      })
      .where(eq(songs.id, songId));
    return normalized;
  }

  /** Import lyrics by raw content into storage without a song row (pre-upload stage). */
  async stageImport(
    content: string,
    format: LyricsFormat,
    language = 'en',
  ): Promise<{ storageKey: string; normalized: NormalizedLyrics }> {
    const normalized = parseLyrics(content, format, language);
    const key = `lyrics/${randomUUID()}/original.json`;
    await this.storage.upload(key, Buffer.from(JSON.stringify(normalized)), 'application/json');
    return { storageKey: key, normalized };
  }
}