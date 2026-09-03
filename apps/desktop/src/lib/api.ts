import { FlowbyteClient, type TokenStorage } from '@flowbyte/api-client';
import type { AuthTokens } from '@flowbyte/types';
import { defaultApiUrl } from '@flowbyte/config';
import type { Song } from '@flowbyte/types';
import { assetUrl } from './tauri';

const KEYS = {
  tokens: 'flowbyte.tokens',
  apiUrl: 'flowbyte.apiUrl',
  deviceId: 'flowbyte.deviceId',
  settings: 'flowbyte.settings',
  savedPlaylists: 'flowbyte.savedPlaylists',
};

const localStorageStorage: TokenStorage = {
  async getTokens(): Promise<AuthTokens | null> {
    const raw = localStorage.getItem(KEYS.tokens);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  },
  async setTokens(tokens: AuthTokens): Promise<void> {
    localStorage.setItem(KEYS.tokens, JSON.stringify(tokens));
  },
  async clear(): Promise<void> {
    localStorage.removeItem(KEYS.tokens);
  },
};

export function getDeviceId(): string {
  let id = localStorage.getItem(KEYS.deviceId);
  if (!id) {
    id = `fb-desktop-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}

export function getApiUrl(): string {
  return localStorage.getItem(KEYS.apiUrl) ?? defaultApiUrl();
}

export function setApiUrl(url: string): void {
  localStorage.setItem(KEYS.apiUrl, url);
  client = createClient();
}

function createClient(): FlowbyteClient {
  const base = getApiUrl().replace(/\/+$/, '');
  return new FlowbyteClient({
    baseUrl: `${base}/api`,
    tokenStorage: localStorageStorage,
    platform: 'desktop',
    deviceName: `flowbyte-desktop-${getDeviceId().slice(-6)}`,
  });
}

export let client: FlowbyteClient = createClient();

export interface DesktopSettings {
  apiUrl: string;
  importBitrate: number;
  importTranscode: boolean;
  notifyOnComplete: boolean;
  /** Show an embedded YouTube iframe preview of pasted videos (with download button). */
  iframePreview: boolean;
  /**
   * Upload imported songs to the cloud library automatically? Default OFF —
   * imports are downloaded locally and stay playable; uploading is always
   * available per-song from the Downloads page.
   */
  uploadImports: boolean;
  /** SmoothUI cursor-follow glow (custom cursor) — toggled from Settings. */
  cursorFollow: boolean;
}

const DEFAULT_SETTINGS: DesktopSettings = {
  apiUrl: defaultApiUrl(),
  importBitrate: 160,
  importTranscode: false,
  notifyOnComplete: true,
  iframePreview: true,
  uploadImports: false,
  cursorFollow: false,
};

export function getSettings(): DesktopSettings {
  const raw = localStorage.getItem(KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<DesktopSettings>) } : DEFAULT_SETTINGS;
}

// Settings change notifications (keeps app-level effects live, e.g. cursor)
type SettingsListener = (settings: DesktopSettings) => void;
const settingsListeners = new Set<SettingsListener>();

export function subscribeSettings(listener: SettingsListener): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export function saveSettings(patch: Partial<DesktopSettings>): DesktopSettings {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  if (patch.apiUrl) setApiUrl(patch.apiUrl);
  for (const listener of settingsListeners) listener(next);
  return next;
}

/**
 * Resolve the playable URL for a song (hybrid playback, mirror of mobile):
 * local file on disk → Tauri asset URL; otherwise signed/proxy stream URL.
 */
export async function resolvePlayUrl(song: Song): Promise<string> {
  if (song.localUri || (song.source === 'local' && song.url)) {
    return assetUrl(song.localUri ?? song.url!);
  }
  if (song.streamUrl) return song.streamUrl;
  const { url } = await client.getStreamUrl(song.id);
  return url;
}

// ---------------------------------------------------------------------------
// Saved YouTube playlists ("save a video/playlist to play later")
// ---------------------------------------------------------------------------

export interface SavedPlaylistItem {
  id: string;
  url: string;
  videoId: string | null;
  playlistId: string | null;
  title: string;
  thumbnail: string | null;
  isPlaylist: boolean;
  savedAt: string;
  importedSongId?: string;
  /** Local file of a downloaded (not uploaded) import — plays offline-first. */
  localFilePath?: string | null;
  /** On-disk thumbnail of the local import (shown instead of the remote one). */
  localArtworkPath?: string | null;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  createdAt: string;
  items: SavedPlaylistItem[];
}

export function getSavedPlaylists(): SavedPlaylist[] {
  const raw = localStorage.getItem(KEYS.savedPlaylists);
  return raw ? (JSON.parse(raw) as SavedPlaylist[]) : [];
}

function persistSavedPlaylists(list: SavedPlaylist[]): void {
  localStorage.setItem(KEYS.savedPlaylists, JSON.stringify(list));
  emitSavedPlaylistsChanged();
}

// ---------------------------------------------------------------------------
// Saved-playlist change notifications (keeps sidebar + Saved page in sync)
// ---------------------------------------------------------------------------

type PlaylistListener = () => void;

const playlistListeners = new Set<PlaylistListener>();

/** Subscribe to any saved-playlist mutation (add/remove/rename/delete). */
export function subscribeSavedPlaylists(listener: PlaylistListener): () => void {
  playlistListeners.add(listener);
  return () => {
    playlistListeners.delete(listener);
  };
}

function emitSavedPlaylistsChanged(): void {
  for (const listener of playlistListeners) listener();
}

export function createSavedPlaylist(name: string): SavedPlaylist {
  const playlist: SavedPlaylist = {
    id: `sp-${Date.now().toString(36)}`,
    name: name.trim() || 'Saved',
    createdAt: new Date().toISOString(),
    items: [],
  };
  persistSavedPlaylists([...getSavedPlaylists(), playlist]);
  return playlist;
}

export function deleteSavedPlaylist(id: string): void {
  persistSavedPlaylists(getSavedPlaylists().filter((p) => p.id !== id));
}

export function renameSavedPlaylist(id: string, name: string): void {
  persistSavedPlaylists(
    getSavedPlaylists().map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)),
  );
}

export function addToSavedPlaylist(
  playlistId: string,
  item: Omit<SavedPlaylistItem, 'id' | 'savedAt'>,
): void {
  persistSavedPlaylists(
    getSavedPlaylists().map((p) =>
      p.id === playlistId
        ? {
            ...p,
            items: [
              { ...item, id: `si-${Date.now().toString(36)}`, savedAt: new Date().toISOString() },
              ...p.items,
            ],
          }
        : p,
    ),
  );
}

export function removeSavedItem(playlistId: string, itemId: string): void {
  persistSavedPlaylists(
    getSavedPlaylists().map((p) =>
      p.id === playlistId ? { ...p, items: p.items.filter((i) => i.id !== itemId) } : p,
    ),
  );
}

export function stampSavedItemImported(
  videoId: string,
  songId: string,
): void {
  persistSavedPlaylists(
    getSavedPlaylists().map((p) => ({
      ...p,
      items: p.items.map((i) =>
        i.videoId === videoId ? { ...i, importedSongId: songId } : i,
      ),
    })),
  );
}

/**
 * Remember the on-disk file of a downloaded (not uploaded) import per video.
 * `artworkPath` (yt-dlp's local thumbnail) is stored alongside it so local
 * songs can show real artwork without uploading anything.
 */
export function stampSavedItemLocalFile(
  videoId: string,
  filePath: string,
  artworkPath?: string | null,
): void {
  const list = getSavedPlaylists();
  let changed = false;
  const next = list.map((p) => ({
    ...p,
    items: p.items.map((i) => {
      if (i.videoId !== videoId || i.localFilePath === filePath) return i;
      changed = true;
      return { ...i, localFilePath: filePath, localArtworkPath: artworkPath ?? null };
    }),
  }));
  if (changed) persistSavedPlaylists(next);
}

/**
 * Build a type-safe client-only `Song` for a file that lives on disk. Used to
 * play a downloaded import without uploading it to the cloud library — the
 * URL/localUri are resolved through `convertFileSrc` by `resolvePlayUrl`. If
 * a local thumbnail was downloaded next to the audio it is exposed through
 * `cover` so every surface (rows, player, cards) shows real artwork.
 */
export function localImportSong(input: {
  id: string;
  title: string;
  artistName?: string | null;
  duration?: number;
  year?: number | null;
  genre?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  filePath: string;
  /** On-disk thumbnail (e.g. `…/imports/<video>.webp`). */
  artworkPath?: string | null;
}): Song {
  const now = new Date().toISOString();
  return {
    id: input.id,
    title: input.title,
    artistId: null,
    artistName: input.artistName ?? null,
    albumId: null,
    albumName: null,
    duration: input.duration ?? 0,
    trackNumber: null,
    year: input.year ?? null,
    genre: input.genre ?? null,
    language: null,
    codec: null,
    bitrate: null,
    fileSize: null,
    artworkStorageKey: null,
    artworkUrl: null,
    cover: input.artworkPath ? assetUrl(input.artworkPath) : undefined,
    lyricsStorageKey: null,
    lyricsLanguage: null,
    lyricsSynced: false,
    sourceUrl: input.sourceUrl ?? null,
    sourceId: input.sourceId ?? null,
    createdAt: now,
    updatedAt: now,
    url: input.filePath,
    localUri: input.filePath,
    source: 'local',
    isDownloaded: true,
  };
}