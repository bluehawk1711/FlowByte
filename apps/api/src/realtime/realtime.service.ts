import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface RealtimeEvent {
  event: string;
  data: unknown;
}

export interface LibraryChangedPayload {
  type: 'song_added' | 'song_deleted' | 'song_updated' | 'favorites_changed' | 'playlist_changed';
  songId?: string;
  playlistId?: string;
}

export interface PlaybackChangedPayload {
  songId: string | null;
  position: number;
  isPlaying: boolean;
  deviceId: string | null;
}

/**
 * Manages per-user SSE streams. Other services inject this and call
 * emit* methods to push events to connected clients.
 *
 * Usage in other services:
 *   constructor(private readonly realtime: RealtimeService) {}
 *   // after mutation:
 *   this.realtime.emitLibraryChanged(userId, { type: 'song_added', songId });
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  /** userId → set of active Subjects (one per connected SSE client) */
  private readonly streams = new Map<string, Set<Subject<RealtimeEvent>>>();

  /**
   * Creates a new SSE subscription for a user. Returns an Observable
   * that the controller pipes to the client. The cleanup function
   * removes the subject when the client disconnects.
   */
  subscribe(userId: string): { observable: Observable<RealtimeEvent>; cleanup: () => void } {
    const subject = new Subject<RealtimeEvent>();
    let pool = this.streams.get(userId);
    if (!pool) {
      pool = new Set();
      this.streams.set(userId, pool);
    }
    pool.add(subject);
    this.logger.debug(`SSE client connected for user ${userId} (${pool.size} active)`);

    const cleanup = () => {
      pool?.delete(subject);
      if (pool.size === 0) this.streams.delete(userId);
      this.logger.debug(`SSE client disconnected for user ${userId} (${pool?.size ?? 0} active)`);
    };

    return { observable: subject.asObservable(), cleanup };
  }

  /** Number of active connections for a user (for diagnostics). */
  connectionCount(userId: string): number {
    return this.streams.get(userId)?.size ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Emit helpers — call these from other services
  // ---------------------------------------------------------------------------

  emitLibraryChanged(userId: string, payload: LibraryChangedPayload): void {
    this.emit(userId, { event: 'library:changed', data: payload });
  }

  emitPlaybackChanged(userId: string, payload: PlaybackChangedPayload): void {
    this.emit(userId, { event: 'playback:changed', data: payload });
  }

  private emit(userId: string, event: RealtimeEvent): void {
    const pool = this.streams.get(userId);
    if (!pool || pool.size === 0) {
      this.logger.debug(`No SSE listeners for user ${userId}, event dropped: ${event.event}`);
      return;
    }
    for (const subject of pool) {
      subject.next(event);
    }
  }
}
