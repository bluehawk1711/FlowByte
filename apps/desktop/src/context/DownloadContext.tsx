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
import type { DownloadProgress, DownloadStatus, NormalizedLyrics } from '@flowbyte/types';
import { toast } from 'sonner';
import {
  client,
  getSettings,
  localImportSong,
  stampSavedItemImported,
  stampSavedItemLocalFile,
} from '../lib/api';
import { isYouTubeUrl } from '../lib/utils';
import {
  cancelDownload,
  cancelMusicImport,
  deleteFiles,
  getVideoInfo,
  getPlaylistItems,
  onDownloadProgress,
  onMusicImportDone,
  readFileBytes,
  startDownload,
  startMusicImport,
  toBytes,
  type DownloadType,
  type MusicImportResult,
  type PlaylistItem,
} from '../lib/tauri';

export interface DownloadJob {
  /** Stable UI id (job id while queued; the Rust id once a command is running). */
  id: string;
  /** Rust task id — used to match progress/result events. */
  rustId?: string;
  kind: 'download' | 'import';
  title: string;
  url?: string;
  videoId?: string | null;
  /** Playlist-import grouping — jobs sharing a batchId are rendered as one batch. */
  batchId?: string | null;
  /** Human name of the playlist import (for batch headers). */
  batchTitle?: string | null;
  progress: DownloadProgress;
  result?: MusicImportResult;
  /** True once the local file was uploaded to the cloud library. */
  uploaded?: boolean;
  uploadedSongId?: string | null;
  createdAt: string;
  /** When the job reached a terminal state (used for queue ETA estimates). */
  completedAt?: string;
}

interface QueueItem {
  id: string;
  url: string;
  title: string;
  videoId?: string | null;
  batchId?: string | null;
  batchTitle?: string | null;
}

interface DownloadContextValue {
  jobs: DownloadJob[];
  analyze: (url: string) => Promise<import('@flowbyte/types').VideoInfo>;
  startDownload: (url: string, type: DownloadType) => Promise<void>;
  /** Download a single video and keep it locally (no upload unless enabled). */
  importToLibrary: (url: string) => void;
  /** Download every video of a playlist as its own queued, cancellable job. */
  importPlaylistToLibrary: (url: string) => Promise<string>;
  /** Manually upload a finished local import to the cloud library. */
  uploadToLibrary: (jobId: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  removeJob: (id: string) => void;
  clearFinished: () => void;
}

const DownloadContext = createContext<DownloadContextValue | null>(null);

const STORE_KEY = 'flowbyte.downloadJobs.v1';

const TERMINAL: ReadonlySet<DownloadStatus> = new Set(['completed', 'failed', 'cancelled']);

function isTerminal(status: DownloadStatus): boolean {
  return TERMINAL.has(status);
}

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

/** Queued/interrupted jobs from a previous session can't resume — mark them. */
function hydrate(raw: string | null): DownloadJob[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DownloadJob[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((j) => j && j.id && j.progress && j.title)
      .map((j) =>
        isTerminal(j.progress.status)
          ? j
          : {
              ...j,
              progress: {
                ...j.progress,
                status: 'failed',
                percent: 0,
                detail: 'Interrupted — the app was closed',
              },
            },
      );
  } catch {
    return [];
  }
}

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<DownloadJob[]>(() => hydrate(localStorage.getItem(STORE_KEY)));
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const queueRef = useRef<QueueItem[]>([]);
  const pumpingRef = useRef(false);
  const terminalWaiters = useRef(new Map<string, () => void>());

