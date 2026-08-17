# Flowbyte — Personal Music Library & Streaming System

## Project Name

**Flowbyte** — private, self-hosted personal music library and streaming system.

## Goal

```text
YouTube
   ↓
Desktop downloader (Tauri)
   ↓
yt-dlp + FFmpeg
   ↓
Process audio/artwork/lyrics
   ↓
Storage Provider (Backblaze B2 / Local)
   ↓
NestJS API + PostgreSQL
   ↓
React Native (mobile) / Tauri (desktop)
   ↓
Stream OR download locally
```

## Repository Layout (Monorepo)

```text
flowbyte/
├── apps/
│   ├── api/                    # NestJS backend
│   ├── desktop/                # NEW Tauri + React desktop app (replaces Electron role)
│   ├── mobile/                 # Existing React Native player (Flowbit), extended with API
│   └── 4k-video-downloader/    # Existing Electron app — KEPT as reference, not used at runtime
│
├── packages/
│   ├── types/                  # Shared TypeScript types (Song, Artist, Album, ...)
│   ├── validation/             # Shared DTO/validation schemas
│   ├── config/                 # Shared configuration helpers
│   └── api-client/             # Shared API client for desktop + mobile
│
├── storage/                    # Local dev storage (audio/artwork/lyrics)
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docker-compose.yml
├── .env.example
├── plan.md
├── architecture.md
├── memory.md
├── agents.md
└── rules.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Package manager | pnpm workspaces |
| Backend | NestJS 11, TypeScript (strict) |
| Database | PostgreSQL 16 (Docker for dev), Drizzle ORM |
| Storage | `StorageProvider` abstraction → `LocalStorageProvider` (dev) / `BackblazeB2Storage` (prod, S3-compatible API) |
| Desktop | Tauri 2 (Rust) + React 19 + Vite + Tailwind v4 + shadcn-style UI |
| Mobile | Existing Expo SDK 54 app (react-native-audio-pro), extended with API client |
| Audio tools | yt-dlp + FFmpeg (bundled binaries, spawned from Rust via std::process::Command) |
| Image | Sharp (in API for artwork optimization) |
| Optional cache | **Upstash Redis** (Phase 11) — read-through cache for library listings, search results, artist/album aggregates, stream-URL short-circuit. PostgreSQL stays the source of truth; cache is invalidated on writes |

## Existing Code Inspection (Phase 1 — COMPLETE)

### apps/4k-video-downloader (Electron downloader — reference only)

Architecture:
- Electron main (`main.js`) is a thin shell: frameless window + 3 IPC channels (minimize/maximize/close). No download logic in Electron itself.
- `backend/server.js` — Express on port 3000. `POST /get-video-info` runs yt-dlp `--print-json --skip-download --no-check-formats --no-warnings --no-check-certificate --playlist-items 1 <url>` and returns title/uploader/duration/thumbnail/views/previewUrl. Resolves binaries from `backend/bin/{win,mac,linux}/`.
- `backend/download.js` — Express router: `POST /api/new-download/start`, `GET /api/new-download/progress/:id` (SSE), `POST /api/new-download/cancel`. Holds in-memory `activeDownloads` Map. 7 download types (audio, video, video-only, merged, fast, playlist, playlistVideo) → yt-dlp args built in a switch.
- Progress parsing regexes (port to Rust):
  - percent: `/(\d+\.\d+)%/`
  - speed: `/at\s+([~\d.]+\w+\/s)/`
  - eta: `/ETA\s+([\d:]+)/`
  - totalSize: `/of\s+([~\d.]+\w+)/`
  - playlist detail: `/Downloading (?:video|item) (\d+) of (\d+)/`
- Frontend: React 19 + Vite 7 + Tailwind v4 + shadcn (JSX). `DownloadContext.jsx` (axios + EventSource), `YouTubeDownloader.jsx` (URL → info → preview → 7 options), `DownloadMenu.jsx` (progress list), `AppFrame.jsx` (custom title bar), dark mode via next-themes.
- Reusable ideas: get-video-info args, download arg builders, progress parsing, preview UI, progress list UI, status colors.

**Decision:** Build a NEW Tauri 2 + React + TypeScript app in `apps/desktop`, porting these patterns to Rust commands + Tauri events. Keep the Electron app untouched in `apps/4k-video-downloader` as a reference.

### apps/music-player (React Native player → apps/mobile)

- Expo SDK 54, expo-router, react-native-audio-pro (AudioPro singleton), zustand stores.
- 100% local: songs come from `expo-media-library` (`getAssetsAsync({ mediaType: audio })`), `Song.url` is a `file://` URI passed straight to `AudioPro.play`.
- Song type (constants/types.ts): `{ id, title, artist?, album?, duration, cover?, url } | null` (nullable union).
- Stores (hooks/store/): `audioContext` (song, playlist, shuffle, repeat, lastPosition, playNext/playPrevious/playList...), `playlist`, `favourite`, `history`, `settingsStore`, `selectionStore`, `songMetadata`, `storageAdapter` (AsyncStorage).
- `AudioPro.configure({ contentType: MUSIC, progressIntervalMs: 1000, showNextPrevControls: true })` + `setupAudio()` at module load; `useAudioLifecycle` handles TRACK_ENDED / REMOTE_NEXT / REMOTE_PREV / PROGRESS.
- Covers via `utils/imageUtils.ts` `getSongCover()` (song.cover → picsum seed → default asset).
- No API/network code exists.
- `expo-file-system` v19 already installed but unused → use it for offline downloads.
- Navigation: 6 visible tabs (Library, Folders, Settings, Favourite, Playing, Playlist) + hidden routes.

