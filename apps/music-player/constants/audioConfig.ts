import { AudioPro, AudioProContentType } from "react-native-audio-pro";

// Set up event listeners that persist for the app's lifetime
// Note: We'll handle actual playback logic in stores/components,
// this is just for initial configuration and global listeners if needed.
// For now we keep it minimal.
import { getSongCover } from "@/utils/imageUtils";

import useAudioContext from "../hooks/store/audioContext";
import { useSettingsStore } from "../hooks/store/settingsStore";

// Configure audio settings
AudioPro.configure({
  contentType: AudioProContentType.MUSIC,
  debug: true,
  debugIncludesProgress: false,
  progressIntervalMs: 1000,
  showNextPrevControls: true,
});

export const setupAudio = async () => {

  // Wait for stores to be hydrated
  await Promise.all([
    new Promise<void>((resolve) => {
      if (useAudioContext.persist.hasHydrated()) {
        resolve();
      } else {
        useAudioContext.persist.onFinishHydration(() => resolve());
      }
    }),
    new Promise<void>((resolve) => {
      if (useSettingsStore.persist.hasHydrated()) {
        resolve();
      } else {
        useSettingsStore.persist.onFinishHydration(() => resolve());
      }
    }),
  ]);

  const settings = useSettingsStore.getState();
  const audioState = useAudioContext.getState();

  if (!settings.resumeOnStartup) {
    if (audioState.isPlaying) {
      useAudioContext.getState().setIsPlaying(false);
    }
    return;
  }

  const { song, lastPosition } = audioState;

  if (song) {
    const resolvedSong = { ...song, cover: getSongCover(song) };

    // Setting the song in the store might redundant if validation hasn't changed,
    // but ensures consistency with the resolved cover.
    // However, calling setSong might trigger other effects or play automatically if not careful.
    // The previous hook called setSong(song) but commented it out?
    // Actually lines 42 "setSong(song)" was commented.
    // But it CALLED AudioPro.play directly.

    AudioPro.play({
      id: resolvedSong.id,
      url: resolvedSong.url,
      title: resolvedSong.title,
      artist: resolvedSong.artist || "unknown",
      artwork: resolvedSong.cover || "",
    });

    if (lastPosition > 0) {
      // seekTo immediately might not work if not prepared?
      // AudioPro usually handles this.
      // The previous code had a setTimeout 500ms. I'll keep it to be safe.
      setTimeout(() => {
        AudioPro.seekTo(lastPosition);
      }, 500);
    }
  }
};
