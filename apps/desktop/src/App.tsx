import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAuth } from './context/AuthContext';
import { AppFrame, type Page } from './components/AppFrame';
import { MiniPlayer } from './components/mini/MiniPlayer';
import { AuthPage } from './pages/AuthPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { SavedPage } from './pages/SavedPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { loading, isAuthed } = useAuth();
  const [page, setPage] = useState<Page>('home');
  const [isMini, setIsMini] = useState(false);

  useEffect(() => {
    setIsMini(getCurrentWindow().label === 'mini');
  }, []);

  if (isMini) {
    return <MiniPlayer />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return <AuthPage />;
  }

  return (
    <AppFrame page={page} onNavigate={setPage}>
      {page === 'home' && <HomePage />}
      {page === 'library' && <LibraryPage />}
      {page === 'saved' && <SavedPage />}
      {page === 'downloads' && <DownloadsPage />}
      {page === 'settings' && <SettingsPage />}
    </AppFrame>
  );
}