**Decision:** Move to `apps/mobile`, keep player core untouched, add an API client + auth + hybrid source resolution (local file if downloaded, else stream URL) + sync (favorites, playlists, history, playback position). Name-spacing `local:` vs `api:` song IDs to avoid collisions.

## Database Schema (PostgreSQL — source of truth)

Tables: `users`, `devices`, `songs`, `artists`, `albums`, `favorites`, `playlists`, `playlist_songs`, `play_history`, `playback_state`.
Binary files NEVER in PostgreSQL — only storage keys (`audio/{id}.opus`, `artwork/{id}.webp`, `lyrics/{id}/original.json`).

## Storage Abstraction

```ts
interface StorageProvider {
  upload(key, data, contentType): Promise<UploadResult>;
  download(key): Promise<Buffer>;
  delete(key): Promise<void>;
  exists(key): Promise<boolean>;
  getSignedUrl(key, opts?): Promise<string>;
}
```

- `LocalStorageProvider` (STORAGE_PROVIDER=local) — fs writes under `storage/`.
- `BackblazeB2Storage` (STORAGE_PROVIDER=backblaze) — S3-compatible API via `@aws-sdk/client-s3` pointed at B2 endpoint; presigned GET URLs.
- Clients never receive B2 credentials; the API authorizes, then hands out signed URLs (B2) or short-lived streaming tokens (local dev proxy with HTTP range support).

## API Modules (apps/api/src)

`auth`, `users`, `devices`, `songs`, `artists`, `albums`, `playlists`, `favorites`, `history`, `playback`, `lyrics`, `storage`, `uploads`, `common`, `db`.

Auth: JWT access + refresh tokens (separate secrets), guards via @nestjs/jwt. All library ops require auth.

## Lyrics

- `LyricsProvider` abstraction (future: multiple providers). Current sources: YouTube subtitle tracks via yt-dlp, imported .lrc/.srt/.vtt.
- Normalized JSON `{ version: 1, language, synced, lines: [{start, end, text}] }` with ms timestamps.
- Stored at `lyrics/{songId}/original.json`; DB stores `lyrics_storage_key`, `lyrics_language`, `lyrics_synced`.
- Translation designed for later (per-language files `lyrics/{songId}/{lang}.json`) but NOT implemented.

## Playback Sync

- `playback_state` table: user_id, song_id, position, is_playing, device_id, updated_at.
- Clients push every 10–15s during playback; immediately on pause/stop/song-change/background/completion.
- Never per-second writes.

## Desktop (apps/desktop) — Tauri 2 + React

