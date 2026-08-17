import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlaylistsService } from './playlists.service';
import { AddSongDto, CreatePlaylistDto, ReorderSongsDto, UpdatePlaylistDto } from './dto/playlist.dto';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { Playlist, PlaylistDetail } from '@flowbyte/types';

@ApiTags('playlists')
@ApiBearerAuth()
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  @ApiOperation({ summary: 'List playlists' })
  list(@CurrentUser() user: AuthUser): Promise<Playlist[]> {
    return this.playlistsService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Playlist detail with ordered songs' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<PlaylistDetail> {
    return this.playlistsService.getDetail(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a playlist' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePlaylistDto): Promise<Playlist> {
    return this.playlistsService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename / update a playlist' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    return this.playlistsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a playlist' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.playlistsService.remove(user.id, id);
  }

  @Post(':id/songs')
  @HttpCode(200)
  @ApiOperation({ summary: 'Add a song to a playlist' })
  addSong(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddSongDto,
  ): Promise<void> {
    return this.playlistsService.addSong(user.id, id, dto.songId);
  }

  @Delete(':id/songs/:songId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a song from a playlist' })
  removeSong(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('songId') songId: string,
  ): Promise<void> {
    return this.playlistsService.removeSong(user.id, id, songId);
  }

  @Put(':id/songs/order')
  @ApiOperation({ summary: 'Reorder playlist songs' })
  reorder(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReorderSongsDto,
  ): Promise<void> {
    return this.playlistsService.reorder(user.id, id, dto.songIds);
  }
}