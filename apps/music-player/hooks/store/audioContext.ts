import { Song } from "@/constants/types";
import { getSongCover } from "@/utils/imageUtils";
import { AudioPro } from "react-native-audio-pro";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import history from "./history";
import { zustandStorage } from "./storageAdapter";

type audioContextState = {
  song: Song;
  isPlaying: boolean;
  playlist: Song[];
  setSong: (song: Song) => void;
  clearSong: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  lastPosition: number;
  setLastPosition: (position: number) => void;
  togglePlayback: () => void;
  setPlaylist: (playlist: Song[]) => void;
  // loadData: () => void; // Removed, handled by persist
  shuffle: boolean;
  repeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playNext: (forceSkip?: boolean) => void;
  playPrevious: () => void;
  playList: (playlist: Song[], initialSongIndex?: number) => void;
};

const useAudioContext = create<audioContextState>()(
  persist(
    (set, get) => ({
      song: null as Song,
      isPlaying: false,
      playlist: [],
      shuffle: false,
      repeat: false,
      lastPosition: 0,
      setLastPosition: (position: number) => set({ lastPosition: position }),
      setSong: (song: Song) => {
        if (song?.id === get().song?.id) {
          return;
        }
        set({ lastPosition: 0 });
        const resolvedSong = song
          ? { ...song, cover: getSongCover(song) }
          : null;
        set({ song: resolvedSong, isPlaying: true });
        if (resolvedSong) {
          history.getState().setHistory(resolvedSong);

          AudioPro.play({
            id: resolvedSong.id,
            url: resolvedSong.url,
            title: resolvedSong.title,
            artist: resolvedSong.artist || "unknown",
            artwork: resolvedSong.cover || "",
          });
        }
      },
      clearSong: () => {
        set({ song: null, isPlaying: false });
        AudioPro.stop();
      },
      setIsPlaying: (isPlaying: boolean) => {
        set({ isPlaying });
        if (isPlaying) {
          AudioPro.resume();
        } else {
          AudioPro.pause();
        }
      },
      togglePlayback: () => {
        const isPlaying = !get().isPlaying;
        set({ isPlaying });
        if (isPlaying) {
          AudioPro.resume();
        } else {
          AudioPro.pause();
        }
      },
      setPlaylist: (playlist: Song[]) => set({ playlist }),

      toggleShuffle: () =>
        set((state) => {
          const shuffle = !state.shuffle;
          return { shuffle, repeat: shuffle ? false : state.repeat };
        }),
      toggleRepeat: () =>
        set((state) => {
          const repeat = !state.repeat;
          return { repeat, shuffle: repeat ? false : state.shuffle };
        }),
      playNext: (forceSkip?: boolean) => {
        const { playlist, shuffle, repeat, song } = get();
        if (!playlist || playlist.length === 0) return;

        let nextIndex = -1;
        const currentIndex = playlist.findIndex((s) => s?.id === song?.id);

        // If Repeat is ON and it's NOT a manual skip, repeat the current song
        if (repeat && !forceSkip) {
          nextIndex = currentIndex;
        } else if (shuffle) {
          // Pick random index different from current
          do {
            nextIndex = Math.floor(Math.random() * playlist.length);
          } while (playlist.length > 1 && nextIndex === currentIndex);
        } else {
          nextIndex = currentIndex + 1;
          if (nextIndex >= playlist.length) {
            // Loop back to start
            nextIndex = 0;
          }
        }

        if (nextIndex >= 0 && nextIndex < playlist.length) {
          get().setSong(playlist[nextIndex]);
        }
      },
      playPrevious: () => {
        const { playlist, song } = get();
        if (!playlist || playlist.length === 0) return;

        const currentIndex = playlist.findIndex((s) => s?.id === song?.id);
        let prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
          // Loop to last song
          prevIndex = playlist.length - 1;
        }

        if (prevIndex >= 0 && prevIndex < playlist.length) {
          get().setSong(playlist[prevIndex]);
        }
      }, 
      playList: (playlist: Song[], initialSongIndex: number = 0) => {
        set({ playlist: playlist });
        if (
          playlist.length > 0 &&
          initialSongIndex >= 0 &&
          initialSongIndex < playlist.length
        ) {
          get().setSong(playlist[initialSongIndex]);
        }
      },
    }),
    {
      name: "audio-storage",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Only persist these fields if needed,
        // Keeping existing behavior: persist song, playlist
        song: state.song,
        playlist: state.playlist,
        // shuffle: state.shuffle,
        // repeat: state.repeat,
        isPlaying: state.isPlaying,
        lastPosition: state.lastPosition,
      }),
    },
  ),
);

export default useAudioContext;
