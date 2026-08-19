# Flowbyte — Architecture

Live architecture document. Updated whenever the design changes.

## System Overview

```text
                         ┌─────────────────────┐
                         │     PostgreSQL      │
                         │  (source of truth)  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      NestJS API     │
                         │ Auth/Library/Stream │
                         │ Uploads/Lyrics/...  │
                         └──────┬───────┬──────┘
                                │       │
                     ┌──────────▼─┐   ┌─▼──────────┐
                     │  Storage   │   │  Redis     │
                     │  Provider  │   │ (optional) │
                     └──────┬─────┘   └────────────┘
                            │
                   ┌────────┴─────────┐
                   │                  │
            ┌──────▼────────┐  ┌──────▼─────────┐
            │ Local Storage │  │ Backblaze B2   │
            │ Development   │  │ Production     │
            └───────────────┘  └────────────────┘
                            │
                  ┌─────────┴─────────┐
                  │                   │
           ┌──────▼───────┐    ┌──────▼─────────┐
           │ Tauri + React│    │ React Native   │
           │ Desktop      │    │ Mobile Player  │
           └──────────────┘    └────────────────┘
```

All clients talk ONLY to the NestJS API. No client ever connects to PostgreSQL or storage directly.

## Request Flows

### Streaming (mobile/desktop playback)

```text
Client → GET /songs/:id/stream (JWT) → API verifies ownership
       → storage.getSignedUrl(key)  → returns { url, expiresIn }
       → Client streams/seek via HTTP Range on signed URL (B2)
       → or short-lived token + API proxy with Range (local dev)
```

### Upload pipeline (desktop → library)

```text
YouTube URL → (desktop) yt-dlp bestaudio → FFmpeg transcode (Opus 128–160k, configurable)
→ artwork via Sharp (WebP, resized, metadata stripped) → lyrics parse (.lrc/.srt/.vtt/subs)
→ POST /uploads/complete (audio/artwork/lyrics storage keys + metadata) → DB insert
→ duplicate detection via source_url/source_id unique index before any upload
```

### Playback sync

```text
Client (mobile/desktop) → PUT /playback/state every 10–15s during play;
immediate on pause/stop/song change/background/end. DB row per user (latest wins).
Resume: GET /playback/state on app start / device switch.
```

## Storage Abstraction

```ts
interface StorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<{ key: string; size: number }>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, opts?: { expiresIn?: number; filename?: string }): Promise<string>;
}
```

- Selected by env: `STORAGE_PROVIDER=local|backblaze` (default `local`).
- **LocalStorageProvider** — writes to `storage/{audio,artwork,lyrics}` at repo root (configurable via `LOCAL_STORAGE_PATH`). `getSignedUrl` returns an API proxy URL (`/storage/stream/:key?token=...`) that serves files with HTTP Range support.
- **BackblazeB2Storage** — S3-compatible client (`@aws-sdk/client-s3`) against B2 endpoint (`B2_ENDPOINT`, `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`). `getSignedUrl` returns presigned GET.
- Bucket layout: `audio/{id}.{ext}`, `artwork/{id}.webp`, `lyrics/{id}/original.json`.

## Database (Drizzle ORM)

Tables (`src/db/schema.ts`): users, devices, artists, albums, songs, favorites, playlists, playlist_songs, play_history, playback_state.

Key constraints:
- `songs.source_url` unique (duplicate detection); `songs.source_id` (YouTube video ID) unique.
- `favorites(user_id, song_id)` unique.
- `playlist_songs(playlist_id, song_id)` unique + position int.
- `playback_state(user_id)` unique (one row per user, latest wins).
- FKs with cascade where appropriate; indexes on FKs and `play_history(user_id, started_at)`.

## Auth

- Access token (JWT, ~15 min) + refresh token (JWT, ~30 days) in HttpOnly cookie or returned body (client decides storage).
- Guards: `JwtAuthGuard` for all library routes; refresh rotation on `/auth/refresh`.
- Devices table registers each client (name/platform) — `deviceId` used in playback sync.

## Lyrics

- `LyricsProvider` interface (extensible). Sources: yt-dlp subtitle tracks (vtt), imported .lrc/.srt/.vtt.
- Normalized format stored at `lyrics/{songId}/original.json`:

