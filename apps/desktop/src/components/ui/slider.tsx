import { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

export function Slider({
  value,
  max = 100,
  onChange,
  onCommit,
  className,
  disabled,
  ariaLabel,
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = ratio * max;
      onChange(next);
      valueRef.current = next;
    },
    [max, onChange],
  );

  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = max > 0 ? max / 100 : 1;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowLeft':
        next = value - step;
        break;
      case 'ArrowRight':
        next = value + step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = max;
        break;
    }
    if (next === null) return;
    e.preventDefault();
    const clamped = Math.min(max, Math.max(0, next));
    onChange(clamped);
    onCommit?.(clamped);
  };

  return (
    <div
      ref={trackRef}
      className={cn('group relative h-4 w-full cursor-pointer touch-none select-none', className)}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => {
        if (disabled) return;
        setFromClientX(e.clientX);
        const move = (ev: MouseEvent) => setFromClientX(ev.clientX);
        const up = () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
          onCommit?.(valueRef.current);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      }}
    >
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent group-hover:bg-accent-hover"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-elev-1 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}
