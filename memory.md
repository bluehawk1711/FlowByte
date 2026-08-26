# Flowbyte — Memory

Persistent project memory. If this file disagrees with code, the code wins and this file must be updated.

## Project Identity

- **Name:** Flowbyte — private, self-hosted personal music library & streaming system.
- **Monorepo:** pnpm workspaces, TypeScript strict. Repo root: `D:\side-projects\Apps\my-music-player` (git: `github.com/bluehawk1711/FlowByte`, branch `main`).
- **Workspace:** `apps/{api,desktop,mobile,4k-video-downloader}` (4k = frozen reference, never modify), `packages/{types,validation,config,api-client}`, `storage/` (gitignored).
- **Commands:** `pnpm -r --filter "@flowbyte/*" <cmd>` only (unfiltered `-r` breaks on legacy apps). API: dev/build/lint, `db:push`, `db:generate`. Desktop: `vite build`/dev. Mobile: expo, `tsc --noEmit`, `expo lint`.

## Current Status

| Phase | Status |
|---|---|
| 1–13 (API, desktop, mobile, CI, Neon, Upstash cache) | ✅ ALL DONE |
| **UI/UX Master Spec** (see `ui_design_plan.md`, 12-phase implementation order) | 🔄 **IN PROGRESS** — Desktop Phases 1–5 ✅, Mobile Phases 6–8 ✅ (see below) |
| **Desktop UI tokenization** | ✅ ALL DONE — all raw `zinc-*`/`blue-*` replaced with design tokens |
| **Desktop Search** | ✅ debounced API search, categorized results, keyboard nav |
| **Desktop Context Menu** | ✅ SongContextMenu with Play/Queue/Favorite/Playlist |
| **Desktop Queue Panel** | ✅ slide-in panel with reorder/remove/clear |
| **Desktop Lyrics Panel** | ✅ synced lyrics with auto-scroll |
| **Desktop Expanded Player** | ✅ full-screen overlay with lyrics + controls |
| **Desktop Downloads polish** | ✅ pipeline stages, progress, retry/cancel |
| **Desktop TopBar Add Music** | ✅ wired to AddMusicModal (was navigating to home incorrectly) |
| **Mobile Feature Audit** | ✅ `feature.md` — full desktop vs mobile comparison |
| **Mobile: Queue Management** | ✅ `addToQueue`, `insertNext`, `removeFromQueue`, `clearQueue`, `moveInQueue` in audioContext |
| **Mobile: Song Actions** | ✅ Play Next, Add to Queue, Toggle Favorite, View Lyrics, Add Cover, Add to Playlist |
| **Mobile: Search Screen** | ✅ debounced API search, categorized results, loading/empty states |
| **Mobile: Add Music Screen** | ✅ YouTube URL paste, save to library, browser preview |
| **Mobile: Lyrics Display** | ✅ synced lyrics with auto-scroll in NowPlayingScreen |
| **Mobile: Real API data** | ✅ AlbumsScreen + SongsScreen now fetch from API (no more mock data) |
| **Mobile: Queue Sheet** | ✅ Bottom sheet with Now Playing/Next Up/Previously, move up/down, remove, clear |
| **Mobile: Skeleton Loading** | ✅ Reusable Skeleton component (Reanimated pulse) + screen-specific skeletons |
| **Mobile: Saved Screen** | ✅ Playlist grouping (Videos/Playlists), YouTube thumbnails, per-item actions |
| **Mobile: Haptic Feedback** | ✅ Queue actions (remove/reorder/clear) + SongActionsMenu + MiniPlayer play/skip |
| **Search URL detection** | ✅ Desktop + Mobile detect YouTube URLs in search input |
| **Search redesign** | ✅ Desktop: filter pills, top result card, 2-col layout per UI spec |
| **Search redesign** | ✅ Mobile: recent searches, browse categories grid per UI spec |
| **AddMusicModal polish** | ✅ URL input + drag-drop zone + preview area per UI spec |
| **SongActionsMenu (mobile)** | ✅ Bottom sheet with drag handle + song preview + action list per UI spec |
| **SSE Realtime** | ✅ Server-Sent Events for live library/playback updates (API + desktop + mobile) |

