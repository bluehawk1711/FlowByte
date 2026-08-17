# Flowbyte — Agent Instructions

Instructions for AI agents (and humans) working in this repository. Read `memory.md` for project state and `architecture.md` for design.

## Commands

- Install all workspace deps: `pnpm install` (from repo root)
- API dev: `pnpm --filter @flowbyte/api dev`
- API build: `pnpm --filter @flowbyte/api build`
- API lint: `pnpm --filter @flowbyte/api lint`
- DB schema push (dev): `pnpm --filter @flowbyte/api db:push`
- Generate migrations: `pnpm --filter @flowbyte/api db:generate`
- Desktop dev: `pnpm --filter @flowbyte/desktop dev`
- Desktop Tauri dev (requires Rust): `pnpm --filter @flowbyte/desktop tauri dev`
- Mobile: `pnpm --filter @flowbyte/mobile start`
- Start dev PostgreSQL: `docker compose up -d db`

## Workspace Layout

```text
apps/
  api/        # NestJS backend (source of truth: PostgreSQL + storage)
  desktop/    # Tauri 2 + React (downloads from YouTube, streams library)
  mobile/     # Existing RN player (Flowbit) + API integration
  4k-video-downloader/   # LEGACY Electron app — reference only, DO NOT modify
packages/
  types/      # Shared TS types
  validation/ # Shared validation schemas
  config/     # Shared config helpers
  api-client/ # Shared API client (desktop + mobile)
storage/      # Local dev storage (audio/artwork/lyrics) — gitignored
```

## Hard Rules (see rules.md for the full list)

1. NEVER modify `apps/4k-video-downloader` — it is a frozen reference. Port its logic, don't edit it.
2. Never rewrite yt-dlp or FFmpeg in Rust. Spawn the binaries.
3. Never couple business logic to Backblaze B2 — use `StorageProvider` only.
4. Never store audio binaries in PostgreSQL — storage keys only.
5. Never put secrets in frontend code. `.env*` files are for the API only; `.env.example` has no real values.
6. Don't rebuild the mobile player. Additive changes only, preserve existing UI/behavior.
7. Don't implement lyrics translation (future feature). Keep the lyrics model extensible only.
8. Don't add Redis everywhere — PostgreSQL is the source of truth; Redis only where it helps.
9. After completing any task, update `memory.md` status table and `architecture.md` if the design changed.

## Workflow

1. Read `memory.md` first (project state), then `architecture.md` for the module you touch.
2. Inspect before changing: the mobile player and Electron downloader contain working code — learn from it.
3. Implement incrementally per `plan.md` phases. Keep modules focused.
4. Verify: run typecheck/build for the affected workspace package.
5. Update tracking docs (memory.md / architecture.md) when done.

## Conventions

- Strict TypeScript. `verbatimModuleSyntax` style imports (type-only imports where applicable).
- DTO validation on every API input (class-validator).
- Errors: structured, never swallowed; log context.
- Shared types live in `packages/types` — never define duplicate `Song` interfaces per app.
- Naming: kebab-case files, PascalCase components, camelCase functions.