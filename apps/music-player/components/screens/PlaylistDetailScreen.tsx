import { AppColors } from "@/constants/theme";
import usePlaylist from "@/hooks/store/playlist";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "../MiniPlayer";
import SongList from "../SongList";

export const PlaylistDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const playlists = usePlaylist((state) => state.playlists);
  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return (
      <View
        style={[styles.container, styles.center, { paddingTop: insets.top }]}
      >
        <Text style={styles.errorText}>Playlist not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={AppColors.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.name}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <SongList songs={playlist.songs} />

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
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: AppColors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  iconButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  errorText: {
    color: AppColors.textPrimary,
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    backgroundColor: AppColors.accentCyan,
    borderRadius: 8,
  },
  backButtonText: {
    color: AppColors.backgroundDark,
    fontWeight: "bold",
  },
  miniPlayerContainer: {
    paddingBottom: 8,
  },
});
