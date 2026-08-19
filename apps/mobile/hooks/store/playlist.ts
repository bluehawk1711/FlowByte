import { PlaylistObj } from "@/constants/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "./storageAdapter";

type playlistState = {
  playlists: PlaylistObj[];
  /** Server playlist ids deleted locally — pushed to the API on next sync. */
  deletedServerIds: string[];
  createPlaylist: (playlist: PlaylistObj) => void;
  deletePlaylist: (id: string) => void;
  setPlaylists: (playlists: PlaylistObj[]) => void;
  findPlaylist: (songId: string) => PlaylistObj | undefined;
  clearDeletedServerIds: (ids: string[]) => void;
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
      deletedServerIds: [],
      createPlaylist: (playlist: PlaylistObj) => {
        const newPlaylists = [playlist, ...get().playlists];
        set(() => ({
          playlists: newPlaylists,
        }));
      },
      deletePlaylist: (id) => {
        const target = get().playlists.find((p) => p.id === id);
        set((state) => {
          const newPlaylists = state.playlists.filter(
            (playlist: PlaylistObj) => playlist.id !== id,
          );
          return {
            playlists: newPlaylists,
            deletedServerIds: target?.serverId
              ? [...new Set([...state.deletedServerIds, target.serverId])]
              : state.deletedServerIds,
          };
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
      clearDeletedServerIds: (ids: string[]) => {
        set((state) => ({
          deletedServerIds: state.deletedServerIds.filter((id) => !ids.includes(id)),
        }));
      },
    }),
    {
      name: "playlist-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

export default usePlaylist;
