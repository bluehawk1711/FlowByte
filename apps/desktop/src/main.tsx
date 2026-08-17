import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { DownloadProvider } from './context/DownloadContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PlayerProvider>
        <DownloadProvider>
          <App />
          <Toaster theme="dark" position="bottom-right" richColors />
        </DownloadProvider>
      </PlayerProvider>
    </AuthProvider>
  </StrictMode>,
);