import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** Bulk favorite request (multi-select) — one round trip instead of N parallel calls. */
export class AddFavoritesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  songIds!: string[];
}
