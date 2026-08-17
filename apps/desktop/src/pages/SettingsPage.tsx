import { useCallback, useState } from 'react';
import { LogOut, Server } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, saveSettings } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/card';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState(getSettings().apiUrl);
  const [bitrate, setBitrate] = useState(String(getSettings().importBitrate));
  const [transcode, setTranscode] = useState(getSettings().importTranscode);
  const [notify, setNotify] = useState(getSettings().notifyOnComplete);

  const save = useCallback(() => {
    saveSettings({
      apiUrl: apiUrl.trim() || getSettings().apiUrl,
      importBitrate: Math.min(320, Math.max(64, Number(bitrate) || 160)),
      importTranscode: transcode,
      notifyOnComplete: notify,
    });
    toast.success('Settings saved');
  }, [apiUrl, bitrate, transcode, notify]);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-400">Signed in as {user?.username ?? '…'}</p>
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
            <label className="text-sm text-zinc-300">Opus bitrate (kbps)</label>
            <Input
              type="number"
              min={64}
              max={320}
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
            />
            <p className="text-xs text-zinc-500">
              Used only when transcoding is enabled. Keeps source codec otherwise.
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="text-zinc-300">Transcode to Opus on import</span>
            <input
              type="checkbox"
              checked={transcode}
              onChange={(e) => setTranscode(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span className="text-zinc-300">Notify when a download finishes</span>
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button onClick={save}>Save settings</Button>
        <Button variant="ghost" className="gap-2 text-zinc-400" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}