  const patchJob = useCallback((id: string, patch: Partial<DownloadJob>) => {
    setJobs((prev) => {
      const i = prev.findIndex((j) => j.id === id);
      if (i < 0) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }, []);

  const patchByRustId = useCallback((rustId: string, patch: Partial<DownloadJob>) => {
    setJobs((prev) => {
      const i = prev.findIndex((j) => j.id === rustId || j.rustId === rustId);
      if (i < 0) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
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

  const findJob = useCallback((id: string) => jobsRef.current.find((j) => j.id === id), []);
  const findByRustId = useCallback(
    (rustId: string) => jobsRef.current.find((j) => j.id === rustId || j.rustId === rustId),
    [],
  );

  // Persist history so Downloads doubles as the app's task log across restarts.
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(jobs));
    } catch {
      /* storage full/unavailable — history is best-effort */
    }
  }, [jobs]);

  // Resolve "wait until this job finishes" promises once it goes terminal.
  useEffect(() => {
    for (const job of jobs) {
      if (!isTerminal(job.progress.status)) continue;
      const waiter = terminalWaiters.current.get(job.id);
      if (waiter) {
        terminalWaiters.current.delete(job.id);
        waiter();
      }
    }
  }, [jobs]);

  // Stamp completion time so the Downloads page can estimate queued work.
  useEffect(() => {
    let changed = false;
    const next = jobs.map((j) => {
      if (isTerminal(j.progress.status) && !j.completedAt) {
        changed = true;
        return { ...j, completedAt: new Date().toISOString() };
      }
      return j;
    });
    if (changed) setJobs(next);
  }, [jobs]);

  const waitTerminal = useCallback((id: string): Promise<void> => {
    const current = findJob(id);
    if (current && isTerminal(current.progress.status)) return Promise.resolve();
    return new Promise((resolve) => {
      terminalWaiters.current.set(id, resolve);
    });
  }, [findJob]);

  // -------------------------------------------------------------------------
  // Upload half of an import. Runs when uploadImports is on (automatic) or the
  // user asks for it per-song (manual) — never otherwise.
  // -------------------------------------------------------------------------
  const runUpload = useCallback(
    async (id: string) => {
      const job = findJob(id);
      if (!job?.result) throw new Error('Nothing to upload');
      const result = job.result;
      const progressFor = () =>
        jobsRef.current.find((j) => j.id === id)?.progress ?? {
          status: 'processing' as const,
          percent: 50,
          speed: '',
          eta: '',
          detail: '',
        };

      const audioBytes = await readFileBytes(result.audioPath);
      patchByRustId(result.id, {
        progress: { ...progressFor(), status: 'uploading', percent: 55, detail: 'Uploading audio…' },
      });
      const audio = await client.uploadAudio(toBytes(audioBytes), result.audioCodec);

      let artwork: { storageKey: string } | null = null;
      if (result.thumbnailPath) {
        patchByRustId(result.id, {
          progress: { ...progressFor(), status: 'uploading', percent: 70, detail: 'Uploading artwork…' },
        });
        const art = await readFileBytes(result.thumbnailPath);
        artwork = await client.uploadArtwork(toBytes(art));
      }

      let lyrics: { storageKey: string } | null = null;
      if (result.subtitlePaths.length > 0) {
        patchByRustId(result.id, {
          progress: { ...progressFor(), status: 'uploading', percent: 85, detail: 'Uploading lyrics…' },
        });
        const vtt = await readFileBytes(result.subtitlePaths[0]);
        const normalized = parseVttToLyrics(new TextDecoder().decode(toBytes(vtt)));
        lyrics = await client.uploadLyrics(normalized);
      }

      patchByRustId(result.id, {
        progress: { ...progressFor(), status: 'uploading', percent: 95, detail: 'Saving metadata…' },
      });
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

      // The staged file is now redundant — the cloud library owns the copy.
      await deleteFiles([
        result.audioPath,
        ...(result.thumbnailPath ? [result.thumbnailPath] : []),
        ...result.subtitlePaths,
      ]);

      if (result.videoId) {
        stampSavedItemImported(result.videoId, res.song.id);
      }
      patchJob(id, { uploaded: true, uploadedSongId: res.song.id });
      return res;
    },
    [findJob, patchByRustId, patchJob],
  );

  const completeImport = useCallback(
    async (job: DownloadJob, result: MusicImportResult) => {
      const notify = getSettings().notifyOnComplete;
      try {
        if (getSettings().uploadImports) {
          await runUpload(job.id);
          patchByRustId(result.id, {
            title: result.title,
            progress: {
              status: 'completed',
              percent: 100,
              speed: '',
              eta: '',
              detail: 'Added to cloud library',
            },
          });
          if (notify) {
            toast.success('Added to library', { description: result.title });
          }
        } else {
          patchByRustId(result.id, {
            title: result.title,
            progress: {
              status: 'completed',
              percent: 100,
              speed: '',
              eta: '',
              detail: 'Ready — saved locally (upload anytime)',
            },
          });
          if (result.videoId) {
            stampSavedItemLocalFile(result.videoId, result.audioPath, result.thumbnailPath);
          }
          if (notify) {
            toast.success('Import finished', { description: result.title });
          }
        }
      } catch (e) {
        // The download itself succeeded — only the upload half failed, so keep
        // the local file playable and surface the problem without losing work.
        patchByRustId(result.id, {
          title: result.title,
          progress: {
            status: 'completed',
            percent: 100,
            speed: '',
            eta: '',
            detail: e instanceof Error ? `Downloaded — upload failed: ${e.message}` : 'Downloaded — upload failed',
          },
        });
        if (result.videoId) {
          stampSavedItemLocalFile(result.videoId, result.audioPath, result.thumbnailPath);
        }
        toast.error('Upload failed', { description: `${result.title} is saved locally — you can upload it manually.` });
      }
    },
    [patchByRustId, runUpload],
  );

  // -------------------------------------------------------------------------
  // Sequential per-song import queue.
  // -------------------------------------------------------------------------
  const pump = useCallback(async () => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        // Only one import runs at a time (yt-dlp is CPU-heavy).
        const active = jobsRef.current.some(
          (j) => j.kind === 'import' && !isTerminal(j.progress.status),
        );
        if (active) return;

        const item = queueRef.current[0];
        const existing = findJob(item.id);
        if (existing && isTerminal(existing.progress.status)) {
          queueRef.current.shift();
          continue;
        }

        // Make sure the row is visible *before* work starts.
        upsert({
          id: item.id,
          kind: 'import',
          title: item.title || 'Importing video…',
          url: item.url,
          videoId: item.videoId ?? null,
          batchId: item.batchId ?? null,
          batchTitle: item.batchTitle ?? null,
          progress: {
            status: 'queued',
            percent: 0,
            speed: '',
            eta: '',
            detail: 'Waiting for its turn…',
          },
          createdAt: new Date().toISOString(),
        });

        const settings = getSettings();
        let rustId: string;
        try {
          rustId = await startMusicImport(item.url, {
            bitrate: settings.importBitrate,
            transcode: settings.importTranscode,
          });
        } catch (e) {
          patchJob(item.id, {
            progress: {
              status: 'failed',
              percent: 0,
              speed: '',
              eta: '',
              detail: e instanceof Error ? e.message : 'Could not start import',
            },
          });
          queueRef.current.shift();
          continue;
        }

        // Bind the Rust task id so progress/result events find this row.
        setJobs((prev) =>
          prev.map((j) =>
            j.id === item.id
              ? {
                  ...j,
                  rustId,
                  progress: {
                    status: 'preparing',
                    percent: 0,
                    speed: '',
                    eta: '',
                    detail: 'Fetching video info…',
                  },
                }
              : j,
          ),
        );
        await waitTerminal(item.id);
        if (queueRef.current[0]?.id === item.id) queueRef.current.shift();
      }
    } finally {
      pumpingRef.current = false;
    }
  }, [findJob, patchJob, upsert, waitTerminal]);

  const enqueue = useCallback(
    (items: QueueItem[]) => {
      queueRef.current = [...queueRef.current, ...items];
      void pump();
    },
    [pump],
  );

  // Tauri events
  useEffect(() => {
    let un: Array<() => void> = [];

    void onDownloadProgress((rustId, progress) => {
      const job = findByRustId(rustId);
      if (!job) return;
      if (progress.status === 'completed') {
        patchJob(job.id, { progress });
        if (getSettings().notifyOnComplete && job.kind === 'download') {
          toast.success('Download finished', { description: job.title });
        }
      } else if (progress.status === 'failed') {
        patchJob(job.id, { progress });
        toast.error('Download failed', {
          description: progress.detail || job.title,
        });
      } else if (progress.status === 'cancelled') {
        patchJob(job.id, { progress });
      } else {
        patchJob(job.id, { progress });
      }
    }).then((fn) => un.push(fn));

    void onMusicImportDone((rustId, result) => {
      const job = findByRustId(rustId);
      if (!job) return;
      void completeImport(job, result).finally(() => {
        // Reflect the final payload (title/stamp) into the row.
        patchJob(job.id, { result });
      });
    }).then((fn) => un.push(fn));

    return () => un.forEach((fn) => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeImport]);

  const analyze = useCallback(async (url: string) => {
    if (!isYouTubeUrl(url)) throw new Error('Enter a valid YouTube URL');
    return getVideoInfo(url);
  }, []);

  const start = useCallback(
    async (url: string, type: DownloadType) => {
      const id = await startDownload(url, type);
      upsert({
        id,
        rustId: id,
        kind: 'download',
        title: url,
        url,
        progress: { percent: 0, speed: '', eta: '', status: 'starting', detail: 'Starting…' },
        createdAt: new Date().toISOString(),
      });
    },
    [upsert],
  );

  const importToLibrary = useCallback(
    (url: string) => {
      if (!isYouTubeUrl(url)) throw new Error('Enter a valid YouTube URL');
      enqueue([
        {
          id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          title: 'Importing video…',
        },
      ]);
    },
    [enqueue],
  );

  const importPlaylistToLibrary = useCallback(
    async (url: string): Promise<string> => {
      if (!isYouTubeUrl(url)) throw new Error('Enter a valid YouTube URL');
      const info = await getPlaylistItems(url);
      const batchId = `batch-${Date.now().toString(36)}`;
      const batchTitle = info.title || 'Playlist import';
      const items: QueueItem[] = info.items.map((item: PlaylistItem) => ({
        id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        url: item.url,
        title: item.title || 'Untitled video',
        videoId: item.videoId,
        batchId,
        batchTitle,
      }));
      enqueue(items);
      return batchId;
    },
    [enqueue],
  );

  const cancel = useCallback(
    async (id: string) => {
      const job = findJob(id);
      if (!job) return;

      if (job.kind === 'download') {
        if (job.rustId) await cancelDownload(job.rustId);
        return;
      }

      if (job.progress.status === 'queued') {
        // Never started — drop it and let the queue move on.
        queueRef.current = queueRef.current.filter((q) => q.id !== id);
        patchJob(id, {
          progress: { percent: 0, speed: '', eta: '', status: 'cancelled', detail: 'Cancelled' },
        });
        void pump();
        return;
      }
      if (job.rustId) {
        await cancelMusicImport(job.rustId);
      }
    },
    [findJob, patchJob, pump],
  );

  const uploadToLibrary = useCallback(
    async (jobId: string) => {
      const job = findJob(jobId);
      if (!job || job.uploaded) return;
      await runUpload(jobId);
      patchJob(jobId, {
        progress: {
          status: 'completed',
          percent: 100,
          speed: '',
          eta: '',
          detail: 'Added to cloud library',
        },
      });
      if (getSettings().notifyOnComplete) {
        toast.success('Added to library', { description: job.title });
      }
    },
    [findJob, patchJob, runUpload],
  );

  const removeJob = useCallback(
    (id: string) => {
      const job = findJob(id);
      if (!job) return;
      // Local files are kept on disk (the saved-item list may still play them);
      // use "Upload to library" first if you want them in the cloud.
      remove(id);
    },
    [findJob, remove],
  );

  const clearFinished = useCallback(() => {
    setJobs((prev) =>
      prev.filter((j) => !isTerminal(j.progress.status) || j.progress.status === 'queued'),
    );
  }, []);

  const value = useMemo(
    () => ({
      jobs,
      analyze,
      startDownload: start,
      importToLibrary,
      importPlaylistToLibrary,
      uploadToLibrary,
      cancel,
      removeJob,
      clearFinished,
    }),
    [jobs, analyze, start, importToLibrary, importPlaylistToLibrary, uploadToLibrary, cancel, removeJob, clearFinished],
  );

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
}

export function useDownloads(): DownloadContextValue {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownloads must be used within DownloadProvider');
  return ctx;
}

export { isTerminal, localImportSong };
