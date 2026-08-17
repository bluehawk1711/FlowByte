import { useCallback, useRef } from 'react';
import { cn } from '../../lib/utils';

export function Slider({
  value,
  max = 100,
  onChange,
  onCommit,
  className,
  disabled,
}: {
  value: number;
  max?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  className?: string;
  disabled?: boolean;
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
      onChange(ratio * max);
    },
    [max, onChange],
  );

  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      ref={trackRef}
      className={cn('group relative h-4 w-full cursor-pointer touch-none select-none', className)}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
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
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}