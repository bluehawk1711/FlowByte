import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic2, Music2, X } from 'lucide-react';
import type { NormalizedLyrics } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Spinner } from './ui/spinner';

interface LyricsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function LyricsPanel({ open, onClose }: LyricsPanelProps) {
  const { current, position } = usePlayer();
  const [lyrics, setLyrics] = useState<NormalizedLyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevActiveRef = useRef<number>(-1);

  // Fetch lyrics when song changes or panel opens
  useEffect(() => {
    if (!open || !current) {
      setLyrics(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setLyrics(null);

    void client
      .getLyrics(current.id)
      .then((res) => {
        if (!cancelled) setLyrics(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, current?.id]);

  // Find the active line index based on current playback position
  const getActiveIndex = useCallback((): number => {
    if (!lyrics?.synced || !lyrics.lines.length) return -1;
    const posMs = position * 1000;
    let active = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (posMs >= lyrics.lines[i].start) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  }, [lyrics, position]);

  const activeIndex = getActiveIndex();

  // Auto-scroll to active line
  useEffect(() => {
    if (activeIndex < 0 || activeIndex === prevActiveRef.current) return;
    prevActiveRef.current = activeIndex;

    const el = lineRefs.current.get(activeIndex);
    const container = containerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offset = elRect.top - containerRect.top - containerRect.height / 2 + elRect.height / 2;

    container.scrollTo({
      top: container.scrollTop + offset,
      behavior: 'smooth',
    });
  }, [activeIndex]);

  // Reset refs map on lyrics change
  useEffect(() => {
    lineRefs.current.clear();
    prevActiveRef.current = -1;
  }, [lyrics]);

  const hasSynced = lyrics?.synced && lyrics.lines.length > 0;
  const hasUnsynced = lyrics && !lyrics.synced && lyrics.lines.length > 0;

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
          'fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-line bg-sidebar shadow-elev-3 transition-transform duration-250 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="text-sm font-semibold text-ink-1">Lyrics</h2>
          <div className="flex items-center gap-2">
            {current && (
              <span className="truncate text-xs text-ink-3">{current.title}</span>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close lyrics">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={containerRef}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-8"
        >
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-ink-3">Loading lyrics…</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Mic2 className="h-8 w-8 text-ink-3" />
              <p className="text-sm text-ink-2">
                Couldn't load lyrics — check your connection.
              </p>
            </div>
          )}

          {!loading && !error && !lyrics && current && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-card">
                <Mic2 className="h-6 w-6 text-ink-3" aria-hidden />
              </div>
              <p className="max-w-[200px] text-sm text-ink-2">
                Lyrics aren't available for this song.
              </p>
            </div>
          )}

          {!loading && !error && !lyrics && !current && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Music2 className="h-8 w-8 text-ink-3" />
              <p className="text-sm text-ink-2">Play a song to see lyrics.</p>
            </div>
          )}

          {/* Synced lyrics */}
          {hasSynced && (
            <div className="space-y-1">
              {lyrics!.lines.map((line, i) => {
                const isActive = i === activeIndex;
                const isPast = activeIndex >= 0 && i < activeIndex;
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el) lineRefs.current.set(i, el);
                    }}
                    className={cn(
                      'py-1.5 transition-all duration-300 ease-out',
                      isActive
                        ? 'scale-105 text-lg font-bold text-ink-1'
                        : isPast
                          ? 'text-base text-ink-3'
                          : 'text-base text-ink-2',
                    )}
                  >
                    {line.text}
                  </div>
                );
              })}
              {/* Spacer so last line can be centered */}
              <div className="h-32" />
            </div>
          )}

          {/* Unsynced lyrics */}
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
    </>
  );
}
