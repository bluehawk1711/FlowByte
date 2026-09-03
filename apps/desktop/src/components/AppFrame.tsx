import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  CircleUserRound,
  Download,
  Home,
  Library,
  ListVideo,
  Minus,
  MoreHorizontal,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  Plus,
  Search,
  Settings,
  Square,
  Trash2,
  X,
} from '../lib/icons';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { AddMusicModal } from './AddMusicModal';
import { Button } from './ui/button';
import { ContextMenu, type ContextMenuItem } from './ui/context-menu';
import { Dialog } from './ui/dialog';
import { ExpandedPlayer } from './ExpandedPlayer';
import { LyricsPanel } from './LyricsPanel';
import { NowPlayingBar } from './NowPlayingBar';
import { QueuePanel } from './QueuePanel';
import { TopBar } from './TopBar';
import {
  createSavedPlaylist,
  deleteSavedPlaylist,
  getSavedPlaylists,
  renameSavedPlaylist,
  subscribeSavedPlaylists,
} from '../lib/api';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { isTerminal, useDownloads } from '../context/DownloadContext';

export type Page = 'home' | 'search' | 'library' | 'saved' | 'downloads' | 'settings' | 'profile';

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
  { page: 'profile', label: 'Profile', icon: CircleUserRound },
];

const SIDEBAR_STORAGE_KEY = 'flowbyte.sidebarCollapsed';
const SIDEBAR_WIDTH_KEY = 'flowbyte.sidebarWidth';
const SIDEBAR_WIDTH_DEFAULT = 240;
const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 460;

function clampSidebarWidth(w: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, w));
}

