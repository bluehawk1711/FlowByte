import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, max, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { playHistory, songs, artists, albums, devices } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import type { PlayHistoryEntry, RecentlyPlayedEntry } from '@flowbyte/types';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecordPlayDto {
  @IsString()
  @Min(1)
  songId: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class HistoryQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;
}

@Injectable()
export class HistoryService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
  ) {}

  async record(
    userId: string,
    dto: { songId: string; deviceId?: string },
  ): Promise<PlayHistoryEntry> {
    const [song] = await this.db.select().from(songs).where(eq(songs.id, dto.songId)).limit(1);
    if (!song) throw new NotFoundException('Song not found');
    const [row] = await this.db
      .insert(playHistory)
      .values({ userId, songId: dto.songId, deviceId: dto.deviceId ?? null })
      .returning();
    if (!row) throw new Error('Failed to record play');
    return {
      id: row.id,
      userId: row.userId,
      songId: row.songId,
      deviceId: row.deviceId,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
      durationPlayed: row.durationPlayed,
    };
  }

  async list(userId: string, limit: number): Promise<PlayHistoryEntry[]> {
    const rows = await this.db
      .select({
        entry: playHistory,
        song: songs,
        artistName: artists.name,
        albumName: albums.name,
        deviceName: devices.name,
      })
      .from(playHistory)
      .innerJoin(songs, eq(playHistory.songId, songs.id))
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .leftJoin(devices, eq(playHistory.deviceId, devices.id))
      .where(eq(playHistory.userId, userId))
      .orderBy(desc(playHistory.startedAt))
      .limit(limit);
    const songsList = await this.songsService.enrich(
      rows.map((r) => ({ song: r.song, artistName: r.artistName, albumName: r.albumName })),
      new Set(),
    );
    const byId = new Map(songsList.map((s) => [s.id, s]));
    return rows.map((r) => ({
      id: r.entry.id,
      userId: r.entry.userId,
      songId: r.entry.songId,
      deviceId: r.entry.deviceId,
      startedAt: r.entry.startedAt.toISOString(),
      endedAt: r.entry.endedAt ? r.entry.endedAt.toISOString() : null,
      durationPlayed: r.entry.durationPlayed,
      song: r.entry.songId ? byId.get(r.entry.songId) : undefined,
    }));
  }

  async recentlyPlayed(userId: string, limit: number): Promise<RecentlyPlayedEntry[]> {
    const sub = this.db
      .select({
        songId: playHistory.songId,
        lastPlayedAt: max(playHistory.startedAt),
        playCount: count(),
      })
      .from(playHistory)
      .where(eq(playHistory.userId, userId))
      .groupBy(playHistory.songId)
      .orderBy(desc(max(playHistory.startedAt)))
      .limit(limit)
      .as('recent');

    const rows = await this.db
      .select({
        songId: sql<string>`${sub.songId}`,
        lastPlayedAt: sql<Date>`${sub.lastPlayedAt}`,
        playCount: sql<number>`${sub.playCount}`,
        song: songs,
        artistName: artists.name,
        albumName: albums.name,
      })
      .from(sub)
      .innerJoin(songs, eq(sub.songId, songs.id))
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id));
    const songsList = await this.songsService.enrich(
      rows.map((r) => ({ song: r.song, artistName: r.artistName, albumName: r.albumName })),
      new Set(),
    );
    const byId = new Map(songsList.map((s) => [s.id, s]));
    const out: RecentlyPlayedEntry[] = [];
    for (const r of rows) {
      const songId = r.songId;
      const lastPlayedAt = r.lastPlayedAt;
      const song = songId ? byId.get(songId) : undefined;
      if (!song) continue;
      out.push({
        song,
        lastPlayedAt: lastPlayedAt.toISOString(),
        playCount: Number(r.playCount),
      });
    }
    return out;
  }
}