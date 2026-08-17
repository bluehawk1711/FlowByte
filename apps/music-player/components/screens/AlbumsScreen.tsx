import { AlbumCard } from "@/components/AlbumCard";
import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ALBUMS = [
  { id: "1", title: "Midnight Vibes", artist: "The Night Owls" },
  { id: "2", title: "Neon Dreams", artist: "Cyber Artists" },
  { id: "3", title: "Echoes of Silence", artist: "Silent Poets" },
  { id: "4", title: "Geometric Beats", artist: "Shape Shifters" },
  { id: "5", title: "Minimalist Sound", artist: "Pure Tones" },
  { id: "6", title: "Retro Wave", artist: "Synth Masters" },
  { id: "7", title: "Deep Ocean", artist: "Blue Whales" },
  { id: "8", title: "Monolith", artist: "Stone Circle" },
];

interface AlbumsScreenProps {
  onAlbumPress?: (albumId: string) => void;
  onSearchPress?: () => void;
  onShufflePress?: () => void;
}

export const AlbumsScreen: React.FC<AlbumsScreenProps> = ({
  onAlbumPress,
  onSearchPress,
  onShufflePress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
        <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
          <Ionicons name="search" size={24} color={AppColors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Album Grid */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      >
        <View style={styles.grid}>
          {ALBUMS.map((album) => (
            <AlbumCard
              key={album.id}
              title={album.title}
              artist={album.artist}
              onPress={() => onAlbumPress?.(album.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Shuffle FAB */}
      <TouchableOpacity
        style={styles.shuffleButton}
        onPress={onShufflePress}
        activeOpacity={0.8}
      >
        <Ionicons name="shuffle" size={20} color={AppColors.textLight} />
        <Text style={styles.shuffleText}>Shuffle</Text>
      </TouchableOpacity>
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
  searchButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  shuffleButton: {
    position: "absolute",
    bottom: 90,
    right: 24,
    backgroundColor: AppColors.accentCyan,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    shadowColor: AppColors.accentCyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  shuffleText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textLight,
  },
});
