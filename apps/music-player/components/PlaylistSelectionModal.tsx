import { AppColors } from "@/constants/theme";
import { PlaylistObj } from "@/constants/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Checkbox, Modal, Portal } from "react-native-paper";

interface PlaylistSelectionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (playlistIds: string[]) => void;
  playlists: PlaylistObj[];
  initialSelectedPlaylists?: string[];
  title?: string;
  description?: string;
  confirmText?: string;
}

const PlaylistSelectionModal: React.FC<PlaylistSelectionModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  playlists,
  initialSelectedPlaylists = [],
  title = "Add to Playlist",
  description = "Select playlists to add songs to",
  confirmText = "Add",
}) => {
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setSelectedPlaylists(initialSelectedPlaylists);
    }
  }, [visible, initialSelectedPlaylists]);

  const handlePlaylistToggle = (playlistId: string) => {
    setSelectedPlaylists((prev) =>
      prev.includes(playlistId)
        ? prev.filter((id) => id !== playlistId)
        : [...prev, playlistId],
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedPlaylists);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.playlistModalContainer}
      >
        <View style={styles.playlistModalContent}>
          <View style={styles.playlistModalHeader}>
            <Ionicons name="list" size={32} color={AppColors.accentCyan} />
            <Text style={styles.playlistModalTitle}>{title}</Text>
            <Text style={styles.playlistModalDescription}>{description}</Text>
          </View>

          <FlatList
            data={playlists}
            style={styles.playlistList}
            keyExtractor={(playlist) => playlist.id}
            renderItem={({ item: playlist }) => (
              <Pressable
                style={styles.playlistItem}
                onPress={() => handlePlaylistToggle(playlist.id)}
              >
                <View style={styles.playlistItemContent}>
                  <Text style={styles.playlistName}>{playlist.name}</Text>
                  <Text style={styles.playlistSongCount}>
                    {playlist.songs.length} songs
                  </Text>
                </View>
                <Checkbox
                  status={
                    selectedPlaylists.includes(playlist.id)
                      ? "checked"
                      : "unchecked"
                  }
                  onPress={() => handlePlaylistToggle(playlist.id)}
                  color={AppColors.accentCyan}
                />
              </Pressable>
            )}
          />

          <View style={styles.playlistModalActions}>
            <Pressable
              style={[styles.playlistModalButton, styles.cancelButton]}
              onPress={onDismiss}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.playlistModalButton, styles.addButton]}
              disabled={selectedPlaylists.length === 0}
              onPress={handleConfirm}
            >
              <Text style={styles.addButtonText}>
                {confirmText}{" "}
                {selectedPlaylists.length > 0
                  ? `(${selectedPlaylists.length})`
                  : ""}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  playlistModalContainer: {
    backgroundColor: AppColors.backgroundCard,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  playlistModalContent: {
    gap: 20,
  },
  playlistModalHeader: {
    alignItems: "center",
    gap: 8,
  },
  playlistModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  playlistModalDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
  },
  playlistList: {
    maxHeight: 300,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  playlistItemContent: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  playlistSongCount: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  playlistModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  playlistModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: AppColors.accentCyan,
  },
  addButton: {
    backgroundColor: AppColors.accentCyan,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
});

export default PlaylistSelectionModal;