- Rust commands: `get_video_info`, `start_download`, `cancel_download`, progress via Tauri events (replaces SSE), binary resolution from bundled resources (sidecars/resources).
- Binaries: reuse existing `yt-dlp.exe` / `ffmpeg.exe` from `apps/4k-video-downloader/backend/bin/win/`; ship via Tauri `bundle.externalBin` sidecar mechanism (copy into `apps/desktop/bin/`).
- Audio pipeline: yt-dlp bestaudio → FFmpeg transcode to Opus 128–160 kbps (configurable) unless source is already suitable → Sharp artwork optimization (WebP) → lyrics extraction → upload via API (signed upload flow or authenticated multipart) → metadata save.
- UI: Dashboard, Library (Songs/Artists/Albums/Playlists/Favorites), Search, Downloads (progress/cancel), Lyrics view, Settings.
- **Hybrid playback (like mobile):** desktop plays BOTH local files (staged/downloaded audio via Tauri `convertFileSrc`) AND API-streamed tracks (signed/proxy URLs from `/songs/:id/stream`) through a single HTML5 `<audio>` player context. Same `SongSource = 'api' | 'local'` resolution logic as mobile — local if the file exists on disk, else stream URL. Playback state syncs via `/playback/state` (desktop registers as a device, same as mobile).
- **Mini-player overlay:** a second frameless, transparent, always-on-top (`setAlwaysOnTop(true)` + `setSkipTaskbar(true)`) window shown when another app is focused — small player with cover, title, play/pause, next/prev, seek. Opened/closed from the main player UI.
- **Windows media controls (NOT now):** SMTC (System Media Transport Controls via the `windows` crate) is the chosen path for taskbar/lock-screen media controls + toasts. The stock `tauri-plugin-notification` does NOT support action buttons on Windows — deferred until after v1; mini-player overlay covers the "quick controls while in another app" use case first.

## Mobile (apps/mobile) — Hybrid Playback

- Song requested → local file exists? YES → play local : NO → stream signed URL.
- Offline downloads via expo-file-system into app documents dir; local metadata table (songId, localPath, downloaded, downloadedAt, fileSize) in AsyncStorage.
- Queue stays client-side. Favorites/playlists/history/playback position sync through API.
- Preserve existing UI, controls, notification/lock-screen controls, background playback.
- Settings gains a "Flowbyte Cloud" section: API URL, sign in/up (JWT via `api-client`), manual sync, sign out.

## Duplicate Detection

- `songs.source_url` + `songs.source_id` (YouTube video ID) unique index; file hash (SHA-256) stored for verification. Duplicates return the existing song.

## Error Handling

- Cleanup temp files on failure; no orphaned DB rows (transactional inserts); retry on transient network failures; structured error responses.

## Security

- Credentials only in API env. `.env.example` without secrets. Signed URLs / streaming tokens. Validation on all inputs (class-validator + shared packages/validation).

## Docker

- `docker-compose.yml` for local PostgreSQL only. Desktop app bundles yt-dlp/ffmpeg.

## Implementation Order (Phases)

1. ~~Inspect existing code~~ (DONE — see above)
2. ~~Monorepo setup~~ (DONE)
3. ~~Backend: DB schema + storage abstraction + auth + library modules~~ (DONE — verified against Neon)
4. ~~Local storage first, then B2~~ (DONE)
5. ~~Desktop Tauri app~~ (DONE — Rust + React; builds via GitHub Actions dev/release)
6. ~~Upload pipeline (yt-dlp → FFmpeg → Sharp → lyrics → storage → DB)~~ (DONE)
7. Mobile integration (API library, hybrid playback, offline) — 🔄 IN PROGRESS
8. ~~Library features (API)~~ (DONE — client UI shipped in desktop; mobile list/sync additive)
9. ~~Lyrics system (providers, parsing, normalization)~~ (DONE — desktop lyrics view small follow-up)
10. ~~Playback synchronization (state, resume, devices)~~ (DONE — desktop pushes; mobile pusher in Phase 7)
11. Optimization — **Upstash Redis read-through cache**:
    - `@nestjs/cache-manager` + Upstash (REST/ioredis) wired in the API
    - Cache: songs/artists/albums list responses, search results, artist/album detail, stream-URL resolution; TTL-based + explicit invalidation on create/update/delete
    - Fallback: if `REDIS_URL` is unset, cache manager is disabled (no behavior change)
12. ~~GitHub Actions CI (desktop + mobile, manual dev/release)~~ (DONE)

## Deferred (NOT now)

Lyrics translation, AI recommendations, advanced search infra, microservices, SMTC media controls (Windows) until after v1.

## Constraints

- PostgreSQL is source of truth; no binaries in DB; no Firebase.
- No business logic coupling to B2 (abstraction only).
- Don't rebuild the mobile player; don't rewrite yt-dlp/FFmpeg in Rust.
- Reuse the existing Electron app's logic patterns; keep the app itself as reference.
- No repeated transcode of already-optimized audio.