import type { Song as ApiSong } from "@flowbyte/types";
import type { Song, PlaylistObj } from "@/constants/types";
import { client } from "./api";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import usePlaylist from "@/hooks/store/playlist";

export const API_PREFIX = "api:";

/** Map an API song into the mobile Song shape (id namespaced `api:`). */
export function toMobileSong(song: ApiSong): NonNullable<Song> {
  return {
    id: `${API_PREFIX}${song.id}`,
    title: song.title,
    artist: song.artistName ?? undefined,
    album: song.albumName ?? undefined,
    duration: song.duration,
    cover: song.artworkUrl ?? undefined,
    url: song.streamUrl ?? "",
    source: "api",
    apiSongId: song.id,
    artworkUrl: song.artworkUrl ?? undefined,
    streamUrl: song.streamUrl ?? undefined,
    albumId: song.albumId ?? undefined,
    artistId: song.artistId ?? undefined,
    isFavorite: song.isFavorite,
  };
}

function toApiSongId(song: NonNullable<Song>): string | null {
  return song.apiSongId ?? (song.source === "api" ? song.id.slice(API_PREFIX.length) : null);
}

export type SyncResult = {
  favorites: number;
  playlists: number;
  errors: string[];
};

/** Push local favorites to the API (server wins on conflicts, local additions pushed). */
async function syncFavorites(errors: string[]): Promise<number> {
  const api = client;
  if (!api) return 0;
  const local = useFavourite.getState().songs.filter(Boolean);
  const server = await api.getFavorites();
  const serverIds = new Set(server.map((s) => s.id));
  const serverSongs = new Map(server.map((s) => [s.id, s]));

  const remoteSongs: NonNullable<Song>[] = [];
  for (const s of server) {
    if (!s) continue;
    const localHit = local.find((l) => l?.apiSongId === s.id);
    if (localHit) continue; // already known locally
    remoteSongs.push(toMobileSong(s));
  }
  if (remoteSongs.length > 0) {
    const merged = [...remoteSongs, ...local];
    useFavourite.setState({ songs: merged });
  }

  for (const s of local) {
    if (!s) continue;
    const apiSongId = toApiSongId(s);
    if (!apiSongId) continue;
    if (serverIds.has(apiSongId)) continue;
    try {
      await api.addFavorite(apiSongId);
      serverIds.add(apiSongId);
    } catch (e) {
      errors.push(`favorite ${apiSongId}: ${String(e)}`);
    }
  }
  return serverSongs.size;
}

/** Pull server playlists into the local playlist store (additive). */
async function syncPlaylists(errors: string[]): Promise<number> {
  const api = client;
  if (!api) return 0;
  const serverPlaylists = await api.getPlaylists();
  const localStore = usePlaylist.getState();
  const localIds = new Set(localStore.playlists.map((p) => p.id));
  const apiIds = new Set<string>();

  for (const p of serverPlaylists) {
    apiIds.add(p.id);
    if (localIds.has(p.id)) continue;
    try {
      const detail = await api.getPlaylist(p.id);
      const playlistObj: PlaylistObj = {
        id: p.id,
        name: p.name,
        songs: detail.songs.map(toMobileSong),
      };
      localStore.createPlaylist(playlistObj);
    } catch (e) {
      errors.push(`playlist ${p.id}: ${String(e)}`);
    }
  }
  return apiIds.size;
}

/** Push the current playback position to the API (throttled by the caller). */
export async function syncPlayback(): Promise<void> {
  const api = client;
  if (!api) return;
  const { song, isPlaying, lastPosition } = useAudioContext.getState();
  const apiSongId = song ? toApiSongId(song) : null;
  if (!apiSongId) return;
  try {
    await api.syncPlayback({
      songId: apiSongId,
      position: Math.floor(lastPosition),
      isPlaying,
      deviceId: await import("./api").then((m) => m.getDeviceId()),
    });
  } catch {
    // offline / auth expired — the next sync attempt retries
  }
}

/** Full two-way sync of favorites + playlists. */
export async function syncLibrary(): Promise<SyncResult> {
  const api = client;
  if (!api) throw new Error("API client not initialized");
  const errors: string[] = [];
  const favorites = await syncFavorites(errors);
  const playlists = await syncPlaylists(errors);
  return { favorites, playlists, errors };
}

/** Record a play in history (called when a song actually starts). */
export async function recordApiPlay(song: NonNullable<Song>): Promise<void> {
  const api = client;
  const apiSongId = toApiSongId(song);
  if (!api || !apiSongId) return;
  try {
    await api.recordPlay({ songId: apiSongId, deviceId: await getDeviceIdSafe() });
  } catch {
    // offline — history recorded locally, pushed next sync
  }
}

async function getDeviceIdSafe(): Promise<string> {
  const { getDeviceId } = await import("./api");
  return getDeviceId();
}