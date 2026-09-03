import { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  CloudUpload,
  Download,
  ListMusic,
  ListRestart,
  Loader2,
  Play,
  Trash2,
  Upload,
  X,
  XCircle,
} from '../lib/icons';
import type { DownloadStatus } from '@flowbyte/types';
import { getSettings, localImportSong, saveSettings } from '../lib/api';
import type { DownloadJob } from '../context/DownloadContext';
import { useDownloads } from '../context/DownloadContext';
import { usePlayer } from '../context/PlayerContext';
import { client } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/feedback';
import { Progress } from '../components/ui/progress';

// ---------------------------------------------------------------------------
// Pipeline stages for imports
// ---------------------------------------------------------------------------

const IMPORT_STAGES: Array<{ key: string; label: string }> = [
  { key: 'download', label: 'Download' },
  { key: 'transcode', label: 'Audio' },
  { key: 'artwork', label: 'Artwork' },
  { key: 'lyrics', label: 'Lyrics' },
  { key: 'upload', label: 'Upload' },
];

function getStageIndex(status: DownloadStatus, stage?: string): number {
  if (status === 'completed') return IMPORT_STAGES.length;
  if (status === 'failed' || status === 'cancelled') return -1;
  if (status === 'queued' || status === 'starting' || status === 'preparing') return -1;
  if (stage) {
    const i = IMPORT_STAGES.findIndex((s) => s.key === stage);
    if (i >= 0) return i;
  }
  if (status === 'downloading') return 0;
  if (status === 'processing') return 1;
  if (status === 'uploading') return 4;
  return -1;
}

function isActive(status: DownloadStatus): boolean {
  return !['completed', 'failed', 'cancelled'].includes(status);
}

function statusIcon(status: DownloadStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-5 w-5 text-danger" />;
    case 'queued':
      return <Clock className="h-5 w-5 text-ink-3" />;
    case 'starting':
    case 'preparing':
      return <Loader2 className="h-5 w-5 animate-spin text-warning" />;
    case 'uploading':
      return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
    default:
      return <Download className="h-5 w-5 text-accent" />;
  }
}

