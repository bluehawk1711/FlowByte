# Flowbyte — Memory

Persistent project memory. Updated as tasks complete. Supersedes stale assumptions — if this file disagrees with code, the code wins and this file must be updated.

## Project Identity

- **Name:** Flowbyte — private, self-hosted personal music library & streaming system.
- **Monorepo:** pnpm workspaces, TypeScript strict.
- **Repo root:** `D:\side-projects\Apps\my-music-player` (no git repo at root yet — each legacy app carries its own `.git`).

## Current Status (updated as work completes)

| Phase | Status |
|---|---|
| 1. Inspect existing code | ✅ DONE (see below) |
| 2. Monorepo setup (pnpm workspace, packages) | ✅ DONE |
| 3. Backend: DB schema + storage + auth + library | ✅ DONE (builds clean; DB connect untested — user skipped local Postgres) |
| 4. Local storage provider (+ B2) | ✅ DONE |
| 5. Desktop Tauri app (Rust) | ✅ DONE (compiles only in CI — no MSVC toolchain locally; Git link.exe shadows PATH) |
| 5b. Desktop React frontend | ✅ DONE (auth, home/downloader, library, downloads, settings, hybrid player, mini overlay) |
| 6. Upload pipeline (API + desktop music.rs) | ✅ DONE (API + Rust pipeline; React upload flow part of 5b) |
| 7. Mobile integration | ⏳ PENDING |
| 8. Library features (API) | ✅ DONE (client UI part of 5b/7) |
| 9. Lyrics (API) | ✅ DONE (client UI part of 5b/7) |
| 10. Playback sync (API) | ✅ DONE (client push part of 5b/7) |
| 11. Optimization | ⏳ PENDING |
| 12. GitHub Actions CI | ✅ DONE (desktop-build.yml + mobile-build.yml, both manual dev/release) |
| 13. Database (Neon) | ✅ DONE — migrations applied, API boots against Neon, Swagger verified |

## Decisions added since initial write

- **Desktop hybrid playback:** same as mobile — play local files (via Tauri `convertFileSrc`) OR API stream URLs through one HTML5 `<audio>` PlayerContext. `SongSource = 'api' | 'local'` shared resolution.
- **Mini-player overlay (Windows):** second frameless transparent window, always-on-top + skip-taskbar, opened from player UI. In plan (post-frontend).
- **Windows media controls:** SMTC via `windows` crate is the chosen path — NOT now. `tauri-plugin-notification` has no Windows action-button support, so notifications-with-controls is out of v1 scope.
- **Rust local builds:** NOT possible on dev machine (no VS Build Tools; `C:\Program Files\Git\usr\bin\link.exe` shadows MSVC `link.exe`; vswhere finds no VS installs). All Rust verification goes through GitHub Actions (windows-latest, MSVC).

## Desktop frontend notes (built)

- `apps/desktop/src/`: `main.tsx` (providers), `App.tsx` (window-label gate → MiniPlayer or full app), `AppFrame.tsx` (custom title bar + sidebar), `NowPlayingBar.tsx`, `pages/{AuthPage,HomePage,LibraryPage,DownloadsPage,SettingsPage}.tsx`, `components/{SongRow,mini/MiniPlayer,ui/*}`, `context/{AuthContext,PlayerContext,DownloadContext}.tsx`, `lib/{api,tauri,utils}.ts`.
- Hybrid playback: `PlayerContext` (HTML5 `Audio`) + `resolvePlayUrl` (local via `convertFileSrc`, else `/songs/:id/stream`). Playback sync: every 10s + on pause/play. Desktop device registered via `client.registerDevice()` (deviceName from stable localStorage id).
- Mini player: window label `mini` (340×92, transparent, alwaysOnTop, skipTaskbar, hidden initially); Rust commands `mini::show_mini_player`/`hide_mini_player` (positioned bottom-right of monitor); state broadcast `mini-player-state` (1s interval from main window) + commands `mini-player-command` (play-pause/next/previous/seek/close). Capability file `capabilities/mini.json`. Pinned from NowPlayingBar's Pin button.
- Vite gotcha: workspace packages are CJS; needed `build.commonjsOptions.include: [/node_modules/, /packages\//]` in `vite.config.ts` or Rollup fails on `defaultApiUrl`.
- `packages/api-client` gained raw upload methods (`uploadAudio`/`uploadArtwork`/`uploadLyrics`) for the desktop pipeline.
- Body is transparent (`index.css`) so the mini window's rounded corners show; main window chrome provides its own bg.

## CI / repo / DB notes

- Root git repo: `https://github.com/bluehawk1711/FlowByte.git`, branch main. Mobile app was folded in from its nested repo (gitlink) — original history preserved locally at `apps/music-player/.git.bak` (gitignored) and still on GitHub at `gourav-1711/music-player-react-native`.
- `apps/api/.env` (gitignored) now has the Neon pooled URL; `pnpm --filter @flowbyte/api db:migrate` applied the 0000 migration; API boots (`/api/docs` 200) against Neon. pg warns `sslmode=require` is treated as verify-full — harmless.
- `desktop-build.yml`: manual only (`workflow_dispatch`), input `build_type: dev|release`. Dev → `tauri build --debug --no-bundle` (raw exe artifact); Release → full NSIS installer.
- `mobile-build.yml`: manual only, input `build_type: dev|release`. **No EAS** — builds APK on the runner: `expo prebuild --platform android` (JDK 17 + Android SDK 35/NDK 27.1/cmake) → `gradlew assembleDebug` (dev) or `assembleRelease` (release, debug-signed so it installs). Artifacts: `app-debug.apk` / `app-release.apk`. No secrets required.
- Mobile app legacy typecheck fixed (3 call sites: SongsScreen mock data typed as `NonNullable<Song>[]`, PlaylistDetailScreen unused prop, SettingsScreen optional props) — `npx tsc --noEmit` passes now.

