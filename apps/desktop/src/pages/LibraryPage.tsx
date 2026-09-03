import { useCallback, useEffect, useState } from 'react';
import {
  Album,
  Check,
  Disc3,
  Heart,
  ListMusic,
  Mic2,
  Music4,
  Play,
  Search,
  SearchX,
  X,
} from '../lib/icons';
import DynamicIsland from '../components/ui/smoothui/dynamic-island';
import GlowHover from '../components/ui/smoothui/glow-hover-card';
import GooeyPopover from '../components/ui/smoothui/gooey-popover';
import { toast } from 'sonner';
import type { Album as AlbumT, Artist, Playlist, Song } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { useRealtime } from '../hooks/useRealtime';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SongRow } from '../components/SongRow';
import { SongContextMenu, type SongContextMenuState } from '../components/SongContextMenu';
import { ArtistDialog } from '../components/ArtistDialog';
import { EmptyState } from '../components/ui/feedback';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '../lib/utils';

type Tab = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'favorites';

const TABS: Array<{ id: Tab; label: string; icon: typeof Music4 }> = [
  { id: 'all', label: 'All', icon: Music4 },
  { id: 'songs', label: 'Songs', icon: Music4 },
  { id: 'artists', label: 'Artists', icon: Mic2 },
  { id: 'albums', label: 'Albums', icon: Disc3 },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'favorites', label: 'Favorites', icon: Heart },
];

