import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "@/hooks/store/storageAdapter";
import { isYouTubeUrl, parseYouTubeUrl } from "@flowbyte/validation";

export type { ParsedYouTubeUrl } from "@flowbyte/validation";
export { isYouTubeUrl, parseYouTubeUrl };

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

/** Get YouTube thumbnail URL from video ID. */
export function youtubeThumbnail(videoId: string | null, quality: "mq" | "hq" = "mq"): string | undefined {
  if (!videoId) return undefined;
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

export default useSaved;