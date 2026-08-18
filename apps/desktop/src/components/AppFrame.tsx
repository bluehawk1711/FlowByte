import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Library,
  Download,
  Home,
  Minus,
  Settings,
  Square,
  X,
  Music2,
  ListVideo,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { NowPlayingBar } from './NowPlayingBar';

export type Page = 'home' | 'library' | 'saved' | 'downloads' | 'settings';

const NAV: Array<{ page: Page; label: string; icon: typeof Home }> = [
  { page: 'home', label: 'Home', icon: Home },
  { page: 'library', label: 'Library', icon: Library },
  { page: 'saved', label: 'Saved', icon: ListVideo },
  { page: 'downloads', label: 'Downloads', icon: Download },
  { page: 'settings', label: 'Settings', icon: Settings },
];

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
  const toggleMaximize = useCallback(
    () => void getCurrentWindow().toggleMaximize(),
    [],
  );
  const close = useCallback(() => void getCurrentWindow().close(), []);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Title bar */}
      <header
        data-tauri-drag-region
        className="flex h-9 shrink-0 items-center border-b border-zinc-800 bg-zinc-900"
      >
        <div className="flex items-center gap-2 pl-3" data-tauri-drag-region>
          <Music2 className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold tracking-wide">Flowbyte</span>
        </div>
        <div className="flex-1" data-tauri-drag-region />
        <div className="flex">
          <Button variant="ghost" size="icon" className="h-8 w-10 rounded-none" onClick={minimize} aria-label="Minimize">
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-10 rounded-none" onClick={toggleMaximize} aria-label="Maximize">
            <Square className={cn('h-3.5 w-3.5', maximized && 'text-blue-400')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-10 rounded-none hover:bg-red-600 hover:text-white"
            onClick={close}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-900 p-2">
          {NAV.map(({ page: p, label, icon: Icon }) => (
            <Button
              key={p}
              variant="ghost"
              className={cn(
                'justify-start gap-3 px-3 py-2 text-sm',
                page === p && 'bg-zinc-800 text-white',
              )}
              onClick={() => onNavigate(p)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
          <div className="flex-1" />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Player bar */}
      <NowPlayingBar />
    </div>
  );
}