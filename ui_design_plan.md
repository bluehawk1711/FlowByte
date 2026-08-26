# Flowbyte — UI/UX Master Specification

Premium personal music library. The desktop and mobile applications must feel like a professionally designed music streaming application — comparable in quality, hierarchy, interaction design, responsiveness, animations, and information architecture to Spotify and Apple Music.

Use Spotify/Apple Music as **UX references** (information hierarchy, navigation patterns, player behavior, library organization, search, queue, playlists, context menus, bottom sheets, media controls, typography, spacing, artwork presentation, interaction feedback, responsive layouts). Do **NOT** copy their branding, exact layouts, proprietary assets, or visual identity — create an original premium design system inspired by proven music-app UX patterns.

## 1. Core Design Philosophy

The app should feel: **Premium, Minimal, Fast, Modern, Music-focused, Spacious, Intentional, Easy to understand, Visually consistent, Responsive, Keyboard friendly (desktop), Touch friendly (mobile).**

Avoid: excessive cards · excessive borders · random rounded containers · huge empty spaces · too many buttons · tiny clickable targets · inconsistent spacing · inconsistent icon sizes · unnecessary gradients · UI clutter · developer-dashboard aesthetics · every section looking like a CRUD table.

**The interface should prioritize the music.** Album artwork, song titles, artists, playlists, and playback are the visual focus.

## 2. Design System

Unified design system shared conceptually between desktop and mobile.

- **Typography scale:** Display, Heading 1–3, Body, Body Small, Caption, Label. Music metadata hierarchy: Song Title > Artist > Album > additional metadata. Do not make every piece of information equally prominent.
- **Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. No arbitrary margins.
- **Border radius scale, icon sizes, button sizes, input heights, shadows, elevation, surface hierarchy, modal hierarchy, animation durations, interaction states** — all defined centrally.

## 3. Color System

Premium dark music-app aesthetic. **Avoid pure black everywhere**; use multiple dark surfaces for depth:

```
Background → Sidebar → Content → Cards/surfaces → Modal → Floating player controls
```

- Deep dark background, slightly lighter sidebar, elevated player surface, subtle secondary surfaces
- High contrast primary text, muted secondary text
- Accent color for active states — configurable via the design system
- Album artwork may influence accents where appropriate, but never visually chaotic

## 4. Desktop Information Architecture

Spotify-style three-zone architecture:

```
┌──────────────────────────────────────────────────┐
│ Top Navigation / Search                          │
├──────────────┬───────────────────────────────────┤
│   SIDEBAR    │         MAIN CONTENT              │
├──────────────┴───────────────────────────────────┤
│            GLOBAL MUSIC PLAYER                   │
└──────────────────────────────────────────────────┘
```

1. Navigation · 2. Main content · 3. Persistent music player

## 5. Desktop Sidebar

Persistent. Primary nav: **Home / Search / Your Library**. Then playlists → dynamic user-created playlists. Example:

```
HOME · Search · Your Library
YOUR MUSIC · Recently Played · Favorites · Downloaded
PLAYLISTS · Liked Songs · Chill · Workout · … · + Create Playlist
```

- Playlist scrolling scrolls independently; sidebar must not become excessively tall
- Active item visually obvious; icon + label; consistent icon style/size (professional icon library, no emoji)

## 6. Collapsible Sidebar

Expanded `[icon] Label` ↔ collapsed `[icon]` with smooth transition. Tooltips on collapsed hover. Never hide important functionality when collapsed. **Remember sidebar state.**

## 7. Main Content

- Independent scrolling, sticky/appropriate header behavior, proper content width, responsive grids, section hierarchy
- Max-widths: on 1920px+ monitors content stays intentionally composed — never a giant empty spreadsheet

## 8. Desktop Home

Personalized: *Good evening* → **Recently Played** (album grid) → **Made for you** (large playlists) → **Recently Added** (song list) → **Recommended from your library**. Sections appear only when meaningful data exists — **no empty sections**. Start music within 1–2 interactions.

## 9. Library

Segmented/filter navigation: `[All] [Songs] [Albums] [Artists] [Playlists]` (+ Downloaded, Favorites). Contextual search/filter. **Grid** for albums/playlists, **list/table** for songs, **artist cards** for artists. Never a giant generic data table.

## 10. Song List Design

```
#  │ TITLE (cover, name / artist) │ ALBUM │ DATE │ LENGTH
```

- Hover: play button appears, row highlights, context actions reveal
- Playing: animated playback indicator replaces the number
- Secondary actions live in a three-dot context menu — never 6 permanent buttons per row

## 11. Context Menus

