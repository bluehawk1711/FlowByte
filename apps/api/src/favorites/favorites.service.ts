import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { favorites, songs, artists, albums } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import { CacheService } from '../cache/cache.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { Song } from '@flowbyte/types';

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
    private readonly cache: CacheService,
    private readonly realtime: RealtimeService,
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
    // Guard so unknown/local-only ids surface a clean 404 instead of an FK error.
    const [row] = await this.db
      .select({ id: songs.id })
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);
    if (!row) throw new NotFoundException('Song not found');
    await this.db
      .insert(favorites)
      .values({ userId, songId })
      .onConflictDoNothing();
    await this.cache.delByPrefix(`songs:list:${userId}`);
    this.realtime.emitLibraryChanged(userId, { type: 'favorites_changed', songId });
  }

  /**
   * Batch favorite (multi-select). Validates ownership once, inserts with
   * `onConflictDoNothing`, and emits a single SSE event — the desktop island
   * previously fired one request per song, which could partially fail.
   */
  async addMany(userId: string, songIds: string[]): Promise<{ added: number }> {
    const unique = [...new Set(songIds)];
    if (unique.length === 0) return { added: 0 };
    const rows = await this.db
      .select({ id: songs.id })
      .from(songs)
      .where(inArray(songs.id, unique));
    const found = rows.map((r) => r.id);
    if (found.length === 0) throw new NotFoundException('Song not found');
    await this.db
      .insert(favorites)
      .values(found.map((songId) => ({ userId, songId })))
      .onConflictDoNothing();
    await this.cache.delByPrefix(`songs:list:${userId}`);
    this.realtime.emitLibraryChanged(userId, { type: 'favorites_changed', songId: found[0] });
    return { added: found.length };
  }

  async remove(userId: string, songId: string): Promise<void> {
    await this.db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)));
    await this.cache.delByPrefix(`songs:list:${userId}`);
    this.realtime.emitLibraryChanged(userId, { type: 'favorites_changed', songId });
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