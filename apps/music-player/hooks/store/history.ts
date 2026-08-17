import { Song } from "@/constants/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storageAdapter";

type HistoryState = {
  history: Song[];
  setHistory: (song: Song) => void;
  clearHistory: () => void;
};
export default create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      setHistory: (song: Song) =>
        set((state) => {
          const filtered = state.history.filter((s) => s?.id !== song?.id);
          const newHistory = [song, ...filtered];
          return { history: newHistory };
        }),

      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: "history-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
