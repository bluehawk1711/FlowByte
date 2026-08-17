import { useCallback, useState } from 'react';
import { Clapperboard, Download, Loader2, Music4, Search } from 'lucide-react';
import type { VideoInfo } from '@flowbyte/types';
import { useDownloads } from '../context/DownloadContext';
import { formatDuration } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/card';
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

export function HomePage() {
  const { analyze, startDownload, importToLibrary } = useDownloads();
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const runAnalyze = useCallback(
    async (value: string) => {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed to start');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Import music</h1>
        <p className="text-sm text-zinc-400">
          Paste a YouTube link — download it, or add it straight to your library.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAnalyze(url);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            className="pl-9"
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || !url}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Analyze
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={importing || !url}
          onClick={() => void onImport()}
        >
          {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music4 className="h-4 w-4" />}
          Import to library
        </Button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {info && info.success && (
        <Card>
          <CardContent className="flex gap-4 p-4">
            {info.thumbnail && (
              <img
                src={info.thumbnail}
                alt=""
                className="h-32 w-24 rounded-md object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-medium">{info.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                {info.uploader && <span>{info.uploader}</span>}
                {info.duration != null && <span>{formatDuration(info.duration)}</span>}
                {info.views != null && (
                  <span>{info.views.toLocaleString()} views</span>
                )}
                {info.extractor && <Badge variant="blue">{info.extractor}</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    <span className="text-[10px] font-normal text-zinc-500">{hint}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {info && !info.success && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-zinc-400">
            <Clapperboard className="h-5 w-5 text-zinc-500" />
            {info.message ?? 'Could not load this video'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}