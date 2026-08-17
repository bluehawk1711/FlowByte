import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { playbackState, songs, artists, albums, devices } from '../db/schema';
import { SongsService } from '../songs/songs.service';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { PlaybackState } from '@flowbyte/types';

export class SyncPlaybackDto {
  @IsOptional()
  @IsString()
  songId?: string | null;

  @IsInt()
  @Min(0)
  position: number;

  @IsBoolean()
  isPlaying: boolean;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

@Injectable()
export class PlaybackService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly songsService: SongsService,
  ) {}

  async get(userId: string): Promise<PlaybackState> {
    const [row] = await this.db
      .select()
      .from(playbackState)
      .where(eq(playbackState.userId, userId))
      .limit(1);
    if (!row) {
      return {
        userId,
        songId: null,
        position: 0,
        isPlaying: false,
        deviceId: null,
        updatedAt: new Date().toISOString(),
        song: null,
      };
    }
    let song: PlaybackState['song'] = null;
    if (row.songId) {
      try {
        song = await this.songsService.findById(row.songId);
      } catch {
        song = null;
      }
    }
    return {
      userId: row.userId,
      songId: row.songId,
      position: row.position,
      isPlaying: row.isPlaying,
      deviceId: row.deviceId,
      updatedAt: row.updatedAt.toISOString(),
      song,
    };
  }

  async sync(userId: string, dto: SyncPlaybackDto): Promise<PlaybackState> {
    let deviceId = dto.deviceId ?? null;
    if (deviceId) {
      // keep device last_seen fresh; ignore unknown device ids
      await this.db
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(eq(devices.id, deviceId));
      const [exists] = await this.db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);
      if (!exists) deviceId = null;
    }

    await this.db
      .insert(playbackState)
      .values({
        userId,
        songId: dto.songId ?? null,
        position: dto.position,
        isPlaying: dto.isPlaying,
        deviceId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: playbackState.userId,
        set: {
          songId: dto.songId ?? null,
          position: dto.position,
          isPlaying: dto.isPlaying,
          deviceId,
          updatedAt: new Date(),
        },
      });
    return this.get(userId);
  }
}