```json
{ "version": 1, "language": "en", "synced": true,
  "lines": [ { "start": 12400, "end": 16800, "text": "..." } ] }
```

- DB columns: `lyrics_storage_key`, `lyrics_language`, `lyrics_synced`.
- Future: `lyrics/{songId}/{lang}.json` per-language translations (NOT implemented).

## Desktop (Tauri)

- Rust side: `src-tauri/src/` — commands `get_video_info`, `start_download`, `cancel_download`, `start_music_import`, `cancel_music_import`, `read_file_bytes`, `delete_files`, `util::platform`; yt-dlp/ffmpeg spawned via `tokio::process::Command`; progress parsed from stdout (regex port from Electron app) and emitted as Tauri events (`download-progress`, `music-import-done`); binaries resolved from `src-tauri/bin/` (dev) / `bundle.resources` (prod). Import pipeline: yt-dlp bestaudio + thumbnail + auto subs → optional Opus transcode → staged files → React uploads via API → `delete_files` cleanup.
- React side: download UI (port of Electron frontend patterns), library UI, settings. Talks to NestJS API via `packages/api-client`.
- Audio pipeline runs desktop-side (yt-dlp → FFmpeg → Sharp → lyrics → upload to API).
- **Playback (hybrid):** single `PlayerContext` over HTML5 `<audio>`. Source resolution identical to mobile — local file present (`convertFileSrc`) else API stream URL from `/songs/:id/stream`. Tracks with `source='local'` play from disk; `source='api'` stream via JWT-authed URL. Playback state pushed to `/playback/state` (device registered at startup).
- **Windows:** main window (decorations:false, custom title bar) + optional mini-player overlay window (frameless, transparent, `alwaysOnTop` + `skipTaskbar`) with transport controls. SMTC (winrt via `windows` crate) deferred — `tauri-plugin-notification` has no Windows action buttons.
- Rust build runs in CI (GitHub Actions, windows-latest + MSVC) — the dev machine has no MSVC toolchain (Git's `link.exe` shadows MSVC in PATH).

## Mobile (React Native)

- Existing player untouched at core: `AudioPro` + zustand stores.
- Additive: `api-client` integration, auth store, hybrid source resolution (`local:` prefix = downloaded file URI; `api:` = stream via signed URL), offline download manager (expo-file-system), sync services (favorites/playlists/history/playback).
- `Song` type extended (fields: `source`, `artworkUrl`, `streamUrl`, `isDownloaded`, `localUri`, `downloadStatus`, `albumId`, `artistId`) while keeping playback fields compatible.
- **Implemented (Phase 7):** `lib/api.ts` (client singleton, AsyncStorage `TokenStorage`, stable deviceId `fb-mobile-*`, runtime-switchable API URL), `lib/playback.ts` `resolvePlaybackUrl()` (offline file → API stream), `lib/offline.ts` (download manager on expo-file-system v19 new API — legacy FS API throws at runtime), `lib/sync.ts` (`api:<uuid>` id namespacing, favorites push + server playlist pull, playback position push every 12s via `useApiSync`), Settings "Flowbyte Cloud" section (sign in/register/sync/sign out + API URL). Cloud tab (browse/search/play/favorite/download) via `lib/cloud.ts` + `CloudSongRow`; Downloads screen for offline records. Reanimated entrance/exit animations (mini player slide, staggered rows, heart pop).

## Desktop — Save YouTube for later (additive)

- **Home page:** after analyzing a URL, "Save to playlist (play later)" — pick an existing saved playlist or create a new one. Stored locally (`flowbyte.savedPlaylists`, localStorage) — NOT server playlists (those hold library songs).
- **Saved page** (`pages/SavedPage.tsx`, sidebar nav): saved playlists → items (YouTube video or playlist URL + metadata). Play = embedded iframe (`components/YouTubeEmbed.tsx` — `youtube-nocookie.com/embed/<videoId>` or `videoseries?list=<playlistId>`), which shows a **Download button** beneath it. Video items Import to library (`start_music_import`); playlist items run the classic MP3 playlist download (`start_download 'playlist'`).
- **Settings:** `DesktopSettings.iframePreview` (default ON) — "Show iframe preview". OFF = no embed, download controls only.
- URL parsing: `parseYouTubeUrl()` in `lib/utils.ts`. Zero Rust/API changes.
- **Audio engine:** `react-native-audio-pro` retained — it provides notification-center next/prev controls + remote events (`REMOTE_NEXT`/`REMOTE_PREV`); `expo-audio` only offers lock-screen seek buttons and no remote events, so it can't replace it (unused `expo-audio` dep removed).
- **Playlist sync (two-way):** pull server playlists (id = server id, `serverId` set); push locally-created playlists (create + `addSongToPlaylist`, local id remapped to server id; seeded "123" Default Playlist is local-only); deletions of synced playlists tracked via `deletedServerIds` tombstones and applied to the API on next sync.
- **Saved YouTube links (mobile):** `lib/saved.ts` + hidden Saved tab; paste YouTube video/playlist URL → local zustand store; Play via `expo-web-browser` in-app browser (no native deps). Desktop equivalent lives in `apps/desktop` (iframe embed playback — see Desktop section).
- **Playing screen (cloud songs):** Cloud badge + "Download offline" toggle backed by `lib/offline` (`downloadSong`/`removeOfflineSong`, live via `onOfflineChange`).

## Caching (Phase 11 — Upstash Redis)

- **Implemented:** `src/cache/cache.module.ts` (global) + `cache.service.ts` — `@upstash/redis` REST client via `Redis.fromEnv()` (canonical env vars `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`), native JS auto-serialization, no-op when env unset (boot logs "cache DISABLED").
- Key scheme (all keys prefixed `fb:`): `songs:list:{userId}:{q}:{artistId}:{albumId}:{genre}:{page}:{pageSize}` (TTL 60s), `songs:detail:{id}` (300s), `songs:stream:{id}` (TTL = stream TTL − 60s margin), `search:{q}` (60s), `artists:list`/`albums:list` (300s), `artists:detail:{id}`/`albums:detail:{id}` (300s), `playlists:list:{userId}`/`playlists:detail:{userId}:{id}` (120s).
- Invalidation on writes: uploads `complete()` → `delByPrefix('songs:list')` + `search:` + `artists:list`/`albums:list`; lyrics import → `songs:detail:{id}`; favorites add/remove → `delByPrefix('songs:list:{userId}')`; playlist create/update/remove/addSong/removeSong/reorder → list + detail keys.
- `delByPrefix` = SCAN(`fb:<prefix>*`, count 100) loop + DEL batch.
- PostgreSQL remains the source of truth; cache is disabled entirely when env unset (no behavior change).

## Error Handling

- Structured errors: `{ statusCode, message, error, details? }` from a global exception filter.
- Upload pipeline: temp files cleaned on failure; DB insert transactional; duplicate detection pre-upload.

## Env Vars (API only)

```text
DATABASE_URL=
STORAGE_PROVIDER=local|backblaze
LOCAL_STORAGE_PATH=../storage
B2_ENDPOINT= B2_KEY_ID= B2_APPLICATION_KEY= B2_BUCKET=
JWT_SECRET= JWT_REFRESH_SECRET=
UPSTASH_REDIS_REST_URL=  # optional (Upstash REST URL)
UPSTASH_REDIS_REST_TOKEN= # optional (Upstash REST token)
PORT=3001             # API port (desktop app does not own a port)
```

### Client env files (no secrets — the API owns secrets)

| Project | File | Vars |
|---|---|---|
| API | `apps/api/.env` (+ `.env.example`) | full template above |
| Desktop | `apps/desktop/.env` (+ `.env.example`) | `VITE_API_URL` (default `http://localhost:3001`), dev-only `TAURI_DEV_HOST` |
| Mobile | `apps/mobile/.env` (+ `.env.example`) | `EXPO_PUBLIC_API_URL` (default `http://localhost:3001`; LAN IP for devices) |

## Out of Scope (v1)

Lyrics translation, AI recommendations, advanced search infra, microservices, Redis everywhere (cache only — PostgreSQL stays the source of truth).