import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [SongsModule],
  controllers: [SearchController],
})
export class SearchModule {}