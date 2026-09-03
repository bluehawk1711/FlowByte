import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import CursorFollow from './components/ui/smoothui/cursor-follow';
import { getSettings, subscribeSettings } from './lib/api';
import { useAuth } from './context/AuthContext';
import { AppFrame, type Page } from './components/AppFrame';
import { MiniPlayer } from './components/mini/MiniPlayer';
import { AuthPage } from './pages/AuthPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { ProfilePage } from './pages/ProfilePage';
import { SavedPage } from './pages/SavedPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { loading, isAuthed } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [isMini, setIsMini] = useState(false);
  const [cursorFollow, setCursorFollow] = useState(() => getSettings().cursorFollow);
  const reduceMotion = useReducedMotion();

  const onSettingsChange = useCallback(() => {
    setCursorFollow(getSettings().cursorFollow);
  }, []);

  useEffect(() => subscribeSettings(onSettingsChange), [onSettingsChange]);

  useEffect(() => {
    try {
      setIsMini(getCurrentWindow().label === 'mini');
    } catch {
      // Running outside Tauri (e.g. browser dev)
    }
  }, []);

  if (isMini) {
    return <MiniPlayer />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-app text-ink-2">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return <AuthPage />;
  }

  const pageView = () => {
    switch (page) {
      case 'home':
        return <HomePage />;
      case 'search':
        return <SearchPage />;
      case 'library':
        return <LibraryPage />;
      case 'profile':
        return <ProfilePage onOpenSettings={() => setPage('settings')} />;
      case 'saved':
        return <SavedPage />;
      case 'downloads':
        return <DownloadsPage />;
      case 'settings':
        return <SettingsPage />;
    }
  };

  const shell = (
    <MotionConfig reducedMotion="user">
      <AppFrame page={page} onNavigate={setPage}>
        {/* Spring page transitions (critical-damped, interruptible). Fades only
            when the user prefers reduced motion. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: 'spring', bounce: 0, duration: 0.35 }
            }
          >
            {pageView()}
          </motion.div>
        </AnimatePresence>
      </AppFrame>
    </MotionConfig>
  );

  // Cursor follow is opt-in from Settings — when on, the accent dot replaces
  // the native cursor over the whole shell (respects prefers-reduced-motion).
  return cursorFollow && !reduceMotion ? <CursorFollow>{shell}</CursorFollow> : shell;
}