import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  bigint,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_username_unique').on(t.username),
    uniqueIndex('users_email_unique').on(t.email),
  ],
);

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    platform: text('platform').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('devices_user_idx').on(t.userId)],
);

// ---------------------------------------------------------------------------
// Artists / Albums
// ---------------------------------------------------------------------------

export const artists = pgTable('artists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  artworkStorageKey: text('artwork_storage_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    artistId: uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
    artworkStorageKey: text('artwork_storage_key'),
    releaseYear: integer('release_year'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('albums_artist_name_unique').on(t.artistId, t.name),
    index('albums_artist_idx').on(t.artistId),
  ],
);

// ---------------------------------------------------------------------------
// Songs
// ---------------------------------------------------------------------------

export const songs = pgTable(
  'songs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    artistId: uuid('artist_id').references(() => artists.id, { onDelete: 'set null' }),
    albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),
    duration: doublePrecision('duration').notNull().default(0),
    trackNumber: integer('track_number'),
    year: integer('year'),
    genre: text('genre'),
    language: text('language'),
    codec: text('codec'),
    bitrate: integer('bitrate'),
    fileSize: bigint('file_size', { mode: 'number' }),
    audioStorageKey: text('audio_storage_key').notNull(),
    artworkStorageKey: text('artwork_storage_key'),
    lyricsStorageKey: text('lyrics_storage_key'),
    lyricsLanguage: text('lyrics_language'),
    lyricsSynced: boolean('lyrics_synced').notNull().default(false),
    sourceUrl: text('source_url'),
    sourceId: text('source_id'),
    checksum: text('checksum'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('songs_audio_key_unique').on(t.audioStorageKey),
    uniqueIndex('songs_source_id_unique').on(t.sourceId),
    uniqueIndex('songs_source_url_unique').on(t.sourceUrl),
    index('songs_artist_idx').on(t.artistId),
    index('songs_album_idx').on(t.albumId),
    index('songs_title_idx').on(t.title),
    index('songs_created_idx').on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    songId: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.songId] }),
    index('favorites_song_idx').on(t.songId),
  ],
);

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

export const playlists = pgTable(
  'playlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    artworkStorageKey: text('artwork_storage_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('playlists_user_idx').on(t.userId)],
);

export const playlistSongs = pgTable(
  'playlist_songs',
  {
    playlistId: uuid('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    songId: uuid('song_id')
      .notNull()
      .references(() => songs.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.playlistId, t.songId] }),
    index('playlist_songs_song_idx').on(t.songId),
  ],
);

// ---------------------------------------------------------------------------
// Play history
// ---------------------------------------------------------------------------

export const playHistory = pgTable(
  'play_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    songId: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationPlayed: integer('duration_played'),
  },
  (t) => [index('play_history_user_started_idx').on(t.userId, t.startedAt)],
);

// ---------------------------------------------------------------------------
// Playback state (one row per user — latest wins)
// ---------------------------------------------------------------------------

export const playbackState = pgTable(
  'playback_state',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    songId: uuid('song_id').references(() => songs.id, { onDelete: 'set null' }),
    position: integer('position').notNull().default(0),
    isPlaying: boolean('is_playing').notNull().default(false),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('playback_state_song_idx').on(t.songId)],
);

// ---------------------------------------------------------------------------
// Cloud storage tokens (OAuth — Google Drive, etc.)
// ---------------------------------------------------------------------------

export const cloudTokens = pgTable(
  'cloud_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google-drive'
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    scope: text('scope'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('cloud_tokens_user_provider_unique').on(t.userId, t.provider),
  ],
);

// ---------------------------------------------------------------------------
// User storage preferences (default provider per user)
// ---------------------------------------------------------------------------

export const userStoragePreferences = pgTable(
  'user_storage_preferences',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    defaultProvider: text('default_provider').notNull().default('local'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  playlists: many(playlists),
  favorites: many(favorites),
  history: many(playHistory),
}));

export const artistsRelations = relations(artists, ({ many }) => ({
  albums: many(albums),
  songs: many(songs),
}));

export const albumsRelations = relations(albums, ({ one, many }) => ({
  artist: one(artists, { fields: [albums.artistId], references: [artists.id] }),
  songs: many(songs),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  artist: one(artists, { fields: [songs.artistId], references: [artists.id] }),
  album: one(albums, { fields: [songs.albumId], references: [albums.id] }),
  favorites: many(favorites),
}));

export const devicesRelations = relations(devices, ({ one }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, { fields: [playlists.userId], references: [users.id] }),
  songs: many(playlistSongs),
}));

export const playlistSongsRelations = relations(playlistSongs, ({ one }) => ({
  playlist: one(playlists, { fields: [playlistSongs.playlistId], references: [playlists.id] }),
  song: one(songs, { fields: [playlistSongs.songId], references: [songs.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  song: one(songs, { fields: [favorites.songId], references: [songs.id] }),
}));

export const playHistoryRelations = relations(playHistory, ({ one }) => ({
  user: one(users, { fields: [playHistory.userId], references: [users.id] }),
  song: one(songs, { fields: [playHistory.songId], references: [songs.id] }),
  device: one(devices, { fields: [playHistory.deviceId], references: [devices.id] }),
}));

export const cloudTokensRelations = relations(cloudTokens, ({ one }) => ({
  user: one(users, { fields: [cloudTokens.userId], references: [users.id] }),
}));

export const userStoragePreferencesRelations = relations(userStoragePreferences, ({ one }) => ({
  user: one(users, { fields: [userStoragePreferences.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type PlaylistSong = typeof playlistSongs.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type PlayHistory = typeof playHistory.$inferSelect;
export type PlaybackState = typeof playbackState.$inferSelect;
export type CloudToken = typeof cloudTokens.$inferSelect;
export type NewCloudToken = typeof cloudTokens.$inferInsert;
export type UserStoragePreference = typeof userStoragePreferences.$inferSelect;