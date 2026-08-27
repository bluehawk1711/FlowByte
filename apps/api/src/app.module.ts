import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { AlbumsModule } from './albums/albums.module';
import { ArtistsModule } from './artists/artists.module';
import { CacheModule } from './cache/cache.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DbModule } from './db/db.module';
import { DevicesModule } from './devices/devices.module';
import { FavoritesModule } from './favorites/favorites.module';
import { HistoryModule } from './history/history.module';
import { LyricsModule } from './lyrics/lyrics.module';
import { PlaybackModule } from './playback/playback.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SearchModule } from './search/search.module';
import { SongsModule } from './songs/songs.module';
import { StorageModule } from './storage/storage.module';
import { StorageController } from './storage/storage.controller';
import { GoogleDriveModule } from './storage/google-drive/google-drive.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    }),
    DbModule,
    StorageModule,
    CacheModule,
    AuthModule,
    DevicesModule,
    SongsModule,
    ArtistsModule,
    AlbumsModule,
    FavoritesModule,
    PlaylistsModule,
    HistoryModule,
    PlaybackModule,
    LyricsModule,
    UploadsModule,
    SearchModule,
    RealtimeModule,
    GoogleDriveModule,
  ],
  controllers: [StorageController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}