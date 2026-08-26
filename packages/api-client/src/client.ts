/**
 * Shared Flowbyte API client. Plain fetch — works in React Native, browsers
 * (desktop React), and Node. No axios, no localStorage coupling.
 */

import type {
  Album,
  Artist,
  AuthResponse,
  AuthTokens,
  Device,
  LibrarySearchParams,
  NormalizedLyrics,
  Paginated,
  PlaybackState,
  PlaybackSyncPayload,
  PlayHistoryEntry,
  Playlist,
  PlaylistDetail,
  RecentlyPlayedEntry,
  Song,
  SongWithLyrics,
  User,
  RealtimeEvent,
} from '@flowbyte/types';

/** Pluggable token persistence (AsyncStorage on mobile, localStorage on desktop). */
export interface TokenStorage {
  getTokens(): Promise<AuthTokens | null>;
  setTokens(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

export class FlowbyteError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'FlowbyteError';
  }
}

export interface FlowbyteClientOptions {
  baseUrl: string;
  tokenStorage: TokenStorage;
  /** e.g. 'flowbyte-mobile' / 'flowbyte-desktop' */
  platform: string;
  /** stable per-install device id */
  deviceName: string;
  fetchImpl?: typeof fetch;
}

type Body = Record<string, unknown> | undefined;
type FetchBody = Parameters<typeof fetch>[1] extends { body?: infer B } ? B : never;

export class FlowbyteClient {
  private readonly baseUrl: string;
  private readonly tokenStorage: TokenStorage;
  private readonly platform: string;
  private readonly deviceName: string;
  private readonly fetchImpl: typeof fetch;
  private refreshing: Promise<AuthTokens> | null = null;