export function LibraryPage() {
  const { playQueue } = usePlayer();
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<AlbumT[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<SongContextMenuState | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async (q: string) => {
    setLoading(true);
    try {
      if (q.trim()) {
        const res = await client.search({ query: q });
        setSongs(res.songs);
        setArtists(res.artists);
        setAlbums(res.albums);
        setPlaylists([]);
        setFavorites([]);
      } else {
        const [s, a, al, p, f] = await Promise.all([
          client.getSongs({ pageSize: 200 }),
          client.getArtists(),
          client.getAlbums(),
          client.getPlaylists(),
          client.getFavorites(),
        ]);
        setSongs(s.items);
        setArtists(a);
        setAlbums(al);
        setPlaylists(p);
        setFavorites(f);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  // Auto-refresh when library changes via SSE
  useRealtime({
    onLibraryChanged: () => {
      void load(query);
    },
  });

  const playAll = useCallback(() => {
    if (songs.length > 0) playQueue(songs, 0);
  }, [songs, playQueue]);

  const playAlbum = (album: AlbumT) => {
    void client.getAlbum(album.id).then(({ songs: albumSongs }) => {
      if (albumSongs.length > 0) playQueue(albumSongs, 0);
    });
  };

  const songCount = songs.length;
  const filteredSongs = tab === 'favorites' ? favorites : songs;
  const selectedSongs = filteredSongs.filter((s) => selected.has(s.id));

  // -------------------------------------------------------------------------
  // Multi-select (dynamic island) helpers
  // -------------------------------------------------------------------------
  const toggleSelect = useCallback(
    (song: Song) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(song.id)) next.delete(song.id);
        else next.add(song.id);
        return next;
      });
    },
    [],
  );

  const selectAllVisible = useCallback(() => {
    setSelected(new Set(filteredSongs.map((s) => s.id)));
  }, [filteredSongs]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const playSelected = useCallback(() => {
    const list = selectedSongs;
    if (list.length > 0) {
      playQueue(list, 0);
      exitSelectMode();
    }
  }, [selectedSongs, playQueue, exitSelectMode]);

  const favoriteSelected = useCallback(async () => {
    const ids = selectedSongs.map((s) => s.id);
    if (ids.length === 0) return;
    try {
      // One batched request (POST /favorites/batch) — N parallel calls could
      // partially fail under burst/rate limits.
      const { added } = await client.addFavorites(ids);
      if (added > 0) {
        toast.success('Added to favorites', {
          description: `${added} ${added === 1 ? 'song' : 'songs'}`,
        });
      } else {
        toast.message('Already in favorites');
      }
      void load(query);
    } catch {
      toast.error('Could not update favorites');
    }
  }, [selectedSongs, load, query]);

  const playArtistTop = useCallback(
    async (a: Artist) => {
      try {
        const res = await client.getArtist(a.id);
        if (res.songs.length > 0) {
          playQueue(res.songs, 0);
          exitSelectMode();
        } else {
          toast.message('No songs yet for this artist');
        }
      } catch {
        toast.error('Could not load this artist');
      }
    },
    [playQueue, exitSelectMode],
  );

  const accentHue = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
    return { hue: h, saturation: 78, lightness: 58 };
  };

  const showArtists = tab === 'all' || tab === 'artists';
  const showAlbums = tab === 'all' || tab === 'albums';
  const showPlaylists = tab === 'playlists';
  const showSongs = tab === 'all' || tab === 'songs' || tab === 'favorites';
  const nothing =
    songCount === 0 && artists.length === 0 && albums.length === 0 && favorites.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-1">Your Library</h1>
          <p className="mt-1 text-sm text-ink-2">
            {songCount} song{songCount === 1 ? '' : 's'} · {albums.length} album
            {albums.length === 1 ? '' : 's'} · {artists.length} artist{artists.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input
              className="w-64 rounded-full bg-card pl-9"
              placeholder="Filter library…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter library"
            />
          </div>
          {selectMode ? (
            <>
              <span className="shrink-0 text-sm text-ink-2">
                {selected.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                Select all
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exitSelectMode}
                aria-label="Exit selection"
              >
                <X className="h-3.5 w-3.5" />
                Done
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={songCount === 0}
              onClick={() => {
                setSelected(new Set());
                setSelectMode(true);
              }}
            >
              <Check className="h-3.5 w-3.5" />
              Select
            </Button>
          )}
          <Button variant="secondary" onClick={playAll} disabled={songs.length === 0}>
            <Play className="h-4 w-4" />
            Play all
          </Button>
        </div>
      </div>

      <div className="mt-6 flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
              tab === id
                ? 'bg-ink-1 text-app'
                : 'text-ink-2 hover:bg-white/8 hover:text-ink-1',
            )}
            onClick={() => {
              exitSelectMode();
              setTab(id);
            }}
            aria-pressed={tab === id}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <LibrarySkeleton />
        ) : nothing ? (
          <EmptyState
            icon={Music4}
            title="Nothing here yet"
            description="Add a YouTube link with the Add Music button — it lands in your library once downloaded."
          />
        ) : query.trim() && songCount === 0 && artists.length === 0 && albums.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No results"
            description={`Nothing matches “${query.trim()}”.`}
          />
        ) : (
          <div className="space-y-8">
            {showSongs && filteredSongs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-3">
                  Songs
                </p>
                <div className="space-y-0.5">
                  {filteredSongs.map((s, i) => (
                    <SongRow
                      key={s.id}
                      song={s}
                      queue={filteredSongs}
                      index={i}
                      onContextMenu={
                        selectMode
                          ? undefined
                          : (song, pos) => setCtxMenu({ song, position: pos })
                      }
                      selectable={selectMode}
                      selected={selected.has(s.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {showArtists && artists.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-3">
                  Artists
                </p>
                <GlowHover
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                  items={artists.map((a) => ({
                    id: a.id,
                    theme: accentHue(a.id),
                    element: (
                      <div className="flex flex-col items-center rounded-lg p-3 text-center transition-colors duration-150 hover:bg-white/8">
                        <GooeyPopover
                          triggerSize={80}
                          side="bottom"
                          contentWidth={220}
                          bgClassName="bg-elevated"
                          contentClassName="text-ink-1"
                          trigger={
                            <div className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-elev-1">
                              {a.artworkUrl ? (
                                <img
                                  src={a.artworkUrl}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-card text-xl font-semibold text-ink-2">
                                  {a.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          }
                        >
                          <div className="space-y-0.5 py-1.5">
                            <p className="truncate px-3 pb-1 text-sm font-semibold">
                              {a.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => setArtist(a)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/8"
                            >
                              <Mic2 className="h-4 w-4 text-ink-3" />
                              Open artist
                            </button>
                            <button
                              type="button"
                              onClick={() => void playArtistTop(a)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/8"
                            >
                              <Play className="h-4 w-4 text-ink-3" />
                              Play top songs
                            </button>
                          </div>
                        </GooeyPopover>
                        <button
                          type="button"
                          onClick={() => setArtist(a)}
                          className="mt-2 w-full truncate text-sm font-medium text-ink-1 transition-colors hover:text-accent-hover"
                        >
                          {a.name}
                        </button>
                      </div>
                    ),
                  }))}
                />
              </div>
            )}

            {showAlbums && albums.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-3">
                  Albums
                </p>
                <GlowHover
                  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                  items={albums.map((al) => ({
                    id: al.id,
                    theme: accentHue(al.id),
                    element: (
                      <button
                        onClick={() => playAlbum(al)}
                        className="group flex flex-col rounded-lg p-3 text-left transition-colors duration-150 hover:bg-white/8"
                      >
                        {al.artworkUrl ? (
                          <img
                            src={al.artworkUrl}
                            alt=""
                            loading="lazy"
                            className="aspect-square w-full rounded-md object-cover shadow-elev-1"
                          />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded-md bg-card">
                            <Album className="h-8 w-8 text-ink-3" />
                          </div>
                        )}
                        <p className="mt-2 truncate text-sm font-medium text-ink-1">{al.name}</p>
                        <p className="truncate text-xs text-ink-2">
                          {al.artistName ?? ''}
                          {al.releaseYear ? ` · ${al.releaseYear}` : ''}
                        </p>
                      </button>
                    ),
                  }))}
                />
              </div>
            )}

            {showPlaylists && playlists.length > 0 && (
              <div className="space-y-0.5">
                {playlists.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 transition-colors duration-150 hover:bg-white/8"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-1">{p.name}</p>
                      <p className="text-xs text-ink-2">
                        {p.songCount} songs{p.description ? ` · ${p.description}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <SongContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)} />
      <ArtistDialog artist={artist} onClose={() => setArtist(null)} />

      {/* Dynamic island — multi-select actions (floats above the player) */}
      {selectMode && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[120] -translate-x-1/2">
          <DynamicIsland
            showControls={false}
            view={selected.size > 0 ? 'ring' : 'idle'}
            className="pointer-events-none"
            idleContent={
              <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm text-white/80">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15">
                  <Check className="h-3 w-3" />
                </span>
                Tap songs to select, then act from here
              </div>
            }
            ringContent={
              <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 text-white">
                <span className="min-w-0 px-2 text-sm font-semibold">
                  {selected.size} selected
                </span>
                <button
                  type="button"
                  title="Play selection"
                  aria-label="Play selection"
                  onClick={playSelected}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Add to favorites"
                  aria-label="Add to favorites"
                  onClick={() => void favoriteSelected()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                >
                  <Heart className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Clear selection"
                  aria-label="Clear selection"
                  onClick={() => setSelected(new Set())}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="mb-2 h-4 w-20" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-14 w-full rounded-md" />
        ))}
      </div>
      <div>
        <Skeleton className="mb-3 h-4 w-20" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}