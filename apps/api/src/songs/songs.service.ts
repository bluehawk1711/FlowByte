import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.interface';
import { DATABASE, type Database } from '../db/db.module';
import { albums, artists, favorites, songs } from '../db/schema';
import { mapSong } from './song-mapper';
import type { ListSongsQuery } from './dto/list-songs.dto';
import type { NormalizedLyrics, Paginated, Song, SongWithLyrics } from '@flowbyte/types';
import { STREAM_TOKEN_TTL_SECONDS } from '@flowbyte/config';

interface SongWithNames {
  song: (typeof songs)['$inferSelect'];
  artistName: string | null;
  albumName: string | null;
}

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);
  private artworkCache = new Map<string, { url: string; at: number }>();

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  /** Enrich artwork keys into short-lived signed URLs (cached per key, 1h TTL). */
  async artworkUrl(key: string | null): Promise<string | null> {
    if (!key) return null;
    const cached = this.artworkCache.get(key);
    if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached.url;
    try {
      const url = await this.storage.getSignedUrl(key, {
        expiresIn: STREAM_TOKEN_TTL_SECONDS,
        contentType: 'image/webp',
      });
      this.artworkCache.set(key, { url, at: Date.now() });
      return url;
    } catch (err) {
      this.logger.warn(`Artwork URL failed for ${key}: ${(err as Error).message}`);
      return null;
    }
  }

  async findAll(userId: string, query: ListSongsQuery): Promise<Paginated<Song>> {
    const conditions = [];
    if (query.q) {
      const like = `%${query.q.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(songs.title, like),
          ilike(songs.genre, like),
          sql`lower(${artists.name}) like ${like}`,
          sql`lower(${albums.name}) like ${like}`,
        ),
      );
    }
    if (query.artistId) conditions.push(eq(songs.artistId, query.artistId));
    if (query.albumId) conditions.push(eq(songs.albumId, query.albumId));
    if (query.genre) conditions.push(ilike(songs.genre, query.genre));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(where);
    const total = totalRow?.value ?? 0;

    const rows = await this.db
      .select({
        song: songs,
        artistName: artists.name,
        albumName: albums.name,
      })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(where)
      .orderBy(desc(songs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const favIds = await this.favoriteIds(userId);
    const items = await this.enrich(rows, favIds);
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<Song> {
    const rows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(songs.id, id))
      .limit(1);
    if (rows.length === 0) throw new NotFoundException('Song not found');
    return (await this.enrich(rows, new Set()))[0]!;
  }

  async findByIds(ids: string[]): Promise<Song[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(inArray(songs.id, ids));
    return this.enrich(rows, new Set());
  }

  async findByArtist(artistId: string): Promise<Song[]> {
    const rows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(songs.artistId, artistId))
      .orderBy(asc(songs.trackNumber), asc(songs.title));
    return this.enrich(rows, new Set());
  }

  async findByAlbum(albumId: string): Promise<Song[]> {
    const rows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(eq(songs.albumId, albumId))
      .orderBy(asc(songs.trackNumber), asc(songs.title));
    return this.enrich(rows, new Set());
  }

  async getStreamInfo(id: string): Promise<{ url: string; expiresIn: number }> {
    const [row] = await this.db
      .select({ song: songs })
      .from(songs)
      .where(eq(songs.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Song not found');
    const expiresIn = STREAM_TOKEN_TTL_SECONDS;
    const url = await this.storage.getSignedUrl(row.song.audioStorageKey, {
      expiresIn,
      filename: `${row.song.title}.${row.song.codec ?? 'opus'}`,
    });
    return { url, expiresIn };
  }

  async getWithLyrics(id: string): Promise<SongWithLyrics> {
    const song = await this.findById(id);
    let lyrics: NormalizedLyrics | null = null;
    if (song.lyricsStorageKey) {
      try {
        const raw = await this.storage.download(song.lyricsStorageKey);
        lyrics = JSON.parse(raw.toString('utf8')) as NormalizedLyrics;
      } catch (err) {
        this.logger.warn(`Lyrics read failed for ${id}: ${(err as Error).message}`);
      }
    }
    return { ...song, lyrics };
  }

  async search(query: string): Promise<{ songs: Song[]; artists: ArtistHit[]; albums: AlbumHit[] }> {
    const like = `%${query.toLowerCase()}%`;
    const songRows = await this.db
      .select({ song: songs, artistName: artists.name, albumName: albums.name })
      .from(songs)
      .leftJoin(artists, eq(songs.artistId, artists.id))
      .leftJoin(albums, eq(songs.albumId, albums.id))
      .where(
        or(
          ilike(songs.title, like),
          ilike(songs.genre, like),
          sql`lower(${artists.name}) like ${like}`,
          sql`lower(${albums.name}) like ${like}`,
        ),
      )
      .orderBy(desc(songs.createdAt))
      .limit(30);
    const artistRows = await this.db
      .select()
      .from(artists)
      .where(ilike(artists.name, like))
      .orderBy(asc(artists.name))
      .limit(15);
    const albumRows = await this.db
      .select({ album: albums, artistName: artists.name })
      .from(albums)
      .leftJoin(artists, eq(albums.artistId, artists.id))
      .where(sql`lower(${albums.name}) like ${like}`)
      .orderBy(asc(albums.name))
      .limit(15);

    return {
      songs: await this.enrich(songRows, new Set()),
      artists: await Promise.all(
        artistRows.map(async (a) => ({
          id: a.id,
          name: a.name,
          artworkStorageKey: a.artworkStorageKey,
          artworkUrl: await this.artworkUrl(a.artworkStorageKey),
        })),
      ),
      albums: await Promise.all(
        albumRows.map(async (r) => ({
          id: r.album.id,
          name: r.album.name,
          artistId: r.album.artistId,
          artistName: r.artistName,
          artworkStorageKey: r.album.artworkStorageKey,
          artworkUrl: await this.artworkUrl(r.album.artworkStorageKey),
          releaseYear: r.album.releaseYear,
        })),
      ),
    };
  }

  // -------------------------------------------------------------------------
  // shared helpers (used by favorites/playlists/history modules)
  // -------------------------------------------------------------------------

  async favoriteIds(userId: string): Promise<Set<string>> {
    const rows = await this.db
      .select({ songId: favorites.songId })
      .from(favorites)
      .where(eq(favorites.userId, userId));
    return new Set(rows.map((r) => r.songId));
  }

  async enrich(
    rows: {
      song: (typeof songs)['$inferSelect'];
      artistName: string | null;
      albumName: string | null;
    }[],
    favoriteIds: Set<string>,
  ): Promise<Song[]> {
    const out: Song[] = [];
    for (const r of rows) {
      out.push(
        mapSong(r.song, { artistName: r.artistName, albumName: r.albumName }, {
          artworkUrl: await this.artworkUrl(r.song.artworkStorageKey),
          isFavorite: favoriteIds.has(r.song.id),
        }),
      );
    }
    return out;
  }
}

export interface ArtistHit {
  id: string;
  name: string;
  artworkStorageKey: string | null;
  artworkUrl: string | null;
}

export interface AlbumHit {
  id: string;
  name: string;
  artistId: string | null;
  artistName: string | null;
  artworkStorageKey: string | null;
  artworkUrl: string | null;
  releaseYear: number | null;
}