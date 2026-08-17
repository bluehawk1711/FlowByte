import type { Song } from '@flowbyte/types';

export interface SongRowLike {
  id: string;
  title: string;
  artistId: string | null;
  albumId: string | null;
  duration: number;
  trackNumber: number | null;
  year: number | null;
  genre: string | null;
  language: string | null;
  codec: string | null;
  bitrate: number | null;
  fileSize: number | null;
  artworkStorageKey: string | null;
  lyricsStorageKey: string | null;
  lyricsLanguage: string | null;
  lyricsSynced: boolean;
  sourceUrl: string | null;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function mapSong(
  row: SongRowLike,
  names?: { artistName?: string | null; albumName?: string | null },
  extra?: { artworkUrl?: string | null; isFavorite?: boolean },
): Song {
  return {
    id: row.id,
    title: row.title,
    artistId: row.artistId,
    artistName: names?.artistName ?? null,
    albumId: row.albumId,
    albumName: names?.albumName ?? null,
    duration: row.duration,
    trackNumber: row.trackNumber,
    year: row.year,
    genre: row.genre,
    language: row.language,
    codec: row.codec,
    bitrate: row.bitrate,
    fileSize: row.fileSize,
    artworkStorageKey: row.artworkStorageKey,
    artworkUrl: extra?.artworkUrl ?? null,
    lyricsStorageKey: row.lyricsStorageKey,
    lyricsLanguage: row.lyricsLanguage,
    lyricsSynced: row.lyricsSynced,
    sourceUrl: row.sourceUrl,
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isFavorite: extra?.isFavorite,
  };
}