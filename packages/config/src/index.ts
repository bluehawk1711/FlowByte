/**
 * Shared configuration helpers.
 */

export const API_DEFAULT_PORT = 3001;

/** Clients override via EXPO_PUBLIC_API_URL (mobile) / VITE_API_URL (desktop). */
export function defaultApiUrl(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  return `http://localhost:${API_DEFAULT_PORT}`;
}

export function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const AUDIO_TARGET_BITRATE = 160; // kbps Opus default
export const AUDIO_MIN_BITRATE = 128;
export const AUDIO_MAX_BITRATE = 320;
export const ARTWORK_MAX_DIMENSION = 800;
export const ARTWORK_FORMAT = 'webp';

export const PLAYBACK_SYNC_INTERVAL_MS = 12_000; // push position every ~12s
export const STREAM_TOKEN_TTL_SECONDS = 60 * 60; // 1h