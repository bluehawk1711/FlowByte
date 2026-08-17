import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

type SongMetadata = {
  customCover?: string;
};

type SongMetadataState = {
  metadata: Record<string, SongMetadata>; // songId -> metadata
  setCustomCover: (songId: string, coverUri: string) => void;
  getCustomCover: (songId: string) => string | undefined;
  removeCustomCover: (songId: string) => void;
  loadMetadata: () => Promise<void>;
  clearAllMetadata: () => Promise<void>;
};

const STORAGE_KEY = "song-metadata";

const useSongMetadata = create<SongMetadataState>((set, get) => ({
  metadata: {},

  setCustomCover: (songId: string, coverUri: string) => {
    const newMetadata = {
      ...get().metadata,
      [songId]: {
        ...get().metadata[songId],
        customCover: coverUri,
      },
    };
    set({ metadata: newMetadata });

    // Persist to AsyncStorage
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMetadata));
  },

  getCustomCover: (songId: string) => {
    return get().metadata[songId]?.customCover;
  },

  removeCustomCover: (songId: string) => {
    const newMetadata = { ...get().metadata };
    if (newMetadata[songId]) {
      delete newMetadata[songId].customCover;
      if (Object.keys(newMetadata[songId]).length === 0) {
        delete newMetadata[songId];
      }
    }
    set({ metadata: newMetadata });

    // Persist to AsyncStorage
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMetadata));
  },

  loadMetadata: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ metadata: JSON.parse(stored) });
      }
    } catch (error) {
      console.error("Failed to load song metadata:", error);
    }
  },

  clearAllMetadata: async () => {
    set({ metadata: {} });
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
}));

export default useSongMetadata;
