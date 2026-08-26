import { Music2, MoreHorizontal, Play } from 'lucide-react';
import type { Song } from '@flowbyte/types';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export function SongRow({
  song,
  queue,
  index,
  onContextMenu,
}: {
  song: Song;
  queue: Song[];
  index?: number;
  onContextMenu?: (song: Song, position: { x: number; y: number }) => void;
}) {
  const { current, playing, playSong } = usePlayer();
  const active = current?.id === song.id;

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-white/8',
        active && 'bg-accent-soft/40 hover:bg-accent-soft/40',
      )}
      onDoubleClick={() => playSong(song, queue)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(song, { x: e.clientX, y: e.clientY });
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') playSong(song, queue);
      }}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-card shadow-elev-1">
        {song.artworkUrl || song.cover ? (
          <img
            src={song.artworkUrl ?? song.cover}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-4 w-4 text-ink-3" />
          </div>
        )}
        <div
          className={cn(
            'absolute inset-0 hidden items-center justify-center bg-black/60 group-hover:flex',
            active && playing && 'flex',
          )}
        >
          {active && playing ? (
            <span className="flex h-4 items-end gap-0.5" aria-hidden>
              <span className="h-2 w-0.5 animate-pulse rounded-full bg-accent-hover" />
              <span className="h-4 w-0.5 animate-pulse rounded-full bg-accent-hover [animation-delay:150ms]" />
              <span className="h-3 w-0.5 animate-pulse rounded-full bg-accent-hover [animation-delay:300ms]" />
            </span>
          ) : (
            <Play className="h-4 w-4 fill-white text-white" />
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', active ? 'text-accent-hover' : 'text-ink-1')}>
          {song.title}
        </p>
        <p className="truncate text-xs text-ink-2">{song.artistName ?? 'Unknown artist'}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs tabular-nums text-ink-3">
          {index != null ? index + 1 : formatDuration(song.duration)}
        </span>
        {onContextMenu && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              onContextMenu(song, { x: rect.left, y: rect.bottom + 4 });
            }}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}