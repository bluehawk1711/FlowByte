import { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Heart,
  ListMusic,
  ListPlus,
  Music4,
  Pencil,
  Play,
  Plus,
  SkipForward,
  Trash2,
} from '../lib/icons';
import { toast } from 'sonner';
import type { Song } from '@flowbyte/types';
import type { Playlist } from '@flowbyte/types';
import { usePlayer } from '../context/PlayerContext';
import { client } from '../lib/api';
import { ContextMenu, type ContextMenuItem } from './ui/context-menu';
import { EditSongDialog } from './EditSongDialog';

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
  // The song being edited. Held separately from the menu state so the dialog
  // stays open after the menu closes and never reappears on later menu opens.
  const [editSong, setEditSong] = useState<Song | null>(null);

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
  // Local (not uploaded) files know their on-disk path — expose it directly.
  const localPath =
    song?.localUri ?? (song?.source === 'local' && song?.url ? song.url : null);

  /**
   * Optimistic toggle that reconciles with the server on failure. A failed
   * request can still land server-side (idempotent add, network blip after
   * commit), so on error we re-fetch and adopt the server truth — the menu can
   * never claim "Add" for a song that is actually favorited (or vice-versa).
   */
  const toggleFavorite = useCallback(async () => {
    if (!song) return;
    const wasFav = isFav;
    const apply = (fav: boolean) =>
      setFavorites((prev) => {
        const next = new Set(prev);
        if (fav) next.add(song.id);
        else next.delete(song.id);
        return next;
      });

    apply(!wasFav); // optimistic flip for instant feedback
    try {
      if (wasFav) {
        await client.removeFavorite(song.id);
        toast.success('Removed from favorites');
      } else {
        await client.addFavorite(song.id);
        toast.success('Added to favorites');
      }
    } catch {
      try {
        const favs = await client.getFavorites();
        const nowFav = favs.some((f) => f.id === song.id);
        setFavorites(new Set(favs.map((f) => f.id)));
        if (nowFav !== wasFav) {
          toast.success(nowFav ? 'Added to favorites' : 'Removed from favorites');
        } else {
          toast.error('Could not update favorite');
        }
      } catch {
        apply(wasFav); // roll the optimistic flip back
        toast.error('Could not update favorite');
      }
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
              label: 'New playlist',
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
          label: 'Edit details',
          icon: Pencil,
          onClick: () => setEditSong(song),
        },
        ...(localPath
          ? [
              {
                label: 'Copy file path',
                icon: Copy,
                onClick: () => {
                  void navigator.clipboard
                    ?.writeText(localPath)
                    .then(() => toast.success('File path copied'))
                    .catch(() => toast.error('Could not copy the file path'));
                },
              },
            ]
          : []),
        {
          label: 'Delete from library',
          icon: Trash2,
          danger: true,
          disabled: true, // TODO: implement when API supports song deletion
        },
      ]
    : [];

  return (
    <>
      <ContextMenu items={items} position={state?.position ?? null} onClose={onClose} />
      {editSong && (
        <EditSongDialog
          key={editSong.id}
          song={editSong}
          open
          onClose={() => setEditSong(null)}
        />
      )}
    </>
  );
}

export type { SongContextMenuState };
