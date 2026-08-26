import { useCallback, useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  /** Items for a submenu (hover to reveal). */
  subItems?: ContextMenuItem[];
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [openSub, setOpenSub] = useState<number | null>(null);

  // Filter out separator-only items for indexing
  const navigable = items.map((item, i) => ({ item, i })).filter(({ item }) => !item.separator);

  // Reposition if menu would overflow viewport
  useEffect(() => {
    if (!position || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const pad = 8;
    if (rect.right > window.innerWidth - pad) {
      el.style.left = `${Math.max(pad, position.x - rect.width)}px`;
    }
    if (rect.bottom > window.innerHeight - pad) {
      el.style.top = `${Math.max(pad, position.y - rect.height)}px`;
    }
  }, [position]);

  // Click outside
  useEffect(() => {
    if (!position) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [position, onClose]);

  // Escape to close
  useEffect(() => {
    if (!position) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [position, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const count = navigable.length;
      if (count === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setFocusIndex((i) => {
            const next = (i + 1) % count;
            setOpenSub(navigable[next].item.subItems ? next : null);
            return next;
          });
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setFocusIndex((i) => {
            const next = (i - 1 + count) % count;
            setOpenSub(navigable[next].item.subItems ? next : null);
            return next;
          });
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (focusIndex >= 0 && focusIndex < count) {
            const item = navigable[focusIndex].item;
            if (item.subItems) setOpenSub(focusIndex);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          setOpenSub(null);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (focusIndex >= 0 && focusIndex < count) {
            const item = navigable[focusIndex].item;
            if (item.subItems) {
              setOpenSub(openSub === focusIndex ? null : focusIndex);
            } else if (!item.disabled && item.onClick) {
              item.onClick();
              onClose();
            }
          }
          break;
        }
      }
    },
    [navigable, focusIndex, openSub, onClose],
  );

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Actions"
      className={cn(
        'animate-fade-in-up fixed z-[100] min-w-[200px] rounded-lg border border-line bg-elevated py-1.5 shadow-elev-3',
        'outline-none',
      )}
      style={{ left: position.x, top: position.y }}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={`sep-${i}`} className="my-1 border-t border-line" />;
        }

        const navIdx = navigable.findIndex((n) => n.i === i);
        const isActive = navIdx === focusIndex;
        const Icon = item.icon;

        return (
          <div key={i} className="relative">
            <button
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-1.5 text-sm transition-colors duration-75',
                item.disabled && 'cursor-not-allowed opacity-40',
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-ink-1 hover:bg-white/8',
                isActive && !item.danger && 'bg-white/8',
                isActive && item.danger && 'bg-danger/10',
              )}
              onMouseEnter={() => {
                setFocusIndex(navIdx);
                setOpenSub(item.subItems ? navIdx : null);
              }}
              onClick={() => {
                if (item.disabled) return;
                if (item.subItems) {
                  setOpenSub(openSub === navIdx ? null : navIdx);
                } else {
                  item.onClick?.();
                  onClose();
                }
              }}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              <span className="flex-1 text-left">{item.label}</span>
              {item.subItems && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
              )}
            </button>

            {/* Submenu */}
            {item.subItems && openSub === navIdx && (
              <div
                role="menu"
                className={cn(
                  'absolute left-full top-0 -mt-1.5 min-w-[180px] rounded-lg border border-line bg-elevated py-1.5 shadow-elev-3',
                )}
              >
                {item.subItems.map((sub, si) => (
                  <button
                    key={si}
                    role="menuitem"
                    tabIndex={-1}
                    disabled={sub.disabled}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-75',
                      sub.disabled
                        ? 'cursor-not-allowed opacity-40'
                        : 'text-ink-1 hover:bg-white/8',
                    )}
                    onClick={() => {
                      if (!sub.disabled) {
                        sub.onClick?.();
                        onClose();
                      }
                    }}
                  >
                    {sub.icon && <sub.icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
