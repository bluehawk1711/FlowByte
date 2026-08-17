import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { Song } from '@flowbyte/types';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List favorite songs' })
  list(@CurrentUser() user: AuthUser): Promise<Song[]> {
    return this.favoritesService.list(user.id);
  }

  @Get(':songId')
  @ApiOperation({ summary: 'Check if a song is favorited' })
  has(@CurrentUser() user: AuthUser, @Param('songId') songId: string): Promise<void> {
    return this.favoritesService.has(user.id, songId);
  }

  @Post(':songId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add song to favorites' })
  add(@CurrentUser() user: AuthUser, @Param('songId') songId: string): Promise<void> {
    return this.favoritesService.add(user.id, songId);
  }

  @Delete(':songId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove song from favorites' })
  remove(@CurrentUser() user: AuthUser, @Param('songId') songId: string): Promise<void> {
    return this.favoritesService.remove(user.id, songId);
  }
}