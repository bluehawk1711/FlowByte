import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Music4, Play, Trash2, XCircle } from 'lucide-react';
import type { DownloadJob } from '../context/DownloadContext';
import { useDownloads } from '../context/DownloadContext';
import { usePlayer } from '../context/PlayerContext';
import { client } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Progress } from '../components/ui/progress';

function statusVariant(status: string): 'blue' | 'green' | 'yellow' | 'red' | 'default' {
  switch (status) {
    case 'completed':
      return 'green';
    case 'failed':
    case 'cancelled':
      return 'red';
    case 'downloading':
    case 'uploading':
    case 'processing':
      return 'blue';
    case 'preparing':
    case 'starting':
      return 'yellow';
    default:
      return 'default';
  }
}

export function DownloadsPage() {
  const { jobs, cancel, clearFinished } = useDownloads();
  const { playSong } = usePlayer();

  const active = jobs.filter((j) => !['completed', 'failed', 'cancelled'].includes(j.progress.status));
  const finished = jobs.filter((j) => ['completed', 'failed', 'cancelled'].includes(j.progress.status));

  const playImported = async (job: DownloadJob) => {
    if (!job.result) return;
    const res = await client.search({ query: job.result.title });
    if (res.songs.length > 0) {
      playSong(res.songs[0]);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Downloads & imports</h1>
          <p className="text-sm text-zinc-400">
            {active.length > 0
              ? `${active.length} running — progress streams from yt-dlp`
              : 'Nothing running right now'}
          </p>
        </div>
        {finished.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFinished}>
            Clear finished
          </Button>
        )}
      </div>

      {jobs.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-zinc-500">
            No downloads yet — paste a YouTube link on the Home tab.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onCancel={() => void cancel(job.id)}
            onPlayImported={() => void playImported(job)}
          />
        ))}
      </div>
    </div>
  );
}

function JobCard({
  job,
  onCancel,
  onPlayImported,
}: {
  job: DownloadJob;
  onCancel: () => void;
  onPlayImported: () => void;
}) {
  const p = job.progress;
  const done = p.status === 'completed';
  const failed = p.status === 'failed' || p.status === 'cancelled';

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-800">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : failed ? (
            <XCircle className="h-5 w-5 text-red-400" />
          ) : p.status === 'preparing' ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          ) : (
            <Music4 className="h-5 w-5 text-blue-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{job.title}</p>
            <Badge variant={statusVariant(p.status)} className="shrink-0">
              {p.status}
            </Badge>
            {job.kind === 'import' && p.stage && (
              <Badge variant="blue" className="shrink-0">
                {p.stage}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-400">{p.detail || 'Waiting…'}</p>
          {!done && !failed && (
            <div className="mt-2 flex items-center gap-3">
              <Progress value={p.percent} className="flex-1" />
              <span className="w-10 text-right text-xs tabular-nums text-zinc-400">
                {Math.round(p.percent)}%
              </span>
              {p.speed && <span className="text-xs tabular-nums text-zinc-500">{p.speed}</span>}
              {p.eta && <span className="text-xs tabular-nums text-zinc-500">ETA {p.eta}</span>}
            </div>
          )}
          {done && job.kind === 'import' && (
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={onPlayImported}>
                <Play className="h-3.5 w-3.5" />
                Play from library
              </Button>
            </div>
          )}
        </div>

        {!done && !failed && (
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
            <Trash2 className="h-4 w-4 text-zinc-400" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}