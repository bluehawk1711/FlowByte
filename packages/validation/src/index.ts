/**
 * Shared validation helpers. Plain functions/constants usable from both
 * class-validator decorators (API) and client-side checks (desktop/mobile).
 */

export const YOUTUBE_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/.+/i;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const TITLE_MAX_LENGTH = 300;
export const NAME_MAX_LENGTH = 100;

export function isYouTubeUrl(value: string): boolean {
  return YOUTUBE_URL_PATTERN.test(value.trim());
}

export interface ParsedYouTubeUrl {
  videoId: string | null;
  playlistId: string | null;
  isPlaylist: boolean;
}

/** Extract video/playlist ids from a YouTube URL (watch/youtu.be/embed/shorts/playlist). */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  const trimmed = url.trim();
  if (!YOUTUBE_URL_PATTERN.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const playlistId = parsed.searchParams.get('list');
    const videoId =
      parsed.searchParams.get('v') ??
      (parsed.hostname.endsWith('youtu.be') ? parsed.pathname.split('/')[1] : undefined) ??
      (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/shorts/')
        ? parsed.pathname.split('/')[2]
        : undefined) ??
      null;
    return { videoId, playlistId, isPlaylist: videoId === null && playlistId !== null };
  } catch {
    return null;
  }
}

export function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidPassword(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH
  );
}

export function isValidUsername(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    /^[a-zA-Z0-9_.-]+$/.test(value)
  );
}

export function isValidEmail(value: string): boolean {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Extract a YouTube video ID from any known YouTube URL form, or null. */
export function extractYouTubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^music\./, '');
  if (host === 'youtu.be') {
    return parsed.pathname.split('/')[1] ?? null;
  }
  if (host === 'youtube.com') {
    const v = parsed.searchParams.get('v');
    if (v) return v;
    const live = parsed.searchParams.get('live');
    if (live) return live;
    // Handle /embed/<id> and /shorts/<id>
    const pathMatch = parsed.pathname.match(/^\/(embed|shorts)\/([^/?]+)/);
    if (pathMatch?.[2]) return pathMatch[2];
  }
  return null;
}