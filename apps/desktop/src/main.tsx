import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import App from './App';
import { initTheme } from './lib/theme';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { PlayerProvider } from './context/PlayerContext';
import { DownloadProvider } from './context/DownloadContext';

// Apply the persisted theme before first paint (no flash of default colors).
initTheme();

/** Toaster follows the selected background (dark palettes → dark toasts). */
function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme.background === 'daylight' ? 'light' : 'dark'}
      position="bottom-right"
      richColors
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <DownloadProvider>
            <App />
            <ThemedToaster />
          </DownloadProvider>
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
