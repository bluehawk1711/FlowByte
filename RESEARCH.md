# Flowbyte — Research & Plans

## Code Review Findings

### API (Critical/High)

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1 | **High** | Stream tokens in localStorage are unsigned base64 — anyone can forge them | `storage.controller.ts:60-68` |
| 2 | **High** | CORS allows all origins with credentials (dev shortcut left in) | `main.ts` (CORS config) |
| 3 | **High** | No rate limiting on auth endpoints (brute-force risk) | `auth/` |
| 4 | **High** | No request body size limits on upload endpoints | `uploads.controller.ts` |
| 5 | **Medium** | `forbidNonWhitelisted: false` allows unexpected body fields | Global validation pipe |
| 6 | **Medium** | Duplicate `JwtModule.register` with different fallback secrets | Auth module |
| 7 | **Low** | No UUID validation on route params — invalid IDs cause empty queries, not 400 | Various controllers |

### Desktop

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 8 | **High** | CSP disabled in Tauri config (required for dev, but should be production-ready) | `tauri.conf.json` |
| 9 | **Medium** | `readFileBytes` returns `number[]` — large files cause IPC serialization overhead | `music.rs:236` + `tauri.ts:58` |
| 10 | **Low** | Mini-player state pushed every 1s unconditionally even when unchanged | `PlayerContext` |

### Mobile

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 11 | **High** | `EqualizerScreen` creates animations on mount but never stops them on unmount | `EqualizerScreen.tsx` |
| 12 | **Medium** | `songMetadata` store never auto-hydrates — custom covers lost on restart | Mobile lib |
| 13 | **Medium** | `offline.ts` persist() doesn't await async writes (data loss risk on crash) | `offline.ts` |
| 14 | **Low** | `LibraryListHeader` dead condition `history.length < 0` (always false) | `LibraryListHeader.tsx` |
| 15 | **Low** | `audioConfig.debug: true` hardcoded — pollutes logs in production | `audioContext.ts` |

### Shared Packages

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 16 | **Medium** | `Song` interface mixes API model fields + client-side state (`isDownloaded`, `localUri`, `downloadStatus`) | `types/src/index.ts:60-93` |
| 17 | **Medium** | `isFavorite()` swallows all errors as `false` — network failures look like "not favorited" | `api-client` |
| 18 | **Low** | `isYouTubeUrl` regex diverges between desktop and mobile packages | `utils.ts` |
| 19 | **Low** | `extractYouTubeVideoId` missing `/embed/` and `/shorts/` URL patterns | `utils.ts` |
| 20 | **Low** | `logout()` calls non-existent `POST /auth/logout` endpoint | `api-client:197` |

---

## Google Drive Integration Plan

### Design Decisions

**Approach: Server-side OAuth with StorageProvider abstraction**

The API already proxies all file transfers (desktop reads local files → POSTs to API). Google Drive fits naturally as another `StorageProvider` implementation — tokens stored server-side, clients never see Google credentials.

**Storage Key Convention:**
- Current: `audio/{uuid}.opus`, `artwork/{uuid}.webp` (local/B2 paths)
- Google Drive: `gdrive:{googleFileId}` — prefix tells the provider which backend to use
- Existing `StorageProvider` interface needs no changes (keys are opaque strings)

**OAuth Flow (Desktop):**
1. Desktop opens browser to `GET /api/storage/google-drive/auth-url`
2. User consents in Google's OAuth screen
3. Google redirects to `GET /api/storage/google-drive/callback?code=...`
4. API exchanges code for tokens, stores encrypted in `cloud_tokens` table
5. Desktop polls `GET /api/storage/google-drive/status` until connected

**OAuth Flow (Mobile):**
1. Mobile uses Expo `AuthSession` to open the same auth URL
2. Same callback/token exchange
3. Mobile polls status

### Phase 1: Database Schema

