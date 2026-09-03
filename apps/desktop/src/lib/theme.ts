/**
 * Runtime theme engine.
 *
 * All design tokens live in `index.css` inside Tailwind v4's `@theme`, so every
 * utility compiles to `var(--color-*)` / `var(--radius-*)` / `var(--font-sans)`,
 * and spacing/text sizes are rem-based. That means the entire app can be
 * re-themed at runtime by overriding those CSS variables on `<html>` plus the
 * root font-size — no component changes required.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BackgroundId = 'midnight' | 'obsidian' | 'slate' | 'daylight';
export type FontId = 'inter' | 'system' | 'hanken' | 'sora' | 'dm' | 'space';
export type RadiusId = 'subtle' | 'default' | 'relaxed';

export interface ThemeSettings {
  /** Preset accent id or custom hex color (`#rrggbb`). */
  accent: string;
  background: BackgroundId;
  font: FontId;
  /** Root font-size multiplier: 0.85 – 1.2 (scales text + spacing, both rem). */
  uiScale: number;
  radius: RadiusId;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const ACCENT_PRESETS: ReadonlyArray<{ id: string; label: string; value: string }> = [
  { id: 'violet', label: 'Violet', value: '#8b5cf6' },
  { id: 'indigo', label: 'Indigo', value: '#6366f1' },
  { id: 'blue', label: 'Blue', value: '#3b82f6' },
  { id: 'sky', label: 'Sky', value: '#0ea5e9' },
  { id: 'cyan', label: 'Cyan', value: '#06b6d4' },
  { id: 'emerald', label: 'Emerald', value: '#10b981' },
  { id: 'green', label: 'Green', value: '#22c55e' },
  { id: 'lime', label: 'Lime', value: '#84cc16' },
  { id: 'amber', label: 'Amber', value: '#f59e0b' },
  { id: 'orange', label: 'Orange', value: '#f97316' },
  { id: 'rose', label: 'Rose', value: '#f43f5e' },
  { id: 'red', label: 'Red', value: '#ef4444' },
];

export const ACCENT_DEFAULT = ACCENT_PRESETS[0]!.value;

/**
 * Background palettes are curated full sets — surfaces AND their paired ink
 * hierarchy — rather than a single free-form color. Picking one raw background
 * color without also tuning the five surface layers and three text tones would
 * silently break readability (Spotify's ≥ 4.5:1 rule, Apple's legibility bar).
 */
export interface BackgroundPalette {
  id: BackgroundId;
  label: string;
  description: string;
  /** CSS values for each overridable token. */
  colors: Record<string, string>;
}

const WHITE_LINE = 'rgb(255 255 255 / 0.08)';
const WHITE_LINE_STRONG = 'rgb(255 255 255 / 0.16)';
const DARK_INK: Record<string, string> = {
  '--color-ink-1': '#f4f6fa',
  '--color-ink-2': '#a9b1bd',
  '--color-ink-3': '#6e7684',
};
const BLACK_LINE = 'rgb(0 0 0 / 0.10)';
const BLACK_LINE_STRONG = 'rgb(0 0 0 / 0.18)';

export const BACKGROUND_PALETTES: BackgroundPalette[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Default deep charcoal with violet undertone',
    colors: {
      '--color-app': '#0c0e11',
      '--color-sidebar': '#12141a',
      '--color-content': '#14161c',
      '--color-card': '#1a1d25',
      '--color-elevated': '#22262f',
      '--color-player': '#161a21',
      '--color-line': WHITE_LINE,
      '--color-line-strong': WHITE_LINE_STRONG,
      ...DARK_INK,
    },
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    description: 'Near-black, maximum contrast',
    colors: {
      '--color-app': '#08090d',
      '--color-sidebar': '#0e0f15',
      '--color-content': '#10121a',
      '--color-card': '#161923',
      '--color-elevated': '#1e2230',
      '--color-player': '#0f1118',
      '--color-line': WHITE_LINE,
      '--color-line-strong': WHITE_LINE_STRONG,
      ...DARK_INK,
    },
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Cool blue-tinted dark',
    colors: {
      '--color-app': '#0f141c',
      '--color-sidebar': '#131a24',
      '--color-content': '#161d28',
      '--color-card': '#1d2531',
      '--color-elevated': '#26303f',
      '--color-player': '#141b26',
      '--color-line': WHITE_LINE,
      '--color-line-strong': WHITE_LINE_STRONG,
      '--color-ink-1': '#eef3fb',
      '--color-ink-2': '#a9b4c6',
      '--color-ink-3': '#6f7d95',
    },
  },
  {
    id: 'daylight',
    label: 'Daylight',
    description: 'Light theme — bright and airy',
    colors: {
      '--color-app': '#f3f4f6',
      '--color-sidebar': '#e9ebef',
      '--color-content': '#f3f4f6',
      '--color-card': '#ffffff',
      '--color-elevated': '#ffffff',
      '--color-player': '#eceef2',
      '--color-line': BLACK_LINE,
      '--color-line-strong': BLACK_LINE_STRONG,
      '--color-ink-1': '#16181d',
      '--color-ink-2': '#4b5261',
      '--color-ink-3': '#7c8595',
    },
  },
];

