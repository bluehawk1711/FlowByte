import { useSettingsStore } from "@/hooks/store/settingsStore";
import { Platform } from "react-native";

// Music Player App Colors
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
  backgroundDark: "#000000",
  backgroundLight: "#F5F5F7",
  backgroundCard: "#1A1A1A",
  backgroundCardLight: "#FFFFFF",

  // Text
  textPrimary: "#FFFFFF",
  textSecondary: "#9BA1A6",
  textLight: "#11181C",
  textMuted: "#666666",

  // UI Elements
  divider: "#2A2A2A",
  iconDefault: "#9BA1A6",

  // Player specific
  waveformActive: "#00F5D4",
  waveformInactive: "#333333",
  playButtonBg: "#A855F7",

  // Settings
  settingsBanner: "linear-gradient(90deg, #00F5D4 0%, #00D4AA 100%)",
};

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
