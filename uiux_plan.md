# Flowbyte Desktop — UI/UX Plan

Scope decided with user: 3 workstreams. Desktop app only (mobile parity = future follow-up).

- **S1 — Lottie animation on the auth/welcome page** (`Girl listening to music`)
- **S2 — Desktop UX/flow bug sweep** (sidebar + alignment + motion polish)
- **S3 — User-customizable theme** (fonts, sizes, colors, background)

Research inputs: `ui/` design mockups (Aura theme — dark surfaces, Material-ish tonal palettes),
`spotify-ui-skills` (dark surfaces <20% lightness, 4:1+ contrast, Inter, tabular numbers, hover-scale
cues), `apple-design` (respond on pointer-down, interruptible springs, respect `prefers-reduced-motion`,
size-specific letter-spacing, translucent chrome, feedback = status/completion/warning/error).

---

## S1 — Lottie on Auth/welcome page

Files: `Girl listening to music.json` (Lottie 4.8, 473×473, 151fr @30fps ≈ 5s loop, 761 KB).
Compressed `.lottie` twin (42 KB) unused on desktop — JSON works with `lottie-web`.

1. Add `lottie-web` + `@types/lottie-web` to `@flowbyte/desktop`.
2. Copy JSON → `apps/desktop/src/assets/animations/girl-listening-to-music.json`.
3. New `GirlListeningAnimation.tsx`: `lottie.loadAnimation({ renderer: 'svg', loop, autoplay })`,
   loaded via `?url` import (keeps 761 KB out of the JS bundle, lazy by design), container cleanup on
   unmount, honors `prefers-reduced-motion` (render single poster frame, no loop).
4. AuthPage → split layout: left art panel (animation + gradient glow + tagline), right flow
   (existing Welcome → Auth steps preserved).

## S2 — Desktop UX/flow bug sweep

Concrete findings from code audit (with fix):

| # | Finding | Fix |
|---|---|---|
| 1 | Collapsed sidebar: Settings & Collapse buttons keep `w-full justify-start` → icons sit off-center (left-shifted) in the 64px rail | When collapsed: drop `w-full`, keep icon size `w-9` + center; wrapper already `items-center` |
| 2 | Playlist scroll regions (`overflow-y-auto` only) can expose a horizontal scrollbar (per CSS spec `overflow-x` computes to `auto`) | `overflow-x-hidden` on both collapsed tiles + expanded list; rows `w-full min-w-0` |
| 3 | Vertical scrollbars shift sidebar/nav content on the fly | `scrollbar-gutter: stable` on the two sidebar scrollers; slim webkit scrollbar is global already |
| 4 | Page switches are instant/abrupt — feels unpolished | Fade/slide page wrapper keyed on `page` (`.animate-page-enter`, only compositor props; global reduced-motion media query already neutralizes) |
| 5 | Inconsistent press feedback on list rows | Standardize `active:scale-[0.98]` + existing hover bg on rows/cards |
| 6 | Playlist tiles/titles in collapsed rail lack overflow safety | `min-w-0` + `truncate` where text can appear |

All motion additions respect `prefers-reduced-motion` (already globally disabled in `index.css`),
stay ≤200 ms, and animate only `opacity`/`transform`.

## S3 — Custom theme engine

Architecture insight: `index.css` declares all design tokens inside Tailwind v4 `@theme`; every utility
compiles to `var(--color-*)`, `var(--radius-*)`, `var(--font-sans)`. Tailwind spacing/text sizes are
`rem`-based. → **runtime theming = overriding those CSS variables on `<html>` + scaling root
font-size.** No component changes needed for the theme to apply app-wide.

### Design

- **`lib/theme.ts`** — pure, framework-free:
  - `ThemeSettings`: `accent` (preset id or custom hex), `background` (palette id), `font` (id),
    `uiScale` (0.85–1.2 multiplier on root font size), `radius` (subtle/default/relaxed).
  - Background palettes = curated sets (`app/sidebar/content/card/elevated/player/line` +
    paired `ink-1/2/3`) so text contrast stays ≥ 4.5:1 — arbitrary single-color backgrounds
    would silently break readability (Spotify contrast rule, Apple legibility). Light + dark palettes.
  - Accent presets + custom color; derives `accent-hover/press/soft/ring/fg` (lighten/darken/alpha).
  - Fonts: stack builder + lazy Google-Fonts `<link>` injection for remote faces (desktop already
    relies on remote Inter availability; falls back to local stack offline).
  - `applyTheme(s)` → writes CSS vars + `fontSize` on `document.documentElement`.
  - Persistence `flowbyte.theme` in localStorage; `initTheme()` applied in `main.tsx` before first
    paint (no flash).
- **`context/ThemeContext.tsx`** — provider + `useTheme()` (settings + `update()` + `reset()`);
  effect applies on change.
- **SettingsPage "Appearance" card** — accent swatches + color picker, background preset previews,
  font select, UI scale slider, radius segmented control, Reset button. Instant apply + persist.

### Token map (runtime-overridden)

`--color-app/sidebar/content/card/elevated/player`, `--color-line(-strong)`, `--color-ink-1/2/3`,
`--color-accent/-hover/-press/-soft/-ring/-fg`, `--color-success/danger(-hover)/warning`,
`--radius-sm/md/lg/xl`, `--font-sans`, root `font-size`.

### Verification

`pnpm --filter @flowbyte/desktop build` (runs `tsc --noEmit` + vite build); manual pass over
AuthPage, sidebar collapsed/expanded, Settings Appearance, page transitions.

## Out of scope (noted for follow-ups)

- Mobile app parity (Lottie on mobile splash, mobile theme settings) — Expo Go can't load native
  lottie module; needs a dev build.
- Artist/album detail pages from `ui/` mockups; More menu simplification.
