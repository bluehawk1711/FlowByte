# Flowbyte — Feature Audit: Desktop vs Mobile

This document audits every feature available in the desktop app and identifies what's missing or incomplete in the mobile app. Items are prioritized by user impact.

---

## 1. Navigation & Layout

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Sidebar navigation | ✅ Collapsible sidebar with sections | ❌ Tab bar (Library, Folders, Cloud, Settings) | ⚠️ Different paradigm — acceptable |
| Global search bar (TopBar) | ✅ Persistent search in TopBar | ❌ Only cloud tab has inline search | **MISSING** |
| "Add Music" button | ✅ TopBar button opens AddMusicModal | ✅ + button in Library header → AddMusicScreen | ✅ |
| Account avatar / sign-in status | ✅ TopBar shows avatar | ❌ Only in Settings screen | ⚠️ Minor gap |

---

## 2. Home / Discovery

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Personalized greeting | ✅ "Good morning/afternoon/evening" | ❌ Just "Library" title | **MISSING** |
| Recently played (horizontal cards) | ✅ AlbumCard grid with play-all | ✅ RecentlyPlayedCard in LibraryListHeader | ✅ Parity |
| Favorites section | ✅ SongRow list with play-all | ✅ Separate Favourite tab | ✅ Parity (different layout) |
| Recently added section | ✅ SongRow list | ❌ Not shown on home | **MISSING** |
| Empty state with guidance | ✅ "Your library is empty" with CTA | ⚠️ Generic "No Songs Here" | **MISSING** — needs contextual guidance |
| Skeleton loading states | ✅ Full skeleton matching final layout | ❌ ActivityIndicator spinner | **MISSING** |

---

## 3. Library

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Tab filters (All/Songs/Artists/Albums/Playlists/Favorites) | ✅ Full filter bar with icons | ❌ SongsScreen has tabs but hardcoded data | **BROKEN** — uses mock data, not real library |
| Inline search/filter | ✅ SearchInput filters library | ❌ No search in library | **MISSING** |
| Artists grid view | ✅ Circular artist cards | ❌ Not available | **MISSING** |
| Albums grid view | ✅ Square album cards with play | ⚠️ AlbumsScreen exists but uses hardcoded data | **BROKEN** — mock data, not connected |
| Playlists list | ✅ Server-side playlists in library | ✅ PlaylistManager (local playlists only) | ⚠️ Desktop uses API playlists; mobile uses local-only |
| Context menu on songs | ✅ SongContextMenu (Play, Queue, Favorite, Playlist, Delete) | ✅ SongActionsMenu bottom sheet (Play Next, Queue, Playlist, Favorite, View Lyrics, Add Cover) | ✅ |
| Multi-select / bulk actions | ❌ Not implemented | ✅ Selection mode with bulk add to playlist/favorites | ✅ Mobile-only feature |
| Skeleton loading | ✅ LibrarySkeleton | ❌ ActivityIndicator | **MISSING** |

---

## 4. Search

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Dedicated search page | ✅ SearchPage with full API search | ✅ SearchScreen with API search | ✅ |
| Debounced search (300ms) | ✅ | ✅ | ✅ |
| Categorized results (Songs/Artists/Albums) | ✅ Sectioned with counts | ✅ Sectioned with counts | ✅ |
| URL detection (YouTube → action) | ✅ YouTube URL card with Open/AddMusic | ✅ YouTube URL banner with save/browse | ✅ |
| Filter pills (All/Songs/Artists/Albums) | ✅ Per UI spec | N/A | ✅ |
| Top Result card | ✅ Artist/album card per UI spec | N/A | ✅ |
| Recent searches | N/A | ✅ AsyncStorage-persisted list | ✅ |
| Browse categories grid | N/A | ✅ Colored category cards | ✅ |
| Keyboard navigation (arrows + enter) | ✅ N/A on mobile | ❌ | N/A |
| Loading skeleton | ✅ Matches final layout | ⚠️ ActivityIndicator | ⚠️ Mobile has spinner |
| Empty/no-results states | ✅ Sparkles + SearchX icons | ✅ Icons + text | ✅ |

---

