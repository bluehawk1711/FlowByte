import type { Song } from "@/constants/types";
import { client } from "./api";
import { getLocalFilePath, isDownloaded } from "./offline";

/**
 * Hybrid playback resolution (mirror of the desktop PlayerContext):
 * 1. offline download exists → local file URI (expo-file-system)
 * 2. explicit localUri on the song → local file URI
 * 3. api song → signed/proxy stream URL from the API
 * 4. fallback → the url the song already carries (legacy local playback)
 */
export async function resolvePlaybackUrl(song: NonNullable<Song>): Promise<string> {
  if (song.source === "api" || song.apiSongId) {
    const apiSongId = song.apiSongId ?? song.id;
    const localUri = await getLocalFilePath(apiSongId);
    if (localUri) return localUri;
    if (song.localUri) return song.localUri;
    if (song.streamUrl) return song.streamUrl;
    const api = client;
    if (api) {
      const { url } = await api.getStreamUrl(apiSongId);
      return url;
    }
  }
  if (song.localUri) return song.localUri;
  if (song.isDownloaded) {
    const localUri = await getLocalFilePath(song.id);
    if (localUri) return localUri;
  }
  return song.url || "";
}

/** True when the song can be played offline without the API. */
export async function canPlayOffline(song: NonNullable<Song>): Promise<boolean> {
  if (song.localUri) return true;
  if (song.isDownloaded) return isDownloaded(song.id);
  if (song.source === "api" || song.apiSongId) {
    return isDownloaded(song.apiSongId ?? song.id);
  }
  return true;
}