import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { albums, artists } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import type { Album, Song } from '@flowbyte/types';

@Injectable()
export class AlbumsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
  ) {}

  async list(): Promise<Album[]> {
    const rows = await this.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .orderBy(asc(albums.name));
    return Promise.all(
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
  }

  async getDetail(id: string): Promise<{ album: Album; songs: Song[] }> {
    const rows = await this.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(eq(albums.id, id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('Album not found');
    const r = rows[0]!;
    return {
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
  }
}