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
  return new FlowbyteClient({
    baseUrl: getApiUrl(),
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
}

const DEFAULT_SETTINGS: DesktopSettings = {
  apiUrl: defaultApiUrl(),
  importBitrate: 160,
  importTranscode: false,
  notifyOnComplete: true,
  iframePreview: true,
};

export function getSettings(): DesktopSettings {
  const raw = localStorage.getItem(KEYS.settings);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<DesktopSettings>) } : DEFAULT_SETTINGS;
}

export function saveSettings(patch: Partial<DesktopSettings>): DesktopSettings {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(KEYS.settings, JSON.stringify(next));
  if (patch.apiUrl) setApiUrl(patch.apiUrl);
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