import { useEffect, useState } from 'react';
import { Mic2, Music2 } from '../lib/icons';
import type { Album, Artist, Song } from '@flowbyte/types';
import { client } from '../lib/api';
import { Dialog } from './ui/dialog';
import { SongRow } from './SongRow';
import { Skeleton } from './ui/skeleton';
import { EmptyState } from './ui/feedback';
import { SongContextMenu, type SongContextMenuState } from './SongContextMenu';

/**
 * Artist spotlight dialog (opened from search results). Loads the artist's
 * full song list via GET /artists/:id so clicking a card actually does
 * something: double-click / Enter plays the song in the context of the
 * artist's catalogue.
 */
export function ArtistDialog({
  artist,
  onClose,
}: {
  artist: Artist | null;
  onClose: () => void;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<SongContextMenuState | null>(null);

  useEffect(() => {
    if (!artist) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSongs([]);
    setAlbums([]);
    void client
      .getArtist(artist.id)
      .then((res) => {
        if (cancelled) return;
        setSongs(res.songs);
        setAlbums(res.albums);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this artist');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [artist]);

  return (
    <Dialog open={!!artist} onClose={onClose} title="Artist" widthClass="max-w-2xl">
      {artist && (
        <div>
          <div className="flex items-center gap-4 pb-4">
            {artist.artworkUrl ? (
              <img
                src={artist.artworkUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover shadow-elev-1"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card">
                <Mic2 className="h-7 w-7 text-ink-3" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-ink-1">{artist.name}</h3>
              <p className="text-xs text-ink-2">
                {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                {albums.length > 0 &&
                  ` · ${albums.length} ${albums.length === 1 ? 'album' : 'albums'}`}
              </p>
            </div>
          </div>

          {error && (
            <EmptyState
              icon={Music2}
              title={error}
              description="Make sure the server is reachable, then try again."
            />
          )}

          {loading && !error && (
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          )}

          {!loading && !error && songs.length === 0 && (
            <EmptyState
              icon={Music2}
              title="No songs yet"
              description="Nothing in the library is attributed to this artist."
            />
          )}

          {!loading && !error && songs.length > 0 && (
            <div className="-mx-1 max-h-[min(55vh,420px)] space-y-0.5 overflow-y-auto overflow-x-hidden px-1 [scrollbar-gutter:stable]">
              {songs.map((song, i) => (
                <SongRow
                  key={song.id}
                  song={song}
                  queue={songs}
                  index={i}
                  onContextMenu={(s, pos) => setCtxMenu({ song: s, position: pos })}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <SongContextMenu state={ctxMenu} onClose={() => setCtxMenu(null)} />
    </Dialog>
  );
}
