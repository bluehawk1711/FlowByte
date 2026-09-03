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
| **Code Review Fixes** | ✅ All 20 issues from RESEARCH.md addressed (HMAC tokens, CORS, rate limiting, CSP, etc.) |
| **Google Drive Cloud Storage** | ✅ OAuth flow, storage provider, desktop/mobile UI, API endpoints |
| **CI Fixes** | ✅ Storage module files committed, mobile workflow builds shared packages, Rust compilation errors fixed |
| **DevTools + App Exit** | ✅ DevTools enabled via Cargo feature + config; app exits on window close via `on_window_event`; improved API error logging |
| **API Error Handling** | ✅ `FlowbyteClient.request()` now logs network errors with URL/method context; `AuthContext` logs `me()` failures |
| **YouTube Playlist Import** | ✅ `get_playlist_items` (yt-dlp --flat-playlist), `start_playlist_import` (batch import to library), hybrid playback (local/URL) |
| **Download Simplification** | ✅ Only "Audio (MP3)" and "Playlist (audio)" options remain — all video types removed |
| **Hybrid Playback** | ✅ Saved playlists: imported songs play via PlayerContext (local file/stream); non-imported show YouTube iframe preview; `importedSongId` stamped on import |
| **Desktop Sidebar collapse** | ✅ Collapsed mode keeps all nav reachable (icon rows + playlist tiles), managed tooltips, playlist create button |
| **TopBar avatar nav** | ✅ Avatar → Settings (was routed to Search via wrong handler) |
| **Desktop cursor pointer** | ✅ Tailwind v4 preflight lacks it — global `@layer base` rule in index.css restores pointer on buttons/`role=button` |
| **Offline playback UX** | ✅ Mobile: local-first playback + unavailable toasts/badges. Desktop: play failure now surfaces sonner toast instead of silent stop |
| **Auth Lottie animation** | ✅ "Girl listening to music" Lottie (repo root JSON → `apps/desktop/src/assets/animations/`) on split AuthPage; `lottie-web` lazy-loaded chunk + `?url` asset |
| **Sidebar/UX polish** | ✅ collapsed footer icons centered, playlist scrollers `overflow-x-hidden` + stable scrollbar-gutter, page-enter transitions (reduced-motion safe) |
| **Runtime theme engine** | ✅ `lib/theme.ts` + `ThemeContext`: accent (12 presets + custom picker), 4 background palettes (3 dark + light), 6 font families, UI scale 85–120%, corner radius, persisted `flowbyte.theme`, applied pre-paint |
| **Settings Appearance UI** | ✅ Appearance card in SettingsPage (instant apply + reset) |
| **Page widths / inputs** | ✅ Home/Downloads/Saved full-width layouts, Settings widened; themed `Select` ui component (replaces bare selects in AddMusic + Appearance) |
| **AddMusic playlist save** | ✅ Explicit "First video only / All N items" segmented choice for playlist URLs (prefetches items via `getPlaylistItems`) |
| **Mobile theme engine** | ✅ Engine + full sweep, FINAL STATE: every AppColors style file themes live via per-component `useThemedStyles(createStyles)` (all ~36 files — screens, rows, sheets, routes). `subscribeToTheme` module-swap removed from `theme.ts`; RootLayout **keyed remount removed** (no more nav-tree reset on theme switch); `(tabs)/_layout` subscribes via `useAppTheme` + tab bar uses live palette (bg `backgroundDark`, border `divider`, inactive `iconDefault`). Light mode coherent; dark default. A few raw-hex decorative chips/artwork intentionally stay dark on light |
| **Desktop playlist live-sync** | ✅ `subscribeSavedPlaylists` events fire from `persistSavedPlaylists` (lib/api) — AppFrame rail updates instantly on delete/rename/add anywhere |
| **Desktop resizable sidebar** | ✅ drag handle (pointer-capture, 200–460 px, persisted `flowbyte.sidebarWidth`), double-click resets; collapsed rail unaffected |
| **Profile page** | ✅ `/profile` page (account card, stats, device id, sign out) + sidebar “Profile” nav + TopBar avatar → profile |
| **Desktop spring transitions** | ✅ `motion` (motion/react) added; AnimatePresence page transitions (spring bounce 0, reduced-motion → fade) |
| **Animated icons (app-wide)** | ✅ **ALL desktop icons swapped** through a single central module `src/lib/icons.tsx` — same lucide names re-exported, animateicons-preferred with a small lucide fallback (see Desktop Notes). NowPlayingBar transports were the pilot; every other `lucide-react` import in `src/` now comes from the module. Glyphs animate on hover; tailwind `h-*`/`w-*` classes are translated to the numeric `size` the lib requires. Mobile stays on lucide (lib is DOM-only). Icons rule codified in `rules.md` #21–23 |
| **Motion pass extras** | ✅ `EqBars` component (CSS scaleY eq) on NowPlayingBar artwork + SongRow playing overlay; spring `whileTap` on nav buttons; active sidebar pill springs between items via `layoutId="sidebar-active-pill"`; `MotionConfig reducedMotion="user"` in App |
| **Song metadata editing** | ✅ `PATCH /songs/:id` (UpdateSongDto w/ class-validator; title/artist/album/genre/year; artist+album resolved-by-name, created on first use; busts list/detail/search caches + SSE `song_updated`) → `client.updateSong()` → **Edit details** in SongContextMenu → `EditSongDialog` (animated Dialog) |
| **Artist click → dialog** | ✅ Desktop Search artist cards are real buttons → `ArtistDialog` (`GET /artists/:id`: avatar, counts, scrollable SongRow list that plays via PlayerContext) |
| **Favorites toggle race** | ✅ SongContextMenu toggle is now optimistic + reconciles with server on failure (re-fetch, adopt server truth, only error when the change really didn't land); API `add` validates song exists → clean 404 instead of FK 500 |
| **Import = local-first, upload is opt-in** | ✅ New model: imports download to `~/Downloads/Flowbyte Imports` (stable, Rust `import_dir` repointed from app cache) and **never auto-upload** unless Settings/Downloads toggle `uploadImports` (default OFF) — or the per-song **Upload to library** button in Downloads. Imports stay playable offline via `localImportSong()` (`localUri` → `convertFileSrc`); Saved items get `localFilePath` stamped (`stampSavedItemLocalFile`) and a **Play file** button; a failed upload no longer loses the download or mislabels it |
| **Per-song playlist imports** | ✅ Playlist import no longer runs a hidden Rust batch loop — the UI enqueues **one job per song** (`queued` status added to `DownloadStatus`), sequential, cancellable (single + “Cancel queued”), each with real title/progress/stages in Downloads |
| **Downloads = task center** | ✅ Job history persisted (`flowbyte.downloadJobs.v1`, interrupted jobs marked failed on relaunch); Downloads page shows Running/Queued/Finished with per-job Play (local/library), Upload, Retry, Remove; completion/error toasts carry the **song title in the description**; legacy `start_playlist_import` kept but unused |
| **Queue summary + batch headers** | ✅ Jobs carry `batchId`/`batchTitle` (+ `completedAt` stamped on terminal) so Downloads shows a **Queue strip** (running/queued counts, overall %, live speed, ≈ ETA — parsed from yt-dlp or averaged from finished items) and a **per-batch header** per playlist import (“N of M · % · Next: … · ≈ ETA”) above its song rows |
| **Sidebar Tasks badge** | ✅ Downloads nav shows a live count chip (soft pill expanded / solid dot collapsed, `text-accent-fg`) for queued + active jobs from `useDownloads` |
| **Saved page file path** | ✅ `SavedPage` subscribes to saved-playlist changes (live re-render on stamp), shows the on-disk **local file path** under downloaded items with a copy-to-clipboard action |
| **Player error copy** | ✅ “not available” toast no longer claims offline — says the music server couldn't be reached when no local copy exists |
| **Edit dialog reopen bug** | ✅ EditSongDialog no longer pops open again on later menu opens — edited song is held in its own `editSong` state cleared on close (was: `editOpen` boolean tied to menu state surviving reopens) |
| **Custom artwork upload** | ✅ API `UpdateSongDto.artworkStorageKey` (nullable) → `SongsService.update()` stores key + emits SSE; `client.uploadArtwork`/`updateSong` + EditSongDialog artwork row (upload/change/remove preview). Why it previously failed: no backend field existed — artwork was download-only |
| **Menu stays glued to row** | ✅ ContextMenu now closes on window scroll/resize (capture phase) — a 3-dot menu can't float in place while the list scrolls; submenu flips left/lifts up when it would overflow the viewport and caps height with its own scroll |
| **Artist click (Library)** | ✅ LibraryPage artist cards were dead `<div>`s — now real buttons that open `ArtistDialog` (songs/albums list, rows playable + context menu). Search cards already did this |
| **Local artwork for songs** | ✅ `SavedPlaylistItem.localArtworkPath` stamped beside `localFilePath` (yt-dlp thumbnail on disk); `localImportSong()` sets `Song.cover = assetUrl(artworkPath)` so local-only songs show real artwork in rows/cards/player without uploading. SavedPage prefers the local file's cover over the remote yt thumbnail; Downloads 'Play local' passes the thumbnail too |
| **Onboarding (Auth welcome)** | ✅ Welcome step now explains what Flowbyte is: tagline + three feature rows (YouTube import, private cloud sync, self-hosted files) with icon chips and staggered entrance |
| **All icons animated** | ✅ The 8 lucide-only glyphs (Album, Clapperboard, GripVertical, ListPlus, Palette, SearchX, Square, XCircle) now get CSS hover animations via `[data-icon-anim]` wrappers in the module + keyframes in index.css — no static icons remain |
| **SongRow menu everywhere** | ✅ Context menu (incl. **Edit details** + **Copy file path** for local files) now also wired on SearchPage song results and ArtistDialog rows (Home/Library already had it) |
| **Add-to-playlist submenu fixes** | ✅ Removed the duplicated plus (“+ New playlist” label kept a leading “+” next to the Plus icon → now just “New playlist” with the icon). Submenu now clamps its height to the viewport space available (measured: prefer lifting up, else internal scroll) so long playlist lists are never half-visible below the fold |
| **Saved items play by YouTube URL fallback** | ✅ `startItemPlayback` on SavedPage: cloud library copy → local file → **YouTube embed**. When the library copy is unreachable (server offline/removed) it no longer toasts “couldn't reach the music server” for saved-from-playlist items — it plays the original YouTube URL (or tells you when preview is disabled) |
| **Click artwork/title to play** | ✅ SongRow artwork + title/artist are now buttons that start playback on a single click (rows keep double-click too); SavedPage rows play from artwork or title clicks as well |
| **Multi-select + Dynamic Island** | ✅ Library songs list: “Select” mode (checkbox rows, click row toggles, Select all, keyboard accessible) → a **SmoothUI Dynamic Island** floats above the player (morphs idle pill ⇄ actions) with Play selection, Add to favorites, and Clear. Component extended with `showControls={false}` for in-product use (demo chips hidden) |
| **SmoothUI components added** | ✅ `src/components/ui/smoothui/{dynamic-island,glow-hover-card,gooey-popover,cursor-follow,reveal-text}` installed (smoothui-cli) + `gsap`/`@radix-ui/react-select` deps. GlowHover wraps Library artist/album grids (per-card hue glow, capture-phase scroll re-sync); GooeyPopover gives artist avatars a quick-actions popover (Open artist / Play top songs). Interactive-image-selector was tried for the Background picker then **removed** at user request (folder deleted; Settings uses the custom palette grid again) |
| **Favorites batch endpoint** | ✅ `POST /favorites/batch {songIds[]}` (AddFavoritesDto, 1–200 UUIDs) → service `addMany` (single insert `onConflictDoNothing`, one SSE event); `client.addFavorites()`; Library multi-select island now sends **one request** instead of N parallel calls (burst/partial-failure safe) |
| **Cursor glow setting** | ✅ `DesktopSettings.cursorFollow` (default OFF, `subscribeSettings` event bus) + Appearance → Effects switch; App mounts SmoothUI `CursorFollow` over the shell when on (accent-colored dot, reduced-motion safe) |
| **Reveal-text on expanded player** | ✅ ExpandedPlayer title/artist reveal on open via SmoothUI `RevealText` (springs the NowPlaying bar → full-screen handoff) |
| **Font select → Radix** | ✅ Appearance font picker now uses themed `ui/select-menu.tsx` (shadcn-style Radix select: portal menu, keyboard nav, typed items); old native select kept only in AddMusic |

## Key Decisions

- Desktop = **new Tauri 2 + React + TS** app (`apps/desktop`); Electron app = frozen reference (port logic, never edit).
- yt-dlp/FFmpeg spawned from Rust; never reimplemented. Storage via `StorageProvider` only. No audio in Postgres, only storage keys. Postgres = source of truth; Upstash Redis = read-through cache only.
- Rust local builds impossible (no MSVC toolchain; Git's `link.exe` shadows) → Rust verified only via GitHub Actions (CI-only). tokio `time` feature required for `tokio::time::sleep`.
- Mobile: keep existing player core (react-native-audio-pro v10, zustand, Expo SDK 54); **additive changes only**. Audio engine stays audio-pro (expo-audio lacks next/prev + remote events).
- Mobile audioContext now has queue management: `addToQueue(song)`, `insertNext(song)`, `removeFromQueue(index)`, `clearQueue()`, `moveInQueue(from, to)`. `playList()` replaces the old `setPlaylist`+`setSong` pattern.
- Lyrics translation: future feature, not implemented. Song IDs namespaced `local:` / `api:`.

## API Notes

- NestJS + Neon PostgreSQL (pooled URL in `apps/api/.env`, gitignored; `.env.example` committed). DTO validation everywhere, structured errors.
- Cache: `apps/api/src/cache/` — `Redis.fromEnv()` reads canonical **`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`**; SDK auto-serialization; keys `fb:`; TTLs: lists/search 60s, details 300s, stream = stream TTL−60; invalidation (delByPrefix SCAN) on uploads/lyrics/favorites/playlist mutations + song metadata edits (`songs:list:{userId}`, `songs:detail:{id}`, `search:`); no-op when env unset (boot logs "cache DISABLED"). Cache keys/TTLs in `architecture.md`.
- SSE Realtime: `apps/api/src/realtime/` — global `RealtimeService` emits `library:changed` (`song_added | song_deleted | song_updated | favorites_changed | playlist_changed` — note the API keeps a **local duplicate** `LibraryChangedPayload` union in `realtime.service.ts`, keep in sync with `packages/types`) and `playback:changed` events. Endpoint: `GET /api/realtime/events?token=<jwt>` (EventSource). Desktop uses browser EventSource; mobile uses fetch streaming. Auto-reconnect with exponential backoff. Events emitted from `UploadsService.complete()`, `SongsService.update()`, `FavoritesService.add/remove()`, `PlaybackService.sync()`.
- Env files: `apps/{api,desktop,mobile}/.env*` — `.env` gitignored, `.env.example` committed, real secrets never committed (rule #5). Desktop `VITE_API_URL`, mobile `EXPO_PUBLIC_API_URL` = `http://localhost:3001`.

## Desktop Notes

- `src/`: `App.tsx` (MiniPlayer window gate + AddMusicModal state + expanded player), `AppFrame.tsx` (title bar + sidebar + panel toggles + `onAddMusic` prop), `NowPlayingBar.tsx` (track clickable → expanded player), `pages/{Auth,Home,Library,Downloads,Settings,Saved,Search,Profile}Page.tsx`, `components/{SongRow,SongContextMenu,YouTubeEmbed,TopBar,AddMusicModal,ExpandedPlayer,LyricsPanel,QueuePanel,EditSongDialog,ArtistDialog,mini/MiniPlayer,ui/{button,card,dialog,input,slider,progress,badge,skeleton,spinner,feedback,context-menu,smoothui/{dynamic-island,glow-hover-card,gooey-popover}}`, `context/{Auth,Player,Download}Context.tsx`, `hooks/{useGlobalShortcuts}.ts`, `lib/{api,tauri,utils,theme,icons}.tsx`. Tailwind v4 (CSS-first config), motion, sonner, cva, gsap. All raw `zinc-*`/`blue-*` colors replaced with design tokens (`ink-*`, `bg-app`, `bg-card`, `accent`, etc.) — full tokenization complete. SmoothUI components live under `ui/smoothui/<name>/index.tsx` (DynamicIsland extended with `showControls` for production use).
- Icons: **all app icons import from `src/lib/icons.tsx`** (never `lucide-react` directly). It re-exports every original lucide name; when the glyph exists in `@animateicons/react/lucide` it's wrapped (hover-animated) and the wrapper translates tailwind `h-*`/`w-*` classes (incl. `h-[Npx]` and the standard scale) into the numeric `size` prop that lib needs — call sites keep writing `<Music2 className="h-4 w-4" />` unchanged. Glyphs without an animated set equivalent (`Album`, `Clapperboard`, `GripVertical`, `ListPlus`, `Palette`, `SearchX`, `Square`, `XCircle`) render through `makeCssAnimated` (span `[data-icon-anim=…]` + keyframes in index.css — shake/spin/pop/bounce-y/hue/clap on hover), so **no icon is static**. Mapping table + substitution decisions live in the file header and `rules.md` #21–23. Rough name map: Music2/Music4→Music, Mic2→Mic, Loader2→Loader, Home→House, Library→BookOpen, MoreHorizontal→Ellipsis, ListMusic→List, ListVideo→LayoutList, CircleUserRound→UserRound, MonitorPlay→Monitor, CheckCircle2→CircleCheck, ListRestart/RotateCcw→RefreshCw, PanelLeftClose/Open→ChevronsLeft/Right, ImagePlus→Image, FileAudio→FileMusic, CloudUpload→CloudUpload, Upload→Upload
- Hybrid playback: HTML5 `<audio>` + `resolvePlayUrl` (local via `convertFileSrc`, else `/songs/:id/stream`). Playback sync every 10s + on pause/play; desktop device via `registerDevice()`.
- DevTools: enabled via `"devtools": true` in `tauri.conf.json` + `"devtools"` Cargo feature in `Cargo.toml`. Opens via F12/Ctrl+Shift+I natively. No JS API (`openDevtools()` doesn't exist in Tauri 2).
- App exit: `on_window_event` in `lib.rs` intercepts `CloseRequested` and calls `app_handle().exit(0)` — app fully exits when any window closes (no background process).
- Custom title bar: Minimize/Maximize/Close buttons in `AppFrame.tsx` header (already present).
- Sidebar (`AppFrame.tsx`): collapsed = `w-16`, all nav groups render as centered icon rows with a single managed tooltip (fixed-position, escapes the scrollable playlist column which would clip CSS tooltips). Expanded playlists list preserved. Avatar in `TopBar` navigates via `handleTopBarNavigate` (page-aware; only Search triggers focus).
- Saved YouTube: localStorage `flowbyte.savedPlaylists`, `parseYouTubeUrl()` (utils.ts), `YouTubeEmbed.tsx` (youtube-nocookie, `videoseries?list=` for playlists), Settings `iframePreview` toggle (default ON), `DesktopSettings` typed localStorage. `SavedPlaylistItem` has optional `importedSongId` (uploaded) and `localFilePath` (downloaded-only) fields; play prefers library song → local file → iframe preview.
- Import pipeline (desktop, current): Rust `start_music_import` downloads to `binaries::import_dir` = **`~/Downloads/Flowbyte Imports`** (persistent, never auto-cleaned; upload deletes staged files). UI runs imports as **sequential per-song jobs** (DownloadContext queue; `queued` status; cancel kills the running yt-dlp child + drops queued rows). `DownloadJob` history persists to `flowbyte.downloadJobs.v1` (hydration marks interrupted rows failed). Upload half (`client.uploadAudio/uploadArtwork/uploadLyrics/completeSongUpload`) runs only when `uploadImports` (default off) or the per-job **Upload to library** action runs; success stamps `importedSongId` via `stampSavedItemImported`, local-only stamps `localFilePath` via `stampSavedItemLocalFile`. Toasts include song titles (description). Legacy Rust `start_playlist_import`/`playlist-import-progress` events kept but unused (Rust builds are CI-only — no local MSVC).
- Binary resolution: `binaries.rs` tries bundled path → resource path → system PATH (`where`/`which`). No more "binary not found" when yt-dlp/ffmpeg are installed system-wide.
- Mini window: label `mini` (340×92 transparent, alwaysOnTop, skipTaskbar), Rust commands `mini::show/hide_mini_player`, broadcast `mini-player-state`, `mini-player-command`; capability `capabilities/mini.json`.
- Vite gotcha: CJS workspace packages need `build.commonjsOptions.include: [/node_modules/, /packages\//]`.
- Runtime theming (see `uiux_plan.md`): tokens live in `index.css` `@theme`; utilities compile to `var(--color-*)`/`var(--radius-*)`/`var(--font-sans)` and spacing/text are rem → `applyTheme()` (lib/theme.ts) overrides those vars + root `font-size` on `<html>`. `initTheme()` runs in `main.tsx` before first paint; `ThemedToaster` follows light/dark palette. Accent fg auto-picks white/near-black by luminance.
- Lottie: `GirlListeningAnimation.tsx` dynamic-imports `lottie-web` (own types, no `@types` package) and loads the JSON via `?url` (never bundled; 761 KB asset, 39 KB gzip). AuthPage is a two-pane split (art + glow left, welcome/auth flow right). Mobile: same JSON under `apps/mobile/assets/animations/` + `lottie-react-native` (needs a dev build, not Expo Go) on the SplashScreen, which RootLayout now gates on (`booted` state).
- Mobile live theming (FINAL): `constants/theme.ts` reads the zustand settings store via live getters (all `AppColors.*` keys) + `useThemedStyles(factory)` re-memoizes per-file styles on `themeVersion` (bumped by accent change / background mode switch). `settingsStore`: `backgroundMode` (dark/light) + `themeVersion`. **Every** AppColors style file now calls `useThemedStyles` inside its component (module `subscribeToTheme` helper deleted). RootLayout still derives nav/paper/status themes from `useAppTheme()` but no longer keys/remounts the tree; `(tabs)/_layout.tsx` also subscribes (tab bar colors come from the live palette). SplashScreen gates boot (`booted` state) + hosts the Girl-listening Lottie.

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
- Mobile workflow has "Build shared packages" step before typecheck (was missing, caused CI failures). Desktop workflow already had it.
- API client methods (shared): login/register, library CRUD (+ `updateSong` PATCH metadata), `getPlaylists/getPlaylist/createPlaylist/deletePlaylist/addSongToPlaylist`, uploads, lyrics, favorites, playback sync, registerDevice.

## Environment / Gotchas

- Windows (win32), PowerShell 5.1. pnpm 11.5.0, Node 22.14.0. Scratch: `C:\Users\Dell\AppData\Local\Temp\opencode`.
- Desktop body transparent (`index.css`) for mini-window rounded corners. Mobile `EqualizerScreen`/`SplashScreen` use mock data. `SongsScreen` and `AlbumsScreen` now fetch from the API.
- Legacy apps have their own `.git` dirs — leave alone. Windows binaries need `.exe`; Tauri sidecars `-${TARGET_TRIPLE}`.
- Electron percent regex only matches `x.y%` (not `5%`) — fixed in Rust port.
