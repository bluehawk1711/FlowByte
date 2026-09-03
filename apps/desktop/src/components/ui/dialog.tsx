import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { X } from '../../lib/icons';
import { cn } from '../../lib/utils';
import { Button } from './button';

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  widthClass = 'max-w-md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  widthClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Only focus the dialog container if nothing inside already has focus (e.g. an autofocus input)
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (ref.current && (!active || !ref.current.contains(active))) {
        ref.current.focus();
      }
    });
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const close = useCallback(() => onClose(), [onClose]);

  if (!open) return null;
  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-backdrop backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-dialog-in w-full rounded-xl border border-line bg-elevated p-5 shadow-elev-3 outline-none',
          widthClass,
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-1">{title}</h2>
          <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}