function statusLabel(status: DownloadStatus): string {
  switch (status) {
    case 'starting': return 'Starting…';
    case 'queued': return 'Queued';
    case 'preparing': return 'Preparing…';
    case 'downloading': return 'Downloading';
    case 'processing': return 'Processing';
    case 'uploading': return 'Uploading';
    case 'completed': return 'Complete';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

function statusVariant(status: DownloadStatus): 'accent' | 'success' | 'warning' | 'danger' | 'default' {
  switch (status) {
    case 'completed': return 'success';
    case 'failed':
    case 'cancelled': return 'danger';
    case 'downloading':
    case 'uploading':
    case 'processing': return 'accent';
    case 'queued':
    case 'preparing':
    case 'starting': return 'warning';
    default: return 'default';
  }
}

// ---------------------------------------------------------------------------
// ETA helpers — yt-dlp reports "MM:SS" / "H:MM:SS", sometimes plain seconds.
// ---------------------------------------------------------------------------

function parseEtaSeconds(eta: string | undefined): number | null {
  if (!eta) return null;
  const t = eta.trim();
  if (!t || t === 'NA' || t === '-') return null;
  const cols = t.split(':');
  if (cols.length > 1 && cols.every((c) => /^\d+$/.test(c))) {
    return cols.reduce((acc, c) => acc * 60 + Number(c), 0);
  }
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatEta(secs: number): string {
  const total = Math.round(secs);
  if (!Number.isFinite(total) || total < 0) return '';
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function estimateRemainingSecs(
  run: DownloadJob | null,
  queuedCount: number,
  avgItemMs: number | null,
): number | null {
  const avgSecs = avgItemMs ? avgItemMs / 1000 : null;
  const fallback = avgSecs ?? 45;
  if (run) {
    if (run.progress.status === 'downloading') {
      const eta = parseEtaSeconds(run.progress.eta);
      if (eta != null) return eta + queuedCount * fallback;
      const remain = ((100 - Math.min(100, Math.max(0, run.progress.percent))) / 100) * fallback;
      return remain + queuedCount * fallback;
    }
    // preparing / processing / uploading — treat each as a partial average item
    const frac = run.progress.percent;
    const one = frac > 0 && frac < 100 ? (1 - frac / 100) * fallback : fallback / 2;
    return one + queuedCount * fallback;
  }
  if (queuedCount > 0 && avgSecs) return queuedCount * avgSecs;
  return null;
}

interface BatchView {
  batchId: string;
  title: string;
  total: number;
  done: number;
  percent: number;
  etaSecs: number | null;
  nextTitle: string | null;
  minAt: number;
  members: DownloadJob[];
}

export function DownloadsPage() {
  const {
    jobs,
    cancel,
    clearFinished,
    removeJob,
    importToLibrary,
    uploadToLibrary,
  } = useDownloads();
  const { playSong } = usePlayer();
  const [uploadOn, setUploadOn] = useState(getSettings().uploadImports);
  const [busy, setBusy] = useState<string | null>(null);

  const running = jobs.filter((j) => isActive(j.progress.status) && j.progress.status !== 'queued');
  const queued = jobs.filter((j) => j.progress.status === 'queued');
  const finished = jobs.filter((j) => !isActive(j.progress.status));

  // Average wall-clock time of one finished item — used to estimate queued work.
  const avgItemMs = useMemo(() => {
    const spans: number[] = [];
    for (const j of jobs) {
      if (j.progress.status !== 'completed' || !j.completedAt) continue;
      const start = Date.parse(j.createdAt);
      const end = Date.parse(j.completedAt);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      const d = end - start;
      if (d > 1500 && d < 2 * 60 * 60 * 1000) spans.push(d);
    }
    if (spans.length === 0) return null;
    return spans.reduce((a, b) => a + b, 0) / spans.length;
  }, [jobs]);

  // Group active playlist imports into batch views with cumulative progress.
  const batches = useMemo<BatchView[]>(() => {
    const activeBatchIds = new Set<string>();
    for (const j of jobs) {
      if (j.batchId && isActive(j.progress.status)) activeBatchIds.add(j.batchId);
    }
    const views: BatchView[] = [];
    for (const batchId of activeBatchIds) {
      const members = jobs.filter((j) => j.batchId === batchId);
      const ordered = [...members].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      const total = members.length;
      if (total === 0) continue;
      const done = members.filter((j) => j.progress.status === 'completed').length;
      const run = members.find((j) => j.progress.status !== 'queued' && isActive(j.progress.status)) ?? null;
      const queuedMembers = members.filter((j) => j.progress.status === 'queued');
      const percent = Math.min(100, ((done + (run ? (run.progress.percent || 0) / 100 : 0)) / total) * 100);
      const next = queuedMembers[0] ?? run;
      views.push({
        batchId,
        title: ordered[0]?.batchTitle || 'Playlist import',
        total,
        done,
        percent,
        etaSecs: estimateRemainingSecs(run, queuedMembers.length, avgItemMs),
        nextTitle: next?.title ?? null,
        minAt: Date.parse(ordered[0]?.createdAt ?? '') || 0,
        members: [...queuedMembers, ...(run ? [run] : [])],
      });
    }
    views.sort((a, b) => a.minAt - b.minAt);
    return views;
  }, [jobs, avgItemMs]);

  // Solo (non-batch) active imports — single "Import" clicks.
  const soloActiveImports = [...running, ...queued].filter((j) => j.kind === 'import' && !j.batchId);
  const soloRun = soloActiveImports.find((j) => j.progress.status !== 'queued') ?? null;
  const soloQueued = soloActiveImports.filter((j) => j.progress.status === 'queued').length;

  const importTotal = batches.reduce((n, b) => n + b.total, 0) + soloActiveImports.length;
  const importOverallPercent = useMemo(() => {
    if (importTotal === 0) return 0;
    const fracWeight =
      batches.reduce((n, b) => n + (b.percent / 100) * b.total, 0) +
      (soloRun ? (soloRun.progress.percent || 0) / 100 : 0);
    return Math.min(100, (fracWeight / importTotal) * 100);
  }, [batches, soloRun, importTotal]);

  const queueEtaSecs = useMemo(() => {
    const fromBatches = batches.reduce<number>((acc, b) => acc + (b.etaSecs ?? 0), 0);
    const solo = estimateRemainingSecs(soloRun, soloQueued, avgItemMs);
    const total = fromBatches + (solo ?? 0);
    return total > 0 ? total : null;
  }, [batches, soloRun, soloQueued, avgItemMs]);

  const liveSpeed = running.map((j) => j.progress.speed).find((s) => !!s);

  // Flat active jobs that are not rendered under a batch header.
  const ungroupedActive = [...queued, ...running].filter((j) => !j.batchId);

  const toggleUpload = (next: boolean) => {
    setUploadOn(next);
    saveSettings({ uploadImports: next });
  };

  const playLocal = async (job: DownloadJob) => {
    if (!job.result?.audioPath) return;
    playSong(
      localImportSong({
        id: `local:${job.id}`,
        title: job.result.title,
        artistName: job.result.artist,
        duration: job.result.duration,
        year: job.result.year ?? null,
        sourceUrl: job.result.sourceUrl,
        sourceId: job.result.videoId,
        filePath: job.result.audioPath,
        artworkPath: job.result.thumbnailPath,
      }),
    );
  };

  const playFromLibrary = async (job: DownloadJob) => {
    if (!job.uploadedSongId) return;
    try {
      const song = await client.getSong(job.uploadedSongId);
      playSong(song);
    } catch {
      /* song may have been removed from the library — fall back to local file */
      await playLocal(job);
    }
  };

  const uploadJob = async (job: DownloadJob) => {
    setBusy(job.id);
    try {
      await uploadToLibrary(job.id);
    } finally {
      setBusy(null);
    }
  };

  const retry = (job: DownloadJob) => {
    removeJob(job.id);
    if (job.url) importToLibrary(job.url);
  };

  const anything = jobs.length > 0;
  const hasQueue = running.length > 0 || queued.length > 0;

  return (
    <div className="w-full px-10 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-1">Downloads & Tasks</h1>
          <p className="mt-1 text-sm text-ink-2">
            {running.length > 0
              ? `${running.length} running` +
                (queued.length > 0 ? ` · ${queued.length} queued` : '')
              : queued.length > 0
                ? `${queued.length} queued`
                : finished.length > 0
                  ? `${finished.length} finished`
                  : 'Nothing running right now'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-md border border-line bg-card px-3 py-1.5 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={uploadOn}
              onChange={(e) => toggleUpload(e.target.checked)}
              className="h-3.5 w-3.5"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <CloudUpload className="h-3.5 w-3.5" />
            Upload imports to cloud library
          </label>
          {queued.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queued.forEach((j) => void cancel(j.id))}
            >
              <X className="h-3.5 w-3.5" />
              Cancel queued ({queued.length})
            </Button>
          )}
          {finished.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFinished}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear finished
            </Button>
          )}
        </div>
      </div>

      {!anything && (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          description="Imports run one song at a time and stay listed here so you can replay or upload them later."
        />
      )}

      {/* Queue summary strip */}
      {hasQueue && (
        <div className="mt-6 rounded-lg border border-line bg-card p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-ink-1">Queue</span>
            </div>
            <Badge variant={running.length > 0 ? 'accent' : 'default'}>
              {running.length} running
            </Badge>
            {queued.length > 0 && <Badge variant="warning">{queued.length} queued</Badge>}
            {importOverallPercent > 0 && (
              <span className="text-xs tabular-nums text-ink-2">
                {Math.round(importOverallPercent)}% overall
              </span>
            )}
            {queueEtaSecs != null && (
              <span className="text-xs tabular-nums text-ink-2">
                ≈ {formatEta(queueEtaSecs)} left
              </span>
            )}
            {liveSpeed && (
              <span className="text-xs tabular-nums text-ink-3">at {liveSpeed}</span>
            )}
            {soloRun && soloRun.title && (
              <span className="min-w-0 max-w-56 truncate text-xs text-ink-3">
                Now: {soloRun.title}
              </span>
            )}
          </div>
          {importOverallPercent > 0 && (
            <Progress value={importOverallPercent} className="mt-2 h-1.5" />
          )}
        </div>
      )}

      {/* Active jobs */}
      {hasQueue && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">
            Active · {running.length + queued.length}
          </p>

          {/* Playlist batches — header shows cumulative progress for the whole import */}
          {batches.map((b) => (
            <div key={b.batchId} className="space-y-2.5">
              <div className="rounded-lg border border-line bg-app px-4 py-3">
                <div className="flex items-center gap-3">
                  <ListMusic className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-ink-1">{b.title}</p>
                      <p className="shrink-0 text-xs tabular-nums text-ink-2">
                        {b.done} of {b.total} · {Math.round(b.percent)}%
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-2">
                      {b.nextTitle
                        ? `Next: ${b.nextTitle}`
                        : b.done === b.total
                          ? 'Finishing up…'
                          : ''}
                      {b.etaSecs != null && (
                        <span className="ml-2 text-ink-3">≈ {formatEta(b.etaSecs)} left</span>
                      )}
                    </p>
                    <Progress value={b.percent} className="mt-2 h-1.5" />
                  </div>
                </div>
              </div>

              {b.members.map((job) => (
                <JobCard key={job.id} job={job} onCancel={() => void cancel(job.id)} />
              ))}
            </div>
          ))}

          {/* Everything else running (single imports, plain downloads) */}
          {ungroupedActive.map((job) => (
            <JobCard key={job.id} job={job} onCancel={() => void cancel(job.id)} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">
            Finished · {finished.length}
          </p>
          {finished.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPlay={() =>
                job.uploadedSongId
                  ? void playFromLibrary(job)
                  : void playLocal(job)
              }
              onUpload={() => void uploadJob(job)}
              uploading={busy === job.id}
              onRetry={() => retry(job)}
              onRemove={() => removeJob(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JobCard
// ---------------------------------------------------------------------------

function JobCard({
  job,
  onCancel,
  onPlay,
  onUpload,
  uploading,
  onRetry,
  onRemove,
}: {
  job: DownloadJob;
  onCancel?: () => void;
  onPlay?: () => void;
  onUpload?: () => void;
  uploading?: boolean;
  onRetry?: () => void;
  onRemove?: () => void;
}) {
  const p = job.progress;
  const done = p.status === 'completed';
  const failed = p.status === 'failed' || p.status === 'cancelled';
  const active = isActive(p.status);
  const isImport = job.kind === 'import';
  const stageIdx = isImport ? getStageIndex(p.status, p.stage) : -1;
  const playableImport = done && isImport && !!job.result?.audioPath;

  return (
    <div className="group rounded-lg border border-line bg-card p-4 transition-colors duration-150 hover:bg-elevated">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app">
          {statusIcon(p.status)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-ink-1">{job.title}</p>
            <Badge variant={statusVariant(p.status)} className="shrink-0">
              {statusLabel(p.status)}
            </Badge>
            {job.uploaded && done && isImport && (
              <Badge variant="success" className="shrink-0">
                In library
              </Badge>
            )}
          </div>

          <p className="mt-0.5 truncate text-xs text-ink-2">
            {p.detail || (active ? 'Waiting…' : '')}
          </p>

          {active && (
            <div className="mt-2.5 flex items-center gap-3">
              <Progress value={p.percent} className="flex-1" />
              <span className="w-10 text-right text-xs tabular-nums text-ink-2">
                {Math.round(p.percent)}%
              </span>
              {p.speed && (
                <span className="text-xs tabular-nums text-ink-3">{p.speed}</span>
              )}
            </div>
          )}

          {isImport && stageIdx >= 0 && (
            <div className="mt-3 flex items-center gap-1">
              {IMPORT_STAGES.map((stage, i) => {
                const isComplete = stageIdx > i || done;
                const isCurrent = stageIdx === i && active;
                return (
                  <div key={stage.key} className="flex items-center gap-1">
                    <div
                      className={`flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium transition-colors duration-200 ${
                        isComplete
                          ? 'bg-accent/15 text-accent'
                          : isCurrent
                            ? 'bg-warning/15 text-warning'
                            : 'bg-app text-ink-3'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : isCurrent ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      {stage.label}
                    </div>
                    {i < IMPORT_STAGES.length - 1 && (
                      <div className={`h-px w-3 ${isComplete ? 'bg-accent/30' : 'bg-line'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {playableImport && (
            <div className="mt-2.5 flex items-center gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={onPlay}>
                <Play className="h-3.5 w-3.5" />
                {job.uploaded ? 'Play from library' : 'Play'}
              </Button>
              {!job.uploaded && onUpload && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={onUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  Upload to library
                </Button>
              )}
            </div>
          )}

          {failed && p.detail && (
            <p className="mt-1 text-xs text-danger">{p.detail}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {active && onCancel && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-ink-3 hover:text-danger"
              onClick={onCancel}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {failed && isImport && onRetry && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-ink-3 hover:text-ink-1"
              onClick={onRetry}
              aria-label="Retry import"
              title="Retry import"
            >
              <ListRestart className="h-4 w-4" />
            </Button>
          )}
          {(done || failed) && onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-ink-3 hover:text-danger opacity-0 group-hover:opacity-100"
              onClick={onRemove}
              aria-label="Remove from list"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
