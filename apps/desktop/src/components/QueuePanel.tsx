import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Music2,
  Trash2,
  X,
} from '../lib/icons';
import { cn, formatDuration } from '../lib/utils';
import { usePlayer } from '../context/PlayerContext';
import { Button } from './ui/button';

interface QueuePanelProps {
  open: boolean;
  onClose: () => void;
}

export function QueuePanel({ open, onClose }: QueuePanelProps) {
  const { current, queue, index, playing, playSong, removeFromQueue, clearQueue, moveInQueue } =
    usePlayer();

  const before = queue.slice(0, index);
  const currentSong = queue[index] ?? current;
  const after = queue.slice(index + 1);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="animate-backdrop-in fixed inset-0 z-40 bg-backdrop backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-line bg-sidebar shadow-elev-3 transition-transform duration-250 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="text-sm font-semibold text-ink-1">Queue</h2>
          <div className="flex items-center gap-1">
            {queue.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearQueue}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close queue">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Queue list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {queue.length === 0 && !currentSong ? (
            <EmptyQueue />
          ) : (
            <div className="space-y-1">
              {/* Now playing */}
              {currentSong && (
                <section>
                  <p className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                    Now playing
                  </p>
                  <QueueRow
                    song={currentSong}
                    isCurrent
                    playing={playing}
                    canMoveUp={false}
                    canMoveDown={false}
                    onPlay={() => playSong(currentSong)}
                    onRemove={() => {}}
                    onMoveUp={() => {}}
                    onMoveDown={() => {}}
                  />
                </section>
              )}

              {/* Next up */}
              {after.length > 0 && (
                <section>
                  <p className="mb-1 px-2 pt-3 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                    Next up
                  </p>
                  {after.map((song, i) => {
                    const qi = index + 1 + i;
                    return (
                      <QueueRow
                        key={`${song.id}-${qi}`}
                        song={song}
                        canMoveUp={true}
                        canMoveDown={i < after.length - 1}
                        onPlay={() => playSong(song, queue)}
                        onRemove={() => removeFromQueue(qi)}
                        onMoveUp={() => moveInQueue(qi, qi - 1)}
                        onMoveDown={() => moveInQueue(qi, qi + 1)}
                      />
                    );
                  })}
                </section>
              )}

              {/* Previously in queue (songs before current) */}
              {before.length > 0 && (
                <section>
                  <p className="mb-1 px-2 pt-3 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                    Previously
                  </p>
                  {before.map((song, i) => (
                    <QueueRow
                      key={`${song.id}-${i}`}
                      song={song}
                      canMoveUp={i > 0}
                      canMoveDown={i < before.length - 1}
                      onPlay={() => playSong(song, queue)}
                      onRemove={() => removeFromQueue(i)}
                      onMoveUp={() => moveInQueue(i, i - 1)}
                      onMoveDown={() => moveInQueue(i, i + 1)}
                    />
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Queue row
// ---------------------------------------------------------------------------

function QueueRow({
  song,
  isCurrent,
  playing,
  canMoveUp,
  canMoveDown,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  song: { id: string; title: string; artistName: string | null; duration: number; artworkUrl: string | null; cover?: string | null };
  isCurrent?: boolean;
  playing?: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-100',
        isCurrent ? 'bg-accent-soft/40' : 'hover:bg-white/6',
      )}
    >
      {/* Artwork */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-card shadow-elev-1">
        {song.artworkUrl || song.cover ? (
          <img
            src={song.artworkUrl ?? song.cover ?? undefined}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-4 w-4 text-ink-3" />
          </div>
        )}
        {isCurrent && playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="flex h-3 items-end gap-0.5" aria-hidden>
              <span className="h-1.5 w-0.5 animate-pulse rounded-full bg-accent-hover" />
              <span className="h-3 w-0.5 animate-pulse rounded-full bg-accent-hover [animation-delay:150ms]" />
              <span className="h-2 w-0.5 animate-pulse rounded-full bg-accent-hover [animation-delay:300ms]" />
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <button onClick={onPlay} className="min-w-0 flex-1 text-left">
        <p
          className={cn(
            'truncate text-sm font-medium',
            isCurrent ? 'text-accent-hover' : 'text-ink-1',
          )}
        >
          {song.title}
        </p>
        <p className="truncate text-xs text-ink-2">{song.artistName ?? 'Unknown artist'}</p>
      </button>

      {/* Duration */}
      <span className="shrink-0 text-xs tabular-nums text-ink-3">
        {formatDuration(song.duration)}
      </span>

      {/* Actions */}
      {!isCurrent && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 text-ink-3 hover:text-danger"
            onClick={onRemove}
            aria-label="Remove from queue"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyQueue() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-card">
        <Music2 className="h-6 w-6 text-ink-3" aria-hidden />
      </div>
      <p className="max-w-[200px] text-sm text-ink-2">
        Your queue is empty — play a song to start.
      </p>
    </div>
  );
}
