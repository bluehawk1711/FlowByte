import { Music2, Pause, Pin, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { cn, formatDuration } from '../lib/utils';
import { showMiniPlayer } from '../lib/tauri';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

export function NowPlayingBar() {
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
      <footer className="flex h-20 shrink-0 items-center justify-center border-t border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
        Nothing playing — pick a song from the library
      </footer>
    );
  }

  return (
    <footer className="flex h-20 shrink-0 items-center gap-4 border-t border-zinc-800 bg-zinc-900 px-4">
      {/* Track */}
      <div className="flex w-64 min-w-0 items-center gap-3">
        {current.artworkUrl || current.cover ? (
          <img
            src={current.artworkUrl ?? current.cover}
            alt=""
            className="h-12 w-12 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-zinc-800">
            <Music2 className="h-5 w-5 text-zinc-500" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-100">{current.title}</p>
          <p className="truncate text-xs text-zinc-400">{current.artistName ?? 'Unknown artist'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', shuffle && 'text-blue-400')}
            onClick={toggleShuffle}
            aria-label="Shuffle"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={previous} aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-px" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next} aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', repeat !== 'off' && 'text-blue-400')}
            onClick={toggleRepeat}
            aria-label="Repeat"
          >
            {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2 text-[11px] text-zinc-400">
          <span className="w-10 text-right tabular-nums">{formatDuration(position)}</span>
          <Slider value={position} max={duration || 1} onChange={seek} />
          <span className="w-10 tabular-nums">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex w-40 items-center gap-2">
        <Volume2 className="h-4 w-4 shrink-0 text-zinc-400" />
        <Slider value={volume * 100} max={100} onChange={(v) => setVolume(v / 100)} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
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