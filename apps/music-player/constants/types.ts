type Song = {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  cover?: string;
  url: string;
} | null;

type PlaylistObj = {
  id: string;
  name: string;
  songs: Song[];
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

