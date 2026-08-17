import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storageAdapter";

export type SettingsState = {
  // Appearance
  accentColor: string;
  setAccentColor: (color: string) => void;

  accentPurple: string;
  setAccentPurple: (color: string) => void;

  accentPink: string;
  setAccentPink: (color: string) => void;

  // Playback
  alwaysShuffle: boolean;
  toggleAlwaysShuffle: () => void;

  alwaysRepeat: boolean;
  toggleAlwaysRepeat: () => void;

  autoplayNext: boolean;
  toggleAutoplayNext: () => void;

  resumeOnStartup: boolean;
  toggleResumeOnStartup: () => void;

  showRandomCoverArt: boolean;
  toggleShowRandomCoverArt: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Defaults
      accentColor: "#00F5D4",
      setAccentColor: (color) => set({ accentColor: color }),

      accentPurple: "#A855F7",
      setAccentPurple: (color) => set({ accentPurple: color }),

      accentPink: "#FF1493",
      setAccentPink: (color) => set({ accentPink: color }),

      alwaysShuffle: false,
      toggleAlwaysShuffle: () =>
        set((state) => ({ alwaysShuffle: !state.alwaysShuffle })),

      alwaysRepeat: false,
      toggleAlwaysRepeat: () =>
        set((state) => ({ alwaysRepeat: !state.alwaysRepeat })),

      autoplayNext: true,
      toggleAutoplayNext: () =>
        set((state) => ({ autoplayNext: !state.autoplayNext })),

      resumeOnStartup: true,
      toggleResumeOnStartup: () =>
        set((state) => ({ resumeOnStartup: !state.resumeOnStartup })),

      showRandomCoverArt: true,
      toggleShowRandomCoverArt: () =>
        set((state) => ({ showRandomCoverArt: !state.showRandomCoverArt })),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
