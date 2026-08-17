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
- **Audio engine:** `react-native-audio-pro` retained — it provides notification-center next/prev controls + remote events (`REMOTE_NEXT`/`REMOTE_PREV`); `expo-audio` only offers lock-screen seek buttons and no remote events, so it can't replace it (unused `expo-audio` dep removed).

## Caching (Phase 11 — Upstash Redis)

- Read-through cache via NestJS cache-manager wired to Upstash Redis (`REDIS_URL`, optional).
- Candidates: song/artist/album lists, search results, artist/album detail, stream-URL resolution. TTL-based expiry; explicit invalidation on writes (cache-manager `del` in the write paths of the relevant modules).
- PostgreSQL remains the source of truth; cache is disabled entirely when `REDIS_URL` is unset (no behavior change).

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
REDIS_URL=            # optional
PORT=3001             # API port (desktop app does not own a port)
```

## Out of Scope (v1)

Lyrics translation, AI recommendations, advanced search infra, microservices, Redis everywhere (cache only — PostgreSQL stays the source of truth).