import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { SongsService } from '../songs/songs.service';
import type { Album, Artist, Song } from '@flowbyte/types';

export class SearchQuery {
  @IsString()
  @MinLength(1)
  q: string;
}

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  @ApiOperation({ summary: 'Search songs, artists and albums (PostgreSQL) ' })
  search(@Query() query: SearchQuery): Promise<{ songs: Song[]; artists: Artist[]; albums: Album[] }> {
    return this.songsService.search(query.q);
  }
}