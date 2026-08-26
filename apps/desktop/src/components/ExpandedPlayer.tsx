import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Heart,
  ListMusic,
  Mic2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type { NormalizedLyrics } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { cn, formatDuration } from '../lib/utils';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Spinner } from './ui/spinner';

interface ExpandedPlayerProps {
  open: boolean;
  onClose: () => void;
}

export function ExpandedPlayer({ open, onClose }: ExpandedPlayerProps) {
  const {
    current,
    playing,
    position,
    duration,
    repeat,
    shuffle,
    togglePlay,
    next,
    previous,
    seek,
    toggleRepeat,
    toggleShuffle,
  } = usePlayer();

  const [lyrics, setLyrics] = useState<NormalizedLyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [fav, setFav] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevActiveRef = useRef<number>(-1);

  // Fetch lyrics + favorite state when open or song changes
  useEffect(() => {
    if (!open || !current) {
      setLyrics(null);
      setFav(false);
      return;
    }
    let cancelled = false;

    // Lyrics
    setLyricsLoading(true);
    void client
      .getLyrics(current.id)
      .then((res) => {
        if (!cancelled) setLyrics(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    // Favorite
    void client
      .isFavorite(current.id)
      .then((f) => {
        if (!cancelled) setFav(f);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, current?.id]);

  // Active line index for synced lyrics
  const getActiveIndex = useCallback((): number => {
    if (!lyrics?.synced || !lyrics.lines.length) return -1;
    const posMs = position * 1000;
    let active = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (posMs >= lyrics.lines[i].start) active = i;
      else break;
    }
    return active;
  }, [lyrics, position]);

  const activeIndex = getActiveIndex();

  // Auto-scroll to active line
  useEffect(() => {
    if (activeIndex < 0 || activeIndex === prevActiveRef.current) return;
    prevActiveRef.current = activeIndex;
    const el = lineRefs.current.get(activeIndex);
    const container = lyricsContainerRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;
    container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
  }, [activeIndex]);

  useEffect(() => {
    lineRefs.current.clear();
    prevActiveRef.current = -1;
  }, [lyrics]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleFavorite = useCallback(async () => {
    if (!current) return;
    try {
      if (fav) await client.removeFavorite(current.id);
      else await client.addFavorite(current.id);
      setFav((f) => !f);
    } catch { /* ignore */ }
  }, [current, fav]);

  if (!open || !current) return null;

  const hasSynced = lyrics?.synced && lyrics.lines.length > 0;
  const hasUnsynced = lyrics && !lyrics.synced && lyrics.lines.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-app/98 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
    >
      {/* Close bar */}
      <div className="flex h-12 shrink-0 items-center justify-end px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close expanded player"
          className="text-ink-2 hover:text-ink-1"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-10 px-10 pb-8">
        {/* Left — artwork + info */}
        <div className="flex w-[420px] shrink-0 flex-col items-center justify-center">
          {/* Artwork */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-card shadow-elev-3">
            {current.artworkUrl || current.cover ? (
              <img
                src={current.artworkUrl ?? current.cover}
                alt={current.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-card">
                <Music2 className="h-20 w-20 text-ink-3" />
              </div>
            )}
          </div>

          {/* Song info + favorite */}
          <div className="mt-6 flex w-full items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-ink-1">{current.title}</h2>
              <p className="truncate text-sm text-ink-2">
                {current.artistName ?? 'Unknown artist'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void toggleFavorite()}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
              className={cn(fav ? 'text-accent' : 'text-ink-3 hover:text-ink-1')}
            >
              <Heart className={cn('h-5 w-5', fav && 'fill-current')} />
            </Button>
          </div>

          {/* Controls */}
          <div className="mt-5 flex w-full flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-ink-2', shuffle && 'text-accent')}
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-1 hover:scale-105 active:scale-95"
                onClick={previous}
                aria-label="Previous"
              >
                <SkipBack className="h-6 w-6 fill-current" />
              </Button>
              <Button
                variant="ghost"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-1 text-app shadow-elev-1 transition-transform duration-150 hover:scale-105 active:scale-95"
                onClick={togglePlay}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 translate-x-px" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-1 hover:scale-105 active:scale-95"
                onClick={next}
                aria-label="Next"
              >
                <SkipForward className="h-6 w-6 fill-current" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('text-ink-2', repeat !== 'off' && 'text-accent')}
                onClick={toggleRepeat}
                aria-label="Repeat"
                aria-pressed={repeat !== 'off'}
              >
                {repeat === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </Button>
            </div>

            {/* Progress */}
            <div className="flex w-full max-w-md items-center gap-3 text-xs tabular-nums text-ink-2">
              <span className="w-10 text-right">{formatDuration(position)}</span>
              <Slider
                value={position}
                max={duration || 1}
                onChange={seek}
                ariaLabel="Seek"
                className="min-w-0 flex-1"
              />
              <span className="w-10">{formatDuration(duration)}</span>
            </div>
          </div>
        </div>

        {/* Right — lyrics */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-ink-3" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-3">
              Lyrics
            </h3>
          </div>

          <div
            ref={lyricsContainerRef}
            className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-card/50 px-6 py-6"
          >
            {lyricsLoading && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Spinner className="h-5 w-5" />
                <p className="text-sm text-ink-3">Loading lyrics…</p>
              </div>
            )}

            {!lyricsLoading && !lyrics && (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Mic2 className="h-8 w-8 text-ink-3" />
                <p className="max-w-[200px] text-sm text-ink-2">
                  Lyrics aren't available for this song.
                </p>
              </div>
            )}

            {hasSynced && (
              <div className="space-y-1">
                {lyrics!.lines.map((line, i) => {
                  const isActive = i === activeIndex;
                  const isPast = activeIndex >= 0 && i < activeIndex;
                  return (
                    <div
                      key={i}
                      ref={(el) => { if (el) lineRefs.current.set(i, el); }}
                      className={cn(
                        'py-2 transition-all duration-300 ease-out',
                        isActive
                          ? 'scale-[1.02] text-xl font-bold text-ink-1'
                          : isPast
                            ? 'text-base text-ink-3'
                            : 'text-base text-ink-2',
                      )}
                    >
                      {line.text}
                    </div>
                  );
                })}
                <div className="h-48" />
              </div>
            )}

            {hasUnsynced && (
              <div className="space-y-4">
                {lyrics!.lines.map((line, i) => (
                  <p key={i} className="text-base leading-relaxed text-ink-2">
                    {line.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
