import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ImportLyricsDto, LyricsService } from './lyrics.service';
import type { NormalizedLyrics } from '@flowbyte/types';

@ApiTags('lyrics')
@ApiBearerAuth()
@Controller('lyrics')
export class LyricsController {
  constructor(private readonly lyricsService: LyricsService) {}

  @Get(':songId')
  @ApiOperation({ summary: 'Get normalized lyrics for a song (null when none)' })
  get(@Param('songId', ParseUUIDPipe) songId: string): Promise<NormalizedLyrics | null> {
    return this.lyricsService.getForSong(songId);
  }

  @Post(':songId/import')
  @HttpCode(200)
  @ApiOperation({ summary: 'Import lyrics from LRC/SRT/VTT/JSON and store normalized' })
  import(
    @Param('songId', ParseUUIDPipe) songId: string,
    @Body() dto: ImportLyricsDto,
  ): Promise<NormalizedLyrics> {
    return this.lyricsService.importForSong(songId, dto);
  }
}