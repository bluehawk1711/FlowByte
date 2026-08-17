import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { favorites, songs, artists, albums } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import type { Song } from '@flowbyte/types';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
  ) {}

  async list(userId: string): Promise<Song[]> {
    const rows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(favorites)
      .innerJoin(songs, eq(favorites.songId, songs.id))
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    return this.songsService.enrich(rows, new Set(rows.map((r) => r.song.id)));
  }

  async add(userId: string, songId: string): Promise<void> {
    await this.db
      .insert(favorites)
      .values({ userId, songId })
      .onConflictDoNothing();
  }

  async remove(userId: string, songId: string): Promise<void> {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)));
  }

  async has(userId: string, songId: string): Promise<void> {
    const rows = await this.db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('Not favorited');
  }
}