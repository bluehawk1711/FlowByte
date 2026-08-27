import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { albums, artists, songs } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import { CacheService } from '../cache/cache.service';
import type { Album, Artist, Song } from '@flowbyte/types';
// import { STORAGE_PROVIDER, StorageProvider } from 'src/storage/storage-provider.interface';

const LIST_TTL = 300;
const DETAIL_TTL = 300;

@Injectable()
export class ArtistsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
    // @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly cache: CacheService,
  ) {}

  async list(): Promise<Artist[]> {
    const cached = await this.cache.get<Artist[]>('artists:list');
    if (cached) return cached;

    const rows = await this.db
      .select({
        id: artists.id,
        name: artists.name,
        artworkStorageKey: artists.artworkStorageKey,
        songCount: sql<number>`count(${songs.id})`,
        albumCount: sql<number>`count(distinct ${albums.id})`,
      })
      .from(artists)
      .leftJoin(songs, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(albums.artistId, artists.id))
      .groupBy(artists.id, artists.name, artists.artworkStorageKey)
      .orderBy(asc(artists.name));
    const result = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        artworkStorageKey: r.artworkStorageKey,
        artworkUrl: await this.songsService.artworkUrl(r.artworkStorageKey),
        songCount: Number(r.songCount),
        albumCount: Number(r.albumCount),
      })),
    );
    await this.cache.set('artists:list', result, LIST_TTL);
    return result;
  }

  async getDetail(id: string): Promise<{ artist: Artist; songs: Song[]; albums: Album[] }> {
    const cacheKey = `artists:detail:${id}`;
    const cached = await this.cache.get<{ artist: Artist; songs: Song[]; albums: Album[] }>(cacheKey);
    if (cached) return cached;

    const [row] = await this.db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Artist not found');
    const albumRows = await this.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.artistId, id))
      .orderBy(asc(albums.name));
    const albumList: Album[] = await Promise.all(
      albumRows.map(async (r) => ({
        id: r.album.id,
        name: r.album.name,
        artistId: r.album.artistId,
        artistName: r.artistName,
        artworkStorageKey: r.album.artworkStorageKey,
        artworkUrl: await this.songsService.artworkUrl(r.album.artworkStorageKey),
        releaseYear: r.album.releaseYear,
      })),
    );
    const result = {
      artist: {
        id: row.id,
        name: row.name,
        artworkStorageKey: row.artworkStorageKey,
        artworkUrl: await this.songsService.artworkUrl(row.artworkStorageKey),
      },
      songs: await this.songsService.findByArtist(id),
      albums: albumList,
    };
    await this.cache.set(cacheKey, result, DETAIL_TTL);
    return result;
  }
}