import { useCallback, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  ListVideo,
  Loader2,
  Music4,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDownloads } from '../context/DownloadContext';
import {
  deleteSavedPlaylist,
  getSavedPlaylists,
  getSettings,
  removeSavedItem,
  type SavedPlaylist,
} from '../lib/api';
import { YouTubeEmbed } from '../components/YouTubeEmbed';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export function SavedPage() {
  const { startDownload, importToLibrary } = useDownloads();
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>(() => getSavedPlaylists());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const iframePreview = getSettings().iframePreview;

  const refresh = useCallback(() => setPlaylists(getSavedPlaylists()), []);

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
      } else {
        await startDownload(item.url, 'playlist');
        toast.success('Playlist download started — see Downloads');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed to start');
    } finally {
      setBusyId(null);
    }
  };

  const total = playlists.reduce((n, p) => n + p.items.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Saved</h1>
        <p className="text-sm text-zinc-400">
          YouTube videos and playlists you saved to play later
          {iframePreview ? ' — tap Play for an embedded preview' : ''}.
        </p>
      </div>

      {playlists.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-sm text-zinc-400">
            <ListVideo className="h-8 w-8 text-zinc-600" />
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
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                )}
                <span className="truncate font-medium">{p.name}</span>
                <Badge variant="blue" className="shrink-0">
                  {p.items.length} {p.items.length === 1 ? 'item' : 'items'}
                </Badge>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-red-400"
                onClick={() => onDeletePlaylist(p.id)}
                aria-label="Delete playlist"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {expanded === p.id && (
              <div className="mt-3 space-y-2">
                {p.items.length === 0 && (
                  <p className="text-sm text-zinc-500">No items yet.</p>
                )}
                {p.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.thumbnail && (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-12 w-20 shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {item.isPlaylist ? 'YouTube playlist' : 'YouTube video'} · saved{' '}
                          {new Date(item.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!iframePreview || playing === item.id}
                        onClick={() => setPlaying(playing === item.id ? null : item.id)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Play
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
                            ? 'Download all videos as MP3'
                            : 'Import into your library'
                        }
                      >
                        {busyId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : item.isPlaylist ? (
                          <Download className="h-3.5 w-3.5" />
                        ) : (
                          <Music4 className="h-3.5 w-3.5" />
                        )}
                        {item.isPlaylist ? 'Download' : 'Import'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-400"
                        onClick={() => onRemoveItem(p.id, item.id)}
                        aria-label="Remove item"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {playing === item.id && (
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
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {playlists.length > 0 && (
        <p className="text-xs text-zinc-600">
          {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'} · {total}{' '}
          saved {total === 1 ? 'item' : 'items'} · playlists are stored on this device
        </p>
      )}
    </div>
  );
}