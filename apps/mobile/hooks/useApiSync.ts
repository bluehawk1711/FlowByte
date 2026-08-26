import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { initApiClient, isSignedIn, signOut, client } from "@/lib/api";
import { recordApiPlay, syncLibrary, syncPlayback } from "@/lib/sync";
import useAudioContext from "./store/audioContext";
import { useRealtime } from "./useRealtime";

const SYNC_INTERVAL_MS = 12_000;

export const useApiSync = () => {
  const [signedIn, setSignedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const lastPlayRef = useRef<string | null>(null);

  const refreshAuth = async () => {
    setSignedIn(await isSignedIn());
  };

  const doSync = async (opts?: { silent?: boolean }) => {
    if (!signedIn) return;
    setSyncing(true);
    try {
      const result = await syncLibrary();
      setLastSync(new Date().toISOString());
      setLastSyncError(result.errors.length > 0 ? result.errors.join("; ") : null);
    } catch (e) {
      if (!opts?.silent) setLastSyncError(String(e));
    } finally {
      setSyncing(false);
    }
  };

  // Real-time library updates via SSE
  useRealtime({
    enabled: signedIn,
    onLibraryChanged: () => {
      // Re-sync library when changes are detected
      void doSync({ silent: true });
    },
  });

  useEffect(() => {
    let mounted = true;
    initApiClient().then(async () => {
      if (!mounted) return;
      await refreshAuth();
      if (await isSignedIn()) {
        try {
          await client?.registerDevice();
        } catch {
          // device already registered or offline
        }
        doSync({ silent: true });
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const { song } = useAudioContext.getState();
      const apiSongId = song?.apiSongId ?? null;
      if (apiSongId && apiSongId !== lastPlayRef.current) {
        lastPlayRef.current = apiSongId;
        recordApiPlay(song as NonNullable<typeof song>);
      }
      syncPlayback();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        refreshAuth();
        doSync({ silent: true });
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  return {
    signedIn,
    syncing,
    lastSync,
    lastSyncError,
    refreshAuth,
    doSync,
    signOut: async () => {
      await signOut();
      await refreshAuth();
    },
  };
};