import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Download,
  Home,
  Library,
  ListVideo,
  Minus,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { AddMusicModal } from './AddMusicModal';
import { Button } from './ui/button';
import { ExpandedPlayer } from './ExpandedPlayer';
import { LyricsPanel } from './LyricsPanel';
import { NowPlayingBar } from './NowPlayingBar';
import { QueuePanel } from './QueuePanel';
import { TopBar } from './TopBar';
import { createSavedPlaylist, getSavedPlaylists } from '../lib/api';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';

export type Page = 'home' | 'search' | 'library' | 'saved' | 'downloads' | 'settings';

interface NavItem {
  page: Page;
  label: string;
  icon: typeof Home;
}

const PRIMARY_NAV: NavItem[] = [
  { page: 'home', label: 'Home', icon: Home },
  { page: 'search', label: 'Search', icon: Search },
  { page: 'library', label: 'Your Library', icon: Library },
];

const YOUR_MUSIC: NavItem[] = [
  { page: 'downloads', label: 'Downloads', icon: Download },
  { page: 'saved', label: 'Saved', icon: ListVideo },
];

const SIDEBAR_STORAGE_KEY = 'flowbyte.sidebarCollapsed';

export function AppFrame({
  page,
  onNavigate,
  children,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  children: ReactNode;
}) {
  const [maximized, setMaximized] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [playlists, setPlaylists] = useState(() => getSavedPlaylists());
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [addMusicOpen, setAddMusicOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlaylists(getSavedPlaylists());
  }, [page]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useGlobalShortcuts(() => onNavigate('search'));

  useEffect(() => {
    const win = getCurrentWindow();
    void win.isMaximized().then(setMaximized);
    let unlisten: (() => void) | undefined;
    void win.onResized(() => {
      void win.isMaximized().then(setMaximized);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  const minimize = useCallback(() => void getCurrentWindow().minimize(), []);
  const toggleMaximize = useCallback(() => void getCurrentWindow().toggleMaximize(), []);
  const close = useCallback(() => void getCurrentWindow().close(), []);

  const createPlaylist = () => {
    const created = createSavedPlaylist(`My Playlist #${playlists.length + 1}`);
    setPlaylists(getSavedPlaylists());
    toast.success(`Created playlist “${created.name}”`);
    onNavigate('saved');
  };

  const openSearch = () => {
    onNavigate('search');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  return (
    <div className="flex h-screen flex-col bg-app text-ink-1">
      {/* Title bar */}
      <header
        data-tauri-drag-region
        className="flex h-9 shrink-0 items-center border-b border-line bg-sidebar"
      >
        <div className="flex items-center gap-2 pl-3" data-tauri-drag-region>
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent">
            <Music2 className="h-3 w-3 text-accent-fg" />
          </div>
          <span className="text-[13px] font-semibold tracking-wide">Flowbyte</span>
        </div>
        <div className="flex-1" data-tauri-drag-region />
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-10 rounded-none text-ink-2 hover:bg-white/8 hover:text-ink-1"
            onClick={minimize}
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-10 rounded-none text-ink-2 hover:bg-white/8 hover:text-ink-1"
            onClick={toggleMaximize}
            aria-label="Maximize"
          >
            <Square className={cn('h-3.5 w-3.5', maximized && 'text-accent')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-10 rounded-none text-ink-2 hover:bg-danger hover:text-white"
            onClick={close}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-200 ease-out',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          <div className={cn('flex flex-col gap-0.5 px-2 pt-3', collapsed && 'items-center')}>
            {PRIMARY_NAV.map(({ page: p, label, icon: Icon }) => (
              <NavButton
                key={p}
                icon={Icon}
                label={label}
                active={page === p}
                collapsed={collapsed}
                onClick={() => onNavigate(p)}
              />
            ))}
          </div>

          {!collapsed && (
            <>
              <p className="mt-5 px-4 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                Your Music
              </p>
              <div className="flex flex-col gap-0.5 px-2">
                {YOUR_MUSIC.map(({ page: p, label, icon: Icon }) => (
                  <NavButton
                    key={p}
                    icon={Icon}
                    label={label}
                    active={page === p}
                    collapsed={false}
                    onClick={() => onNavigate(p)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            {!collapsed && (
              <>
                <div className="flex items-center justify-between px-4 pb-1 pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                    Playlists
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={createPlaylist}
                    aria-label="Create playlist"
                    title="Create playlist"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
                  {playlists.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-ink-3">
                      No playlists yet — save a video to create one.
                    </p>
                  ) : (
                    playlists.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onNavigate('saved')}
                        title={p.name}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-white/8 hover:text-ink-1',
                        )}
                      >
                        <Play className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                        <span className="truncate">{p.name}</span>
                        <span className="ml-auto text-xs tabular-nums text-ink-3">
                          {p.items.length}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className={cn('border-t border-line p-2', collapsed && 'flex flex-col items-center gap-1')}>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn('w-full justify-start text-ink-2 hover:text-ink-1', !collapsed && 'px-3')}
              onClick={() => onNavigate('settings')}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Settings</span>}
            </Button>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn('mt-1 w-full justify-start text-ink-3', !collapsed && 'px-3')}
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  Collapse
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col bg-content">
          <TopBar onNavigate={openSearch} onAddMusic={() => setAddMusicOpen(true)} searchInputRef={searchInputRef} />
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>

      {/* Global player */}
      <NowPlayingBar
        onToggleQueue={() => setQueueOpen((o) => !o)}
        onToggleLyrics={() => setLyricsOpen((o) => !o)}
        onExpand={() => setExpandedOpen(true)}
      />
      <QueuePanel open={queueOpen} onClose={() => setQueueOpen(false)} />
      <LyricsPanel open={lyricsOpen} onClose={() => setLyricsOpen(false)} />
      <ExpandedPlayer open={expandedOpen} onClose={() => setExpandedOpen(false)} />
      <AddMusicModal open={addMusicOpen} onClose={() => setAddMusicOpen(false)} />
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
        collapsed ? 'justify-center px-0' : 'w-full',
        active
          ? 'bg-accent-soft text-accent-hover'
          : 'text-ink-2 hover:bg-white/8 hover:text-ink-1',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}