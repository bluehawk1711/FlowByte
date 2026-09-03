import { AppColors, useThemedStyles } from "@/constants/theme";
import { useApiSync } from "@/hooks/useApiSync";
import useAudioContext from "@/hooks/store/audioContext";
import { toMobileSong } from "@/lib/sync";
import {
  clearOfflineLibrary,
  getOfflineRecords,
  type DownloadRecord,
} from "@/lib/offline";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight } from "react-native-reanimated";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<DownloadRecord>);

export const DownloadsScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signedIn } = useApiSync();
  const playList = useAudioContext((s) => s.playList);
  const [records, setRecords] = useState<DownloadRecord[]>([]);

  const refresh = useCallback(() => {
    setRecords(Object.values(getOfflineRecords()));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, signedIn]);

  const playRecord = (record: DownloadRecord) => {
    const mobile = toMobileSong({
      id: record.songId,
      title: record.title,
      artistName: record.artist ?? null,
      albumName: record.album ?? null,
      duration: record.duration,
      artworkUrl: record.artworkUrl ?? null,
      streamUrl: undefined,
      url: record.localPath,
      localUri: record.localPath,
      isDownloaded: true,
      source: "api",
      // remaining required ApiSong fields
      artistId: null,
      albumId: null,
      trackNumber: null,
      year: null,
      genre: null,
      language: null,
      codec: null,
      bitrate: null,
      fileSize: record.fileSize,
      artworkStorageKey: null,
      lyricsStorageKey: null,
      lyricsLanguage: null,
      lyricsSynced: false,
      sourceUrl: null,
      sourceId: null,
      createdAt: record.downloadedAt,
      updatedAt: record.downloadedAt,
    });
    playList([mobile], 0);
  };

  const removeRecord = async (songId: string) => {
    const { removeOfflineSong } = await import("@/lib/offline");
    await removeOfflineSong(songId);
    refresh();
  };

  const clearAll = () => {
    Alert.alert(
      "Clear Offline Library",
      "Remove all downloaded songs from this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearOfflineLibrary();
            refresh();
          },
        },
      ],
    );
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={AppColors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Downloads</Text>
        {records.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearAll}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </Pressable>
        )}
      </View>

      <AnimatedFlatList
        data={records}
        keyExtractor={(item) => item.songId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="download-outline" size={44} color={AppColors.textSecondary} />
            <Text style={styles.emptyText}>
              No offline songs yet. Tap the download icon in the Cloud tab.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 40).duration(250)}>
            <View style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => playRecord(item)}>
                <View style={styles.art}>
                  <Ionicons name="musical-note" size={20} color={AppColors.accentCyan} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {item.artist ?? "Unknown Artist"} · {formatBytes(item.fileSize)}
                  </Text>
                </View>
              </Pressable>
              <Pressable style={styles.rowAction} onPress={() => removeRecord(item.songId)}>
                <Ionicons name="close" size={20} color={AppColors.textSecondary} />
              </Pressable>
            </View>
          </Animated.View>
        )}
      />
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  backButton: {
    padding: 6,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  clearButton: {
    padding: 6,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 40,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: "#14141E",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#2A2A3A",
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
    color: AppColors.textSecondary,
  },
  rowAction: {
    padding: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});

