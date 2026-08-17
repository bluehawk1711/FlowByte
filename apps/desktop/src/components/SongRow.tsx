import { Music2, Play } from 'lucide-react';
import type { Song } from '@flowbyte/types';
import { usePlayer } from '../context/PlayerContext';
import { formatDuration } from '../lib/utils';
import { cn } from '../lib/utils';

export function SongRow({
  song,
  queue,
  index,
}: {
  song: Song;
  queue: Song[];
  index?: number;
}) {
  const { current, playSong } = usePlayer();
  const active = current?.id === song.id;

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-zinc-800',
        active && 'bg-zinc-800/70',
      )}
      onDoubleClick={() => playSong(song, queue)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') playSong(song, queue);
      }}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded">
        {song.artworkUrl || song.cover ? (
          <img
            src={song.artworkUrl ?? song.cover}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            <Music2 className="h-4 w-4 text-zinc-500" />
          </div>
        )}
        <div
          className={cn(
            'absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex',
            active && 'flex',
          )}
        >
          {active ? (
            <span className="h-2 w-2 rounded-full bg-blue-400" />
          ) : (
            <Play className="h-4 w-4 text-white" />
          )}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm', active ? 'text-blue-400' : 'text-zinc-100')}>
          {song.title}
        </p>
        <p className="truncate text-xs text-zinc-400">{song.artistName ?? 'Unknown artist'}</p>
      </div>
      <div className="shrink-0 text-xs text-zinc-500">
        {index != null ? index + 1 : formatDuration(song.duration)}
      </div>
    </div>
  );
}