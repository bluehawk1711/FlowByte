import { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

/**
 * Global keyboard shortcuts (spec: keyboard support).
 * Space → play/pause · ←/→ → seek ±5s · Ctrl/Cmd+K → open search.
 * Never interferes with text inputs.
 */
export function useGlobalShortcuts(onOpenSearch: () => void) {
  const { togglePlay, seek, position } = usePlayer();
  const seekRef = useRef(seek);
  const posRef = useRef(position);
  seekRef.current = seek;
  posRef.current = position;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
        return;
      }
      if (typing) return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') {
        seekRef.current(posRef.current + 5);
      } else if (e.key === 'ArrowLeft') {
        seekRef.current(posRef.current - 5);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenSearch, togglePlay]);
}