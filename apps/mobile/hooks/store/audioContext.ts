import { Song } from "@/constants/types";
import { getSongCover } from "@/utils/imageUtils";
import { AudioPro } from "react-native-audio-pro";
import { Alert } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import history from "./history";
import { zustandStorage } from "./storageAdapter";
import { OfflineError, resolvePlaybackUrl } from "@/lib/playback";

async function playResolved(song: NonNullable<Song>): Promise<void> {
  try {
    const url = await resolvePlaybackUrl(song);
    if (!url) {
      Alert.alert(
        "Not Available",
        `"${song.title}" has no playable source. It may not be downloaded and no stream URL could be resolved.`,
        [{ text: "OK" }],
      );
      return;
    }
    AudioPro.play({
      id: song.id,
      url,
      title: song.title,
      artist: song.artist || "unknown",
      artwork: song.cover || "",
    });
  } catch (e) {
    if (e instanceof OfflineError) {
      Alert.alert("Not Available", e.message, [
        { text: "OK" },
      ]);
    } else {
      Alert.alert(
        "Playback Error",
        `Could not play "${song.title}". ${e instanceof Error ? e.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    }
  }
}

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
  shuffle: boolean;
  repeat: boolean;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  /** Advance to next track (auto-play / manual skip). */
  playNext: (forceSkip?: boolean) => void;
  playPrevious: () => void;
  playList: (playlist: Song[], initialSongIndex?: number) => void;
  // --- Queue management ---
  /** Append a song to the end of the queue. */
  addToQueue: (song: NonNullable<Song>) => void;
  /** Insert a song right after the currently playing song. */
  insertNext: (song: NonNullable<Song>) => void;
  /** Remove a song at a given playlist index. */
  removeFromQueue: (index: number) => void;
  /** Remove all songs except the currently playing one. */
  clearQueue: () => void;
  /** Move a song from one playlist index to another. */
  moveInQueue: (from: number, to: number) => void;
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
          playResolved(resolvedSong);
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

      // --- Queue management ---

      addToQueue: (song) => {
        set((state) => ({ playlist: [...state.playlist, song] }));
      },

      insertNext: (song) => {
        const { playlist, song: current } = get();
        const idx = playlist.findIndex((s) => s?.id === current?.id);
        const insertAt = idx >= 0 ? idx + 1 : playlist.length;
        const next = [...playlist];
        next.splice(insertAt, 0, song);
        set({ playlist: next });
      },

      removeFromQueue: (index) => {
        const { playlist, song: current } = get();
        if (index < 0 || index >= playlist.length) return;
        const next = [...playlist];
        next.splice(index, 1);
        // If we removed the currently playing song, advance to the next one
        if (current && playlist[index]?.id === current.id) {
          set({ playlist: next });
          if (next.length > 0) {
            const newIdx = Math.min(index, next.length - 1);
            get().setSong(next[newIdx]);
          } else {
            get().clearSong();
          }
        } else {
          set({ playlist: next });
        }
      },

      clearQueue: () => {
        const { song: current } = get();
        set({ playlist: current ? [current] : [] });
      },

      moveInQueue: (from, to) => {
        const { playlist } = get();
        if (from === to || from < 0 || to < 0 || from >= playlist.length || to >= playlist.length) return;
        const next = [...playlist];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        set({ playlist: next });
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