Heavy use for secondary actions. Song menu: Play · Play Next · Add to Queue · Add to Playlist · Favorite · Download · View Album · View Artist · View Lyrics · Delete from Library.

## 12–13. Search

Best-in-class experience. Desktop: large search field in top nav, **Ctrl/Cmd+K** focuses it. Categorized instant results (Songs / Artists / Albums / Playlists) with debounce, loading/empty/no-results states. Full interaction model: click → focus; type → suggestions; ↑/↓ navigate; Enter → open selected; Escape → close. Feels native.

## 14. Music Player (global)

Persistent bottom player — original, not a copy:

- **Left:** artwork, song title, artist, favorite
- **Center:** previous / play-pause (primary) / next / shuffle / repeat
- **Right:** lyrics, queue, volume, more
- Progress: current time / bar / remaining time. Strong control hierarchy; Play/Pause is primary.

## 15. Expanded Player

Clicking player/artwork opens an expanded view: large artwork, title, artist, progress, controls, **lyrics panel, queue, playback details**. Smooth transition. Primary place for lyrics/queue/larger artwork.

## 16. Lyrics Experience

First-class. Lyrics button in player → large readable lyrics, **current line highlighted** (stronger typography/opacity), previous/next subtle, automatic smooth scrolling synchronized with playback. Unavailable → polished empty state ("Lyrics aren't available for this song"), never broken-looking.

## 17. Queue

Right-side panel on desktop / bottom sheet on mobile. Items: artwork, song, artist, duration (+ drag handle where appropriate). Current song highlighted. Support reorder, remove, play, clear — never complicated.

## 18–19. Download UX

**Never a developer utility.** Polish the flow: Download → Downloading… (progress bar, size) → Processing audio… → Optimizing artwork… → Processing lyrics… → Uploading… → Complete ✓. Dedicated Downloads view: Active (Song, status, %), Completed (✓, size); pause where supported, cancel, retry, remove; expandable technical "Details".

## 20–21. Add Music Flow

Prominent **+ Add Music** button → modal: Paste YouTube URL / Import Local File (future: Import Folder). Analyze → preview (artwork, title, artist, duration) → Download. Optional pre-download: audio quality, lyrics, artwork — sensible defaults. **No FFmpeg flags for normal users** (advanced settings separate). Clear stages with a visual progress indicator — user always knows "what is happening right now".

## 22–23. Mobile Information Architecture

Mobile-native, not a shrunk desktop. **Bottom navigation: Home / Search / Library (3 tabs max)** — secondary navigation lives inside screens. Mini player sits above bottom nav. Respect safe areas + Android gesture areas.

## 24. Mobile Mini Player

`Artwork │ Song Name │ ▶/❚❚` above bottom nav. Tap → full player. Never obscures important content.

## 25. Mobile Full Player

Immersive: large artwork dominates, title/artist, favorite, progress + times, previous/play-pause/next, shuffle/repeat, lyrics/queue. Vertical spacing used carefully.

## 26. Mobile Lyrics

Full-screen lyrics view. Current line large/high-contrast with animated transition; previous/next smaller/lower emphasis; auto-scroll; tap line may seek.

## 27. Mobile Search

Dedicated screen, input focused on entry. Recent searches, suggested searches, results grouped Songs/Artists/Albums/Playlists. **Touch targets ≈ 44×44pt minimum.**

## 28. Mobile Library

`[Playlists] [Songs] [Albums] [Artists]` + Recently Added / Favorites / Downloaded. **Horizontal scrolling sections** — not everything a vertical list.

## 29. Mobile Download Flow

Native feel: tap download → Downloading… with progress → ✓ Downloaded. Bulk download from album/playlist. Downloads section; offline songs clearly identified.

## 30. Mobile Bottom Sheets

Preferred for: song actions, playlist actions, queue, add-to-playlist, sort/filter, download options (e.g. "Add to Playlist" sheet with playlist list + "+ New Playlist"). Avoid repeated full-screen dialogs.

## 31. Modals

Desktop: centered dialogs for confirmation/create/delete; **side panels** for queue/lyrics/details. Mobile: bottom sheets, not desktop-style centered dialogs.

## 32. Toasts / Feedback

Subtle: "✓ Added to playlist" etc. Never intrusive alerts for normal operations. Dismissible + accessible.

## 33. Loading States

**Skeletons matching final layout** (album/song row/artist/playlist) — no blank screens, no generic spinners everywhere.

## 34. Empty States

Every major screen: useful empty state that guides the next action ("No songs yet — Add your first song… [Add Music]").

## 35. Error States

Human-readable ("Couldn't load your library — check your connection", [Retry]). Technical details hidden behind "Details".

