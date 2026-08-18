import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { playlistSongs, playlists, songs, artists, albums } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import { CacheService } from '../cache/cache.service';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import type { Playlist, PlaylistDetail, Song } from '@flowbyte/types';
import type { CreatePlaylistDto, UpdatePlaylistDto } from './dto/playlist.dto';

const LIST_TTL = 120;
const DETAIL_TTL = 120;

@Injectable()
export class PlaylistsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly cache: CacheService,
  ) {}

  private listKey(userId: string): string {
    return `playlists:list:${userId}`;
  }

  private detailKey(userId: string, id: string): string {
    return `playlists:detail:${userId}:${id}`;
  }

  async list(userId: string): Promise<Playlist[]> {
    const cacheKey = this.listKey(userId);
    const cached = await this.cache.get<Playlist[]>(cacheKey);
    if (cached) return cached;

    const rows = await this.db
      .select({
        playlist: playlists,
        songCount: count(playlistSongs.songId),
      })
      .from(playlists)
      .leftJoin(playlistSongs, eq(playlistSongs.playlistId, playlists.id))
      .where(eq(playlists.userId, userId))
      .groupBy(playlists.id)
      .orderBy(asc(playlists.name));
    const result = await Promise.all(
      rows.map(async (r) => ({
        id: r.playlist.id,
        userId: r.playlist.userId,
        name: r.playlist.name,
        description: r.playlist.description,
        artworkStorageKey: r.playlist.artworkStorageKey,
        artworkUrl: await this.songsService.artworkUrl(r.playlist.artworkStorageKey),
        songCount: Number(r.songCount),
        createdAt: r.playlist.createdAt.toISOString(),
        updatedAt: r.playlist.updatedAt.toISOString(),
      })),
    );
    await this.cache.set(cacheKey, result, LIST_TTL);
    return result;
  }

  async getDetail(userId: string, id: string): Promise<PlaylistDetail> {
    const cacheKey = this.detailKey(userId, id);
    const cached = await this.cache.get<PlaylistDetail>(cacheKey);
    if (cached) return cached;

    const [row] = await this.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Playlist not found');

    const songRows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(playlistSongs)
      .innerJoin(songs, eq(playlistSongs.songId, songs.id))
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(playlistSongs.playlistId, id))
      .orderBy(asc(playlistSongs.position));
    const items: Song[] = await this.songsService.enrich(songRows, new Set());

    const result: PlaylistDetail = {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      artworkStorageKey: row.artworkStorageKey,
      artworkUrl: await this.songsService.artworkUrl(row.artworkStorageKey),
      songCount: items.length,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      songs: items,
    };
    await this.cache.set(cacheKey, result, DETAIL_TTL);
    return result;
  }

  async create(userId: string, dto: CreatePlaylistDto): Promise<Playlist> {
    const [row] = await this.db
      .insert(playlists)
      .values({ userId, name: dto.name, description: dto.description ?? null })
      .returning();
    if (!row) throw new Error('Failed to create playlist');
    await this.cache.del(this.listKey(userId));
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      artworkStorageKey: null,
      artworkUrl: null,
      songCount: 0,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(userId: string, id: string, dto: UpdatePlaylistDto): Promise<Playlist> {
    const existing = await this.ensureOwned(userId, id);
    const [row] = await this.db
      .update(playlists)
      .set({
        name: dto.name ?? existing.name,
        description: dto.description !== undefined ? dto.description : existing.description,
        updatedAt: new Date(),
      })
      .where(eq(playlists.id, id))
      .returning();
    if (!row) throw new Error('Failed to update playlist');
    await this.cache.del(this.listKey(userId));
    await this.cache.del(this.detailKey(userId, id));
    return this.list(userId).then((l) => l.find((p) => p.id === id)!);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureOwned(userId, id);
    await this.db.delete(playlists).where(eq(playlists.id, id));
    await this.cache.del(this.listKey(userId));
    await this.cache.del(this.detailKey(userId, id));
  }

  async addSong(userId: string, playlistId: string, songId: string): Promise<void> {
    await this.ensureOwned(userId, playlistId);
    const [exists] = await this.db
      .select()
      .from(songs)
      .where(eq(songs.id, songId))
      .limit(1);
    if (!exists) throw new NotFoundException('Song not found');
    const [maxRow] = await this.db
      .select({ maxPos: sql<number>`coalesce(max(${playlistSongs.position}), -1)` })
      .from(playlistSongs)
      .where(eq(playlistSongs.playlistId, playlistId));
    await this.db
      .insert(playlistSongs)
      .values({ playlistId, songId, position: (maxRow?.maxPos ?? -1) + 1 })
      .onConflictDoNothing();
    await this.cache.del(this.detailKey(userId, playlistId));
    await this.cache.del(this.listKey(userId));
  }

  async removeSong(userId: string, playlistId: string, songId: string): Promise<void> {
    await this.ensureOwned(userId, playlistId);
    await this.db
      .delete(playlistSongs)
      .where(and(eq(playlistSongs.playlistId, playlistId), eq(playlistSongs.songId, songId)));
    await this.cache.del(this.detailKey(userId, playlistId));
    await this.cache.del(this.listKey(userId));
  }

  async reorder(userId: string, playlistId: string, songIds: string[]): Promise<void> {
    await this.ensureOwned(userId, playlistId);
    await this.db.transaction(async (tx) => {
      for (let i = 0; i < songIds.length; i++) {
        await tx
          .update(playlistSongs)
          .set({ position: i })
          .where(
            and(
              eq(playlistSongs.playlistId, playlistId),
              eq(playlistSongs.songId, songIds[i]!),
            ),
          );
      }
    });
    await this.cache.del(this.detailKey(userId, playlistId));
  }

  private async ensureOwned(userId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Playlist not found');
    return row;
  }
}