**New table: `cloud_tokens`** — stores OAuth tokens per user per provider
```sql
CREATE TABLE cloud_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,           -- 'google-drive'
  access_token TEXT NOT NULL,       -- encrypted at rest
  refresh_token TEXT,               -- encrypted at rest
  expires_at TIMESTAMPTZ,
  scope TEXT,                       -- granted scopes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
```

**New table: `user_storage_preferences`** — default provider per user
```sql
CREATE TABLE user_storage_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_provider TEXT NOT NULL DEFAULT 'local',  -- 'local' | 'backblaze' | 'google-drive'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Phase 2: API — `GoogleDriveStorage` Provider

New file: `apps/api/src/storage/google-drive.provider.ts`

Implements `StorageProvider` using Google Drive API v3:
- `upload(key, data, contentType)` → creates file in user's Drive folder
- `download(key)` → downloads file content
- `delete(key)` → trash or permanent delete
- `getSignedUrl(key)` → generates sharing link (or direct download for private files)
- `exists(key)` → checks file existence

The provider reads the user's tokens from `cloud_tokens` table (injected via request context or a service).

**Key design detail:** Since `StorageProvider` doesn't take a userId, we need a request-scoped wrapper or a factory pattern. The cleanest approach:
- Create a `RequestScopedStorageProvider` that wraps `GoogleDriveStorage`
- Uses NestJS's `REQUEST` injection to get the current user
- Falls back to the configured `STORAGE_PROVIDER` when no Google Drive tokens exist

### Phase 3: API — OAuth Endpoints

New module: `apps/api/src/storage/google-drive/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/storage/google-drive/auth-url` | GET | Returns OAuth consent URL with state token |
| `/storage/google-drive/callback` | GET | Handles OAuth redirect, exchanges code, stores tokens |
| `/storage/google-drive/status` | GET | Returns connection status + storage used |
| `/storage/google-drive/disconnect` | DELETE | Removes stored tokens |
| `/storage/providers` | GET | Lists available providers + user's default |
| `/storage/preferences` | PUT | Sets default provider |

**Scopes needed:** `https://www.googleapis.com/auth/drive.file` (access only to files created by the app, not the entire Drive)

### Phase 4: Upload Flow Changes

**`UploadsService` changes:**
1. Accept optional `storageProvider` parameter in `uploadAudio()`, `uploadArtwork()`, `uploadLyrics()`
2. When `google-drive` selected: use the user's Google Drive tokens
3. Store the Google Drive file ID in the storage key: `gdrive:{fileId}`
4. For streaming: Google Drive provider generates direct links

**`SongsService.getStreamInfo` changes:**
- When `audioStorageKey` starts with `gdrive:`, generate Google Drive streaming URL
- Cache the URL similar to artwork URLs

**`StorageController.stream` changes:**
- When provider is Google Drive, redirect to the Google Drive URL instead of proxying

### Phase 5: Desktop Integration

**Settings page — new "Cloud Storage" section:**
- Shows connection status (Connected/Disconnected)
- "Connect Google Drive" button → opens auth URL in browser
- Shows storage used (via Google Drive API)
- Default provider dropdown (Local / Google Drive)

**AddMusicModal — provider selector:**
- Dropdown above the download button: "Save to: Local / Google Drive"
- Pre-selects the user's default from settings
- Only shows Google Drive option if connected

**Download pipeline:**
- `DownloadContext.handleImportResult` passes selected provider to API
- API routes to the correct StorageProvider

### Phase 6: Mobile Integration

- Add "Cloud Storage" section in mobile settings
- Same OAuth flow via `expo-auth-session`
- Provider selector in the download/add music flow

### Dependencies

```
googleapis (npm) — Google Drive API v3 client
```

### Files to Create/Modify

**Create:**
- `apps/api/src/storage/google-drive.provider.ts`
- `apps/api/src/storage/google-drive/` (module, controller, service)
- `apps/api/src/db/migrations/` (schema migration)
- `apps/desktop/src/components/CloudStorageSettings.tsx`

