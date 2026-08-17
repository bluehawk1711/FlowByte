import { Controller, Get, HttpCode, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HistoryService, RecordPlayDto, HistoryQuery } from './history.service';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { PlayHistoryEntry, RecentlyPlayedEntry } from '@flowbyte/types';

@ApiTags('history')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Play history (most recent first)' })
  list(@CurrentUser() user: AuthUser, @Query() query: HistoryQuery): Promise<PlayHistoryEntry[]> {
    return this.historyService.list(user.id, query.limit ?? 50);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Recently played songs (deduplicated, with play counts)' })
  recent(
    @CurrentUser() user: AuthUser,
    @Query() query: HistoryQuery,
  ): Promise<RecentlyPlayedEntry[]> {
    return this.historyService.recentlyPlayed(user.id, query.limit ?? 20);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a play' })
  record(@CurrentUser() user: AuthUser, @Body() dto: RecordPlayDto): Promise<PlayHistoryEntry> {
    return this.historyService.record(user.id, dto);
  }
}