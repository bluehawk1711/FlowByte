import { useSettingsStore, type BackgroundMode } from "@/hooks/store/settingsStore";
import { useMemo } from "react";
import { Platform } from "react-native";

/**
 * Music Player App Colors.
 *
 * Every value is a getter over the live settings store (accent colors +
 * background mode). Reading `AppColors.x` at render time always yields the
 * current theme; the `useThemedStyles` hook re-memoizes per-file style sheets
 * whenever `themeVersion` bumps, so the whole app repaints instantly.
 */
export const AppColors = {
  // Primary accents
  get accentCyan() {
    return useSettingsStore.getState().accentColor;
  },
  get accentPurple() {
    return useSettingsStore.getState().accentPurple;
  },
  get accentPink() {
    return useSettingsStore.getState().accentPink;
  },

  // Backgrounds
  get backgroundDark() {
    return palette().backgroundDark;
  },
  get backgroundLight() {
    return palette().backgroundLight;
  },
  get backgroundCard() {
    return palette().backgroundCard;
  },
  get backgroundCardLight() {
    return palette().backgroundCardLight;
  },

  // Text
  get textPrimary() {
    return palette().textPrimary;
  },
  get textSecondary() {
    return palette().textSecondary;
  },
  get textLight() {
    return palette().textLight;
  },
  get textMuted() {
    return palette().textMuted;
  },

  // UI Elements
  get divider() {
    return palette().divider;
  },
  get iconDefault() {
    return palette().iconDefault;
  },

  // Player specific
  get waveformActive() {
    return palette().waveformActive;
  },
  get waveformInactive() {
    return palette().waveformInactive;
  },
  get playButtonBg() {
    return palette().playButtonBg;
  },

  // Settings
  get settingsBanner() {
    return palette().settingsBanner;
  },
};

/** Which accent plays the "waveform/play-button" roles per mode. */
function roleAccents(mode: BackgroundMode) {
  const { accentColor, accentPurple } = useSettingsStore.getState();
  return {
    waveformActive: accentColor,
    playButtonBg: accentPurple,
    settingsBanner: `linear-gradient(90deg, ${accentColor} 0%, ${accentPurple} 100%)`,
  };
}

export type ThemePalette = {
  backgroundDark: string;
  backgroundLight: string;
  backgroundCard: string;
  backgroundCardLight: string;
  textPrimary: string;
  textSecondary: string;
  textLight: string;
  textMuted: string;
  divider: string;
  iconDefault: string;
  waveformActive: string;
  waveformInactive: string;
  playButtonBg: string;
  settingsBanner: string;
};

function paletteFor(mode: BackgroundMode): ThemePalette {
  const accents = roleAccents(mode);
  if (mode === "light") {
    return {
      backgroundDark: "#F5F5F7",
      backgroundLight: "#FFFFFF",
      backgroundCard: "#FFFFFF",
      backgroundCardLight: "#F5F5F7",
      textPrimary: "#11181C",
      textSecondary: "#4B5563",
      textLight: "#11181C",
      textMuted: "#6B7280",
      divider: "#E4E4E7",
      iconDefault: "#6B7280",
      waveformInactive: "#D4D4D8",
      ...accents,
    };
  }
  return {
    backgroundDark: "#000000",
    backgroundLight: "#F5F5F7",
    backgroundCard: "#1A1A1A",
    backgroundCardLight: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#9BA1A6",
    textLight: "#11181C",
    textMuted: "#666666",
    divider: "#2A2A2A",
    iconDefault: "#9BA1A6",
    waveformInactive: "#333333",
    ...accents,
  };
}

function palette(): ThemePalette {
  return paletteFor(useSettingsStore.getState().backgroundMode);
}

/** Current mode + palette snapshot, for chrome (nav/status/paper) to consume. */
export function useAppTheme(): { mode: BackgroundMode; palette: ThemePalette } {
  const mode = useSettingsStore((s) => s.backgroundMode);
  const version = useSettingsStore((s) => s.themeVersion);
  return useMemo(() => ({ mode, palette: paletteFor(mode) }), [mode, version]);
}

/**
 * Build a per-file style sheet that tracks the live theme. Call inside the
 * component (or a `useStyles` wrapper); styles re-memoize whenever the accent
 * or background mode changes.
 *
 * ```ts
 * const styles = useThemedStyles(() => ({ container: { backgroundColor: AppColors.backgroundDark } }));
 * ```
 */
export function useThemedStyles<T>(factory: () => T): T {
  const version = useSettingsStore((s) => s.themeVersion);
  // `factory` intentionally omitted — inline arrows change identity each render
  // and the store version is the only signal that matters for recoloring.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(factory, [version]);
}

/**
 * Accent presets shown in the appearance section (mirrors desktop engine).
 * The app defaults to "Cyan".
 */
export const ACCENT_PRESETS: ReadonlyArray<{ id: string; label: string; value: string }> = [
  { id: "cyan", label: "Cyan", value: "#00F5D4" },
  { id: "violet", label: "Violet", value: "#8B5CF6" },
  { id: "purple", label: "Purple", value: "#A855F7" },
  { id: "pink", label: "Pink", value: "#FF1493" },
  { id: "rose", label: "Rose", value: "#F43F5E" },
  { id: "red", label: "Red", value: "#EF4444" },
  { id: "orange", label: "Orange", value: "#F97316" },
  { id: "amber", label: "Amber", value: "#F59E0B" },
  { id: "green", label: "Green", value: "#22C55E" },
  { id: "emerald", label: "Emerald", value: "#10B981" },
  { id: "blue", label: "Blue", value: "#3B82F6" },
  { id: "indigo", label: "Indigo", value: "#6366F1" },
];

const tintColorLight = "#00F5D4";
const tintColorDark = "#00F5D4";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#F5F5F7",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    card: "#FFFFFF",
    border: "#E5E5E5",
  },
  dark: {
    text: "#FFFFFF",
    background: "#000000",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    card: "#1A1A1A",
    border: "#2A2A2A",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