**Modify:**
- `apps/api/src/db/schema.ts` — add tables
- `apps/api/src/storage/storage.module.ts` — register multi-provider
- `apps/api/src/uploads/uploads.service.ts` — accept provider param
- `apps/api/src/songs/songs.service.ts` — handle gdrive keys
- `apps/api/.env.example` — add `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`
- `packages/types/src/index.ts` — add provider types
- `packages/api-client/src/client.ts` — add storage endpoints
- `apps/desktop/src/pages/SettingsPage.tsx` — add cloud storage section
- `apps/desktop/src/components/AddMusicModal.tsx` — add provider selector
- `apps/desktop/src/lib/api.ts` — add settings type
- `apps/desktop/src/context/DownloadContext.tsx` — pass provider through

---

## Realtime WebSocket vs HTTP Polling Analysis

### Current State (No WebSockets)

The codebase uses **zero WebSocket/Socket.io/SSE connections**. All cross-device sync is HTTP polling.

#### Active Polling Loops

| What | Where | Interval | Network? |
|------|-------|----------|----------|
| Desktop playback sync | `PlayerContext.tsx:281-293` | 10s while playing | PUT /playback/state |
| Mobile playback sync + play recording | `useApiSync.ts:54-65` | 12s always | PUT + POST |
| Mobile foreground re-sync | `useApiSync.ts:67-76` | On app foreground | Full library pull |
| Desktop mini-player state | `PlayerContext.tsx:300-305` | 1s | No (Tauri IPC) |

#### What Never Refreshes

| What | Where | Problem |
|------|-------|---------|
| Desktop Home page | `HomePage.tsx:27-47` | Fetches once on mount, never updates |
| Desktop Library page | `LibraryPage.tsx:66-69` | Fetches on mount + query change only |
| Mobile Cloud screen | `CloudScreen.tsx:53-55` | Only on sign-in or manual pull-to-refresh |

#### Key Gaps

1. **No server-push for library changes**: Desktop adds song → mobile doesn't know until foreground re-sync
2. **Half-implemented cross-device resume**: Desktop pushes playback state, but no client ever calls `GET /playback/state` to resume from another device
3. **Inconsistent intervals**: Desktop 10s, mobile 12s, shared constant unused

---

### WebSocket Implementation Plan

#### Architecture: NestJS WebSocket Gateway

```
┌──────────┐     WebSocket      ┌──────────┐     WebSocket      ┌──────────┐
│ Desktop  │◄──────────────────►│   API    │◄──────────────────►│  Mobile  │
│ (React)  │                    │ (NestJS) │                    │ (RN)     │
└──────────┘                    └──────────┘                    └──────────┘
                                    │
                                    ▼
                              ┌──────────┐
                              │ Postgres │
                              └──────────┘
```

#### What WebSocket Handles vs What Stays REST

| Use Case | Current | With WebSocket | Worth It? |
|----------|---------|----------------|-----------|
| Playback sync (10-12s poll) | HTTP PUT every 10-12s | WS push on play/pause/seek + heartbeat | **YES** — eliminates constant HTTP |
| Library change notification | None (stale until remount) | WS broadcast "library:changed" event | **YES** — instant refresh |
| Cross-device resume | Half-implemented | WS push "playback:changed" to other devices | **YES** — completes the feature |
| Song added/deleted | None | WS broadcast to all clients | **YES** — instant library update |
| Download progress | Tauri IPC (local only) | Stays Tauri IPC | **NO** — not cross-device |
| Search | HTTP GET | Stays HTTP (user-initiated) | **NO** — not real-time |
| Auth (login/register) | HTTP POST | Stays HTTP | **NO** — not real-time |
| File upload/download | HTTP POST/GET | Stays HTTP | **NO** — binary data, not suited for WS |

---

### Phase 1: API — WebSocket Gateway

**New dependencies:**
```
@nestjs/websockets     — WebSocket gateway support
@nestjs/platform-socket.io  — Socket.IO adapter
socket.io               — WebSocket library
```

**New files:**
- `apps/api/src/realtime/realtime.module.ts`
- `apps/api/src/realtime/realtime.gateway.ts` — main gateway
- `apps/api/src/realtime/realtime.service.ts` — business logic

