import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Song } from '@flowbyte/types';
import { client, getDeviceId, resolvePlayUrl } from '../lib/api';
import {
  emitMiniPlayerState,
  hideMiniPlayer,
  onMiniPlayerCommand,
} from '../lib/tauri';
import { useAuth } from './AuthContext';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextValue {
  current: Song | null;
  queue: Song[];
  index: number;
  playing: boolean;
  position: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  playSong: (song: Song, queue?: Song[]) => void;
  playQueue: (queue: Song[], startIndex?: number) => void;
  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (queueIndex: number) => void;
  clearQueue: () => void;
  moveInQueue: (from: number, to: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isAuthed } = useAuth();
  const deviceId = getDeviceId();

  const [current, setCurrent] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [shuffle, setShuffle] = useState(false);

  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const audio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      const el = audioRef.current;
      el.addEventListener('timeupdate', () => setPosition(el.currentTime));
      el.addEventListener('durationchange', () => setDuration(el.duration || 0));
      el.addEventListener('play', () => setPlaying(true));
      el.addEventListener('pause', () => setPlaying(false));
      el.addEventListener('ended', () => {
        const mode = repeatRef.current;
        if (mode === 'one') {
          el.currentTime = 0;
          void el.play();
          return;
        }
        const q = queueRef.current;
        const i = indexRef.current;
        if (i + 1 < q.length) playAtRef.current(i + 1, q);
        else if (mode === 'all') playAtRef.current(0, q);
        else {
          setPlaying(false);
          void client.syncPlayback({ songId: null, position: 0, isPlaying: false, deviceId }).catch(() => undefined);
        }
      });
    }
    return audioRef.current;
  }, [deviceId]);

  // Refs mirroring state for use inside event listeners without re-subscribing.
  const queueRef = useRef<Song[]>([]);
  queueRef.current = queue;
  const indexRef = useRef(0);
  indexRef.current = index;
  const repeatRef = useRef<RepeatMode>('off');
  repeatRef.current = repeat;

  const playAt = useCallback(
    (i: number, q: Song[]) => {
      const song = q[i];
      if (!song) return;
      setIndex(i);
      setQueue(q);
      setCurrent(song);
      setPosition(0);
      setDuration(song.duration || 0);
      void (async () => {
        try {
          const url = await resolvePlayUrl(song);
          const el = audio();
          el.src = url;
          el.volume = volumeRef.current;
          await el.play();
        } catch {
          // stream resolution failed — surface via ended-like behavior
          setPlaying(false);
        }
      })();
    },
    [audio],
  );
  const playAtRef = useRef(playAt);
  playAtRef.current = playAt;

  const playSong = useCallback((song: Song, q?: Song[]) => {
    const list = q && q.length > 0 ? q : [song];
    const i = list.findIndex((s) => s.id === song.id);
    playAtRef.current(i >= 0 ? i : 0, list);
  }, []);

  const playQueue = useCallback((q: Song[], startIndex = 0) => {
    playAtRef.current(startIndex, q);
  }, []);

  const playNext = useCallback((song: Song) => {
    const q = queueRef.current;
    const i = indexRef.current;
    const nextQ = [...q.slice(0, i + 1), song, ...q.slice(i + 1)];
    setQueue(nextQ);
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setQueue((q) => [...q, song]);
  }, []);

  const removeFromQueue = useCallback((queueIndex: number) => {
    setQueue((q) => {
      const next = q.filter((_, i) => i !== queueIndex);
      // Adjust current index after removal
      setIndex((cur) => {
        if (queueIndex < cur) return cur - 1;
        if (queueIndex === cur) {
          if (next.length === 0) {
            setCurrent(null);
            setPlaying(false);
            return 0;
          }
          return cur >= next.length ? 0 : cur;
        }
        return cur;
      });
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue((q) => {
      const cur = currentRef.current;
      if (cur) return [cur];
      return [];
    });
    setIndex(0);
  }, []);

  const moveInQueue = useCallback((from: number, to: number) => {
    setQueue((q) => {
      const next = [...q];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setIndex((cur) => {
      if (from === cur) return to;
      if (from < cur && to >= cur) return cur - 1;
      if (from > cur && to <= cur) return cur + 1;
      return cur;
    });
  }, []);

  const togglePlay = useCallback(() => {
    const el = audio();
    if (el.paused) void el.play();
    else el.pause();
  }, [audio]);

  const next = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const shuffleOn = shuffleRef.current;
    let i: number;
    if (shuffleOn) {
      const remaining = q.map((_, idx) => idx).filter((idx) => idx !== indexRef.current);
      if (remaining.length === 0) return;
      i = remaining[Math.floor(Math.random() * remaining.length)];
    } else {
      i = indexRef.current + 1;
      if (i >= q.length) {
        if (repeatRef.current === 'all') i = 0;
        else return;
      }
    }
    playAtRef.current(i, q);
  }, []);
  const shuffleRef = useRef(false);
  shuffleRef.current = shuffle;

  const previous = useCallback(() => {
    const el = audio();
    if (el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }
    const q = queueRef.current;
    if (q.length === 0) return;
    playAtRef.current(Math.max(0, indexRef.current - 1), q);
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = seconds;
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    volumeRef.current = v;
    const el = audioRef.current;
    if (el) el.volume = v;
  }, []);
  const volumeRef = useRef(1);

  const toggleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => !s);
  }, []);

  // Playback-state sync: push every 10s while playing; immediately on change.
  const sync = useCallback(
    (songId: string | null, pos: number, isPlaying: boolean) => {
      if (!isAuthed) return;
      void client
        .syncPlayback({ songId, position: pos, isPlaying, deviceId })
        .catch(() => undefined);
    },
    [isAuthed, deviceId],
  );
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPause = () => sync(currentRef.current?.id ?? null, el.currentTime, false);
    const onPlay = () => sync(currentRef.current?.id ?? null, el.currentTime, true);
    el.addEventListener('pause', onPause);
    el.addEventListener('play', onPlay);
    return () => {
      el.removeEventListener('pause', onPause);
      el.removeEventListener('play', onPlay);
    };
  }, [sync]);

  const currentRef = useRef<Song | null>(null);
  currentRef.current = current;

  useEffect(() => {
    if (playing) {
      syncTimer.current = setInterval(() => {
        sync(currentRef.current?.id ?? null, audioRef.current?.currentTime ?? 0, true);
      }, 10_000);
    } else if (syncTimer.current) {
      clearInterval(syncTimer.current);
      syncTimer.current = null;
    }
    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, [playing, sync]);

  // --- Mini-player overlay window -----------------------------------------
  // Broadcast state (main → mini) and consume commands (mini → main).
  const miniStateRef = useRef({ song: null as Song | null, playing: false, position: 0, duration: 0 });
  miniStateRef.current = { song: current, playing, position, duration };

  useEffect(() => {
    const push = () => void emitMiniPlayerState(miniStateRef.current);
    push();
    const t = setInterval(push, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let un: (() => void) | undefined;
    void onMiniPlayerCommand(async (cmd) => {
      switch (cmd.action) {
        case 'play-pause':
          togglePlayRef.current();
          break;
        case 'next':
          nextRef.current();
          break;
        case 'previous':
          previousRef.current();
          break;
        case 'seek':
          seekRef.current(cmd.position);
          break;
        case 'close':
          await hideMiniPlayer();
          break;
      }
    }).then((fn) => {
      un = fn;
    });
    return () => un?.();
  }, []);

  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;
  const nextRef = useRef(next);
  nextRef.current = next;
  const previousRef = useRef(previous);
  previousRef.current = previous;
  const seekRef = useRef(seek);
  seekRef.current = seek;

  const value = useMemo(
    () => ({
      current,
      queue,
      index,
      playing,
      position,
      duration,
      volume,
      repeat,
      shuffle,    playSong, playQueue, playNext, addToQueue, removeFromQueue, clearQueue, moveInQueue, togglePlay, next, previous, seek, setVolume, toggleRepeat, toggleShuffle,
    }),
    [
      current, queue, index, playing, position, duration, volume, repeat, shuffle,
      playSong, playQueue, playNext, addToQueue, removeFromQueue, clearQueue, moveInQueue, togglePlay, next, previous, seek, setVolume, toggleRepeat, toggleShuffle,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}