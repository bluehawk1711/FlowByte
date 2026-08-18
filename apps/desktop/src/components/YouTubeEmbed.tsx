import { cn } from '../lib/utils';

/**
 * Embedded YouTube player (iframe). Plays a single video via
 * /embed/<videoId> or a whole playlist via /embed/videoseries?list=<id>.
 * Uses the privacy-friendly youtube-nocookie host.
 */
export function YouTubeEmbed({
  videoId,
  playlistId,
  className,
}: {
  videoId?: string | null;
  playlistId?: string | null;
  className?: string;
}) {
  const src = playlistId
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}`
    : videoId
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
      : null;
  if (!src) return null;
  return (
    <div className={cn('aspect-video w-full overflow-hidden rounded-md bg-black', className)}>
      <iframe
        src={src}
        title="YouTube preview"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