**Gateway design:**
```typescript
// realtime.gateway.ts
@WebSocketGateway({ cors: { origin: true }, namespace: '/' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Auth middleware — verify JWT on connection
  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    // Verify JWT, attach userId to client
  }

  // Client joins a room based on their userId
  // All devices for the same user get events in that room
  handleConnection(client: Socket, userId: string) {
    client.join(`user:${userId}`);
  }

  // Broadcast to all devices of a user
  broadcastToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
```

**Events:**

| Event | Direction | Payload | When |
|-------|-----------|---------|------|
| `playback:sync` | Client → Server | `{ songId, position, isPlaying, deviceId }` | On play/pause/seek (replaces HTTP PUT) |
| `playback:changed` | Server → Client | `{ songId, position, isPlaying, deviceId }` | When another device updates playback |
| `library:changed` | Server → Client | `{ type: 'song_added'\|'song_deleted'\|'favorites_changed', songId? }` | When library mutates |
| `library:sync` | Client → Server | `{ lastSyncVersion: number }` | On reconnect or foreground |
| `library:sync:response` | Server → Client | `{ changes: [...], version: number }` | Response to sync request |
| `ping` / `pong` | Both | — | Heartbeat (30s interval) |

---

### Phase 2: API — Event Emission Points

**Where to emit events (minimal changes):**

1. **`UploadsService.complete()`** — after song inserted:
   ```typescript
   await this.realtime.broadcastToUser(userId, 'library:changed', {
     type: 'song_added',
     songId: result.id,
   });
   ```

2. **`SongsService.delete()` (new)** — after song deleted:
   ```typescript
   await this.realtime.broadcastToUser(userId, 'library:changed', {
     type: 'song_deleted',
     songId: id,
   });
   ```

3. **`FavoritesService.toggle()`** — after favorite added/removed:
   ```typescript
   await this.realtime.broadcastToUser(userId, 'library:changed', {
     type: 'favorites_changed',
   });
   ```

4. **`PlaybackService.sync()`** — after state updated:
   ```typescript
   // Broadcast to OTHER devices (not the sender)
   await this.realtime.broadcastToUser(userId, 'playback:changed', {
     songId, position, isPlaying, deviceId,
   }, excludeDeviceId);
   ```

---

### Phase 3: Desktop — Socket.IO Client

**New dependency:**
```
socket.io-client
```

**New hook: `useRealtime.ts`**
```typescript
// hooks/useRealtime.ts
export function useRealtime() {
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorageStorage.getTokens();
    socket.current = io(getApiUrl(), {
      auth: { token: token?.accessToken },
      transports: ['websocket'],
    });

    socket.current.on('playback:changed', (data) => {
      // Update PlayerContext if another device is playing
    });

    socket.current.on('library:changed', (data) => {
      // Invalidate query cache, refetch library data
    });

    return () => { socket.current?.disconnect(); };
  }, []);
}
```

**Integration points:**
- `PlayerContext.tsx` — replace 10s sync interval with `socket.emit('playback:sync', ...)`
- `HomePage.tsx` / `LibraryPage.tsx` — listen for `library:changed` to auto-refresh
- `AppFrame.tsx` — reconnect on visibility change

---

### Phase 4: Mobile — Socket.IO Client

**New dependency:**
```
socket.io-client
```

**New hook: `useRealtime.ts`**
```typescript
// hooks/useRealtime.ts
export function useRealtime() {
  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    const tokens = getAuthTokens(); // from AsyncStorage
    socket.current = io(getApiUrl(), {
      auth: { token: tokens?.accessToken },
      transports: ['websocket'],
    });

    socket.current.on('playback:changed', (data) => {
      // Update audio context if another device is playing
    });

    socket.current.on('library:changed', (data) => {
      // Trigger incremental library sync
    });

    // Reconnect on AppState change
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') socket.current?.connect();
    });

    return () => {
      sub.remove();
      socket.current?.disconnect();
    };
  }, []);
}
```