## 5. Now Playing / Player

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Full-screen expanded player | ✅ ExpandedPlayer overlay | ✅ NowPlayingScreen (separate screen) | ✅ Parity |
| Mini player bar | ✅ NowPlayingBar (global, persistent) | ✅ MiniPlayer component | ✅ Parity |
| Shuffle toggle | ✅ | ✅ | ✅ |
| Repeat toggle (off/all/one) | ✅ 3-state (off/all/one) | ✅ 2-state (off/all) | ⚠️ Desktop has repeat-one |
| Seek slider with timestamps | ✅ | ✅ | ✅ |
| Volume control | ✅ Slider in NowPlayingBar | ❌ No volume control | **MISSING** — device volume via hardware |
| Favorite toggle | ✅ Heart in expanded player | ✅ Heart in NowPlayingScreen + MiniPlayer | ✅ |
| Lyrics view | ✅ LyricsPanel + ExpandedPlayer synced lyrics | ✅ Synced lyrics in NowPlayingScreen | ✅ |
| Queue view | ✅ QueuePanel (slide-in) | ⚠️ Queue managed in audioContext but no dedicated UI | ⚠️ Functional but no visual queue |
| Play next / Add to queue | ✅ Via context menu | ✅ Via SongActionsMenu | ✅ |
| Offline download toggle | ❌ Desktop streams only | ✅ Download/remove offline button | ✅ Mobile-only |
| Cloud badge + status | ❌ N/A | ✅ Shows cloud badge + offline status | ✅ Mobile-only |
| Mini player window (Tauri) | ✅ Separate always-on-top window | ❌ N/A (mobile multitasking) | N/A |

---

## 6. Downloads / Offline

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Active download tracking | ✅ DownloadContext with real-time progress | ❌ No active download tracking | **MISSING** — downloads happen server-side |
| Pipeline stage indicators | ✅ 5-stage pill bar (Download→Audio→Artwork→Lyrics→Upload) | ❌ | **MISSING** |
| Progress bar + speed/ETA | ✅ Progress component with percent/speed/eta | ❌ | **MISSING** |
| Cancel active download | ✅ | ❌ | **MISSING** |
| Retry failed import | ✅ | ❌ | **MISSING** |
| Offline library management | ✅ (via API) | ✅ DownloadsScreen with play/remove/clear | ✅ |
| Offline playback | ✅ Local files via Tauri | ✅ Local files via expo-file-system | ✅ |

---

## 7. Add Music / Import

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| YouTube URL input modal | ✅ AddMusicModal dialog | ✅ AddMusicScreen with URL input | ✅ |
| Video analysis (thumbnail, metadata) | ✅ analyze() shows title, uploader, duration, views | ❌ | **MISSING** |
| YouTube iframe preview | ✅ YouTubeEmbed component | ❌ | **MISSING** |
| Multiple download types (audio/video/playlist) | ✅ 7 download options | ❌ | **MISSING** |
| Import to library | ✅ importToLibrary() | ❌ | **MISSING** |
| Save to playlist | ✅ addToSavedPlaylist() | ❌ | **MISSING** |

---

## 8. Saved YouTube Videos

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Save YouTube URLs | ✅ Via AddMusicModal "Save to playlist" | ✅ SavedScreen with URL input | ✅ |
| Playlist organization | ✅ Named playlists with items | ⚠️ Flat list, no playlist grouping | **PARTIAL** — needs playlist support |
| YouTube embed preview | ✅ YouTubeEmbed with play button | ❌ Opens in external browser | **MISSING** — needs in-app preview |
| Download/import from saved | ✅ Import to library + Download playlist | ❌ No download/import from saved items | **MISSING** |
| Thumbnail display | ✅ Shows video thumbnail | ❌ No thumbnails | **MISSING** |

---

## 9. Playlists (Server-side)

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Create playlist | ✅ Via context menu or sidebar | ✅ PlaylistManager (local only) | ⚠️ Desktop uses API; mobile uses local |
| Add songs to playlist | ✅ Via context menu submenu | ✅ PlaylistSelectionModal | ✅ |
| Delete playlist | ✅ | ✅ | ✅ |
| Playlist sync with server | ✅ Implicit via API | ✅ Two-way sync via sync.ts | ✅ |
| Rename playlist | ❌ Not implemented | ❌ Not implemented | ❌ Both missing |

---

## 10. Settings

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| API URL configuration | ✅ | ✅ | ✅ |
| Sign in / sign out | ✅ AuthPage + SettingsPage | ✅ SettingsScreen cloud modal | ✅ |
| Import bitrate | ✅ | ❌ Desktop-only setting | N/A |
| Transcode option | ✅ | ❌ Desktop-only setting | N/A |
| Notify on complete | ✅ | ❌ Desktop-only setting | N/A |
| YouTube iframe preview toggle | ✅ | ❌ Desktop-only setting | N/A |
| Appearance / theme colors | ❌ | ✅ Accent color picker (3 colors) | ✅ Mobile-only |
| Resume playback on startup | ❌ | ✅ | ✅ Mobile-only |
| Random cover art toggle | ❌ | ✅ | ✅ Mobile-only |
| Clear metadata cache | ❌ | ✅ | ✅ Mobile-only |
| Equalizer | ❌ | ✅ EqualizerScreen with presets | ✅ Mobile-only |

---