export interface FontOption {
  id: FontId;
  label: string;
  /** CSS font stack. */
  stack: string;
  /** Google Fonts family name; undefined when no remote font needed. */
  googleFamily?: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'inter', label: 'Inter', googleFamily: 'Inter', stack: "'Inter', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif" },
  { id: 'system', label: 'System UI', stack: "system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', sans-serif" },
  { id: 'hanken', label: 'Hanken Grotesk', googleFamily: 'Hanken+Grotesk', stack: "'Hanken Grotesk', 'Segoe UI Variable Text', 'Segoe UI', sans-serif" },
  { id: 'sora', label: 'Sora', googleFamily: 'Sora', stack: "'Sora', 'Segoe UI Variable Text', 'Segoe UI', sans-serif" },
  { id: 'dm', label: 'DM Sans', googleFamily: 'DM+Sans', stack: "'DM Sans', 'Segoe UI Variable Text', 'Segoe UI', sans-serif" },
  { id: 'space', label: 'Space Grotesk', googleFamily: 'Space+Grotesk', stack: "'Space Grotesk', 'Segoe UI Variable Text', 'Segoe UI', sans-serif" },
];

export const RADIUS_PRESETS: Record<RadiusId, { sm: string; md: string; lg: string; xl: string }> = {
  subtle: { sm: '0.25rem', md: '0.5rem', lg: '0.625rem', xl: '0.875rem' },
  default: { sm: '0.375rem', md: '0.625rem', lg: '0.875rem', xl: '1.25rem' },
  relaxed: { sm: '0.5rem', md: '0.875rem', lg: '1.125rem', xl: '1.5rem' },
};

export const RADIUS_OPTIONS: ReadonlyArray<{ id: RadiusId; label: string }> = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'default', label: 'Default' },
  { id: 'relaxed', label: 'Relaxed' },
];

export const DEFAULT_THEME: ThemeSettings = {
  accent: ACCENT_DEFAULT,
  background: 'midnight',
  font: 'inter',
  uiScale: 1,
  radius: 'default',
};

const STORAGE_KEY = 'flowbyte.theme';

// ---------------------------------------------------------------------------
// Small color math (strict, no deps)
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Lighten (+) or darken (−) a hex color by `amount` in [−1, 1]. */
function shift(hex: string, amount: number): string {
  const rgb = hexToRgb(hex) ?? hexToRgb(ACCENT_DEFAULT)!;
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c + 255 * amount)));
  const { r, g, b } = rgb;
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? hexToRgb(ACCENT_DEFAULT)!;
  return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${alpha})`;
}

/** Perceived luminance — used to pick a readable foreground (≥ 4.5:1 goal). */
function isLight(hex: string): boolean {
  const rgb = hexToRgb(hex) ?? hexToRgb(ACCENT_DEFAULT)!;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255 > 0.55;
}

// ---------------------------------------------------------------------------
// Load / persist
// ---------------------------------------------------------------------------

export function loadTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>;
    return {
      accent: typeof parsed.accent === 'string' && /^#?[0-9a-f]{6}$/i.test(parsed.accent) ? parsed.accent : DEFAULT_THEME.accent,
      background:
        BACKGROUND_PALETTES.some((p) => p.id === parsed.background)
          ? (parsed.background as BackgroundId)
          : DEFAULT_THEME.background,
      font: FONT_OPTIONS.some((f) => f.id === parsed.font) ? (parsed.font as FontId) : DEFAULT_THEME.font,
      uiScale:
        typeof parsed.uiScale === 'number' && parsed.uiScale >= 0.85 && parsed.uiScale <= 1.2
          ? parsed.uiScale
          : DEFAULT_THEME.uiScale,
      radius:
        parsed.radius === 'subtle' || parsed.radius === 'relaxed' ? parsed.radius : DEFAULT_THEME.radius,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

export function persistTheme(theme: ThemeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* storage unavailable — theme still applies for the session */
  }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

const FONT_LINK_ID = 'flowbyte-theme-fonts';

/** Inject the Google Fonts stylesheet for the selected family (once). */
function ensureFont(font: FontOption): void {
  if (!font.googleFamily) return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFamily}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

/**
 * Write a theme onto `document.documentElement` as CSS custom properties.
 * Idempotent — safe to call at boot and on every change.
 */
export function applyTheme(theme: ThemeSettings): void {
  const root = document.documentElement;
  const style = root.style;

  const palette = BACKGROUND_PALETTES.find((p) => p.id === theme.background) ?? BACKGROUND_PALETTES[0]!;
  const font = FONT_OPTIONS.find((f) => f.id === theme.font) ?? FONT_OPTIONS[0]!;
  const radii = RADIUS_PRESETS[theme.radius];

  for (const [key, value] of Object.entries(palette.colors)) {
    style.setProperty(key, value);
  }
  style.setProperty('--color-accent', theme.accent);
  style.setProperty('--color-accent-hover', shift(theme.accent, 0.12));
  style.setProperty('--color-accent-press', shift(theme.accent, -0.1));
  style.setProperty('--color-accent-soft', withAlpha(theme.accent, 0.16));
  style.setProperty('--color-accent-ring', withAlpha(theme.accent, 0.55));
  style.setProperty('--color-accent-fg', isLight(theme.accent) ? '#10131a' : '#ffffff');

  style.setProperty('--radius-sm', radii.sm);
  style.setProperty('--radius-md', radii.md);
  style.setProperty('--radius-lg', radii.lg);
  style.setProperty('--radius-xl', radii.xl);
  style.setProperty('--font-sans', font.stack);

  // Text + spacing scale: Tailwind sizes are rem-based, so one root font-size
  // multiplier rescales the whole interface (Apple: layout should scale with text).
  style.setProperty('font-size', `${Math.round(16 * theme.uiScale * 100) / 100}px`);

  ensureFont(font);
}

/** Apply the persisted theme before the first paint (call in `main.tsx`). */
export function initTheme(): ThemeSettings {
  const theme = loadTheme();
  applyTheme(theme);
  return theme;
}