## Key Decisions

- Desktop = **new Tauri 2 + React + TS** app (`apps/desktop`); Electron app = frozen reference (port logic, never edit).
- yt-dlp/FFmpeg spawned from Rust; never reimplemented. Storage via `StorageProvider` only. No audio in Postgres, only storage keys. Postgres = source of truth; Upstash Redis = read-through cache only.
- Rust local builds impossible (no MSVC toolchain; Git's `link.exe` shadows) → Rust verified only via GitHub Actions (CI-only).
- Mobile: keep existing player core (react-native-audio-pro v10, zustand, Expo SDK 54); **additive changes only**. Audio engine stays audio-pro (expo-audio lacks next/prev + remote events).
- Mobile audioContext now has queue management: `addToQueue(song)`, `insertNext(song)`, `removeFromQueue(index)`, `clearQueue()`, `moveInQueue(from, to)`. `playList()` replaces the old `setPlaylist`+`setSong` pattern.
- Lyrics translation: future feature, not implemented. Song IDs namespaced `local:` / `api:`.

## API Notes

- NestJS + Neon PostgreSQL (pooled URL in `apps/api/.env`, gitignored; `.env.example` committed). DTO validation everywhere, structured errors.
- Cache: `apps/api/src/cache/` — `Redis.fromEnv()` reads canonical **`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`**; SDK auto-serialization; keys `fb:`; TTLs: lists/search 60s, details 300s, stream = stream TTL−60; invalidation (delByPrefix SCAN) on uploads/lyrics/favorites/playlist mutations; no-op when env unset (boot logs "cache DISABLED"). Cache keys/TTLs in `architecture.md`.
- SSE Realtime: `apps/api/src/realtime/` — global `RealtimeService` emits `library:changed` and `playback:changed` events to connected clients. Endpoint: `GET /api/realtime/events?token=<jwt>` (EventSource). Desktop uses browser EventSource; mobile uses fetch streaming. Auto-reconnect with exponential backoff. Events emitted from `UploadsService.complete()`, `FavoritesService.add/remove()`, `PlaybackService.sync()`.
- Env files: `apps/{api,desktop,mobile}/.env*` — `.env` gitignored, `.env.example` committed, real secrets never committed (rule #5). Desktop `VITE_API_URL`, mobile `EXPO_PUBLIC_API_URL` = `http://localhost:3001`.

## Desktop Notes

- `src/`: `App.tsx` (MiniPlayer window gate + AddMusicModal state + expanded player), `AppFrame.tsx` (title bar + sidebar + panel toggles + `onAddMusic` prop), `NowPlayingBar.tsx` (track clickable → expanded player), `pages/{Auth,Home,Library,Downloads,Settings,Saved,Search}Page.tsx`, `components/{SongRow,SongContextMenu,YouTubeEmbed,TopBar,AddMusicModal,ExpandedPlayer,LyricsPanel,QueuePanel,mini/MiniPlayer,ui/{button,card,dialog,input,slider,progress,badge,skeleton,spinner,feedback,context-menu}}`, `context/{Auth,Player,Download}Context.tsx`, `hooks/{useGlobalShortcuts}.ts`, `lib/{api,tauri,utils}.ts`. Tailwind v4 (CSS-first config), lucide-react, sonner, cva. All raw `zinc-*`/`blue-*` colors replaced with design tokens (`ink-*`, `bg-app`, `bg-card`, `accent`, etc.) — full tokenization complete.
- Hybrid playback: HTML5 `<audio>` + `resolvePlayUrl` (local via `convertFileSrc`, else `/songs/:id/stream`). Playback sync every 10s + on pause/play; desktop device via `registerDevice()`.
- Saved YouTube: localStorage `flowbyte.savedPlaylists`, `parseYouTubeUrl()` (utils.ts), `YouTubeEmbed.tsx` (youtube-nocookie, `videoseries?list=` for playlists), Settings `iframePreview` toggle (default ON), `DesktopSettings` typed localStorage.
- Mini window: label `mini` (340×92 transparent, alwaysOnTop, skipTaskbar), Rust commands `mini::show/hide_mini_player`, broadcast `mini-player-state`, `mini-player-command`; capability `capabilities/mini.json`.
- Vite gotcha: CJS workspace packages need `build.commonjsOptions.include: [/node_modules/, /packages\//]`.

## Mobile Notes

- Expo SDK 54, expo-router, RN 0.81.5, audio-pro v10, zustand v5, Reanimated 4. Legacy nested workflow deleted; mobile folded from nested repo (history at `apps/mobile/.git.bak`).
- `Song` in `constants/types.ts` is a nullable union — guard nulls everywhere. Stores in `hooks/store/` (audioContext, playlist, favourite, history, settingsStore, selectionStore, songMetadata, storageAdapter) persisted via AsyncStorage.
- Additive integration: `lib/{api,playback,offline,sync,saved,cloud}.ts`, `hooks/{useApiSync,store}.ts`. `lib/offline.ts` uses **expo-file-system v19 new API** (`File`/`Directory`/`Paths`) — legacy API throws at runtime.
- New screens: `SearchScreen` (debounced API search + URL detection + recent searches + browse categories grid), `AddMusicScreen` (YouTube URL save). Search tab added to tab bar. AddMusic is a hidden tab navigated from Library header.
- `SongActionsMenu` converted to bottom sheet modal (drag handle + song preview header + action list) matching UI spec. Actions: Play Next, Add to Queue, Add to Playlist, Toggle Favorite, Download (placeholder), View Lyrics, Add Cover Image.
- Playlist sync: `PlaylistObj.serverId` + `deletedServerIds` tombstones; push local creates (create + add songs, remap local→server id); skip seeded "123". NowPlaying: Cloud badge + offline toggle.
- Saved YouTube (mobile): `lib/saved.ts` zustand storage, hidden tab `app/(tabs)/saved/index.tsx` → `SavedScreen.tsx`, plays via `expo-web-browser.openBrowserAsync` (no native deps).
- Typed routes: new routes need `.expo/types/router.d.ts` regenerated (run `node node_modules/expo/bin/cli start --port 8091` once; file gitignored). `expo start` also loads `.env`.
- Register requires valid email (RegisterDto `@IsEmail`); username from email prefix.
- Song type in `constants/types.ts` is `Song | null` union — always guard nulls. API types use `string | null` for optional fields; map to `string | undefined` when storing locally.

## CI / Repo

- Root workflows (manual, `workflow_dispatch`): `desktop-build.yml` (Rust+Tauri, dev/release), `mobile-build.yml` (prebuild + gradlew APK, no EAS). No secrets required.
- API client methods (shared): login/register, library CRUD, `getPlaylists/getPlaylist/createPlaylist/deletePlaylist/addSongToPlaylist`, uploads, lyrics, favorites, playback sync, registerDevice.

## Environment / Gotchas

- Windows (win32), PowerShell 5.1. pnpm 11.5.0, Node 22.14.0. Scratch: `C:\Users\Dell\AppData\Local\Temp\opencode`.
- Desktop body transparent (`index.css`) for mini-window rounded corners. Mobile `EqualizerScreen`/`SplashScreen` use mock data. `SongsScreen` and `AlbumsScreen` now fetch from the API.
- Legacy apps have their own `.git` dirs — leave alone. Windows binaries need `.exe`; Tauri sidecars `-${TARGET_TRIPLE}`.
- Electron percent regex only matches `x.y%` (not `5%`) — fixed in Rust port.
