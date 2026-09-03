import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Music4, Trash2 } from '../lib/icons';
import { toast } from 'sonner';
import type { Song } from '@flowbyte/types';
import { FlowbyteError } from '@flowbyte/api-client';
import { client } from '../lib/api';
import { Dialog } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

/**
 * Edit song metadata (title, artist, album, genre, year) plus custom artwork.
 * Saves through PATCH /songs/:id — the backend re-links artist/album by name,
 * stores the uploaded artwork key, and emits a realtime event so open lists
 * refresh themselves.
 */
export function EditSongDialog({
  song,
  open,
  onClose,
}: {
  song: Song;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(song.title ?? '');
  const [artist, setArtist] = useState(song.artistName ?? '');
  const [album, setAlbum] = useState(song.albumName ?? '');
  const [genre, setGenre] = useState(song.genre ?? '');
  const [year, setYear] = useState(song.year != null ? String(song.year) : '');
  const [previewUrl, setPreviewUrl] = useState<string | null>(song.artworkUrl ?? song.cover ?? null);
  const [saving, setSaving] = useState(false);
  const [artBusy, setArtBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = !saving && !artBusy && title.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await client.updateSong(song.id, {
        title: title.trim(),
        artistName: artist.trim(),
        albumName: album.trim(),
        genre: genre.trim(),
        year: year.trim() ? Number(year.trim()) : undefined,
      });
      toast.success('Song details updated');
      onClose();
    } catch (e) {
      const reason =
        e instanceof FlowbyteError && e.status > 0
          ? e.message
          : 'Could not update the song';
      toast.error(reason);
    } finally {
      setSaving(false);
    }
  };

  const setArtwork = async (file: File | null | undefined) => {
    if (!file) return;
    const looksLikeImage =
      file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(file.name);
    if (!looksLikeImage) {
      toast.error('Choose an image file (JPG, PNG, WebP, …)');
      return;
    }
    setArtBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const { storageKey } = await client.uploadArtwork(bytes);
      const updated = await client.updateSong(song.id, { artworkStorageKey: storageKey });
      setPreviewUrl(updated.artworkUrl);
      toast.success('Artwork updated');
    } catch (e) {
      const reason =
        e instanceof FlowbyteError && e.status > 0
          ? e.message
          : 'Could not upload the artwork';
      toast.error(reason);
    } finally {
      setArtBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeArtwork = async () => {
    setArtBusy(true);
    try {
      const updated = await client.updateSong(song.id, { artworkStorageKey: null });
      setPreviewUrl(updated.artworkUrl);
      toast.success('Artwork removed');
    } catch {
      toast.error('Could not remove the artwork');
    } finally {
      setArtBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit details">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-2" htmlFor="edit-title">
            Title
          </label>
          <Input
            id="edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2" htmlFor="edit-artist">
              Artist
            </label>
            <Input
              id="edit-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={300}
              placeholder="Unknown artist"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2" htmlFor="edit-album">
              Album
            </label>
            <Input
              id="edit-album"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              maxLength={300}
              placeholder="—"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2" htmlFor="edit-genre">
              Genre
            </label>
            <Input
              id="edit-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              maxLength={100}
              placeholder="e.g. Rock"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2" htmlFor="edit-year">
              Year
            </label>
            <Input
              id="edit-year"
              type="number"
              min={1000}
              max={9999}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2024"
            />
          </div>
        </div>

        {/* Artwork */}
        <div className="flex items-center gap-3 rounded-lg border border-line bg-app/60 p-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover shadow-elev-1"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-card">
              <Music4 className="h-6 w-6 text-ink-3" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-1">Artwork</p>
            <p className="truncate text-xs text-ink-3">
              {previewUrl ? 'Custom cover set for this song.' : 'No custom cover yet.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void setArtwork(e.target.files?.[0])}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              disabled={artBusy}
              onClick={() => fileRef.current?.click()}
            >
              {artBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              {previewUrl ? 'Change' : 'Upload'}
            </Button>
            {previewUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-ink-3 hover:text-danger"
                disabled={artBusy}
                onClick={() => void removeArtwork()}
                aria-label="Remove artwork"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSave}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
