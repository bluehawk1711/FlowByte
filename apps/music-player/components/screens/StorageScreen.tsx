import { FolderListItem } from "@/components/FolderListItem";
import { MiniPlayer } from "@/components/MiniPlayer";
import { AppColors } from "@/constants/theme";
import { FlashList } from "@shopify/flash-list";
import {
  Album,
  getAlbumsAsync,
  requestPermissionsAsync,
} from "expo-media-library";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getPermission = async () => {
  const { status } = await requestPermissionsAsync();
  if (status !== "granted") {
    alert("We need storage access to show your music");
    return false;
  }
  return true;
};

export const StorageScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [folders, setFolders] = useState<Album[]>([]);

  const getAudioFolders = async () => {
    const permission = await getPermission();
    if (!permission) {
      return [];
    }
    const folders = await getAlbumsAsync({
      includeSmartAlbums: true,
    });
    setFolders(folders);
  };

  useEffect(() => {
    getAudioFolders();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Storage</Text>
      </View>

      {/* Folder List */}
      <FlashList
        data={folders}
        renderItem={({ item }: { item: Album }) => (
          <FolderListItem id={item.id} name={item.title} />
        )}
        estimatedItemSize={60}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer />
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
  filterButton: {
    padding: 8,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  breadcrumbItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  breadcrumbActive: {
    color: AppColors.accentCyan,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});
