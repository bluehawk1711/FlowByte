import type { Song } from "@/constants/types";
import { client } from "./api";
import { getLocalFilePath, isDownloaded } from "./offline";

/**
 * Hybrid playback resolution (mirror of the desktop PlayerContext):
 * 1. offline download exists → local file URI (expo-file-system)
 * 2. explicit localUri on the song → local file URI
 * 3. api song → signed/proxy stream URL from the API
 * 4. fallback → the url the song already carries (legacy local playback)
 *
 * Throws OfflineError when the song requires network but is unavailable.
 */
export async function resolvePlaybackUrl(
  song: NonNullable<Song>,
): Promise<string> {
  // --- Local-first: check offline file ---
  if (song.source === "api" || song.apiSongId) {
    const apiSongId = song.apiSongId ?? song.id;

    // 1) Offline download
    const localUri = await getLocalFilePath(apiSongId);
    if (localUri) return localUri;

    // 2) Explicit localUri stored on the song
    if (song.localUri) return song.localUri;

    // 3) Pre-resolved stream URL
    if (song.streamUrl) return song.streamUrl;

    // 4) Need the network → try API (client is null when not initialized/offline)
    if (!client) throw new OfflineError("offline-only", song);
    try {
      const { url } = await client.getStreamUrl(apiSongId);
      return url;
    } catch {
      throw new OfflineError("network-error", song);
    }
  }

  // --- Legacy local playback ---
  if (song.localUri) return song.localUri;
  if (song.isDownloaded) {
    const localUri = await getLocalFilePath(song.id);
    if (localUri) return localUri;
  }
  return song.url || "";
}

/**
 * Check whether a song can be played without network access.
 * Returns a structured result so callers can show the right UI.
 */
export async function getOfflineAvailability(
  song: NonNullable<Song>,
): Promise<OfflineAvailability> {
  // Always playable if it has a local URI or is a local file
  if (song.source === "local") return { available: true, reason: "local" };

  // Check if we have an offline download
  const apiSongId =
    song.source === "api" || song.apiSongId ? song.apiSongId ?? song.id : song.id;

  if (song.localUri) return { available: true, reason: "local-uri" };

  const downloaded = await isDownloaded(apiSongId);
  if (downloaded) return { available: true, reason: "downloaded" };

  // Needs network
  return {
    available: false,
    reason: "not-downloaded",
    message: "This song is not saved for offline listening. Connect to the internet or download it first.",
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfflineAvailabilityReason =
  | "local"
  | "local-uri"
  | "downloaded"
  | "not-downloaded";

export interface OfflineAvailability {
  available: boolean;
  reason: OfflineAvailabilityReason;
  message?: string;
}

/**
 * Custom error for offline playback failures. Carries enough context
 * so the UI layer can show a meaningful message.
 */
export class OfflineError extends Error {
  constructor(
    reason: "offline-only" | "network-error",
    song: NonNullable<Song>,
  ) {
    const message =
      reason === "offline-only"
        ? `"${song.title}" is not available offline. Connect to the internet or download it first.`
        : `Could not load "${song.title}". Check your connection and try again.`;
    super(message);
    this.name = "OfflineError";
    this.reason = reason;
    this.songTitle = song.title;
  }

  reason: "offline-only" | "network-error";
  songTitle: string;
}