## 36. Animations

Subtle and purposeful: sidebar expansion, player expansion, mini→full player, bottom sheet, modal, hover, press, favorite, queue changes, lyrics scroll, download progress. Communicate hierarchy/state/continuity/spatial relationships. Fast interactions ~120–180ms; larger transitions ~200–350ms.

## 37. Hover States (desktop)

Song row: normal = title/artist; hover reveals ▶ + ⋮ (never noisy). Buttons have hover/pressed/focused/disabled states.

## 38. Keyboard Support (desktop)

Space → play/pause · Ctrl/Cmd+K → search · ←/→ → prev/next (or seek by context) · Ctrl/Cmd+Shift+F → favorite · Escape → close modal/panel. Never interfere with text inputs. Tab navigation + visible focus states.

## 39. Accessibility

Accessible labels, semantic controls, keyboard nav, focus management, contrast, screen-reader labels, touch targets. **Never communicate only through color** (favorite = filled heart + accessible label, not just color).

## 40–42. Responsiveness

1280/1440/1920/2560+: narrower → reduce sidebar width, grid columns, secondary metadata, compact player; wider → more columns/artwork but preserved max content width. Player: normal width = full controls; narrower → secondary controls into "More"; very narrow → artwork, song, play/pause, next only. Never overlapping controls.

## 43. Artwork System

Consistent aspect ratio, lazy loading, proper object-fit, rounded corners per design, missing-artwork placeholders, blur/loading placeholders. Grids keep consistent dimensions — ratios never break layout.

## 44–46. Playlist / Album / Artist Pages

**Editorial, not CRUD.** Playlist: large artwork, name, description, song count, actions (Play / Shuffle / ⋮), song list. Album: large artwork, name, artist, year, song count, Play/Shuffle/Download, track list. Artist: header/artwork, name, popular songs, albums, singles, recently added — simple if metadata is limited.

## 47–49. Settings + Download States

Settings organized: Account · Playback · Downloads · Audio · Storage · Appearance · About (per platform). Advanced (FFmpeg flags, storage keys, raw API URLs) hidden under "Advanced". Normal: audio quality, download location, auto artwork/lyrics. Download state semantics shared across platforms: Cloud-only → Downloading → ✓ Downloaded → Failed.

## 50. Premium UX Details

Artwork crossfade, smooth player transitions, persistent playback state, scroll restoration, remember last library filter/sidebar state/volume, preserved search query + queue when navigating, no unnecessary reloads, optimistic favorite/playlist actions, immediate local feedback, background sync, offline-aware UI. **Fast even when the network is slow.**

## 51. Performance

Virtualized song lists, lazy artwork, pagination/infinite scroll, cached API responses, local metadata caching, optimized images, efficient streaming, debounced search, memoized UI, minimal re-renders. Player stays responsive during downloads/uploads/sync/search/artwork loading.

## 52–53. Consistency + Component Architecture

Reusable primitives: Button, IconButton, Card, SongRow, AlbumCard, ArtistCard, PlaylistCard, Modal, BottomSheet, Toast, ProgressBar, Slider, Tabs, SearchInput, ContextMenu, Skeleton, EmptyState, ErrorState, MiniPlayer, FullPlayer. Separate UI / business logic / data fetching / player state / local storage / API state. Dedicated player architecture: PlayerProvider, PlayerStore, QueueManager, PlaybackController, PlaybackSync — UI consumes state. Never put player logic in UI components.

## 54. Player State

Centralize: currentSong, queue, currentPosition, duration, isPlaying, volume, shuffle, repeat, loading, buffering, lyrics, device.

---

# UI Implementation Order

- **Phase 1:** Design tokens + UI primitives
- **Phase 2:** Desktop AppShell — Sidebar, TopBar, MainContent, GlobalPlayer
- **Phase 3:** Desktop Home / Library / Search
- **Phase 4:** Player — MiniPlayer, FullPlayer, Queue, Lyrics
- **Phase 5:** Desktop Add Music + Download Manager
- **Phase 6:** Mobile AppShell — BottomNavigation, MiniPlayer, FullPlayer
- **Phase 7:** Mobile Home / Library / Search
- **Phase 8:** Mobile Queue / Lyrics / Sheets
- **Phase 9:** Connect real API/data
- **Phase 10:** Loading / empty / error / offline states
- **Phase 11:** Animations and micro-interactions
- **Phase 12:** Full responsive / accessibility / UX pass

**Hard requirements:** No placeholder boxes as final UI. No "TODO" UI sections. No generic dashboard components reused everywhere. Every screen intentionally designed for its purpose.
