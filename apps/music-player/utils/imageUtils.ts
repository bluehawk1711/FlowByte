import { Song } from "@/constants/types";
import { useSettingsStore } from "@/hooks/store/settingsStore";
import { Image } from "react-native";

export const getSongCover = (song: Song | null): string => {
  if (!song) return "";

  // 1. Check for existing metadata cover
  if (song.cover) {
    return song.cover;
  }

  // 2. Check Settings for Random Cover Art
  // We access the store state directly (non-reactive for this utility function)
  const showRandom = useSettingsStore.getState().showRandomCoverArt;

  if (showRandom) {
    // Return a deterministic random image based on song ID to ensure consistency
    return `https://picsum.photos/seed/${song.id}/800`;
  }

  // 3. Return Default Asset
  try {
    return Image.resolveAssetSource(
      require("@/assets/images/default-cover.png"),
    ).uri;
  } catch {
    // Fallback if asset resolution fails (e.g. during tests or weird envs)
    return "";
  }
};
