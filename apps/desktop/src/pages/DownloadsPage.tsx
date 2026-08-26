import { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  Music4,
  Play,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import type { DownloadStatus } from '@flowbyte/types';
import type { DownloadJob } from '../context/DownloadContext';
import { useDownloads } from '../context/DownloadContext';
import { usePlayer } from '../context/PlayerContext';
import { client } from '../lib/api';
import { formatDuration, formatBytes } from '../lib/utils';
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
  if (status === 'starting' || status === 'preparing') return -1;
  if (stage) {
    const i = IMPORT_STAGES.findIndex((s) => s.key === stage);
    if (i >= 0) return i;
  }
  if (status === 'downloading') return 0;
  if (status === 'processing') return 1;
  if (status === 'uploading') return 4;
  return -1;
}

function statusIcon(status: DownloadStatus, stage?: string) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-5 w-5 text-success" />;
  }
  if (status === 'failed' || status === 'cancelled') {
    return <XCircle className="h-5 w-5 text-danger" />;
  }
  if (status === 'starting' || status === 'preparing') {
    return <Loader2 className="h-5 w-5 animate-spin text-warning" />;
  }
  if (status === 'uploading') {
    return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
  }
  // downloading / processing
  return <Download className="h-5 w-5 text-accent" />;
}

function statusLabel(status: DownloadStatus): string {
  switch (status) {
    case 'starting': return 'Starting…';
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
    case 'preparing':
    case 'starting': return 'warning';
    default: return 'default';
  }
}

// ---------------------------------------------------------------------------
// DownloadsPage
// ---------------------------------------------------------------------------

export function DownloadsPage() {
  const { jobs, cancel, clearFinished } = useDownloads();
  const { playSong } = usePlayer();
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visibleJobs = jobs.filter((j) => !removed.has(j.id));
  const active = visibleJobs.filter((j) => !['completed', 'failed', 'cancelled'].includes(j.progress.status));
  const finished = visibleJobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.progress.status));

  const playImported = async (job: DownloadJob) => {
    if (!job.result) return;
    const res = await client.search({ query: job.result.title });
    if (res.songs.length > 0) {
      playSong(res.songs[0]);
    }
  };

  const removeJob = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
  };

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-1">Downloads</h1>
          <p className="mt-1 text-sm text-ink-2">
            {active.length > 0
              ? `${active.length} active — progress streams from yt-dlp`
              : finished.length > 0
                ? `${finished.length} completed`
                : 'Nothing running right now'}
          </p>
        </div>
        {finished.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFinished}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear finished
          </Button>
        )}
      </div>

      {/* Empty state */}
      {visibleJobs.length === 0 && (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          description="Paste a YouTube link in Add Music to start downloading."
        />
      )}

      {/* Active jobs */}
      {active.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">Active</p>
          {active.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onCancel={() => void cancel(job.id)}
              onPlayImported={() => void playImported(job)}
            />
          ))}
        </div>
      )}

      {/* Finished jobs */}
      {finished.length > 0 && (
        <div className="mt-8 space-y-3">
          {active.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-3">Finished</p>
          )}
          {finished.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onRemove={() => removeJob(job.id)}
              onPlayImported={() => void playImported(job)}
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
  onRemove,
  onPlayImported,
}: {
  job: DownloadJob;
  onCancel?: () => void;
  onRemove?: () => void;
  onPlayImported?: () => void;
}) {
  const p = job.progress;
  const done = p.status === 'completed';
  const failed = p.status === 'failed' || p.status === 'cancelled';
  const running = !done && !failed;
  const isImport = job.kind === 'import';
  const stageIdx = isImport ? getStageIndex(p.status, p.stage) : -1;

  return (
    <div className="group rounded-lg border border-line bg-card p-4 transition-colors duration-150 hover:bg-elevated">
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app">
          {statusIcon(p.status, p.stage)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {/* Title + badges */}
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-ink-1">{job.title}</p>
            <Badge variant={statusVariant(p.status)} className="shrink-0">
              {statusLabel(p.status)}
            </Badge>
          </div>

          {/* Detail text */}
          <p className="mt-0.5 truncate text-xs text-ink-2">
            {p.detail || (running ? 'Waiting…' : '')}
          </p>

          {/* Progress bar + stats */}
          {running && (
            <div className="mt-2.5 flex items-center gap-3">
              <Progress value={p.percent} className="flex-1" />
              <span className="w-10 text-right text-xs tabular-nums text-ink-2">
                {Math.round(p.percent)}%
              </span>
              {p.speed && (
                <span className="text-xs tabular-nums text-ink-3">{p.speed}</span>
              )}
              {p.eta && (
                <span className="text-xs tabular-nums text-ink-3">ETA {p.eta}</span>
              )}
            </div>
          )}

          {/* Import pipeline stages */}
          {isImport && stageIdx >= 0 && (
            <div className="mt-3 flex items-center gap-1">
              {IMPORT_STAGES.map((stage, i) => {
                const isComplete = stageIdx > i || done;
                const isCurrent = stageIdx === i && running;
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
                      <div
                        className={`h-px w-3 ${
                          isComplete ? 'bg-accent/30' : 'bg-line'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed import: play button */}
          {done && isImport && onPlayImported && (
            <div className="mt-2.5">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={onPlayImported}>
                <Play className="h-3.5 w-3.5" />
                Play from library
              </Button>
            </div>
          )}

          {/* Failed: error detail */}
          {failed && p.detail && (
            <p className="mt-1 text-xs text-danger">{p.detail}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {running && onCancel && (
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
          {failed && onPlayImported && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-ink-3 hover:text-ink-1"
              onClick={onPlayImported}
              aria-label="Retry"
              title="Retry import"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          {(done || failed) && onRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-ink-3 hover:text-danger opacity-0 group-hover:opacity-100"
              onClick={onRemove}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
