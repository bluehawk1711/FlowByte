import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlaybackService, SyncPlaybackDto } from './playback.service';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { PlaybackState } from '@flowbyte/types';

@ApiTags('playback')
@ApiBearerAuth()
@Controller('playback')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Get('state')
  @ApiOperation({ summary: 'Current playback state (cross-device resume)' })
  get(@CurrentUser() user: AuthUser): Promise<PlaybackState> {
    return this.playbackService.get(user.id);
  }

  @Put('state')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sync playback state (call ~every 10-15s + on events)' })
  sync(@CurrentUser() user: AuthUser, @Body() dto: SyncPlaybackDto): Promise<PlaybackState> {
    return this.playbackService.sync(user.id, dto);
  }
}