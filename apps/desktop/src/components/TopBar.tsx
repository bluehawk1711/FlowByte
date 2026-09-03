import { Plus, Search } from '../lib/icons';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function TopBar({
  onNavigate,
  onAddMusic,
  searchInputRef,
}: {
  onNavigate: (p: 'home' | 'search' | 'settings' | 'profile') => void;
  onAddMusic: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { user } = useAuth();
  const initial = (user?.username ?? user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-content px-4">
      <div
        className="group relative max-w-md flex-1 cursor-text"
        onClick={() => searchInputRef.current?.focus()}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <Input
          ref={searchInputRef}
          className="h-9 cursor-pointer rounded-full border-line bg-card pl-9 pr-14 text-sm focus:cursor-text"
          placeholder="Search your library"
          readOnly
          onFocus={() => onNavigate('search')}
          aria-label="Search (Ctrl+K)"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 flex h-5 -translate-y-1/2 items-center rounded border border-line bg-elevated px-1.5 text-[10px] font-medium text-ink-3">
          Ctrl K
        </kbd>
      </div>

      <div className="flex-1" />

      <Button onClick={onAddMusic}>
        <Plus className="h-4 w-4" />
        Add Music
      </Button>

      <button
        onClick={() => onNavigate('profile')}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-fg transition-transform duration-150 hover:scale-105 active:scale-95"
        aria-label="Open profile"
        title={user?.username ?? user?.email}
      >
        {initial}
      </button>
    </div>
  );
}