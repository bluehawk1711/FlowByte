import { useEffect, useRef, useCallback } from 'react';
import type { LibraryChangedEvent, PlaybackChangedEvent, RealtimeEvent } from '@flowbyte/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '@/lib/api';

const KEYS = {
  tokens: 'flowbyte.tokens',
};

export interface UseRealtimeOptions {
  onLibraryChanged?: (event: LibraryChangedEvent) => void;
  onPlaybackChanged?: (event: PlaybackChangedEvent) => void;
  enabled?: boolean;
}

/**
 * SSE hook for React Native. Uses fetch with streaming since EventSource
 * doesn't exist in React Native. Automatically reconnects on errors.
 */
export function useRealtime(options: UseRealtimeOptions = {}) {
  const { onLibraryChanged, onPlaybackChanged, enabled = true } = options;
  const abortRef = useRef<AbortController | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Abort any existing connection
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const tokensRaw = await AsyncStorage.getItem(KEYS.tokens);
      const tokens = tokensRaw ? (JSON.parse(tokensRaw) as { accessToken?: string }) : null;
      if (!tokens?.accessToken || controller.signal.aborted) return;

      const baseUrl = await getApiUrl();
      const url = `${baseUrl}/api/realtime/events?token=${encodeURIComponent(tokens.accessToken)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      // Reset retries on successful connection
      retriesRef.current = 0;

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || controller.signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim();
          } else if (line === '' && eventType && eventData) {
            // Empty line signals end of event
            try {
              const parsed = JSON.parse(eventData) as RealtimeEvent['data'];
              handleEvent(eventType, parsed);
            } catch {
              // Skip malformed events
            }
            eventType = '';
            eventData = '';
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      // Reconnect with exponential backoff
      if (retriesRef.current < maxRetries) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 30_000);
        retriesRef.current++;
        setTimeout(connect, delay);
      }
    }
  }, [enabled, onLibraryChanged, onPlaybackChanged]);

  const handleEvent = useCallback(
    (eventType: string, data: unknown) => {
      switch (eventType) {
        case 'library:changed':
          onLibraryChanged?.(data as LibraryChangedEvent);
          break;
        case 'playback:changed':
          onPlaybackChanged?.(data as PlaybackChangedEvent);
          break;
      }
    },
    [onLibraryChanged, onPlaybackChanged],
  );

  useEffect(() => {
    void connect();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [connect]);
}