## 11. Context Menus / Song Actions

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Right-click context menu | ✅ SongContextMenu | N/A | N/A — different paradigm |
| Long-press action menu | N/A | ✅ SongActionsMenu bottom sheet | ✅ |
| Play next | ✅ | ✅ Via SongActionsMenu | ✅ |
| Add to queue | ✅ | ✅ Via SongActionsMenu | ✅ |
| Add to favorites | ✅ | ✅ Via SongActionsMenu | ✅ |
| Add to playlist | ✅ With submenu | ✅ PlaylistSelectionModal | ✅ |
| View lyrics | ✅ | ✅ Navigates to NowPlayingScreen | ✅ |
| Delete from library | ✅ (disabled placeholder) | ❌ | ❌ Both incomplete |

---

## 12. Queue Management

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Queue panel / view | ✅ QueuePanel (slide-in) | ❌ No queue UI | **MISSING** |
| View upcoming songs | ✅ | ❌ | **MISSING** |
| Reorder queue | ✅ Move up/down buttons | ❌ | **MISSING** |
| Remove from queue | ✅ | ❌ | **MISSING** |
| Clear queue | ✅ | ❌ | **MISSING** |
| Add to queue | ✅ Via context menu | ❌ No mechanism | **MISSING** |
| Play next (insert after current) | ✅ | ❌ | **MISSING** |

---

## 13. Lyrics

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Synced lyrics display | ✅ LyricsPanel with auto-scroll | ❌ No lyrics | **MISSING** |
| Unsynced lyrics fallback | ✅ | ❌ | **MISSING** |
| Active line highlighting | ✅ Scaled + bold + accent color | ❌ | **MISSING** |
| Auto-scroll to current line | ✅ Smooth scroll | ❌ | **MISSING** |
| Lyrics toggle button | ✅ In NowPlayingBar | ❌ | **MISSING** |
| Lyrics in expanded player | ✅ Right panel | ❌ | **MISSING** |

---

## 14. Loading / Empty / Error States

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Skeleton loading screens | ✅ All pages have matching skeletons | ❌ ActivityIndicator everywhere | **MISSING** |
| Empty states with icons + guidance | ✅ EmptyState component with context | ⚠️ Generic or missing | **MISSING** |
| Error states with retry | ✅ | ❌ | **MISSING** |
| Offline state | ❌ | ⚠️ "Not signed in" screen | ⚠️ Partial |

---

## 15. Keyboard Shortcuts / Gestures

| Feature | Desktop | Mobile | Status |
|---|---|---|---|
| Space = play/pause | ✅ useGlobalShortcuts | ❌ N/A | N/A |
| Arrow keys = seek | ✅ | ❌ N/A | N/A |
| Ctrl+K = search | ✅ | ❌ N/A | N/A |
| Swipe gestures | N/A | ❌ No swipe actions on song rows | **MISSING** — could add swipe-to-favorite/download |
| Pull-to-refresh | N/A | ✅ CloudScreen has RefreshControl | ✅ |

---

## Summary: Priority Fix List

### 🔴 Critical (Core functionality gaps) — ALL RESOLVED

All critical gaps have been addressed. Search, Add Music, Queue management, and Song Actions are now functional on both platforms.

### 🟡 Important (Feature parity gaps)

1. **Library Tabs Connected** — AlbumsScreen and SongsScreen now fetch from API ✅
2. **Queue Visual UI (Mobile)** — Queue is managed in audioContext but no dedicated visual queue screen/bottom sheet
3. **Saved Page** — Needs playlist grouping, thumbnails, download/import actions
4. **Download Progress** — No active download tracking with stages (mobile)

### 🟢 Nice-to-have (Polish)

5. **Skeleton Loading** — Mobile still uses ActivityIndicator; could add skeleton screens
6. **Empty States** — Contextual empty states with guidance
7. **Recently Added** — Show on home/library
8. **Swipe Gestures** — Swipe-to-favorite, swipe-to-download on song rows
9. **Volume Slider** — Software volume control (optional, hardware buttons exist)
10. **Repeat One** — Mobile repeat toggle is 2-state; desktop has 3-state (off/all/one)

---

## Implementation Plan

### Phase 1: Core Gaps — ✅ ALL DONE

All critical gaps have been implemented:
- Search screen with URL detection, recent searches, browse categories
- Song actions bottom sheet with Play Next, Queue, Favorites, Lyrics
- Queue management in audioContext (addToQueue, insertNext, removeFromQueue, clearQueue, moveInQueue)
- Add Music screen for YouTube URL import

### Phase 2: Feature Parity — ✅ MOSTLY DONE

- AlbumsScreen and SongsScreen now fetch from API (no more mock data)
- Lyrics display in NowPlayingScreen with auto-scroll
- Search redesigned to match UI spec

### Phase 3: Remaining Polish

1. **Mobile Queue Visual UI** — Create a bottom sheet showing current queue
2. **Saved Page Improvements** — Playlist grouping, thumbnails, download/import
3. **Skeleton Loading** — Replace ActivityIndicator with skeleton screens
4. **Empty States** — Contextual empty states with guidance
5. **Swipe Gestures** — Swipe-to-favorite, swipe-to-download on song rows
