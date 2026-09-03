import { useEffect, useState } from 'react';
import { Music2, Pause, Play, SkipBack, SkipForward, X } from '../../lib/icons';
import { emit } from '@tauri-apps/api/event';
import { formatDuration } from '../../lib/utils';
import { hideMiniPlayer, onMiniPlayerState, type MiniPlayerState } from '../../lib/tauri';

export function MiniPlayer() {
  const [state, setState] = useState<MiniPlayerState>({
    song: null,
    playing: false,
    position: 0,
    duration: 0,
  });

  useEffect(() => {
    let un: (() => void) | undefined;
    void onMiniPlayerState(setState).then((fn) => {
      un = fn;
    });
    return () => un?.();
  }, []);

  const song = state.song;
  const pct = state.duration > 0 ? (state.position / state.duration) * 100 : 0;

  const command = (payload: unknown) => void emit('mini-player-command', payload);

  const close = () => {
    command({ action: 'close' });
    void hideMiniPlayer();
  };

  return (
    <div
      data-tauri-drag-region
      className="relative flex h-full w-full items-center gap-3 overflow-hidden rounded-xl border border-line-strong bg-player/95 px-3 text-ink-1"
    >
      {/* progress line */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-accent"
        style={{ width: `${pct}%` }}
      />

      {song ? (
        <>
          {song.artworkUrl || song.cover ? (
            <img
              src={song.artworkUrl ?? song.cover}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-card">
              <Music2 className="h-6 w-6 text-ink-3" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{song.title}</p>
            <p className="truncate text-xs text-ink-2">{song.artistName ?? 'Unknown artist'}</p>
            <p className="mt-0.5 text-[10px] tabular-nums text-ink-3">
              {formatDuration(state.position)} / {formatDuration(state.duration)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="rounded p-1.5 text-ink-2 hover:bg-card hover:text-ink-1"
              onClick={() => command({ action: 'previous' })}
              aria-label="Previous"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              className="rounded-full bg-accent p-2 text-accent-fg hover:bg-accent-hover"
              onClick={() => command({ action: 'play-pause' })}
              aria-label={state.playing ? 'Pause' : 'Play'}
            >
              {state.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
            </button>
            <button
              className="rounded p-1.5 text-ink-2 hover:bg-card hover:text-ink-1"
              onClick={() => command({ action: 'next' })}
              aria-label="Next"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              className="rounded p-1.5 text-ink-3 hover:bg-card hover:text-ink-1"
              onClick={close}
              aria-label="Close mini player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex w-full items-center justify-center gap-2 text-sm text-ink-3">
          <Music2 className="h-4 w-4" />
          Nothing playing
        </div>
      )}
    </div>
  );
}