function loadSidebarWidth(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) ?? '', 10);
    return Number.isFinite(n) ? clampSidebarWidth(n) : SIDEBAR_WIDTH_DEFAULT;
  } catch {
    return SIDEBAR_WIDTH_DEFAULT;
  }
}

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
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [addMusicOpen, setAddMusicOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [playlistMenu, setPlaylistMenu] = useState<{ id: string; name: string; x: number; y: number } | null>(null);
  const [renamingPlaylist, setRenamingPlaylist] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Managed tooltip for collapsed sidebar icons (fixed-position so it can
  // escape the playlist scroll container, which would clip CSS tooltips).
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

  // Tasks running right now (downloads + imports, queued or active) for the badge.
  const { jobs: taskJobs } = useDownloads();
  const activeTaskCount = taskJobs.filter((j) => !isTerminal(j.progress.status)).length;

  // Live-sync the playlist rail with mutations from anywhere (Saved page,
  // Add Music modal, context menus, etc.).
  useEffect(() => {
    return subscribeSavedPlaylists(() => setPlaylists(getSavedPlaylists()));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
    // Hovering icons while the sidebar reflows can leave a stale tooltip behind.
    setTooltip(null);
  }, [collapsed]);

  useGlobalShortcuts(() => onNavigate('search'));

  useEffect(() => {
    try {
      const win = getCurrentWindow();
      void win.isMaximized().then(setMaximized);
      let unlisten: (() => void) | undefined;
      void win.onResized(() => {
        void win.isMaximized().then(setMaximized);
      }).then((fn) => {
        unlisten = fn;
      });
      return () => unlisten?.();
    } catch {
      return undefined;
    }
  }, []);

  const minimize = useCallback(() => { try { getCurrentWindow().minimize(); } catch {} }, []);
  const toggleMaximize = useCallback(() => { try { getCurrentWindow().toggleMaximize(); } catch {} }, []);
  const close = useCallback(() => { try { getCurrentWindow().close(); } catch {} }, []);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(SIDEBAR_WIDTH_DEFAULT);
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(SIDEBAR_WIDTH_DEFAULT));
    } catch {
      /* ignore */
    }
  }, []);

  const createPlaylist = () => {
    const created = createSavedPlaylist(`My Playlist #${playlists.length + 1}`);
    setPlaylists(getSavedPlaylists());
    toast.success(`Created playlist “${created.name}”`);
    onNavigate('saved');
  };

  const showTip = useCallback(
    (label: string) => (e: ReactMouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTooltip({ label, x: Math.round(r.right + 10), y: Math.round(r.top + r.height / 2) });
    },
    [],
  );
  const hideTip = useCallback(() => setTooltip(null), []);

  const openSearch = () => {
    onNavigate('search');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  // TopBar children ask for a page by name (e.g. avatar → 'settings').
  // Navigate there, and when it's the search page also focus the search box.
  const handleTopBarNavigate = useCallback(
    (p: 'home' | 'search' | 'settings' | 'profile') => {
      if (p === 'search') openSearch();
      else onNavigate(p);
    },
    [openSearch, onNavigate],
  );

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
            'relative flex shrink-0 flex-col border-r border-line bg-sidebar transition-[width] duration-200 ease-out',
            resizing && 'select-none transition-none',
          )}
          style={{ width: collapsed ? 64 : sidebarWidth }}
        >
          {/* Primary nav — always visible, icon rows when collapsed */}
          <div className={cn('flex flex-col gap-0.5 pt-3', collapsed ? 'items-center px-2' : 'px-2')}>
            {PRIMARY_NAV.map(({ page: p, label, icon: Icon }) => (
              <NavButton
                key={p}
                icon={Icon}
                label={label}
                active={page === p}
                collapsed={collapsed}
                onClick={() => onNavigate(p)}
                onTip={collapsed ? showTip(label) : undefined}
                onTipLeave={collapsed ? hideTip : undefined}
              />
            ))}
          </div>

          {/* Your Music — kept reachable when collapsed (icons only) */}
          {collapsed ? (
            <div className="mx-2 mt-3 h-px bg-line" />
          ) : (
            <p className="mt-5 px-4 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
              Your Music
            </p>
          )}
          <div className={cn('flex flex-col gap-0.5', collapsed ? 'items-center px-2 pt-2' : 'px-2 pt-1')}>
            {YOUR_MUSIC.map(({ page: p, label, icon: Icon }) => (
              <NavButton
                key={p}
                icon={Icon}
                label={label}
                active={page === p}
                collapsed={collapsed}
                onClick={() => onNavigate(p)}
                onTip={collapsed ? showTip(label) : undefined}
                onTipLeave={collapsed ? hideTip : undefined}
                badge={p === 'downloads' ? activeTaskCount : undefined}
              />
            ))}
          </div>

          {/* Playlists — scoped list when expanded, icon tiles when collapsed */}
          <div className="flex min-h-0 flex-1 flex-col pt-2">
            {collapsed ? (
              <>
                <div className="mx-2 h-px bg-line" />
                <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto px-2 py-2 [scrollbar-gutter:stable]">
                  <button
                    onClick={createPlaylist}
                    onMouseEnter={showTip('Create playlist')}
                    onMouseLeave={hideTip}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-white/8 hover:text-ink-1"
                    aria-label="Create playlist"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {playlists.map((p) => {
                    const cover = p.items[0]?.thumbnail;
                    return (
                      <button
                        key={p.id}
                        onClick={() => onNavigate('saved')}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setPlaylistMenu({ id: p.id, name: p.name, x: e.clientX, y: e.clientY });
                        }}
                        onMouseEnter={showTip(`${p.name} · ${p.items.length}`)}
                        onMouseLeave={hideTip}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/8"
                        aria-label={`Open playlist ${p.name} (right-click for options)`}
                      >
                        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-gradient-to-br from-accent/60 to-elevated">
                          {cover ? (
                            <img
                              src={cover}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Play className="h-3 w-3 text-accent-fg/80" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
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
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2 [scrollbar-gutter:stable]">
                  {playlists.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-ink-3">
                      No playlists yet — save a video to create one.
                    </p>
                  ) : (
                    playlists.map((p) => (
                      <div
                        key={p.id}
                        className={cn(
                          'group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-ink-2 transition-colors duration-150 hover:bg-white/8 hover:text-ink-1',
                        )}
                      >
                        <button
                          onClick={() => onNavigate('saved')}
                          title={p.name}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <Play className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                          <span className="truncate">{p.name}</span>
                          <span className="ml-auto text-xs tabular-nums text-ink-3">
                            {p.items.length}
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistMenu({ id: p.id, name: p.name, x: e.clientX, y: e.clientY });
                          }}
                          className="shrink-0 rounded p-0.5 text-ink-3 opacity-0 transition-opacity hover:text-ink-1 group-hover:opacity-100"
                          aria-label={`Options for ${p.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer: settings + collapse toggle (icons centered when collapsed) */}
          <div className={cn('border-t border-line p-2', collapsed && 'flex flex-col items-center gap-1')}>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn(
                'text-ink-2 hover:text-ink-1',
                collapsed ? 'justify-center' : 'w-full justify-start px-3',
              )}
              onClick={() => onNavigate('settings')}
              aria-label="Settings"
              onMouseEnter={collapsed ? showTip('Settings') : undefined}
              onMouseLeave={collapsed ? hideTip : undefined}
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span>Settings</span>}
            </Button>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn(
                'mt-1 text-ink-3',
                collapsed ? 'justify-center' : 'w-full justify-start px-3',
              )}
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onMouseEnter={collapsed ? showTip('Expand sidebar') : undefined}
              onMouseLeave={collapsed ? hideTip : undefined}
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

          {/* Resize handle (expanded only) — drag to resize, double-click to reset */}
          {!collapsed && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              title="Drag to resize · double-click to reset"
              className="group absolute -right-1.5 top-0 z-30 h-full w-3 cursor-col-resize touch-none"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
                setResizing(true);
              }}
              onPointerMove={(e) => {
                if (!dragRef.current) return;
                setSidebarWidth(
                  clampSidebarWidth(
                    dragRef.current.startWidth + (e.clientX - dragRef.current.startX),
                  ),
                );
              }}
              onPointerUp={() => {
                dragRef.current = null;
                setResizing(false);
                try {
                  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
                } catch {
                  /* ignore */
                }
              }}
              onDoubleClick={resetSidebarWidth}
            >
              <div className="absolute inset-y-0 right-1/2 w-px translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-accent/60" />
            </div>
          )}
        </aside>

        {/* Content column */}
        <div className="flex min-w-0 flex-1 flex-col bg-content">
          <TopBar onNavigate={handleTopBarNavigate} onAddMusic={() => setAddMusicOpen(true)} searchInputRef={searchInputRef} />
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

      {/* Managed tooltip for collapsed sidebar entries */}
      {tooltip && (
        <div
          role="tooltip"
          aria-hidden
          className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-md border border-line bg-elevated px-2 py-1 text-xs font-medium text-ink-1 shadow-elev-3"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}
        </div>
      )}

      <ContextMenu
        position={playlistMenu ? { x: playlistMenu.x, y: playlistMenu.y } : null}
        onClose={() => setPlaylistMenu(null)}
        items={
          playlistMenu
            ? [
                {
                  label: 'Rename',
                  icon: Pencil,
                  onClick: () => {
                    setRenamingPlaylist({ id: playlistMenu.id, name: playlistMenu.name });
                    setRenameValue(playlistMenu.name);
                  },
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  danger: true,
                  onClick: () => {
                    deleteSavedPlaylist(playlistMenu.id);
                    setPlaylists(getSavedPlaylists());
                    toast.success(`Deleted "${playlistMenu.name}"`);
                  },
                },
              ]
            : []
        }
      />

      {renamingPlaylist && (
        <Dialog
          open
          onClose={() => setRenamingPlaylist(null)}
          title="Rename Playlist"
          widthClass="max-w-sm"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameSavedPlaylist(renamingPlaylist.id, renameValue);
              setPlaylists(getSavedPlaylists());
              setRenamingPlaylist(null);
              toast.success('Playlist renamed');
            }}
            className="flex flex-col gap-3"
          >
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink-1 outline-none focus:border-accent"
              placeholder="Playlist name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setRenamingPlaylist(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameValue.trim()}>
                Save
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  onTip,
  onTipLeave,
  badge,
}: {
  icon: typeof Home;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  onTip?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  onTipLeave?: () => void;
  /** Small count chip shown when > 0 (e.g. running download tasks). */
  badge?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={onTip}
      onMouseLeave={onTipLeave}
      whileTap={{ scale: 0.97 }}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'relative flex shrink-0 items-center rounded-md text-sm font-medium transition-colors duration-150',
        collapsed ? 'h-9 w-9 justify-center' : 'w-full gap-3 px-3 py-2',
        active
          ? 'text-accent-hover'
          : 'text-ink-2 hover:bg-white/8 hover:text-ink-1',
      )}
    >
      {/* Active pill springs between nav items (shared layoutId) */}
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
          className="absolute inset-0 rounded-md bg-accent-soft"
          aria-hidden
        />
      )}
      <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
      {!collapsed && (
        <span className="relative z-10 truncate">{label}</span>
      )}
      {badge != null && badge > 0 && !collapsed && (
        <span
          className="relative z-10 ml-auto shrink-0 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-accent"
          aria-label={`${badge} active tasks`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {badge != null && badge > 0 && collapsed && (
        <span
          className="absolute -right-0.5 -top-0.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-accent-fg"
          aria-label={`${badge} active tasks`}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}