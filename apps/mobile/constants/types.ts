type Song = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  cover?: string;
  url: string;
  // --- Flowbyte API additions (optional, additive) ---
  source?: "api" | "local";
  apiSongId?: string; // server-side song id when source === "api"
  artworkUrl?: string;
  streamUrl?: string;
  isDownloaded?: boolean;
  localUri?: string;
  downloadStatus?: "none" | "downloading" | "downloaded" | "error";
  albumId?: string;
  artistId?: string;
  isFavorite?: boolean;
} | null;

type PlaylistObj = {
  id: string;
  name: string;
  songs: Song[];
  /** Server-side playlist id when this playlist is synced to Flowbyte Cloud. */
  serverId?: string;
};

type audioStatusType = {
  currentTime: number;
  didJustFinish: boolean;
  duration: number;
  id: string;
  isBuffering: boolean;
  isLoaded: boolean;
  loop: boolean;
  mute: boolean;
  playbackRate: number;
  playbackState: string;
  playing: boolean;
  reasonForWaitingToPlay: string | null;
  shouldCorrectPitch: boolean;
  timeControlStatus: string;
};

export type { PlaylistObj, Song ,audioStatusType };

