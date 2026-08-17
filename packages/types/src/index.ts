/**
 * Shared Flowbyte types. The single source of truth for API models.
 * Consumers: apps/api, apps/desktop, apps/mobile. Never redefine these per app.
 */

// ---------------------------------------------------------------------------
// Auth / Users / Devices
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  platform: string;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export interface Artist {
  id: string;
  name: string;
  artworkStorageKey: string | null;
  artworkUrl: string | null;
}

export interface Album {
  id: string;
  name: string;
  artistId: string | null;
  artistName: string | null;
  artworkStorageKey: string | null;
  artworkUrl: string | null;
  releaseYear: number | null;
}

export type SongSource = 'api' | 'local';

export interface Song {
  id: string;
  title: string;
  artistId: string | null;
  artistName: string | null;
  albumId: string | null;
  albumName: string | null;
  duration: number;
  trackNumber: number | null;
  year: number | null;
  genre: string | null;
  language: string | null;
  codec: string | null;
  bitrate: number | null;
  fileSize: number | null;
  artworkStorageKey: string | null;
  artworkUrl: string | null;
  lyricsStorageKey: string | null;
  lyricsLanguage: string | null;
  lyricsSynced: boolean;
  sourceUrl: string | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
  // --- playback/mobile additions (optional, client-side) ---
  url?: string;
  cover?: string;
  streamUrl?: string;
  source?: SongSource;
  isDownloaded?: boolean;
  localUri?: string;
  downloadStatus?: 'none' | 'downloading' | 'downloaded' | 'error';
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  artworkStorageKey: string | null;
  artworkUrl: string | null;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetail extends Playlist {
  songs: Song[];
}

export interface Favorite {
  userId: string;
  songId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// History / Playback
// ---------------------------------------------------------------------------

export interface PlayHistoryEntry {
  id: string;
  userId: string;
  songId: string | null;
  deviceId: string | null;
  startedAt: string;
  endedAt: string | null;
  durationPlayed: number | null;
  song?: Song;
}

export interface PlaybackState {
  userId: string;
  songId: string | null;
  position: number;
  isPlaying: boolean;
  deviceId: string | null;
  updatedAt: string;
  song?: Song | null;
}

export interface PlaybackSyncPayload {
  songId: string | null;
  position: number;
  isPlaying: boolean;
  deviceId: string;
}

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

export interface LyricsLine {
  start: number;
  end: number | null;
  text: string;
}

export interface NormalizedLyrics {
  version: 1;
  language: string;
  synced: boolean;
  lines: LyricsLine[];
}

export interface SongWithLyrics extends Song {
  lyrics: NormalizedLyrics | null;
}

// ---------------------------------------------------------------------------
// Downloads / processing (desktop pipeline)
// ---------------------------------------------------------------------------

export type DownloadStatus =
  | 'starting'
  | 'preparing'
  | 'downloading'
  | 'processing'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadProgress {
  percent: number;
  speed: string;
  eta: string;
  status: DownloadStatus;
  detail: string;
  stage?: 'download' | 'transcode' | 'artwork' | 'lyrics' | 'upload';
  outputId?: string;
}

export interface VideoInfo {
  success: boolean;
  title: string;
  uploader: string | null;
  duration: number | null;
  thumbnail: string | null;
  views: number | null;
  uploadDate: string | null;
  videoId: string | null;
  extractor: string | null;
  error?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Search / Lists
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LibrarySearchParams {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface RecentlyPlayedEntry {
  song: Song;
  lastPlayedAt: string;
  playCount: number;
}