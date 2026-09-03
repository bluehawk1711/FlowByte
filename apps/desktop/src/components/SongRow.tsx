import { Check, Music2, MoreHorizontal, Play } from '../lib/icons';
import type { Song } from '@flowbyte/types';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { EqBars } from './EqBars';

export function SongRow({
  song,
  queue,
  index,
  onContextMenu,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  song: Song;
  queue: Song[];
  index?: number;
  onContextMenu?: (song: Song, position: { x: number; y: number }) => void;
  /** Multi-select mode: the whole row becomes a checkbox. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (song: Song) => void;
}) {
  const { current, playing, playSong } = usePlayer();
  const active = current?.id === song.id;

  const handleClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(song);
    }
  };

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150',
        selectable ? 'hover:bg-accent-soft/20' : 'hover:bg-white/8',
        active && !selectable && 'bg-accent-soft/40 hover:bg-accent-soft/40',
        selected && 'bg-accent-soft/40 hover:bg-accent-soft/40',
      )}
      onClick={handleClick}
      onDoubleClick={() => {
        if (!selectable) playSong(song, queue);
      }}
      onContextMenu={(e) => {
        if (onContextMenu && !selectable) {
          e.preventDefault();
          onContextMenu(song, { x: e.clientX, y: e.clientY });
        }
      }}
      role={selectable ? 'checkbox' : 'button'}
      aria-checked={selectable ? selected : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (selectable) handleClick();
          else playSong(song, queue);
        }
      }}
    >
      {/* Leading artwork — click starts playback (also in select mode? no: it selects) */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={selectable ? 'Select song' : `Play ${song.title}`}
        className={cn('relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-card shadow-elev-1', !selectable && 'transition-transform duration-200 hover:scale-[1.03] active:scale-95')}
        onClick={(e) => {
          if (selectable) {
            e.stopPropagation();
            handleClick();
          } else {
            e.stopPropagation();
            playSong(song, queue);
          }
        }}
      >
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
            <EqBars className="text-accent-hover" />
          ) : (
            <Play className="h-4 w-4 fill-white text-white" />
          )}
        </div>
      </button>

      {/* Title / artist — clicking starts playback too */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={selectable ? 'Select song' : `Play ${song.title}`}
        className="min-w-0 flex-1 text-left"
        onClick={(e) => {
          e.stopPropagation();
          if (selectable) handleClick();
          else playSong(song, queue);
        }}
      >
        <p className={cn('truncate text-sm font-medium', active ? 'text-accent-hover' : 'text-ink-1')}>
          {song.title}
        </p>
        <p className="truncate text-xs text-ink-2">{song.artistName ?? 'Unknown artist'}</p>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {selectable ? (
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border transition-colors duration-150',
              selected
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-line bg-card',
            )}
          >
            {selected && <Check className="h-3.5 w-3.5" />}
          </span>
        ) : (
          <span className="text-xs tabular-nums text-ink-3">
            {index != null ? index + 1 : formatDuration(song.duration)}
          </span>
        )}
        {onContextMenu && !selectable && (
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