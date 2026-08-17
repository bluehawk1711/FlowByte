import { MiniPlayer } from "@/components/MiniPlayer";
import { SongListItem } from "@/components/SongListItem";
import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper function to format duration

const FavouriteScreen = () => {
  const insets = useSafeAreaInsets();
  const songs = useFavourite((state) => state.songs);
  const currentSong = useAudioContext((state) => state.song);
  const setSong = useAudioContext((state) => state.setSong);
  const isPlaying = useAudioContext((state) => state.isPlaying);
  const clearSongs = useFavourite((state) => state.clearSongs);
  const setPlaylist = useAudioContext((state) => state.setPlaylist);
  const [visible, setVisible] = useState(false);

  const handleSongPress = (song: NonNullable<Song>) => {
    setSong(song);
    setPlaylist(songs);
  };

  // Filter out null songs
  const validSongs = songs.filter(
    (song): song is NonNullable<Song> => song !== null,
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Favourites</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setVisible(true)}
            style={styles.actionButton}
            disabled={validSongs.length === 0}
          >
            <Ionicons name="trash" size={24} color={AppColors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.containerStyle}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons
                name="warning-outline"
                size={48}
                color={AppColors.accentPink}
              />
              <Text style={styles.modalTitle}>Clear Favourites?</Text>
              <Text style={styles.modalDescription}>
                This will remove all songs from your favourites. This action
                cannot be undone.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.deleteButton]}
                disabled={validSongs.length === 0}
                onPress={() => {
                  clearSongs();
                  setVisible(false);
                }}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={20} color={AppColors.accentPink} />
          <Text style={styles.statText}>{validSongs.length} songs</Text>
        </View>
      </View>

      {/* Song List */}
      <View style={styles.listContainer}>
        <FlashList
          data={validSongs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="heart-outline"
                size={64}
                color={AppColors.textSecondary}
              />
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySubtitle}>
                Songs you mark as favourite will appear here
              </Text>
            </View>
          }
          renderItem={({ item: song }) => (
            <SongListItem
              song={song}
              isActive={currentSong?.id === song.id}
              isPlaying={currentSong?.id === song.id && isPlaying}
              onPress={handleSongPress}
            />
          )}
        />
      </View>

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer showHeart={true} />
      </View>
    </View>
  );
};

export default FavouriteScreen;

const styles = StyleSheet.create({
  containerStyle: {
    backgroundColor: AppColors.backgroundCard,
    width: "90%",
    margin: "auto",
    borderRadius: 20,
    padding: 24,
  },
  modalContent: {
    gap: 24,
  },
  modalHeader: {
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: AppColors.backgroundDark,
    borderWidth: 1,
    borderColor: AppColors.accentCyan,
  },
  deleteButton: {
    backgroundColor: AppColors.accentPink,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
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
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  listContainer: {
    flex: 1,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
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
