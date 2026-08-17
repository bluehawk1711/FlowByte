import type { Song as ApiSong } from "@flowbyte/types";
import type { Song } from "@/constants/types";
import { client } from "./api";
import { toMobileSong } from "./sync";
import useFavourite from "@/hooks/store/favourite";
import { getOfflineRecords, isDownloaded } from "./offline";
import { API_PREFIX } from "./sync";

/** Fetch the cloud library and enrich rows with offline + favorite state. */
export async function fetchCloudLibrary(query?: string): Promise<NonNullable<Song>[]> {
  const api = client;
  if (!api) throw new Error("API client not initialized");

  const page = await api.getSongs(query ? { query, pageSize: 100 } : { pageSize: 100 });
  const favorites = new Set(
    useFavourite.getState().songs.filter(Boolean).map((s) => s?.apiSongId ?? ""),
  );
  const offline = getOfflineRecords();

  return page.items.map((s: ApiSong) => {
    const mobile = toMobileSong(s);
    mobile.isFavorite = favorites.has(s.id);
    mobile.isDownloaded = !!offline[s.id];
    mobile.downloadStatus = offline[s.id]
      ? "downloaded"
      : s.downloadStatus ?? "none";
    return mobile;
  });
}

/** True when the row's server id belongs to an offline download. */
export function isCloudOffline(song: NonNullable<Song>): boolean {
  if (song.localUri) return true;
  return isDownloadedImmediate(song.apiSongId ?? song.id);
}

function isDownloadedImmediate(songId: string): boolean {
  return !!getOfflineRecords()[songId];
}

/** Toggle favorite on an API song (server + local store). */
export async function toggleCloudFavorite(
  song: NonNullable<Song>,
): Promise<boolean> {
  const api = client;
  const apiSongId = song.apiSongId ?? song.id.replace(API_PREFIX, "");
  const nowFavorite = !song.isFavorite;
  try {
    if (nowFavorite) await api?.addFavorite(apiSongId);
    else await api?.removeFavorite(apiSongId);
  } catch {
    // server unreachable — still update locally; next sync reconciles
  }
  useFavourite.getState().toggleSong(song);
  return nowFavorite;
}

export { API_PREFIX };