import { useCallback, useEffect, useState } from 'react';
import { Clock, Heart, Sparkles } from 'lucide-react';
import type { RecentlyPlayedEntry, Song } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { SongRow } from '../components/SongRow';
import { SongContextMenu, type SongContextMenuState } from '../components/SongContextMenu';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/feedback';
import { Skeleton } from '../components/ui/skeleton';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const { playQueue } = usePlayer();
  const [recent, setRecent] = useState<RecentlyPlayedEntry[]>([]);
  const [added, setAdded] = useState<Song[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<SongContextMenuState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, s, f] = await Promise.all([
          client.recentlyPlayed(12).catch(() => []),
          client.getSongs({ pageSize: 10 }).catch(() => ({ items: [] as Song[] })),
          client.getFavorites().catch(() => []),
        ]);
        if (cancelled) return;
        setRecent(r);
        setAdded(s.items);
        setFavorites(f);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const playRecent = useCallback(() => {
    const songs = recent.map((r) => r.song);
    if (songs.length > 0) playQueue(songs, 0);
  }, [recent, playQueue]);

  const playFavorites = useCallback(() => {
    if (favorites.length > 0) playQueue(favorites, 0);
  }, [favorites, playQueue]);

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-1">{greeting()}</h1>
          <p className="mt-1 text-sm text-ink-2">Your music, ready when you are.</p>
        </div>
        {recent.length > 0 && (
          <Button variant="secondary" onClick={playRecent}>
            <Clock className="h-4 w-4" />
            Resume
          </Button>
        )}
      </div>

      {loading ? (
        <HomeSkeleton />
      ) : (
        <div className="mt-8 space-y-10">
          {recent.length === 0 && added.length === 0 && favorites.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Your library is empty"
              description="Add your first song from YouTube — it downloads and lands in your library automatically."
              className="mt-8"
            />
          ) : (
            <>
              {recent.length > 0 && (
                <section>
                  <SectionHeader title="Recently played" />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {recent.slice(0, 8).map(({ song }) => (
                      <AlbumCard key={song.id} song={song} onPlay={() => playQueue(recent.map((r) => r.song), 0)} />
                    ))}
                  </div>
                </section>
              )}

              {favorites.length > 0 && (
                <section>
                  <SectionHeader title="Your favorites" action={
                    <button onClick={playFavorites} className="text-xs font-medium text-ink-2 transition-colors hover:text-ink-1">
                      Play all
                    </button>
                  } />
                  <div className="space-y-0.5">
                    {favorites.slice(0, 10).map((s, i) => (
                      <SongRow key={s.id} song={s} queue={favorites} index={i} onContextMenu={(song, pos) => setCtxMenu({ song, position: pos })} />
                    ))}
                  </div>
                </section>
              )}

              {added.length > 0 && (
                <section>
                  <SectionHeader title="Recently added" />
                  <div className="space-y-0.5">
                    {added.map((s, i) => (
                      <SongRow key={s.id} song={s} queue={added} index={i} onContextMenu={(song, pos) => setCtxMenu({ song, position: pos })} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
      <SongContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)} />
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xl font-semibold tracking-tight text-ink-1">{title}</h2>
      {action}
    </div>
  );
}

function AlbumCard({ song, onPlay }: { song: Song; onPlay: () => void }) {
  return (
    <button
      onClick={onPlay}
      className="group flex flex-col rounded-lg p-3 text-left transition-colors duration-150 hover:bg-white/8"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-card shadow-elev-1">
        {song.artworkUrl || song.cover ? (
          <img
            src={song.artworkUrl ?? song.cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Heart className="h-8 w-8 text-ink-3" />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-ink-1">{song.title}</p>
      <p className="truncate text-xs text-ink-2">{song.artistName ?? 'Unknown artist'}</p>
    </button>
  );
}

function HomeSkeleton() {
  return (
    <div className="mt-8 space-y-10">
      <div>
        <Skeleton className="mb-3 h-6 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-3">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-3 h-6 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}