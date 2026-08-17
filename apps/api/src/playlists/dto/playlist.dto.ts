import { IsArray, IsOptional, IsString, MaxLength, MinLength, ArrayUnique } from 'class-validator';

export class CreatePlaylistDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdatePlaylistDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class AddSongDto {
  @IsString()
  @MinLength(1)
  songId: string;
}

export class ReorderSongsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  songIds: string[];
}