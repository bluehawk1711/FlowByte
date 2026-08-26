import { useCallback, useEffect, useState } from 'react';
import {
  Heart,
  ListMusic,
  ListPlus,
  Music4,
  Play,
  Plus,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Song } from '@flowbyte/types';
import type { Playlist } from '@flowbyte/types';
import { usePlayer } from '../context/PlayerContext';
import { client } from '../lib/api';
import { ContextMenu, type ContextMenuItem } from './ui/context-menu';

interface SongContextMenuState {
  song: Song;
  position: { x: number; y: number };
}

/**
 * Manages the context menu lifecycle for songs. Render once in a page that
 * uses SongRow — pass `onRequestContextMenu` to each SongRow, and this
 * component renders the positioned menu.
 */
export function SongContextMenu({
  state,
  onClose,
  playlists,
  onRefreshPlaylists,
}: {
  state: SongContextMenuState | null;
  onClose: () => void;
  playlists?: Playlist[];
  onRefreshPlaylists?: () => void;
}) {
  const { playSong, playNext, addToQueue } = usePlayer();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites to show correct toggle state
  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    void client.getFavorites().then((favs) => {
      if (!cancelled) setFavorites(new Set(favs.map((f) => f.id)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [state]);

  const song = state?.song;
  const isFav = song ? favorites.has(song.id) : false;

  const toggleFavorite = useCallback(async () => {
    if (!song) return;
    try {
      if (isFav) {
        await client.removeFavorite(song.id);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
        toast.success('Removed from favorites');
      } else {
        await client.addFavorite(song.id);
        setFavorites((prev) => new Set(prev).add(song.id));
        toast.success('Added to favorites');
      }
    } catch {
      toast.error('Could not update favorite');
    }
  }, [song, isFav]);

  const addToPlaylist = useCallback(async (playlistId: string, playlistName: string) => {
    if (!song) return;
    try {
      await client.addSongToPlaylist(playlistId, song.id);
      toast.success(`Added to "${playlistName}"`);
    } catch {
      toast.error('Could not add to playlist');
    }
  }, [song]);

  const createAndAdd = useCallback(async () => {
    if (!song) return;
    try {
      const name = `My Playlist #${Date.now() % 1000}`;
      const pl = await client.createPlaylist({ name });
      await client.addSongToPlaylist(pl.id, song.id);
      toast.success(`Created "${pl.name}" and added song`);
      onRefreshPlaylists?.();
    } catch {
      toast.error('Could not create playlist');
    }
  }, [song, onRefreshPlaylists]);

  const items: ContextMenuItem[] = song
    ? [
        {
          label: 'Play',
          icon: Play,
          onClick: () => playSong(song),
        },
        {
          label: 'Play next',
          icon: SkipForward,
          onClick: () => {
            playNext(song);
            toast.success('Playing next');
          },
        },
        {
          label: 'Add to queue',
          icon: ListPlus,
          onClick: () => {
            addToQueue(song);
            toast.success('Added to queue');
          },
        },
        { label: '', separator: true },
        {
          label: isFav ? 'Remove from favorites' : 'Add to favorites',
          icon: Heart,
          onClick: () => void toggleFavorite(),
        },
        {
          label: 'Add to playlist',
          icon: ListMusic,
          subItems: [
            {
              label: '+ New playlist',
              icon: Plus,
              onClick: () => void createAndAdd(),
            },
            { label: '', separator: true },
            ...(playlists ?? []).map((p) => ({
              label: p.name,
              onClick: () => void addToPlaylist(p.id, p.name),
            })),
            ...(playlists && playlists.length === 0
              ? [{ label: 'No playlists yet', disabled: true }]
              : []),
          ],
        },
        { label: '', separator: true },
        {
          label: 'Delete from library',
          icon: Trash2,
          danger: true,
          disabled: true, // TODO: implement when API supports song deletion
        },
      ]
    : [];

  return (
    <ContextMenu items={items} position={state?.position ?? null} onClose={onClose} />
  );
}

export type { SongContextMenuState };
