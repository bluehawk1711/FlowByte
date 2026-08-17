import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Album, Artist, Playlist, Song } from '@flowbyte/types';
import { client } from '../lib/api';
import { usePlayer } from '../context/PlayerContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/card';
import { SongRow } from '../components/SongRow';
import { cn } from '../lib/utils';

type Tab = 'songs' | 'artists' | 'albums' | 'playlists' | 'favorites';

const TABS: Tab[] = ['songs', 'artists', 'albums', 'playlists', 'favorites'];

export function LibraryPage() {
  const { playQueue } = usePlayer();
  const [tab, setTab] = useState<Tab>('songs');
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favorites, setFavorites] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

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

  const visiblePlaylists = tab === 'playlists' ? playlists : [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold capitalize">{tab}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="w-64 pl-9"
              placeholder="Search library…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={playAll} disabled={songs.length === 0}>
            Play all
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            className={cn(
              'px-3 py-2 text-sm capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-blue-500 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {!loading && tab === 'songs' && (
        <div className="space-y-0.5">
          {songs.map((s, i) => (
            <SongRow key={s.id} song={s} queue={songs} index={i} />
          ))}
          {songs.length === 0 && <EmptyState label="No songs yet — import some from the Home tab" />}
        </div>
      )}

      {!loading && tab === 'favorites' && (
        <div className="space-y-0.5">
          {favorites.map((s, i) => (
            <SongRow key={s.id} song={s} queue={favorites} index={i} />
          ))}
          {favorites.length === 0 && (
            <EmptyState label="No favorites yet — click the heart on a song" />
          )}
        </div>
      )}

      {!loading && tab === 'artists' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <Card key={a.id} className="flex items-center gap-3 p-3">
              {a.artworkUrl ? (
                <img src={a.artworkUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-400">
                  {a.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
              </div>
            </Card>
          ))}
          {artists.length === 0 && <EmptyState label="No artists yet" />}
        </div>
      )}

      {!loading && tab === 'albums' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((al) => (
            <Card key={al.id} className="flex items-center gap-3 p-3">
              {al.artworkUrl ? (
                <img src={al.artworkUrl} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-800">
                  <span className="text-xs text-zinc-500">No art</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{al.name}</p>
                <p className="truncate text-xs text-zinc-400">
                  {al.artistName ?? ''}
                  {al.releaseYear ? ` · ${al.releaseYear}` : ''}
                </p>
              </div>
            </Card>
          ))}
          {albums.length === 0 && <EmptyState label="No albums yet" />}
        </div>
      )}

      {!loading && tab === 'playlists' && visiblePlaylists.length === 0 && (
        <EmptyState label="No playlists yet — playlist support ships with the mobile sync" />
      )}
      {!loading && tab === 'playlists' && visiblePlaylists.length > 0 && (
        <div className="space-y-0.5">
          {visiblePlaylists.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-zinc-800"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-zinc-400">
                  {p.songCount} songs{p.description ? ` · ${p.description}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="px-3 py-12 text-center text-sm text-zinc-500">{label}</p>;
}