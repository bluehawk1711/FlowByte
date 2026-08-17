import { PlaylistObj } from "@/constants/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storageAdapter";

type playlistState = {
  playlists: PlaylistObj[];
  createPlaylist: (playlist: PlaylistObj) => void;
  deletePlaylist: (id: string) => void;
  setPlaylists: (playlists: PlaylistObj[]) => void;
  findPlaylist: (songId: string) => PlaylistObj | undefined;
  // loadData: () => void; // Removed
};

const usePlaylist = create<playlistState>()(
  persist(
    (set, get) => ({
      playlists: [
        {
          id: "123",
          name: "Default Playlist",
          songs: [],
        },
      ],
      createPlaylist: (playlist: PlaylistObj) => {
        const newPlaylists = [playlist, ...get().playlists];
        set(() => ({
          playlists: newPlaylists,
        }));
      },
      deletePlaylist: (id) => {
        set((state) => {
          const newPlaylists = state.playlists.filter(
            (playlist: PlaylistObj) => playlist.id !== id,
          );
          return { playlists: newPlaylists };
        });
      },
      setPlaylists: (playlists: PlaylistObj[]) => {
        set({ playlists });
      },
      findPlaylist: (songId: string) => {
        return get().playlists.find((playlist) =>
          playlist.songs.some((song) => song?.id === songId),
        );
      },
    }),
    {
      name: "playlist-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

export default usePlaylist;
