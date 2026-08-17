import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  artistName?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  albumName?: string | null;

  @IsOptional()
  @IsString()
  albumArtistId?: string | null;

  @IsNumber()
  @Min(0)
  duration: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trackNumber?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  year?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  codec: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bitrate?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSize: number;

  @IsString()
  @MinLength(1)
  audioStorageKey: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  artworkStorageKey?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lyricsStorageKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  lyricsLanguage?: string | null;

  @IsOptional()
  @IsBoolean()
  lyricsSynced?: boolean;

  @IsString()
  @MinLength(1)
  sourceUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  checksum?: string | null;
}