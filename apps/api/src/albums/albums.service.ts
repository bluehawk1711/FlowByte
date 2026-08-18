import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { albums, artists } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import { CacheService } from '../cache/cache.service';
import type { Album, Song } from '@flowbyte/types';

const LIST_TTL = 300;
const DETAIL_TTL = 300;

@Injectable()
export class AlbumsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
    private readonly cache: CacheService,
  ) {}

  async list(): Promise<Album[]> {
    const cached = await this.cache.get<Album[]>('albums:list');
    if (cached) return cached;

    const rows = await this.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(asc(albums.name));
    const result = await Promise.all(
      rows.map(async (r) => ({
        id: r.album.id,
        name: r.album.name,
        artistId: r.album.artistId,
        artistName: r.artistName,
        artworkStorageKey: r.album.artworkStorageKey,
        artworkUrl: await this.songsService.artworkUrl(r.album.artworkStorageKey),
        releaseYear: r.album.releaseYear,
      })),
    );
    await this.cache.set('albums:list', result, LIST_TTL);
    return result;
  }

  async getDetail(id: string): Promise<{ album: Album; songs: Song[] }> {
    const cacheKey = `albums:detail:${id}`;
    const cached = await this.cache.get<{ album: Album; songs: Song[] }>(cacheKey);
    if (cached) return cached;

    const rows = await this.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('Album not found');
    const r = rows[0]!;
    const result = {
      album: {
        id: r.album.id,
        name: r.album.name,
        artistId: r.album.artistId,
        artistName: r.artistName,
        artworkStorageKey: r.album.artworkStorageKey,
        artworkUrl: await this.songsService.artworkUrl(r.album.artworkStorageKey),
        releaseYear: r.album.releaseYear,
      },
      songs: await this.songsService.findByAlbum(id),
    };
    await this.cache.set(cacheKey, result, DETAIL_TTL);
    return result;
  }
}
