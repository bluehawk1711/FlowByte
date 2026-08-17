import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SongsService } from './songs.service';
import { ListSongsQuery } from './dto/list-songs.dto';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { Paginated, Song, SongWithLyrics } from '@flowbyte/types';

@ApiTags('songs')
@ApiBearerAuth()
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  @ApiOperation({ summary: 'List songs (paginated, searchable)' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListSongsQuery): Promise<Paginated<Song>> {
    return this.songsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single song' })
  findOne(@Param('id') id: string): Promise<Song> {
    return this.songsService.findById(id);
  }

  @Get(':id/lyrics')
  @ApiOperation({ summary: 'Get a song with normalized lyrics (if any)' })
  findOneWithLyrics(@Param('id') id: string): Promise<SongWithLyrics> {
    return this.songsService.getWithLyrics(id);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Get a signed streaming URL (authorized before issuing)' })
  stream(@Param('id') id: string): Promise<{ url: string; expiresIn: number }> {
    return this.songsService.getStreamInfo(id);
  }
}