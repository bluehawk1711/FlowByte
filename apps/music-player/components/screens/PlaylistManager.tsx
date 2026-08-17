import { AppColors } from "@/constants/theme";
import usePlaylist from "@/hooks/store/playlist";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { Modal, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "../EmptyState";
import { MiniPlayer } from "../MiniPlayer";

// if (
//   Platform.OS === "android" &&
//   UIManager.setLayoutAnimationEnabledExperimental
// ) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

export const PlaylistManager = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const playlists = usePlaylist((state) => state.playlists);
  const createPlaylist = usePlaylist((state) => state.createPlaylist);
  const deletePlaylist = usePlaylist((state) => state.deletePlaylist);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist({
        id: Math.random().toString(), // Using simple ID generation as in other parts
        name: newPlaylistName.trim(),
        songs: [],
      });
      setNewPlaylistName("");
      setCreateModalVisible(false);
    }
  };

  const handleDeletePress = (id: string) => {
    setPlaylistToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (playlistToDelete) {
      deletePlaylist(playlistToDelete);
      setDeleteModalVisible(false);
      setPlaylistToDelete(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Playlists</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={AppColors.textPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(playlist) => playlist.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No Playlist Availible. Create a New Playlist " />
        }
        renderItem={({ item: playlist }) => (
          <Pressable
            style={styles.playlistItem}
            onPress={() => router.push(`/playlist/${playlist.id}`)}
          >
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>{playlist.name}</Text>
              <Text style={styles.playlistCount}>
                {playlist.songs.length} songs
              </Text>
            </View>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleDeletePress(playlist.id);
              }}
              style={styles.deleteButton}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={AppColors.accentPink}
              />
            </Pressable>
          </Pressable>
        )}
      />

      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Playlist</Text>
            <TextInput
              style={styles.input}
              placeholder="Playlist Name"
              placeholderTextColor={AppColors.textSecondary}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={deleteModalVisible}
          onDismiss={() => setDeleteModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Playlist?</Text>
            <Text style={styles.modalDescription}>
              Are you sure you want to delete this playlist? This action cannot
              be undone.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Portal>

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
  addButton: {
    padding: 8,
    backgroundColor: AppColors.backgroundCard,
    borderRadius: 20,
  },
  listContent: {
    paddingBottom: 100,
  },

  playlistItem: {
    backgroundColor: AppColors.backgroundCard,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  playlistCount: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  modalContainer: {
    backgroundColor: AppColors.backgroundCard,
    width: "90%",
    alignSelf: "center",
    borderRadius: 20,
    padding: 24,
  },
  modalContent: {
    gap: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    textAlign: "center",
  },
  input: {
    backgroundColor: AppColors.backgroundDark,
    borderRadius: 12,
    padding: 16,
    color: AppColors.textPrimary,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: AppColors.accentCyan,
  },
  createButton: {
    backgroundColor: AppColors.accentCyan,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.backgroundDark,
  },
  modalDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  confirmDeleteButton: {
    backgroundColor: AppColors.accentPink,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  miniPlayerContainer: {
    paddingBottom: 8,
  },
});
