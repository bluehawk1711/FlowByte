import { useCallback, useEffect, useState } from 'react';
import { Album, Disc3, Heart, ListMusic, Mic2, Music4, Play, Search, SearchX } from 'lucide-react';
import type { Album as AlbumT, Artist, Playlist, Song } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SongRow } from '../components/SongRow';
import { SongContextMenu, type SongContextMenuState } from '../components/SongContextMenu';
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
            onClick={() => setTab(id)}
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
                    <SongRow key={s.id} song={s} queue={filteredSongs} index={i} onContextMenu={(song, pos) => setCtxMenu({ song, position: pos })} />
                  ))}
                </div>
              </div>
            )}

            {showArtists && artists.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-3">
                  Artists
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {artists.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-col items-center rounded-lg p-3 text-center transition-colors duration-150 hover:bg-white/8"
                    >
                      {a.artworkUrl ? (
                        <img
                          src={a.artworkUrl}
                          alt=""
                          className="h-20 w-20 rounded-full object-cover shadow-elev-1"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-card text-xl font-semibold text-ink-2">
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <p className="mt-2 truncate text-sm font-medium text-ink-1">{a.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAlbums && albums.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-3">
                  Albums
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {albums.map((al) => (
                    <button
                      key={al.id}
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
                  ))}
                </div>
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