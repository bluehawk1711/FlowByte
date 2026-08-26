import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "@/hooks/store/storageAdapter";

export interface SavedYouTubeItem {
  id: string;
  url: string;
  videoId: string | null;
  playlistId: string | null;
  isPlaylist: boolean;
  title: string;
  thumbnail?: string;
  savedAt: string;
}

type SavedState = {
  items: SavedYouTubeItem[];
  addItem: (item: Omit<SavedYouTubeItem, "id" | "savedAt">) => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
};

const useSaved = create<SavedState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set({
          items: [
            {
              ...item,
              id: `yt-${Date.now().toString(36)}`,
              thumbnail: item.thumbnail ?? (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : undefined),
              savedAt: new Date().toISOString(),
            },
            ...get().items,
          ],
        }),
      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clearAll: () => set({ items: [] }),
    }),
    {
      name: "saved-youtube-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

export interface ParsedYouTubeUrl {
  videoId: string | null;
  playlistId: string | null;
  isPlaylist: boolean;
}

/** Extract video/playlist ids from a YouTube URL (watch/youtu.be/embed/shorts/playlist). */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
  const trimmed = url.trim();
  if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const playlistId = parsed.searchParams.get("list");
    const videoId =
      parsed.searchParams.get("v") ??
      (parsed.hostname.endsWith("youtu.be") ? parsed.pathname.split("/")[1] : undefined) ??
      (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")
        ? parsed.pathname.split("/")[2]
        : undefined) ??
      null;
    return { videoId, playlistId, isPlaylist: videoId === null && playlistId !== null };
  } catch {
    return null;
  }
}

export function isYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/.test(url.trim());
}

/** Get YouTube thumbnail URL from video ID. */
export function youtubeThumbnail(videoId: string | null, quality: "mq" | "hq" = "mq"): string | undefined {
  if (!videoId) return undefined;
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

export default useSaved;