  constructor(options: FlowbyteClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.tokenStorage = options.tokenStorage;
    this.platform = options.platform;
    this.deviceName = options.deviceName;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  get isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  // -------------------------------------------------------------------------
  // Core request machinery
  // -------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: Body,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extraHeaders,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const tokens = await this.tokenStorage.getTokens();
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (
      res.status === 401 &&
      tokens &&
      path !== '/auth/refresh' &&
      !path.startsWith('/auth/login')
    ) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        const retry = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse<T>(retry);
      }
    }

    return this.handleResponse<T>(res);
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) throw await this.errorFrom(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async errorFrom(res: Response): Promise<FlowbyteError> {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    let details: unknown;
    try {
      const data = (await res.json()) as {
        message?: string;
        error?: string;
        code?: string;
        details?: unknown;
      };
      if (typeof data.message === 'string') message = data.message;
      if (data.error) message = data.error;
      code = data.code;
      details = data.details;
    } catch {
      // non-JSON error body
    }
    return new FlowbyteError(message, res.status, code, details);
  }

  private async tryRefresh(): Promise<AuthTokens | null> {
    if (this.refreshing) return this.refreshing.catch(() => null);
    const tokens = await this.tokenStorage.getTokens();
    if (!tokens?.refreshToken) return null;
    this.refreshing = (async () => {
      try {
        const res = await this.fetchImpl(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!res.ok) {
          await this.tokenStorage.clear();
          throw new FlowbyteError('Refresh failed', res.status);
        }
        const data = (await res.json()) as AuthTokens;
        await this.tokenStorage.setTokens(data);
        return data;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  async register(input: {
    username: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/register', input);
    await this.tokenStorage.setTokens(res.tokens);
    return res;
  }

  async login(input: { usernameOrEmail: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('POST', '/auth/login', input);
    await this.tokenStorage.setTokens(res.tokens);
    return res;
  }

  async logout(): Promise<void> {
    await this.request<void>('POST', '/auth/logout').catch(() => undefined);
    await this.tokenStorage.clear();
  }

  async me(): Promise<User> {
    return this.request<User>('GET', '/auth/me');
  }

  // -------------------------------------------------------------------------
  // Library
  // -------------------------------------------------------------------------

  async getSongs(params: LibrarySearchParams = {}): Promise<Paginated<Song>> {
    const qs = new URLSearchParams();
    if (params.query) qs.set('q', params.query);
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    const query = qs.toString();
    return this.request<Paginated<Song>>('GET', `/songs${query ? `?${query}` : ''}`);
  }

  async getSong(id: string): Promise<Song> {
    return this.request<Song>('GET', `/songs/${id}`);
  }

  async getSongWithLyrics(id: string): Promise<SongWithLyrics> {
    return this.request<SongWithLyrics>('GET', `/songs/${id}/lyrics`);
  }

  /** Signed URL for streaming/downloading (or local proxy URL). */
  async getStreamUrl(songId: string): Promise<{ url: string; expiresIn: number }> {
    return this.request<{ url: string; expiresIn: number }>('GET', `/songs/${songId}/stream`);
  }

  async getArtists(): Promise<Artist[]> {
    return this.request<Artist[]>('GET', '/artists');
  }

  async getArtist(id: string): Promise<{ artist: Artist; songs: Song[]; albums: Album[] }> {
    return this.request<{ artist: Artist; songs: Song[]; albums: Album[] }>(
      'GET',
      `/artists/${id}`,
    );
  }

  async getAlbums(): Promise<Album[]> {
    return this.request<Album[]>('GET', '/albums');
  }

  async getAlbum(id: string): Promise<{ album: Album; songs: Song[] }> {
    return this.request<{ album: Album; songs: Song[] }>('GET', `/albums/${id}`);
  }

  async search(params: LibrarySearchParams): Promise<{
    songs: Song[];
    artists: Artist[];
    albums: Album[];
  }> {
    const qs = new URLSearchParams();
    if (params.query) qs.set('q', params.query);
    const query = qs.toString();
    return this.request('GET', `/search${query ? `?${query}` : ''}`);
  }

  // -------------------------------------------------------------------------
  // Favorites
  // -------------------------------------------------------------------------

  async getFavorites(): Promise<Song[]> {
    return this.request<Song[]>('GET', '/favorites');
  }

  async addFavorite(songId: string): Promise<void> {
    return this.request<void>('POST', `/favorites/${songId}`);
  }

  async removeFavorite(songId: string): Promise<void> {
    return this.request<void>('DELETE', `/favorites/${songId}`);
  }

  async isFavorite(songId: string): Promise<boolean> {
    try {
      await this.request('GET', `/favorites/${songId}`);
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Playlists
  // -------------------------------------------------------------------------

  async getPlaylists(): Promise<Playlist[]> {
    return this.request<Playlist[]>('GET', '/playlists');
  }

  async getPlaylist(id: string): Promise<PlaylistDetail> {
    return this.request<PlaylistDetail>('GET', `/playlists/${id}`);
  }

  async createPlaylist(input: { name: string; description?: string }): Promise<Playlist> {
    return this.request<Playlist>('POST', '/playlists', input);
  }

  async updatePlaylist(id: string, input: { name?: string; description?: string }): Promise<Playlist> {
    return this.request<Playlist>('PATCH', `/playlists/${id}`, input);
  }

  async deletePlaylist(id: string): Promise<void> {
    return this.request<void>('DELETE', `/playlists/${id}`);
  }

  async addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
    return this.request<void>('POST', `/playlists/${playlistId}/songs`, { songId });
  }

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
    return this.request<void>('DELETE', `/playlists/${playlistId}/songs/${songId}`);
  }

  async reorderPlaylist(playlistId: string, songIds: string[]): Promise<void> {
    return this.request<void>('PUT', `/playlists/${playlistId}/songs/order`, { songIds });
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  async getHistory(limit = 50): Promise<PlayHistoryEntry[]> {
    return this.request<PlayHistoryEntry[]>('GET', `/history?limit=${limit}`);
  }

  async recordPlay(input: { songId: string; deviceId: string }): Promise<PlayHistoryEntry> {
    return this.request<PlayHistoryEntry>('POST', '/history', input);
  }

  async recentlyPlayed(limit = 20): Promise<RecentlyPlayedEntry[]> {
    return this.request<RecentlyPlayedEntry[]>('GET', `/history/recent?limit=${limit}`);
  }

  // -------------------------------------------------------------------------
  // Playback sync
  // -------------------------------------------------------------------------

  async getPlaybackState(): Promise<PlaybackState> {
    return this.request<PlaybackState>('GET', '/playback/state');
  }

  async syncPlayback(payload: PlaybackSyncPayload): Promise<PlaybackState> {
    return this.request<PlaybackState>('PUT', '/playback/state', { ...payload });
  }

  // -------------------------------------------------------------------------
  // Devices
  // -------------------------------------------------------------------------

  async registerDevice(): Promise<Device> {
    return this.request<Device>('POST', '/devices', {
      name: this.deviceName,
      platform: this.platform,
    });
  }

  async getDevices(): Promise<Device[]> {
    return this.request<Device[]>('GET', '/devices');
  }

  async removeDevice(id: string): Promise<void> {
    return this.request<void>('DELETE', `/devices/${id}`);
  }

  // -------------------------------------------------------------------------
  // Uploads (desktop pipeline)
  // -------------------------------------------------------------------------

  /** Raw POST of arbitrary bytes (audio/artwork) with auth — no JSON wrapper. */
  private async rawUpload<T>(
    path: string,
    bytes: ArrayBuffer | Uint8Array,
    contentType: string,
    query?: string,
  ): Promise<T> {
    const tokens = await this.tokenStorage.getTokens();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
    const res = await this.fetchImpl(`${this.baseUrl}${path}${query ?? ''}`, {
      method: 'POST',
      headers,
      body: bytes as FetchBody,
    });
    if (res.status === 401 && tokens) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        const retry = await this.fetchImpl(`${this.baseUrl}${path}${query ?? ''}`, {
          method: 'POST',
          headers,
          body: bytes as FetchBody,
        });
        return this.handleResponse<T>(retry);
      }
    }
    return this.handleResponse<T>(res);
  }

  /** Upload raw audio bytes; returns the storage key to pass to completeSongUpload. */
  async uploadAudio(bytes: ArrayBuffer | Uint8Array, ext: string): Promise<{ storageKey: string; fileSize: number }> {
    return this.rawUpload<{ storageKey: string; fileSize: number }>(
      '/uploads/audio',
      bytes,
      'application/octet-stream',
      `?ext=${encodeURIComponent(ext.replace(/^\./, ''))}`,
    );
  }

  /** Upload raw artwork bytes; API optimizes to WebP and returns a storage key. */
  async uploadArtwork(bytes: ArrayBuffer | Uint8Array): Promise<{ storageKey: string; fileSize: number }> {
    return this.rawUpload<{ storageKey: string; fileSize: number }>(
      '/uploads/artwork',
      bytes,
      'application/octet-stream',
    );
  }

  /** Upload normalized lyrics JSON (see NormalizedLyrics). */
  async uploadLyrics(lyrics: import('@flowbyte/types').NormalizedLyrics): Promise<{ storageKey: string }> {
    return this.request<{ storageKey: string }>('POST', '/uploads/lyrics', lyrics as unknown as Record<string, unknown>);
  }

  /**
   * Complete a song upload: registers metadata for already-uploaded files.
   * The desktop pipeline uploads audio/artwork/lyrics first via uploadChunked,
   * then calls this to persist metadata.
   */
  async completeSongUpload(input: {
    title: string;
    artistName?: string | null;
    albumName?: string | null;
    duration: number;
    trackNumber?: number | null;
    year?: number | null;
    genre?: string | null;
    language?: string | null;
    codec: string;
    bitrate?: number | null;
    fileSize: number;
    audioStorageKey: string;
    artworkStorageKey?: string | null;
    lyricsStorageKey?: string | null;
    lyricsLanguage?: string | null;
    lyricsSynced?: boolean;
    sourceUrl: string;
    sourceId: string;
    checksum?: string | null;
  }): Promise<{ song: Song; duplicate: boolean }> {
    return this.request<{ song: Song; duplicate: boolean }>('POST', '/uploads/complete', input);
  }

  // -------------------------------------------------------------------------
  // Lyrics
  // -------------------------------------------------------------------------

  async getLyrics(songId: string): Promise<NormalizedLyrics | null> {
    return this.request<NormalizedLyrics | null>('GET', `/lyrics/${songId}`);
  }

  // -------------------------------------------------------------------------
  // Realtime (SSE)
  // -------------------------------------------------------------------------

  /**
   * Subscribe to server-sent events (library changes, playback changes).
   * Returns a cleanup function to close the EventSource.
   *
   * Usage:
   *   const unsub = client.subscribeToEvents((event) => {
   *     if (event.event === 'library:changed') { ... }
   *     if (event.event === 'playback:changed') { ... }
   *   });
   *   // later: unsub();
   */
  subscribeToEvents(
    onEvent: (event: RealtimeEvent) => void,
    onError?: (error: Event) => void,
  ): () => void {
    const tokens = this.tokenStorage.getTokens();
    // tokens is a Promise, but EventSource needs the URL immediately
    // We'll use a thenable approach
    let eventSource: EventSource | null = null;

    void tokens.then((t) => {
      if (!t) return;
      const url = `${this.baseUrl}/api/realtime/events?token=${encodeURIComponent(t.accessToken)}`;
      eventSource = new EventSource(url);

      eventSource.addEventListener('library:changed', ((e: MessageEvent) => {
        onEvent({ event: 'library:changed', data: JSON.parse(e.data) });
      }) as EventListener);

      eventSource.addEventListener('playback:changed', ((e: MessageEvent) => {
        onEvent({ event: 'playback:changed', data: JSON.parse(e.data) });
      }) as EventListener);

      eventSource.onerror = (e) => {
        onError?.(e);
      };
    });

    return () => {
      eventSource?.close();
    };
  }
}