import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlbumsService } from './albums.service';
import type { Album, Song } from '@flowbyte/types';

@ApiTags('albums')
@ApiBearerAuth()
@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get()
  @ApiOperation({ summary: 'List all albums' })
  list(): Promise<Album[]> {
    return this.albumsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Album detail with its songs' })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<{ album: Album; songs: Song[] }> {
    return this.albumsService.getDetail(id);
  }
}