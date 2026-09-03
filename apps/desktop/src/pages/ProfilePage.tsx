import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Cloud,
  Heart,
  ListVideo,
  LogOut,
  MonitorPlay,
  Music2,
} from '../lib/icons';
import { useAuth } from '../context/AuthContext';
import { client, getDeviceId, getSavedPlaylists } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

interface ProfileStats {
  favorites: number;
  recentlyPlayed: number;
  savedItems: number;
}

export function ProfilePage({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({ favorites: 0, recentlyPlayed: 0, savedItems: 0 });
  const [loading, setLoading] = useState(true);

  const initial = (user?.username ?? user?.email ?? '?').charAt(0).toUpperCase();
  const deviceId = getDeviceId();

  const load = useCallback(async () => {
    try {
      const [favorites, recent, saved] = await Promise.all([
        client.getFavorites().catch(() => []),
        client.recentlyPlayed(200).catch(() => []),
        Promise.resolve(getSavedPlaylists().reduce((n, p) => n + p.items.length, 0)),
      ]);
      setStats({
        favorites: favorites.length,
        recentlyPlayed: recent.length,
        savedItems: saved,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="w-full space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-ink-2">Your account and library at a glance.</p>
      </div>

      {/* Account card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/25 blur-xl" aria-hidden />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-fg shadow-elev-2">
              {initial}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-ink-1">
              {user?.username ?? user?.email ?? 'Flowbyte user'}
            </p>
            <p className="mt-0.5 truncate text-sm text-ink-2">{user?.email ?? '—'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
              <Cloud className="h-3.5 w-3.5" />
              Synced to your Flowbyte library
            </p>
          </div>
          <div className="flex gap-2">
            {onOpenSettings && (
              <Button variant="secondary" onClick={onOpenSettings}>
                Settings
              </Button>
            )}
            <Button variant="ghost" className="text-ink-3 hover:text-danger" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Heart}
          label="Favorites"
          value={stats.favorites}
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label="Recently played"
          value={stats.recentlyPlayed}
          loading={loading}
        />
        <StatCard
          icon={ListVideo}
          label="Saved items"
          value={stats.savedItems}
          loading={loading}
        />
        <StatCard icon={Music2} label="Library role" value="Owner" loading={false} />
      </div>

      {/* About this device */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-5 text-sm">
          <MonitorPlay className="h-4 w-4 text-ink-3" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink-1">This desktop</p>
            <p className="mt-0.5 truncate font-mono text-xs text-ink-3">{deviceId}</p>
          </div>
          {onOpenSettings && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="gap-1.5"
            >
              Manage playback devices
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Heart;
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-elev-2">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums text-ink-1">
            {loading && typeof value === 'number' ? '…' : value}
          </p>
          <p className="truncate text-xs text-ink-2">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
