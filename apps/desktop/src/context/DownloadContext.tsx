import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DownloadProgress, NormalizedLyrics, VideoInfo } from '@flowbyte/types';
import { toast } from 'sonner';
import { client } from '../lib/api';
import { isYouTubeUrl } from '../lib/utils';
import {
  cancelDownload,
  cancelMusicImport,
  deleteFiles,
  getVideoInfo,
  onDownloadProgress,
  onMusicImportDone,
  readFileBytes,
  startDownload,
  startMusicImport,
  toBytes,
  type DownloadType,
  type MusicImportResult,
} from '../lib/tauri';
import { getSettings } from '../lib/api';

export interface DownloadJob {
  id: string;
  kind: 'download' | 'import';
  title: string;
  progress: DownloadProgress;
  result?: MusicImportResult;
}

interface DownloadContextValue {
  jobs: DownloadJob[];
  analyze: (url: string) => Promise<VideoInfo>;
  startDownload: (url: string, type: DownloadType) => Promise<void>;
  importToLibrary: (url: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  clearFinished: () => void;
}

const DownloadContext = createContext<DownloadContextValue | null>(null);

function parseVttToLyrics(vtt: string, language = 'en'): NormalizedLyrics {
  const lines: Array<{ start: number; end: number | null; text: string }> = [];
  const cueRegex = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[.,](\d{3})/;
  let current: { start: number; end: number | null; text: string[] } | null = null;

  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = cueRegex.exec(line);
    if (m) {
      if (current) {
        lines.push({ start: current.start, end: current.end, text: current.text.join(' ') });
      }
      const toMs = (g: RegExpExecArray, o: number) =>
        (+g[o] * 3600 + +g[o + 1] * 60 + +g[o + 2]) * 1000 + +g[o + 3];
      current = {
        start: toMs(m, 1),
        end: toMs(m, 5),
        text: [],
      };
    } else if (current && !/^\d+$/.test(line) && !line.startsWith('WEBVTT') && !line.startsWith('Kind:') && !line.startsWith('Language:')) {
      current.text.push(line);
    }
  }
  if (current) lines.push({ start: current.start, end: current.end, text: current.text.join(' ') });
  return { version: 1, language, synced: true, lines };
}

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const patch = useCallback((id: string, progress: DownloadProgress) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, progress } : j)),
    );
  }, []);

  const upsert = useCallback((job: DownloadJob) => {
    setJobs((prev) => {
      const i = prev.findIndex((j) => j.id === job.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = job;
        return next;
      }
      return [job, ...prev];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  // Tauri events
  useEffect(() => {
    let un: Array<() => void> = [];
    void onDownloadProgress((id, progress) => {
      setJobs((prev) => {
        const i = prev.findIndex((j) => j.id === id);
        if (i < 0) return prev;
        const next = [...prev];
        next[i] = { ...next[i], progress };
        return next;
      });
      if (progress.status === 'completed') {
        toast.success('Download finished');
      } else if (progress.status === 'failed') {
        toast.error(progress.detail || 'Download failed');
      }
    }).then((fn) => un.push(fn));

    void onMusicImportDone((id, result) => {
      void handleImportResult(id, result);
    }).then((fn) => un.push(fn));

    return () => un.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportResult = useCallback(
    async (id: string, result: MusicImportResult) => {
      const progressFor = () =>
        jobsRef.current.find((j) => j.id === id)?.progress ?? {
          status: 'processing' as const,
          percent: 50,
          speed: '',
          eta: '',
          detail: '',
        };

      try {
        // 1) upload audio
        const audioBytes = await readFileBytes(result.audioPath);
        patch(id, { ...progressFor(), status: 'uploading', percent: 55, detail: 'Uploading audio...' });
        const audio = await client.uploadAudio(toBytes(audioBytes), result.audioCodec);

        // 2) upload artwork
        let artwork: { storageKey: string } | null = null;
        if (result.thumbnailPath) {
          patch(id, { ...progressFor(), status: 'uploading', percent: 70, detail: 'Uploading artwork...' });
          const art = await readFileBytes(result.thumbnailPath);
          artwork = await client.uploadArtwork(toBytes(art));
        }

        // 3) upload lyrics (first vtt subtitle)
        let lyrics: { storageKey: string } | null = null;
        if (result.subtitlePaths.length > 0) {
          patch(id, { ...progressFor(), status: 'uploading', percent: 85, detail: 'Uploading lyrics...' });
          const vtt = await readFileBytes(result.subtitlePaths[0]);
          const normalized = parseVttToLyrics(new TextDecoder().decode(toBytes(vtt)));
          lyrics = await client.uploadLyrics(normalized);
        }

        // 4) complete
        patch(id, { ...progressFor(), status: 'uploading', percent: 95, detail: 'Saving metadata...' });
        const res = await client.completeSongUpload({
          title: result.title,
          artistName: result.artist ?? null,
          duration: result.duration,
          codec: result.audioCodec,
          bitrate: result.audioBitrate ?? null,
          fileSize: audio.fileSize,
          audioStorageKey: audio.storageKey,
          artworkStorageKey: artwork?.storageKey ?? null,
          lyricsStorageKey: lyrics?.storageKey ?? null,
          lyricsLanguage: lyrics ? 'en' : null,
          lyricsSynced: lyrics ? true : false,
          sourceUrl: result.sourceUrl,
          sourceId: result.videoId,
        });

        patch(id, {
          status: 'completed',
          percent: 100,
          speed: '',
          eta: '',
          detail: res.duplicate ? 'Already in library' : 'Added to library',
        });
        toast.success(res.duplicate ? 'Song already in library' : 'Added to library');

        // 5) cleanup staged files
        await deleteFiles([
          result.audioPath,
          ...(result.thumbnailPath ? [result.thumbnailPath] : []),
          ...result.subtitlePaths,
        ]);
      } catch (e) {
        patch(id, {
          status: 'failed',
          percent: 0,
          speed: '',
          eta: '',
          detail: e instanceof Error ? e.message : 'Import failed',
        });
        toast.error('Import failed');
      }
    },
    [patch],
  );

  const analyze = useCallback(async (url: string) => {
    if (!isYouTubeUrl(url)) throw new Error('Enter a valid YouTube URL');
    return getVideoInfo(url);
  }, []);

  const start = useCallback(async (url: string, type: DownloadType) => {
    const id = await startDownload(url, type);
    upsert({
      id,
      kind: 'download',
      title: url,
      progress: { percent: 0, speed: '', eta: '', status: 'starting', detail: 'Starting...' },
    });
  }, [upsert]);

  const importToLibrary = useCallback(async (url: string) => {
    if (!isYouTubeUrl(url)) throw new Error('Enter a valid YouTube URL');
    const settings = getSettings();
    const id = await startMusicImport(url, {
      bitrate: settings.importBitrate,
      transcode: settings.importTranscode,
    });
    upsert({
      id,
      kind: 'import',
      title: url,
      progress: { percent: 0, speed: '', eta: '', status: 'preparing', detail: 'Fetching video info...' },
    });
  }, [upsert]);

  const cancel = useCallback(
    async (id: string) => {
      const job = jobsRef.current.find((j) => j.id === id);
      if (!job) return;
      if (job.kind === 'download') {
        await cancelDownload(id);
      } else {
        await cancelMusicImport(id);
      }
    },
    [],
  );

  const clearFinished = useCallback(() => {
    setJobs((prev) =>
      prev.filter((j) => !['completed', 'failed', 'cancelled'].includes(j.progress.status)),
    );
  }, []);

  const value = useMemo(
    () => ({ jobs, analyze, startDownload: start, importToLibrary, cancel, clearFinished }),
    [jobs, analyze, start, importToLibrary, cancel, clearFinished],
  );

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
}

export function useDownloads(): DownloadContextValue {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadProvider');
  return ctx;
}