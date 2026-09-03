import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  HardDrive,
  ImagePlus,
  ListVideo,
  Loader2,
  Music4,
  Play,
  Trash2,
  X,
} from '../lib/icons';
import { toast } from 'sonner';
import { useDownloads } from '../context/DownloadContext';
import { usePlayer } from '../context/PlayerContext';
import {
  client,
  deleteSavedPlaylist,
  getSavedPlaylists,
  getSettings,
  localImportSong,
  removeSavedItem,
  subscribeSavedPlaylists,
  type SavedPlaylist,
} from '../lib/api';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import { assetUrl } from '../lib/tauri';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

type SavedItem = SavedPlaylist['items'][number];

export function SavedPage() {
  const { startDownload, importToLibrary, importPlaylistToLibrary } = useDownloads();
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>(() => getSavedPlaylists());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const iframePreview = getSettings().iframePreview;

  const refresh = useCallback(() => setPlaylists(getSavedPlaylists()), []);

  // Keep in sync when an import stamps a local file / library id on any item.
  useEffect(() => subscribeSavedPlaylists(refresh), [refresh]);

  const copyPath = (path: string) => {
    void navigator.clipboard
      ?.writeText(path)
      .then(() => toast.success('File path copied'))
      .catch(() => toast.error('Could not copy the file path'));
  };

  /**
   * Playback order: cloud library copy → local file → YouTube embed. When the
   * cloud copy can't be reached the item still plays through its original
   * YouTube URL instead of erroring (saved items are URLs, not uploads).
   */
  const startItemPlayback = (item: SavedItem) => {
    if (item.importedSongId) {
      void client
        .getSong(item.importedSongId)
        .then((song) => playSong(song))
        .catch(() => {
          if (iframePreview && (item.videoId || item.playlistId)) {
            toast.info('Library copy unreachable — playing the YouTube preview');
            setPlaying(item.id);
          } else {
            toast.error('Could not load song from library');
          }
        });
    } else if (item.localFilePath) {
      // Imported locally but never uploaded — play the file.
      playSong(
        localImportSong({
          id: `saved:${item.id}`,
          title: item.title,
          artistName: null,
          duration: 0,
          sourceUrl: item.url,
          sourceId: item.videoId,
          filePath: item.localFilePath,
          artworkPath: item.localArtworkPath,
        }),
      );
    } else {
      setPlaying(playing === item.id ? null : item.id);
    }
  };

  const onDeletePlaylist = (id: string) => {
    deleteSavedPlaylist(id);
    refresh();
    if (expanded === id) setExpanded(null);
    toast.success('Playlist deleted');
  };

  const onRemoveItem = (playlistId: string, itemId: string) => {
    removeSavedItem(playlistId, itemId);
    refresh();
  };

  const onDownload = async (
    item: SavedPlaylist['items'][number],
    isImport: boolean,
  ) => {
    setBusyId(item.id);
    try {
      if (isImport) {
        await importToLibrary(item.url);
        toast.success('Import started — see Downloads');
      } else if (item.isPlaylist) {
        await importPlaylistToLibrary(item.url);
        toast.success('Playlist import started — see Downloads');
      } else {
        await startDownload(item.url, 'audio');
        toast.success('Download started — see Downloads');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed to start');
    } finally {
      setBusyId(null);
    }
  };

  const total = playlists.reduce((n, p) => n + p.items.length, 0);

  return (
    <div className="w-full space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Saved</h1>
        <p className="text-sm text-ink-2">
          YouTube videos and playlists you saved to play later
          {iframePreview ? ' — tap Play for an embedded preview' : ''}.
        </p>
      </div>

      {playlists.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-sm text-ink-2">
            <ListVideo className="h-8 w-8 text-ink-3" />
            <p>
              Nothing saved yet. Paste a YouTube link on the Home page, analyze it, and use
              “Save to playlist”.
            </p>
          </CardContent>
        </Card>
      )}

      {playlists.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              >
                {expanded === p.id ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                )}
                <span className="truncate font-medium">{p.name}</span>
                <Badge variant="accent" className="shrink-0">
                  {p.items.length} {p.items.length === 1 ? 'item' : 'items'}
                </Badge>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-ink-3 hover:text-danger"
                onClick={() => onDeletePlaylist(p.id)}
                aria-label="Delete playlist"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {expanded === p.id && (
              <div className="mt-3 space-y-2">
                {p.items.length === 0 && (
                  <p className="text-sm text-ink-3">No items yet.</p>
                )}
                {p.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-line bg-card/60 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label={`Play ${item.title}`}
                        title="Play"
                        onClick={() => startItemPlayback(item)}
                        className="shrink-0 cursor-pointer rounded transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                      >
                        {(item.localFilePath && item.localArtworkPath) || item.thumbnail ? (
                          <img
                            src={
                              item.localFilePath && item.localArtworkPath
                                ? assetUrl(item.localArtworkPath)
                                : (item.thumbnail ?? undefined)
                            }
                            alt=""
                            className="h-12 w-20 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-20 items-center justify-center rounded bg-card">
                            <ImagePlus className="h-4 w-4 text-ink-3" />
                          </div>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          aria-label={`Play ${item.title}`}
                          onClick={() => startItemPlayback(item)}
                          className="block w-full cursor-pointer text-left"
                        >
                          <p className="truncate text-sm font-medium group-hover:text-accent-hover">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-3">
                            {item.isPlaylist ? 'YouTube playlist' : 'YouTube video'} · saved{' '}
                            {new Date(item.savedAt).toLocaleDateString()}
                            {item.importedSongId ? (
                              <span className="ml-1 text-accent"> · In library</span>
                            ) : item.localFilePath ? (
                              <span className="ml-1 text-accent"> · Downloaded</span>
                            ) : null}
                          </p>
                        </button>
                        {item.localFilePath && (
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-3">
                            <HardDrive className="h-3 w-3 shrink-0" />
                            <span className="truncate" title={item.localFilePath}>
                              {item.localFilePath}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyPath(item.localFilePath as string)}
                              className="shrink-0 text-ink-3 transition-colors hover:text-accent"
                              aria-label="Copy file path"
                              title="Copy file path"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={
                          item.importedSongId || item.localFilePath
                            ? playing === item.id
                            : !iframePreview || playing === item.id
                        }
                        onClick={() => startItemPlayback(item)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        {item.importedSongId
                          ? 'Play'
                          : item.localFilePath
                            ? 'Play file'
                            : 'Preview'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void onDownload(item, !item.isPlaylist)
                        }
                        title={
                          item.isPlaylist
                            ? 'Import all videos to library'
                            : 'Import into your library'
                        }
                      >
                        {busyId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Music4 className="h-3.5 w-3.5" />
                        )}
                        Import
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-ink-3 hover:text-danger"
                        onClick={() => onRemoveItem(p.id, item.id)}
                        aria-label="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {playing === item.id && !item.importedSongId && !item.localFilePath && (
                      <div className="mt-3 space-y-2">
                        <YouTubeEmbed
                          videoId={item.videoId}
                          playlistId={item.playlistId}
                        />
                        <Button
                          size="sm"
                          onClick={() =>
                            void onDownload(item, !item.isPlaylist)
                          }
                        >
                          <Music4 className="h-3.5 w-3.5" />
                          Import
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}        {playlists.length > 0 && (
        <p className="text-xs text-ink-3">
          {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} · {total}{' '}
          saved {total === 1 ? 'item' : 'items'} · playlists are stored on this device
        </p>
      )}
    </div>
  );
}
