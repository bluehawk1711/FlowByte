# Flowbyte — Rules

Non-negotiable project rules. Violations should be fixed immediately.

## Storage & Data

1. **NEVER modify `apps/4k-video-downloader`.** It is a frozen reference. Port its logic, don't edit it.
2. **Never rewrite yt-dlp or FFmpeg in Rust** (or anywhere). Always spawn the binaries.
3. **Never couple business logic to Backblaze B2.** Use the `StorageProvider` interface everywhere.
4. **Never store audio/video binaries in PostgreSQL.** Storage keys only.
5. **PostgreSQL is the source of truth.** Redis is optional caching only, never primary state.
6. **Clients never connect to PostgreSQL or storage directly.** Everything goes through the NestJS API.

## Security

7. **Never put secrets in frontend code.** `.env*` files are API-only; `.env.example` contains no real values.
8. Validate every API input (class-validator + shared validation package).
9. Signed URLs / streaming tokens for private media; the API authorizes before issuing them.
10. Structured errors with context. Never swallow errors.

## Code

11. **Don't rebuild the mobile player.** Additive changes only; preserve UI, playback, notification/lock-screen controls, background playback.
12. **Don't implement lyrics translation** (future feature). Keep the lyrics model extensible only.
13. **No duplicate types across apps.** Shared types live in `packages/types`.
14. Strict TypeScript; type-only imports where applicable.
15. Don't add unnecessary dependencies or cloud services.
16. Don't repeatedly transcode already-optimized audio.
17. No premature scaling: no microservices, no search engines, no AI features in v1.

## Workflow

18. Read `memory.md` and `architecture.md` before touching a module.
19. After completing a task: update `memory.md` status table; update `architecture.md` if design changed.
20. Verify with typecheck/build for the affected package before declaring done.

## UI / Icons

21. **Never import icons from `lucide-react` (or any icon package) directly in the desktop app** — always import from `src/lib/icons.tsx`, which mirrors the original lucide names. It prefers the animated glyphs from `@animateicons/react/lucide`; glyphs that set lacks get a CSS hover animation via the `[data-icon-anim]` keyframes in `index.css` (never a raw static icon).
22. **Animated icon sizing**: `@animateicons/react` icons are DOM-wrapped and can't be sized via CSS classes — the `src/lib/icons.tsx` wrapper converts tailwind `h-*`/`w-*` classes (including `h-[Npx]` and the standard spacing scale) into the numeric `size` prop. Keep writing `<Icon className="h-4 w-4" />`; do not add a separate `size` prop.
23. **Do not add new icon imports outside the module.** If an animated equivalent is missing, extend the mapping in `src/lib/icons.tsx` (keep the same public name; add the `makeCssAnimated` variant for lucide-only glyphs). Mobile stays on lucide — the animated package is DOM-based (motion/react) and cannot run on React Native.