**Integration points:**
- `useApiSync.ts` — replace 12s interval with `socket.emit('playback:sync', ...)`
- `useApiSync.ts` — remove foreground full sync, use `library:changed` event instead
- `audioContext.ts` — listen for `playback:changed` to update playing song

---

### Phase 5: Protocol Optimization

**Differential sync for playback:**
```typescript
// Only emit when values actually change
const lastState = useRef({ songId: '', position: 0, isPlaying: false });

socket.on('audio-progress', (position) => {
  const state = { songId: currentSong.id, position, isPlaying: true };
  if (state.songId !== lastState.current.songId ||
      Math.abs(state.position - lastState.current.position) > 5 ||
      state.isPlaying !== lastState.current.isPlaying) {
    socket.emit('playback:sync', state);
    lastState.current = state;
  }
});
```

**Binary heartbeat:**
```typescript
// Lightweight ping every 30s
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping', Date.now());
  }
}, 30_000);
```

---

### Implementation Effort

| Phase | What | Effort |
|-------|------|--------|
| 1 | API Gateway + auth middleware | 0.5 day |
| 2 | Emit events at mutation points | 0.5 day |
| 3 | Desktop client integration | 0.5 day |
| 4 | Mobile client integration | 0.5 day |
| 5 | Optimization (diff sync, reconnect) | 0.5 day |
| **Total** | | **~2.5 days** |

---

### Recommendation

**For a personal music library with 1-2 devices: Keep HTTP polling.**

The current 10-12s sync interval is acceptable for cross-device resume. Library changes are infrequent (adding a song happens maybe once a day). The complexity of WebSocket (connection management, reconnection, auth tokens on connect, mobile battery drain) doesn't justify the marginal improvement.

**Switch to WebSocket if:**
- You want real-time cross-device playback (see what's playing on your phone from desktop instantly)
- You plan to add collaborative features (shared playlists, live listening)
- You have >2 concurrent devices
- You want instant library updates (song added on desktop → mobile shows it immediately)

**Hybrid approach (recommended if you want some real-time):**
Keep REST for all CRUD, add **Server-Sent Events (SSE)** for one-way push notifications:
- Simpler than WebSocket (no双向 communication needed for library changes)
- Auto-reconnect built into `EventSource`
- No new dependency on mobile (React Native has `EventSource` polyfills)
- Desktop: native `EventSource` in browser

SSE handles: "library changed" notifications, "playback changed" notifications. Playback sync stays as HTTP PUT (client → server) since it's periodic and unidirectional.

### Implementation Status: DONE

All SSE code has been implemented and typechecked:

**API (NestJS):**
- `apps/api/src/realtime/realtime.service.ts` — manages per-user SSE streams
- `apps/api/src/realtime/realtime.controller.ts` — SSE endpoint at `/api/realtime/events?token=<jwt>`
- `apps/api/src/realtime/realtime.module.ts` — global module, injectable anywhere
- Registered in `app.module.ts`
- Events emitted from:
  - `UploadsService.complete()` → `library:changed` (song_added)
  - `FavoritesService.add/remove()` → `library:changed` (favorites_changed)
  - `PlaybackService.sync()` → `playback:changed`

**Shared packages:**
- `packages/types/src/index.ts` — added `LibraryChangedEvent`, `PlaybackChangedEvent`, `RealtimeEvent`
- `packages/api-client/src/client.ts` — added `subscribeToEvents()` method using browser EventSource

**Desktop (React):**
- `apps/desktop/src/hooks/useRealtime.ts` — EventSource hook with auto-reconnect
- Integrated into `HomePage.tsx` — auto-refreshes on library changes
- Integrated into `LibraryPage.tsx` — auto-refreshes on library changes

**Mobile (React Native):**
- `apps/mobile/hooks/useRealtime.ts` — fetch-based SSE client (no EventSource in RN)
- Integrated into `useApiSync.ts` — triggers library re-sync on changes
