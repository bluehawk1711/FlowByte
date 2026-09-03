import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Song metadata patch. Every field is optional — only the provided values are
 * applied. Empty strings clear the corresponding value (artist/album/genre);
 * `year` accepts only a 4-digit value and is omitted when absent.
 */
export class UpdateSongDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  /** Artist display name; empty string clears the artist link. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  artistName?: string;

  /** Album display name; empty string clears the album link. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  albumName?: string;

  /** Genre tag; empty string clears it. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  genre?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
  year?: number;

  /** Storage key returned by `POST /uploads/artwork`; null removes artwork. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  artworkStorageKey?: string | null;
}
