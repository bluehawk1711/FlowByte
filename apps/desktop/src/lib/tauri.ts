import { invoke } from '@tauri-apps/api/core';
import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { VideoInfo } from '@flowbyte/types';

export type DownloadType =
  | 'audio'
  | 'video'
  | 'video-only'
  | 'merged'
  | 'fast'
  | 'playlist'
  | 'playlistVideo';

export interface MusicImportOptions {
  bitrate?: number;
  transcode?: boolean;
}

export interface MusicImportResult {
  id: string;
  title: string;
  artist?: string | null;
  duration: number;
  videoId: string;
  sourceUrl: string;
  year?: number | null;
  audioPath: string;
  audioCodec: string;
  audioBitrate?: number | null;
  thumbnailPath?: string | null;
  subtitlePaths: string[];
}

export interface PlatformInfo {
  os: string;
  arch: string;
}

export const getVideoInfo = (url: string): Promise<VideoInfo> =>
  invoke<VideoInfo>('get_video_info', { url });

export const startDownload = (url: string, downloadType: DownloadType): Promise<string> =>
  invoke<string>('start_download', { url, downloadType });

export const cancelDownload = (id: string): Promise<void> =>
  invoke<void>('cancel_download', { id });

export const startMusicImport = (
  url: string,
  opts?: MusicImportOptions,
): Promise<string> =>
  invoke<string>('start_music_import', { url, opts: opts ?? null });

export const cancelMusicImport = (id: string): Promise<void> =>
  invoke<void>('cancel_music_import', { id });

export const readFileBytes = (path: string): Promise<string> =>
  invoke<string>('read_file_bytes', { path });

export const deleteFiles = (paths: string[]): Promise<void> =>
  invoke<void>('delete_files', { paths });

export const platform = (): Promise<PlatformInfo> => invoke<PlatformInfo>('platform');

export const showMiniPlayer = (): Promise<void> => invoke<void>('show_mini_player');

export const hideMiniPlayer = (): Promise<void> => invoke<void>('hide_mini_player');

export const onMiniPlayerCommand = (
  handler: (action: MiniPlayerCommand) => void,
): Promise<UnlistenFn> =>
  listen<MiniPlayerCommand>('mini-player-command', (e) => handler(e.payload));

export type MiniPlayerCommand =
  | { action: 'play-pause' }
  | { action: 'next' }
  | { action: 'previous' }
  | { action: 'seek'; position: number }
  | { action: 'close' };

export interface MiniPlayerState {
  song: import('@flowbyte/types').Song | null;
  playing: boolean;
  position: number;
  duration: number;
}

export const emitMiniPlayerState = (state: MiniPlayerState): Promise<void> =>
  emit('mini-player-state', state);

export const onMiniPlayerState = (
  handler: (state: MiniPlayerState) => void,
): Promise<UnlistenFn> =>
  listen<MiniPlayerState>('mini-player-state', (e) => handler(e.payload));

export const onDownloadProgress = (
  handler: (id: string, progress: import('@flowbyte/types').DownloadProgress) => void,
): Promise<UnlistenFn> =>
  listen<[string, import('@flowbyte/types').DownloadProgress]>('download-progress', (e) => {
    const [id, progress] = e.payload;
    handler(id, progress);
  });

export const onMusicImportDone = (
  handler: (id: string, result: MusicImportResult) => void,
): Promise<UnlistenFn> =>
  listen<[string, MusicImportResult]>('music-import-done', (e) => {
    const [id, result] = e.payload;
    handler(id, result);
  });

export const assetUrl = (path: string): string => convertFileSrc(path);

export const toBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};