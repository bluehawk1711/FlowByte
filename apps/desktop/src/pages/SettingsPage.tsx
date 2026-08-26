import { useCallback, useState } from 'react';
import { LogOut, MonitorPlay, Server } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, saveSettings } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState(getSettings().apiUrl);
  const [bitrate, setBitrate] = useState(String(getSettings().importBitrate));
  const [transcode, setTranscode] = useState(getSettings().importTranscode);
  const [notify, setNotify] = useState(getSettings().notifyOnComplete);
  const [iframePreview, setIframePreview] = useState(getSettings().iframePreview);

  const save = useCallback(() => {
    saveSettings({
      apiUrl: apiUrl.trim() || getSettings().apiUrl,
      importBitrate: Math.min(320, Math.max(64, Number(bitrate) || 160)),
      importTranscode: transcode,
      notifyOnComplete: notify,
      iframePreview,
    });
    toast.success('Settings saved');
  }, [apiUrl, bitrate, transcode, notify, iframePreview]);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-ink-2">Signed in as {user?.username ?? '…'}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            API server
          </CardTitle>
          <CardDescription>
            Where Flowbyte stores your library. The API must be reachable from this machine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://localhost:3001/api"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Music import</CardTitle>
          <CardDescription>
            Options used when importing YouTube videos into your library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-ink-2">Opus bitrate (kbps)</label>
            <Input
              type="number"
              min={64}
              max={320}
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
            />
            <p className="text-xs text-ink-3">
              Used only when transcoding is enabled. Keeps source codec otherwise.
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="text-ink-2">Transcode to Opus on import</span>
            <input
              type="checkbox"
              checked={transcode}
              onChange={(e) => setTranscode(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="text-ink-2">Notify when a download finishes</span>
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4" />
            YouTube preview
          </CardTitle>
          <CardDescription>
            Embed a YouTube iframe preview when analyzing a link, and when playing saved
            videos. When enabled, the preview shows a download button.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="text-ink-2">Show iframe preview (embed player)</span>
            <input
              type="checkbox"
              checked={iframePreview}
              onChange={(e) => setIframePreview(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button onClick={save}>Save settings</Button>
        <Button variant="ghost" className="gap-2 text-ink-3" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}