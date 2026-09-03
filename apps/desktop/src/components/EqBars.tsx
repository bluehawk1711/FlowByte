import { cn } from '../lib/utils';

/**
 * Tiny animated equalizer bars (pure CSS, compositor-only scaleY).
 * Colored via `text-*`/`color` on the parent or `className`; bar color
 * follows `currentColor`. Disabled under prefers-reduced-motion globally.
 */
export function EqBars({
  className,
  bars = 3,
}: {
  className?: string;
  bars?: number;
}) {
  return (
    <span className={cn('eq-bars', className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="eq-bar"
          style={{ animationDelay: `${i * 130}ms` }}
        />
      ))}
    </span>
  );
}
