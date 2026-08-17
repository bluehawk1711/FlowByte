import { Directory, File, Paths } from "expo-file-system";
import { client } from "./api";

const LIBRARY_DIR = new Directory(Paths.document, "flowbyte");
const INDEX_FILE = new File(LIBRARY_DIR, "index.json");

export type DownloadRecord = {
  songId: string;
  title: string;
  artist?: string;
  album?: string;
  duration: number;
  artworkUrl?: string;
  localPath: string;
  downloadedAt: string;
  fileSize: number;
};

type OfflineStore = {
  records: Record<string, DownloadRecord>;
  loading: Record<string, boolean>;
  listeners: Set<() => void>;
};

const store: OfflineStore = { records: {}, loading: {}, listeners: new Set() };

let hydrated = false;
let hydratePromise: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        if (INDEX_FILE.exists) {
          store.records = JSON.parse(
            INDEX_FILE.textSync(),
          ) as Record<string, DownloadRecord>;
        }
      } catch {
        store.records = {};
      }
      hydrated = true;
      notify();
    })();
  }
  return hydratePromise;
}

function notify(): void {
  store.listeners.forEach((l) => l());
}

export function onOfflineChange(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function getOfflineRecords(): Record<string, DownloadRecord> {
  return store.records;
}

function persist(): void {
  try {
    LIBRARY_DIR.create({ intermediates: true, idempotent: true });
    INDEX_FILE.create({ overwrite: true, intermediates: true });
    INDEX_FILE.write(JSON.stringify(store.records));
  } catch {
    // best-effort persistence; index can be rebuilt by re-downloading
  }
}

export async function isDownloaded(songId: string): Promise<boolean> {
  await hydrate();
  return !!store.records[songId];
}

export async function getLocalFilePath(songId: string): Promise<string | null> {
  await hydrate();
  const record = store.records[songId];
  if (!record) return null;
  const file = new File(record.localPath);
  return file.exists ? record.localPath : null;
}

export async function downloadSong(
  song: NonNullable<import("@/constants/types").Song>,
): Promise<void> {
  await hydrate();
  const songId = song.apiSongId ?? song.id;
  if (store.loading[songId] || store.records[songId]) return;

  const api = client;
  if (!api) throw new Error("API client not initialized");
  if (song.source !== "api" && !song.apiSongId) {
    throw new Error("Only Flowbyte cloud songs can be downloaded offline");
  }

  store.loading[songId] = true;
  notify();
  try {
    const { url } = await api.getStreamUrl(songId);
    const target = new File(LIBRARY_DIR, `${songId}.mp3`);
    LIBRARY_DIR.create({ intermediates: true, idempotent: true });

    const downloaded = await File.downloadFileAsync(url, target, {
      idempotent: true,
    });
    store.records[songId] = {
      songId,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      artworkUrl: song.artworkUrl,
      localPath: downloaded.uri,
      downloadedAt: new Date().toISOString(),
      fileSize: downloaded.size ?? 0,
    };
    persist();
  } finally {
    delete store.loading[songId];
    notify();
  }
}

export async function removeOfflineSong(songId: string): Promise<void> {
  await hydrate();
  const record = store.records[songId];
  if (record) {
    try {
      new File(record.localPath).delete();
    } catch {
      // file already gone
    }
    delete store.records[songId];
    persist();
    notify();
  }
}

export async function clearOfflineLibrary(): Promise<void> {
  await hydrate();
  try {
    LIBRARY_DIR.delete();
  } catch {
    // already gone
  }
  store.records = {};
  hydrated = false;
  notify();
}