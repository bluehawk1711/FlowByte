import { useCallback, useEffect, useRef, useState } from 'react';
import type { IconComponent } from '../../lib/icons';
import { ChevronRight } from '../../lib/icons';
import { cn } from '../../lib/utils';

export interface ContextMenuItem {
  label: string;
  icon?: IconComponent;
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

const EDGE_PAD = 8;

export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [openSub, setOpenSub] = useState<number | null>(null);
  const [subAlign, setSubAlign] = useState<{ flip: boolean; up: boolean; cap?: number } | null>(null);

  // Filter out separator-only items for indexing
  const navigable = items.map((item, i) => ({ item, i })).filter(({ item }) => !item.separator);

  // Reposition if menu would overflow viewport
  useEffect(() => {
    if (!position || !menuRef.current) return;
    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth - EDGE_PAD) {
      el.style.left = `${Math.max(EDGE_PAD, position.x - rect.width)}px`;
    }
    if (rect.bottom > window.innerHeight - EDGE_PAD) {
      el.style.top = `${Math.max(EDGE_PAD, position.y - rect.height)}px`;
    }
  }, [position]);

  // Flip / lift the submenu so it never leaves the viewport.
  useEffect(() => {
    if (openSub === null) {
      setSubAlign(null);
      return;
    }
    // Give React a tick to mount the newly opened submenu, then measure it.
    const raf = requestAnimationFrame(() => {
      const sub = menuRef.current?.querySelector<HTMLElement>('[data-submenu="open"]');
      if (!sub) return;
      const r = sub.getBoundingClientRect();
      const height = r.height;
      const flip = r.right > window.innerWidth - EDGE_PAD;
      // Keep the submenu fully on screen: lift it up when it would run past
      // the bottom, and clamp its height to the space actually available so
      // no entry is left half-visible below the fold.
      let up = false;
      let cap: number | undefined;
      const below = window.innerHeight - EDGE_PAD - r.top;
      const above = r.top - EDGE_PAD;
      if (r.bottom > window.innerHeight - EDGE_PAD) {
        // Prefer opening upward when there's more (or equal) headroom above;
        // otherwise stay anchored down but scroll internally to the space we
        // have. Either way nothing is silently cut off.
        if (above >= below || above >= height) {
          up = true;
          cap = Math.min(height, Math.max(150, above));
        } else {
          cap = Math.min(height, Math.max(150, below));
        }
      }
      setSubAlign((prev) =>
        prev &&
        prev.flip === flip &&
        prev.up === up &&
        prev.cap === cap
          ? prev
          : { flip, up, cap },
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [openSub]);

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

  // Closing on scroll/resize keeps a positioned menu glued to the row that
  // opened it — it can't stay floating while the list moves underneath.
  useEffect(() => {
    if (!position) return;
    const close = () => onClose();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
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
        const subOpen = item.subItems && openSub === navIdx;

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
                  setOpenSub(subOpen ? null : navIdx);
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

            {/* Submenu — flips left / lifts up when it would overflow the screen */}
            {item.subItems && subOpen && (
              <div
                data-submenu="open"
                role="menu"
                className={cn(
                  'absolute top-0 z-10 -mt-1 max-h-[min(60vh,360px)] min-w-[180px] max-w-[280px] overflow-y-auto overflow-x-hidden rounded-lg border border-line bg-elevated py-1.5 shadow-elev-3',
                  subAlign?.flip ? 'left-auto right-full' : 'left-full',
                )}
                style={{
                  width: 'max-content',
                  maxHeight: subAlign?.cap,
                  transform: subAlign?.up ? 'translateY(-100%)' : undefined,
                }}
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
