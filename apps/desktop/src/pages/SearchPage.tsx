import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Disc3,
  Mic2,
  Music4,
  Search,
  SearchX,
  Sparkles,
} from 'lucide-react';
import type { Song, Artist, Album, Playlist } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { Input } from '../components/ui/input';
import { SongRow } from '../components/SongRow';
import { EmptyState } from '../components/ui/feedback';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';

interface SearchResult {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}

interface FlatItem {
  type: 'song' | 'artist' | 'album' | 'playlist';
  id: string;
  label: string;
  sub?: string;
  data: Song | Artist | Album | Playlist;
}

export function SearchPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ songs: [], artists: [], albums: [], playlists: [] });
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const flatResults: FlatItem[] = [
    ...results.songs.map((s) => ({ type: 'song' as const, id: s.id, label: s.title, sub: s.artistName ?? undefined, data: s })),
    ...results.artists.map((a) => ({ type: 'artist' as const, id: a.id, label: a.name, data: a })),
    ...results.albums.map((a) => ({ type: 'album' as const, id: a.id, label: a.name, sub: a.artistName ?? undefined, data: a })),
    ...results.playlists.map((p) => ({ type: 'playlist' as const, id: p.id, label: p.name, sub: `${p.songCount} songs`, data: p })),
  ];

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ songs: [], artists: [], albums: [], playlists: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const r = await client.search({ query: q });
      setResults({ ...r, playlists: [] });
    } catch {
      setResults({ songs: [], artists: [], albums: [], playlists: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ songs: [], artists: [], albums: [], playlists: [] });
      setActiveIdx(-1);
      return;
    }
    setActiveIdx(-1);
    const t = setTimeout(() => void search(query), 250);
    return () => clearTimeout(t);
  }, [query, search]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (flatResults.length === 0 ? -1 : Math.min(i + 1, flatResults.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && flatResults[activeIdx]) {
        const item = flatResults[activeIdx];
        if (item.type === 'song') {
          playSong(item.data as Song, results.songs);
        }
      }
    }
  };

  useEffect(() => {
    if (activeIdx >= 0 && activeIdx < flatResults.length) {
      const el = document.getElementById(`search-item-${activeIdx}`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx, flatResults.length]);

  const hasQuery = query.trim().length > 0;
  const hasResults = flatResults.length > 0;
  const noResults = hasQuery && !loading && !hasResults;

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
        <Input
          ref={inputRef}
          autoFocus
          className="h-12 rounded-full bg-card pl-11 pr-4 text-base"
          placeholder="Songs, artists, albums, playlists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={hasResults}
          aria-activedescendant={activeIdx >= 0 ? `search-item-${activeIdx}` : undefined}
        />
      </div>

      <div className="mt-6">
        {!hasQuery && !loading && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-card">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <p className="max-w-sm text-sm text-ink-2">
              Start typing to search your library — songs, artists, albums and playlists.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        )}

        {noResults && (
          <EmptyState
            icon={SearchX}
            title="No results"
            description={`Nothing matches “${query.trim()}". Try a different search.`}
          />
        )}

        {!loading && hasResults && (
          <div className="space-y-6">
            {results.songs.length > 0 && (
              <ResultGroup title="Songs" icon={Music4} count={results.songs.length}>
                {results.songs.map((s, i) => (
                  <div key={s.id} id={`search-item-${results.artists.length > 0 ? i : i}`}>
                    <SongRow
                      song={s}
                      queue={results.songs}
                      index={i}
                      onContextMenu={() => {}}
                    />
                  </div>
                ))}
              </ResultGroup>
            )}

            {results.artists.length > 0 && (
              <ResultGroup title="Artists" icon={Mic2} count={results.artists.length}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {results.artists.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col items-center rounded-lg p-3 text-center transition-colors hover:bg-white/8"
                    >
                      {a.artworkUrl ? (
                        <img src={a.artworkUrl} alt="" className="h-16 w-16 rounded-full object-cover shadow-elev-1" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-lg font-semibold text-ink-2">
                          {a.name.charAt(0)}
                        </div>
                      )}
                      <p className="mt-2 truncate text-sm font-medium text-ink-1">{a.name}</p>
                    </div>
                  ))}
                </div>
              </ResultGroup>
            )}

            {results.albums.length > 0 && (
              <ResultGroup title="Albums" icon={Disc3} count={results.albums.length}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {results.albums.map((al) => (
                    <div key={al.id} className="flex flex-col rounded-lg p-3 text-left transition-colors hover:bg-white/8">
                      {al.artworkUrl ? (
                        <img src={al.artworkUrl} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover shadow-elev-1" />
                      ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-md bg-card">
                          <Disc3 className="h-8 w-8 text-ink-3" />
                        </div>
                      )}
                      <p className="mt-2 truncate text-sm font-medium text-ink-1">{al.name}</p>
                      <p className="truncate text-xs text-ink-2">{al.artistName ?? ''}</p>
                    </div>
                  ))}
                </div>
              </ResultGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof Music4;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-3" />
        <h2 className="text-sm font-semibold text-ink-1">{title}</h2>
        <span className="text-xs text-ink-3">({count})</span>
      </div>
      {children}
    </div>
  );
}