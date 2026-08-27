import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArtistsService } from './artists.service';
import type { Album, Artist, Song } from '@flowbyte/types';

@ApiTags('artists')
@ApiBearerAuth()
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  @ApiOperation({ summary: 'List all artists with song/album counts' })
  list(): Promise<Artist[]> {
    return this.artistsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Artist detail with songs and albums' })
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<{ artist: Artist; songs: Song[]; albums: Album[] }> {
    return this.artistsService.getDetail(id);
  }
}