## Key Decisions (recorded)

- Desktop is a **NEW Tauri 2 + React + TypeScript app** at `apps/desktop`. The existing Electron app stays at `apps/4k-video-downloader` **untouched, as reference only** — its logic (yt-dlp args, progress parsing, UI patterns) is ported, not rewritten from scratch.
- yt-dlp/FFmpeg are spawned from **Rust** (`std::process::Command`) — never reimplemented.
- Storage uses a `StorageProvider` interface; `LocalStorageProvider` for dev, `BackblazeB2Storage` (S3-compatible API) for prod. Clients never see storage credentials.
- PostgreSQL is the source of truth. No audio binaries in the DB, only storage keys.
- Lyrics translation: designed for later, NOT implemented now.
- Mobile keeps its player core (react-native-audio-pro, zustand stores) intact; API integration is additive.
- Song IDs must be name-spaced across sources (`local:` / `api:`) to avoid collisions.

## Existing Code Facts (from inspection)

### apps/4k-video-downloader (Electron — reference)

- Electron main is a thin shell (window + 3 IPC: minimize/maximize/close). All work happens in Express backend on port 3000.
- `backend/server.js`: `POST /get-video-info` (yt-dlp `--print-json --skip-download --no-check-formats --no-warnings --no-check-certificate --playlist-items 1 <url>`), binary resolution `backend/bin/{win,mac,linux}/`.
- `backend/download.js`: `/api/new-download/{start,progress/:id,cancel}`; in-memory `activeDownloads` Map; 7 download types; SSE progress; cancel via `process.kill()`.
- Progress regexes: percent `/(\d+\.\d+)%/`, speed `/at\s+([~\d.]+\w+\/s)/`, eta `/ETA\s+([\d:]+)/`, size `/of\s+([~\d.]+\w+)/`, playlist `/Downloading (?:video|item) (\d+) of (\d+)/`.
- Frontend: React 19 + Vite 7 + Tailwind v4 + shadcn (JSX). `DownloadContext` (axios + EventSource), `YouTubeDownloader` (URL→info→preview→7 options), `DownloadMenu` (progress list), `AppFrame` (title bar).
- Only `backend/bin/win/{yt-dlp.exe, ffmpeg.exe}` exist (no mac/linux).
- Backend port 3000 hardcoded in 2 frontend files.

### apps/music-player (React Native — becomes apps/mobile)

- Expo SDK 54, expo-router, RN 0.81.5, react-native-audio-pro v10 (AudioPro singleton), zustand v5, TypeScript.
- Songs 100% local via `expo-media-library`; `Song.url` = `file://` URI → `AudioPro.play({id,url,title,artist,artwork})`.
- Song type: `{ id, title, artist?, album?, duration, cover?, url } | null` (nullable union!) in `constants/types.ts`.
- Stores in `hooks/store/`: audioContext (song/playlist/shuffle/repeat/lastPosition + playNext/playPrevious/playList/setSong), playlist, favourite, history, settingsStore, selectionStore, songMetadata, storageAdapter. Persisted via AsyncStorage (`audio-storage`, `playlist-storage`, `favourite-storage`, `history-storage`, `settings-storage`, `song-metadata`).
- `constants/audioConfig.ts`: `setupAudio()` + `AudioPro.configure({contentType: MUSIC, progressIntervalMs: 1000, showNextPrevControls: true})`.
- `hooks/useAudioLifecycle.ts`: TRACK_ENDED/REMOTE_NEXT/REMOTE_PREV/PROGRESS handlers.
- `utils/imageUtils.ts` `getSongCover`: song.cover → picsum seed → default-cover.png.
- No API/network code. `expo-file-system` v19 installed but unused (use for offline downloads).
- Screens in `components/screens/`; 6 visible tabs + hidden routes (`folders/[id]`, `playlist/[id]`).
- `SongsScreen`/`AlbumsScreen`/`EqualizerScreen`/`SplashScreen` use mock data, not wired to tabs — candidates to repurpose for API catalog.

## Environment

- Windows (win32), PowerShell 5.1 shell.
- pnpm 11.5.0, Node v22.14.0, cargo/rustc 1.97.1 — all available.
- Temp dir for scratch work: `C:\Users\Dell\AppData\Local\Temp\opencode`.

## Gotchas / Warnings

- Mobile `Song` type is a nullable union — guard nulls everywhere (existing code does `filter(Boolean)`).
- The Electron app's percent regex only matches `x.y%`, not integer `5%` — improve in Rust port.
- `-N 8` duplicated in playlistVideo args of the old backend — harmless, don't replicate.
- Legacy apps have their own `.git` directories — leave them alone.
- Windows: binaries need `.exe` suffix; Tauri sidecars use `-${TARGET_TRIPLE}` suffix convention.