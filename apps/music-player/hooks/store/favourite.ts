import { Song } from "@/constants/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storageAdapter";

type favouriteState = {
  songs: Song[];
  toggleSong: (song: Song) => void;
  clearSongs: () => void;
};

const useFavourite = create<favouriteState>()(
  persist(
    (set) => ({
      songs: [],
      toggleSong: (song: Song) => {
        
        set((state) => {
          const newSongs = state.songs.some((s) => s?.id === song?.id)
            ? state.songs.filter((s) => s?.id !== song?.id)
            : [song, ...state.songs];
          return { songs: newSongs };
        });
      },
      clearSongs: () => {
        set({ songs: [] });
      },
    }),
    {
      name: "favourite-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

export default useFavourite;
