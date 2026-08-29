# Flowbyte

Private, self-hosted personal music library & streaming system.

## Architecture

```
apps/
  api/          NestJS backend (PostgreSQL + storage)
  desktop/      Tauri 2 + React (downloads from YouTube, streams library)
  mobile/       React Native (Expo) player
packages/
  types/        Shared TypeScript types
  config/       Shared config helpers
  validation/   Shared validation schemas
  api-client/   Shared API client
```

## Prerequisites

- Node.js >= 20
- pnpm 11.5.0 (`corepack enable && corepack prepare pnpm@11.5.0 --activate`)
- Docker (for local PostgreSQL)
- Rust + Tauri CLI (for desktop builds)
- Android Studio + JDK 17 (for mobile builds)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local PostgreSQL
docker compose up -d db

# Push database schema
pnpm --filter @flowbyte/api db:push

# Start API dev server (port 3001)
pnpm api:dev

# Start desktop dev server (port 1420)
pnpm desktop:vite

# Start mobile dev server
pnpm --filter @flowbyte/mobile start
```

## Build Commands

```bash
# Build all shared packages + API
pnpm build:api

# Build everything (shared packages + API + desktop frontend)
pnpm build

# Build specific workspace
pnpm --filter @flowbyte/api build
pnpm --filter @flowbyte/desktop build
pnpm --filter @flowbyte/mobile build
```

---

## Render Deployment (API)

### 1. Create a Web Service

| Setting | Value |
|---------|-------|
| **Name** | `flowbyte-api` |
| **Region** | Oregon (or closest to you) |
| **Runtime** | Node |
| **Root Directory** | *(leave blank — must be repo root, NOT `apps/api`)* |
| **Build Command** | `npm install -g pnpm@11.5.0 && pnpm install --frozen-lockfile && pnpm build:api` |
| **Start Command** | `pnpm --filter @flowbyte/api start:prod` |
| **Node Version** | 22 |

> **Important:** Root Directory must be blank (repo root). The build needs access to `packages/` for workspace dependencies.

### 2. Environment Variables

Set these in Render Dashboard → Environment:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon/Postgres connection string (use pooled URL) |
| `JWT_SECRET` | Yes | Random string for access tokens (generate with `openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | Yes | Random string for refresh tokens (different from JWT_SECRET) |
| `CORS_ORIGINS` | Yes | `https://flowbyte.onrender.com,tauri://localhost,http://localhost:1420` |
| `STORAGE_PROVIDER` | No | `local` (default) or `backblaze` |
| `PORT` | No | `3001` (default) |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL for caching |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |
| `GOOGLE_DRIVE_CLIENT_ID` | No | Google Drive OAuth client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | No | Google Drive OAuth client secret |

### 3. CORS Origins Explained

| Origin | Purpose |
|--------|---------|
| `https://flowbyte.onrender.com` | API itself (Swagger/docs) |
| `tauri://localhost` | Tauri 2 desktop app (production builds) |
| `http://localhost:1420` | Vite dev server (local development) |

### 4. Database Setup

The API uses Drizzle ORM with Neon PostgreSQL.

```bash
# Push schema changes (dev)
pnpm --filter @flowbyte/api db:push

# Generate migrations
pnpm --filter @flowbyte/api db:generate
```

---

## GitHub Actions Secrets

Set these in GitHub → Settings → Environments → `production`:

| Secret | Value | Used by |
|--------|-------|---------|
| `VITE_API_URL` | `https://flowbyte.onrender.com` | Desktop build (Vite) |
| `EXPO_PUBLIC_API_URL` | `https://flowbyte.onrender.com` | Mobile build (Expo/Gradle) |

---

## Local Development

### API

```bash
# Copy env file
cp apps/api/.env.example apps/api/.env

# Edit apps/api/.env with your values (at minimum DATABASE_URL, JWT secrets)

# Push schema
pnpm --filter @flowbyte/api db:push

# Start dev server
pnpm api:dev
```

### Desktop

```bash
# Copy env file
cp apps/desktop/.env.example apps/desktop/.env

# Edit apps/desktop/.env (VITE_API_URL defaults to http://localhost:3001)

# Start Vite dev server
pnpm desktop:vite

# Or start Tauri dev (requires Rust)
pnpm desktop:dev
```

### Mobile

```bash
# Copy env file
cp apps/mobile/.env.example apps/mobile/.env

# Edit apps/mobile/.env (EXPO_PUBLIC_API_URL defaults to http://localhost:3001)

# Start Expo dev server
pnpm --filter @flowbyte/mobile start
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS, Drizzle ORM, PostgreSQL (Neon), JWT auth |
| Desktop | Tauri 2, React, Vite, Tailwind v4 |
| Mobile | React Native, Expo SDK 54, zustand, audio-pro |
| Shared | TypeScript strict, pnpm workspaces |
| Cache | Upstash Redis (optional, read-through) |
| Storage | Local filesystem or Backblaze B2 |

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm build` | Build all packages |
| `pnpm build:api` | Build shared packages + API only |
| `pnpm api:dev` | Start API in watch mode |
| `pnpm desktop:vite` | Start desktop Vite dev server |
| `pnpm desktop:dev` | Start desktop Tauri dev (needs Rust) |
| `pnpm --filter @flowbyte/api db:push` | Push schema to database |
| `pnpm --filter @flowbyte/api db:generate` | Generate Drizzle migrations |
| `pnpm --filter @flowbyte/api lint` | Typecheck API |
| `pnpm --filter @flowbyte/desktop typecheck` | Typecheck desktop |
| `pnpm --filter @flowbyte/mobile typecheck` | Typecheck mobile |
