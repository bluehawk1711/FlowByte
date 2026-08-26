import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Download,
  FileAudio,
  Link,
  ListPlus,
  Loader2,
  Music4,
  Search,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import type { VideoInfo } from '@flowbyte/types';
import { useDownloads } from '../context/DownloadContext';
import { formatDuration, parseYouTubeUrl } from '../lib/utils';
import {
  addToSavedPlaylist,
  createSavedPlaylist,
  getSavedPlaylists,
  getSettings,
} from '../lib/api';
import { YouTubeEmbed } from './YouTubeEmbed';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog } from './ui/dialog';
import { Input } from './ui/input';
import type { DownloadType } from '../lib/tauri';

const DOWNLOAD_OPTIONS: Array<{ type: DownloadType; label: string; hint: string }> = [
  { type: 'audio', label: 'Audio (MP3)', hint: 'Best audio only' },
  { type: 'video', label: 'Video (best)', hint: 'Best quality merged' },
  { type: 'merged', label: 'Video (720p)', hint: '≤720p merged MP4' },
  { type: 'fast', label: 'Video (360p)', hint: 'Fast, small file' },
  { type: 'video-only', label: 'Video only', hint: 'No audio track' },
  { type: 'playlist', label: 'Playlist (audio)', hint: 'MP3 for every item' },
  { type: 'playlistVideo', label: 'Playlist (video)', hint: 'Merged videos' },
];

export function AddMusicModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { analyze, startDownload, importToLibrary } = useDownloads();
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [playlistId, setPlaylistId] = useState<string>('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseYouTubeUrl(url), [url]);
  const iframePreview = getSettings().iframePreview;
  const showPreview = iframePreview && info?.success && (parsed?.videoId || parsed?.playlistId);

  const runAnalyze = useCallback(
    async (value: string) => {
      if (!value.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const result = await analyze(value);
        setInfo(result);
        if (result.success === false) {
          setError(result.message ?? 'Could not read video info');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Analysis failed');
        setInfo(null);
      } finally {
        setBusy(false);
      }
    },
    [analyze],
  );

  const onDownload = async (type: DownloadType) => {
    if (!url) return;
    setBusy(true);
    setError(null);
    try {
      await startDownload(url, type);
      toast.success('Download started — see the Downloads page');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed to start');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    if (!url) return;
    setImporting(true);
    setError(null);
    try {
      await importToLibrary(url);
      toast.success('Import started — see the Downloads page');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed to start');
    } finally {
      setImporting(false);
    }
  };

  const onSaveToPlaylist = () => {
    if (!url || !info?.success || !parsed) return;
    if (newPlaylistName.trim()) {
      const created = createSavedPlaylist(newPlaylistName);
      addToSavedPlaylist(created.id, {
        url,
        videoId: parsed.videoId,
        playlistId: parsed.playlistId,
        title: info.title,
        thumbnail: info.thumbnail ?? null,
        isPlaylist: parsed.isPlaylist,
      });
      setNewPlaylistName('');
      setPlaylistId('');
      toast.success(`Saved to new playlist "${created.name}"`);
    } else if (playlistId) {
      addToSavedPlaylist(playlistId, {
        url,
        videoId: parsed.videoId,
        playlistId: parsed.playlistId,
        title: info.title,
        thumbnail: info.thumbnail ?? null,
        isPlaylist: parsed.isPlaylist,
      });
      toast.success('Saved to playlist');
    } else {
      toast.error('Pick a playlist or enter a name for a new one');
    }
  };

  const close = () => {
    if (busy || importing) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title="Add Music to Library" widthClass="max-w-2xl">
      <div className="max-h-[75vh] space-y-6 overflow-y-auto pr-1">
        {/* Section 1: URL Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-1">Paste URL</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                className="pl-9"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              onClick={() => void runAnalyze(url)}
              disabled={busy || !url.trim()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Analyze
            </Button>
          </div>
          <p className="text-xs text-ink-3">
            Supports YouTube, SoundCloud, and Bandcamp links.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs uppercase tracking-wider text-ink-3">Or</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* Section 2: Local Upload */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all ${
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-line hover:border-accent/50 hover:bg-elevated'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            // Handle dropped files
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              toast.info(`${files.length} file(s) detected — import coming soon`);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card">
            <Upload className="h-6 w-6 text-ink-2" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-ink-1">Import Local Audio</p>
            <p className="mt-0.5 text-xs text-ink-2">
              Drag and drop your files here, or click to browse.
            </p>
            <p className="mt-1 text-[11px] text-ink-3">FLAC, WAV, MP3 up to 100MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                toast.info(`${files.length} file(s) detected — import coming soon`);
              }
            }}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Section 3: Preview after analysis */}
        {info && info.success && (
          <Card>
            <CardContent className="flex gap-4 p-4">
              {info.thumbnail ? (
                <img
                  src={info.thumbnail}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg object-cover shadow-elev-2"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-card">
                  <FileAudio className="h-8 w-8 text-ink-3" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  {info.extractor && <Badge variant="accent">{info.extractor}</Badge>}
                  {info.duration != null && (
                    <span className="text-[11px] text-ink-3">{formatDuration(info.duration)}</span>
                  )}
                </div>
                <h3 className="truncate text-base font-semibold text-ink-1">{info.title}</h3>
                {info.uploader && (
                  <p className="mt-0.5 truncate text-sm text-ink-2">{info.uploader}</p>
                )}
                {info.views != null && (
                  <p className="mt-0.5 text-xs text-ink-3">{info.views.toLocaleString()} views</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 border-l border-line pl-4">
                <Button
                  disabled={importing}
                  onClick={() => void onImport()}
                  className="w-full"
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download
                </Button>
                <p className="text-center text-[11px] text-ink-3">or pick a format below</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download format grid */}
        {info && info.success && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DOWNLOAD_OPTIONS.map(({ type, label, hint }) => (
              <Button
                key={type}
                variant="outline"
                className="h-auto flex-col gap-0.5 py-2"
                disabled={busy}
                onClick={() => void onDownload(type)}
              >
                <Download className="mb-1 h-4 w-4" />
                <span className="text-xs">{label}</span>
                <span className="text-[10px] font-normal text-ink-3">{hint}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Section 4: Save to playlist */}
        {info && info.success && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-ink-1">
                <ListPlus className="h-4 w-4" />
                Save to playlist (play later)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={playlistId}
                  onChange={(e) => setPlaylistId(e.target.value)}
                  className="h-9 rounded-md border border-line-strong bg-app px-2 text-sm text-ink-1"
                >
                  <option value="">Existing playlist…</option>
                  {getSavedPlaylists().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.items.length})
                    </option>
                  ))}
                </select>
                <Input
                  className="w-44"
                  placeholder="…or new playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
                <Button variant="outline" onClick={onSaveToPlaylist}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-ink-3">
                Saved videos can be played later from the Saved page — with an embedded preview
                and a download button.
              </p>
            </CardContent>
          </Card>
        )}

        {/* YouTube embed preview */}
        {showPreview && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <YouTubeEmbed videoId={parsed!.videoId} playlistId={parsed!.playlistId} />
            </CardContent>
          </Card>
        )}

        {/* Failed analysis */}
        {info && !info.success && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-sm text-ink-2">
              <Clapperboard className="h-5 w-5 text-ink-3" />
              {info.message ?? 'Could not load this video'}
            </CardContent>
          </Card>
        )}
      </div>
    </Dialog>
  );
}
