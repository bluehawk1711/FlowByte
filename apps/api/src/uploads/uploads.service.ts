import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { albums, artists, songs } from '../db/schema';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { SongsService } from '../songs/songs.service';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { CompleteUploadDto } from './dto/complete-upload.dto';
import type { Song } from '@flowbyte/types';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly songsService: SongsService,
  ) {}

  /** Raw audio bytes → storage. Key: audio/{uuid}.{ext} */
  async uploadAudio(buffer: Buffer, ext = 'opus'): Promise<{ storageKey: string; fileSize: number }> {
    const safeExt = ext.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'opus';
    const key = `audio/${randomUUID()}.${safeExt}`;
    const result = await this.storage.upload(key, buffer, `audio/${safeExt}`);
    return { storageKey: result.key, fileSize: result.size };
  }

  /** Raw artwork bytes → WebP (resized, metadata stripped), storage. */
  async uploadArtwork(buffer: Buffer): Promise<{ storageKey: string; fileSize: number }> {
    const optimized = await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const key = `artwork/${randomUUID()}.webp`;
    const result = await this.storage.upload(key, optimized, 'image/webp');
    return { storageKey: result.key, fileSize: result.size };
  }

  /** Normalized lyrics JSON → storage. Key: lyrics/{uuid}/original.json */
  async uploadLyrics(normalized: unknown): Promise<{ storageKey: string }> {
    const key = `lyrics/${randomUUID()}/original.json`;
    await this.storage.upload(key, Buffer.from(JSON.stringify(normalized)), 'application/json');
    return { storageKey: key };
  }

  /**
   * Register metadata for already-uploaded files. Duplicate detection via
   * sourceId (YouTube video ID) / sourceUrl — duplicates return the existing
   * song and any newly staged files are cleaned up (no orphans).
   */
  async complete(dto: CompleteUploadDto): Promise<{ song: Song; duplicate: boolean }> {
    const duplicate = await this.findDuplicate(dto);
    if (duplicate) {
      await this.cleanupStaged(dto, duplicate);
      const song = await this.songsService.findById(duplicate.id);
      return { song, duplicate: true };
    }

    const result = await this.db.transaction(async (tx) => {
      let artistId: string | null = null;
      if (dto.artistName) {
        const existing = await tx
          .select()
          .from(artists)
          .where(eq(artists.name, dto.artistName))
          .limit(1);
        if (existing.length > 0) {
          artistId = existing[0]!.id;
        } else {
          const [created] = await tx
            .insert(artists)
            .values({ name: dto.artistName })
            .returning();
          artistId = created!.id;
        }
      }

      let albumId: string | null = null;
      if (dto.albumName) {
        const albumArtist = dto.albumArtistId ?? artistId;
        const existing = albumArtist
          ? await tx
              .select()
              .from(albums)
              .where(and(eq(albums.name, dto.albumName), eq(albums.artistId, albumArtist)))
              .limit(1)
          : await tx.select().from(albums).where(eq(albums.name, dto.albumName)).limit(1);
        if (existing.length > 0) {
          albumId = existing[0]!.id;
        } else {
          const [created] = await tx
            .insert(albums)
            .values({
              name: dto.albumName,
              artistId: albumArtist,
              releaseYear: dto.year ?? null,
            })
            .returning();
          albumId = created!.id;
        }
      }

      const [row] = await tx
        .insert(songs)
        .values({
          title: dto.title,
          artistId,
          albumId,
          duration: dto.duration,
          trackNumber: dto.trackNumber ?? null,
          year: dto.year ?? null,
          genre: dto.genre ?? null,
          language: dto.language ?? null,
          codec: dto.codec,
          bitrate: dto.bitrate ?? null,
          fileSize: dto.fileSize,
          audioStorageKey: dto.audioStorageKey,
          artworkStorageKey: dto.artworkStorageKey ?? null,
          lyricsStorageKey: dto.lyricsStorageKey ?? null,
          lyricsLanguage: dto.lyricsLanguage ?? null,
          lyricsSynced: dto.lyricsSynced ?? false,
          sourceUrl: dto.sourceUrl,
          sourceId: dto.sourceId ?? null,
          checksum: dto.checksum ?? null,
        })
        .returning();
      if (!row) throw new Error('Failed to insert song');
      return row;
    });

    this.logger.log(`Song added: ${result.title} (${result.id})`);
    return { song: await this.songsService.findById(result.id), duplicate: false };
  }

  private async findDuplicate(dto: CompleteUploadDto) {
    const conditions = [];
    if (dto.sourceId) conditions.push(eq(songs.sourceId, dto.sourceId));
    if (dto.sourceUrl) conditions.push(eq(songs.sourceUrl, dto.sourceUrl));
    if (conditions.length === 0) return null;
    const rows = await this.db.select().from(songs).where(or(...conditions)).limit(1);
    return rows[0] ?? null;
  }

  private async cleanupStaged(dto: CompleteUploadDto, existing: { audioStorageKey: string }): Promise<void> {
    const keys: string[] = [];
    if (dto.audioStorageKey !== existing.audioStorageKey) keys.push(dto.audioStorageKey);
    if (dto.artworkStorageKey) keys.push(dto.artworkStorageKey);
    if (dto.lyricsStorageKey) keys.push(dto.lyricsStorageKey);
    for (const key of keys) {
      try {
        await this.storage.delete(key);
      } catch (err) {
        this.logger.warn(`Cleanup of ${key} failed: ${(err as Error).message}`);
      }
    }
  }
}