import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeEvent, LibraryChangedEvent, PlaybackChangedEvent } from '@flowbyte/types';
import { client } from '../lib/api';

export interface UseRealtimeOptions {
  /** Called when the library changes (song added/removed, favorites toggled). */
  onLibraryChanged?: (event: LibraryChangedEvent) => void;
  /** Called when another device updates playback state. */
  onPlaybackChanged?: (event: PlaybackChangedEvent) => void;
  /** Whether to enable the SSE connection. Defaults to true. */
  enabled?: boolean;
}

/**
 * Subscribes to server-sent events for real-time updates.
 * Automatically reconnects on errors (with exponential backoff).
 *
 * Usage:
 *   useRealtime({
 *     onLibraryChanged: () => refetchLibrary(),
 *     onPlaybackChanged: (e) => updatePlayerState(e),
 *   });
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { onLibraryChanged, onPlaybackChanged, enabled = true } = options;
  const unsubRef = useRef<(() => void) | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;

  const connect = useCallback(() => {
    if (!enabled) return;

    unsubRef.current = client.subscribeToEvents(
      (event: RealtimeEvent) => {
        // Reset retries on successful event
        retriesRef.current = 0;

        switch (event.event) {
          case 'library:changed':
            onLibraryChanged?.(event.data as LibraryChangedEvent);
            break;
          case 'playback:changed':
            onPlaybackChanged?.(event.data as PlaybackChangedEvent);
            break;
        }
      },
      () => {
        // On error, reconnect with exponential backoff
        if (retriesRef.current < maxRetries) {
          const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
          retriesRef.current++;
          setTimeout(connect, delay);
        }
      },
    );
  }, [enabled, onLibraryChanged, onPlaybackChanged]);

  useEffect(() => {
    connect();
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [connect]);
}
