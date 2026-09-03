import { ListMusic, Mic2, Music2, Pin, Volume2 } from '../lib/icons';
import {
  PauseIcon,
  PlayIcon,
  Repeat1Icon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from '@animateicons/react/lucide';
import { usePlayer } from '../context/PlayerContext';
import { cn, formatDuration } from '../lib/utils';
import { showMiniPlayer } from '../lib/tauri';
import { Button } from './ui/button';
import { EqBars } from './EqBars';
import { Slider } from './ui/slider';

export function NowPlayingBar({
  onToggleQueue,
  onToggleLyrics,
  onExpand,
}: {
  onToggleQueue?: () => void;
  onToggleLyrics?: () => void;
  onExpand?: () => void;
}) {
  const {
    current,
    playing,
    position,
    duration,
    volume,
    repeat,
    shuffle,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleRepeat,
    toggleShuffle,
  } = usePlayer();

  if (!current) {
    return (
      <footer className="flex h-[72px] shrink-0 items-center justify-center border-t border-line bg-player text-sm text-ink-3">
        Nothing playing — pick a song from your library
      </footer>
    );
  }

  return (
    <footer className="flex h-[72px] shrink-0 items-center gap-4 border-t border-line bg-player px-4">
      {/* Track — clickable to open expanded player */}
      <button
        className="relative flex w-48 min-w-0 items-center gap-3 rounded-md p-1 -m-1 text-left transition-colors duration-150 hover:bg-white/6 md:w-60 lg:w-72"
        onClick={onExpand}
        aria-label="Expand player"
      >
        {current.artworkUrl || current.cover ? (
          <img
            src={current.artworkUrl ?? current.cover}
            alt=""
            className="h-14 w-14 shrink-0 rounded-md object-cover shadow-elev-2"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-card shadow-elev-2">
            <Music2 className="h-5 w-5 text-ink-3" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-1">{current.title}</p>
          <p className="hidden truncate text-xs text-ink-2 md:block">
            {current.artistName ?? 'Unknown artist'}
          </p>
        </div>
        {playing && (
          <span
            className="absolute right-1 top-1 flex h-5 items-center rounded-md bg-black/60 px-1.5 text-accent-hover backdrop-blur-sm"
            title="Playing"
          >
            <EqBars />
          </span>
        )}
      </button>

      {/* Controls */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(shuffle && 'text-accent')}
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <ShuffleIcon size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-ink-1 hover:scale-105 active:scale-95"
            onClick={previous}
            aria-label="Previous"
          >
            <SkipBackIcon size={20} />
          </Button>
          <Button
            variant="ghost"
            className="mx-1 flex h-10 w-10 items-center justify-center rounded-full bg-ink-1 text-app shadow-elev-1 transition-transform duration-150 hover:scale-105 hover:bg-ink-1 active:scale-95"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-ink-1 hover:scale-105 active:scale-95"
            onClick={next}
            aria-label="Next"
          >
            <SkipForwardIcon size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(repeat !== 'off' && 'text-accent')}
            onClick={toggleRepeat}
            aria-label="Repeat"
            aria-pressed={repeat !== 'off'}
          >
            {repeat === 'one' ? <Repeat1Icon size={16} /> : <RepeatIcon size={16} />}
          </Button>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2 text-[11px] tabular-nums text-ink-2">
          <span className="w-10 text-right">{formatDuration(position)}</span>
          <Slider
            value={position}
            max={duration || 1}
            onChange={seek}
            ariaLabel="Seek"
            className="min-w-0"
          />
          <span className="w-10">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Volume — hidden on narrow screens */}
      <div className="hidden w-44 shrink-0 items-center gap-2 lg:flex">
        <Volume2 className="h-4 w-4 shrink-0 text-ink-2" />
        <Slider
          value={volume * 100}
          max={100}
          onChange={(v) => setVolume(v / 100)}
          ariaLabel="Volume"
        />          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-ink-2 hover:text-ink-1"
            onClick={onToggleLyrics}
            aria-label="Toggle lyrics"
            title="Lyrics"
          >
            <Mic2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-ink-2 hover:text-ink-1"
            onClick={onToggleQueue}
            aria-label="Toggle queue"
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-ink-2 hover:text-ink-1"
            onClick={() => void showMiniPlayer()}
            aria-label="Open mini player"
            title="Open mini player (stays on top of other apps)"
          >
            <Pin className="h-4 w-4" />
          </Button>
      </div>
    </footer>
  );
}