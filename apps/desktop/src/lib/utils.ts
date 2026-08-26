import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function isYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url.trim());
}

export interface ParsedYouTubeUrl {
  videoId: string | null;
  playlistId: string | null;
  isPlaylist: boolean;
}

/**
 * Extract video/playlist ids from a YouTube URL.
 * Handles watch?v=, youtu.be/<id>, youtube.com/embed/<id>, shorts/<id>,
 * playlist?list= and watch?v=…&list=….
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  const trimmed = url.trim();
  if (!isYouTubeUrl(trimmed)) return null;
  const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  const playlistId = parsed.searchParams.get('list');
  const videoId =
    parsed.searchParams.get('v') ??
    (parsed.hostname.endsWith('youtu.be') ? parsed.pathname.split('/')[1] : undefined) ??
    (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')
      ? parsed.pathname.split('/')[2]
      : undefined) ??
    null;
  return {
    videoId,
    playlistId,
    isPlaylist: videoId === null && playlistId !== null,
  };
}