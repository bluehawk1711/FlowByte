import { MiniPlayer } from "@/components/MiniPlayer";
import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";

import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SongList from "../SongList";

export const LibraryScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [songs, setSongs] = useState<Song[]>([]);

  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  const [isLoading, setIsLoading] = useState(true);

  const getSongs = useCallback(() => {
    if (permissionResponse?.status !== "granted") {
      requestPermission();
    }
    const allSongs = MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 200,
    });
    allSongs
      .then((res) => {
        const songs = res.assets.map((asset) => ({
          id: asset.id,
          title: asset.filename.replace(/\.[^/.]+$/, "") || asset.filename,
          artist: undefined,
          album: undefined,
          duration: asset.duration,
          cover: undefined,
          url: asset.uri,
        }));
        setSongs(songs);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [permissionResponse, requestPermission]);

  useEffect(() => {
    getSongs();
  }, [getSongs]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={AppColors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      <SongList
        songs={songs}
        isLoading={isLoading}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer showHeart={true} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  scrollView: {},

  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },

  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});
