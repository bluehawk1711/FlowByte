import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import usePlaylist from "@/hooks/store/playlist";
import { useImagePicker } from "@/hooks/useImagePicker";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Menu } from "react-native-paper";
import PlaylistSelectionModal from "./PlaylistSelectionModal";

interface SongActionsMenuProps {
  song?: Song;
  menuIconColor?: string;
}

export const SongActionsMenu: React.FC<SongActionsMenuProps> = ({
  song,
  menuIconColor = AppColors.textSecondary,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);

  const playlists = usePlaylist((state) => state.playlists);
  const setPlaylists = usePlaylist((state) => state.setPlaylists);

  const { pickImageForSong } = useImagePicker();

  const handleAddCoverImage = useCallback(async () => {
    setMenuVisible(false);
    if (!song?.id) return;

    await pickImageForSong(song.id);
  }, [song?.id, pickImageForSong]);

  const handleAddToPlaylist = useCallback(() => {
    setMenuVisible(false);
    setPlaylistModalVisible(true);
  }, []);

  const handleConfirmAddToPlaylists = useCallback(
    (selectedPlaylists: string[]) => {
      if (!song) return;

      const updatedPlaylists = playlists.map((playlist) => {
        if (selectedPlaylists.includes(playlist.id)) {
          const songExists = playlist.songs.some((s) => s?.id === song.id);
          if (!songExists) {
            return {
              ...playlist,
              songs: [...playlist.songs, song],
            };
          }
        }
        return playlist;
      });

      setPlaylists(updatedPlaylists);
      setPlaylistModalVisible(false);
    },
    [song, playlists, setPlaylists],
  );

  return (
    <>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Pressable
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={menuIconColor}
            />
          </Pressable>
        }
        contentStyle={styles.menuContent}
      >
        <Menu.Item
          onPress={handleAddCoverImage}
          title="Add Cover Image"
          leadingIcon={() => (
            <Ionicons
              name="image-outline"
              size={20}
              color={AppColors.textPrimary}
            />
          )}
          titleStyle={styles.menuItemTitle}
        />
        <Menu.Item
          onPress={handleAddToPlaylist}
          title="Add to Playlist"
          leadingIcon={() => (
            <Ionicons name="list" size={20} color={AppColors.textPrimary} />
          )}
          titleStyle={styles.menuItemTitle}
        />
      </Menu>

      <PlaylistSelectionModal
        visible={playlistModalVisible}
        onDismiss={() => setPlaylistModalVisible(false)}
        onConfirm={handleConfirmAddToPlaylists}
        playlists={playlists}
        title="Add to Playlist"
        description="Select playlists to add this song to"
        confirmText="Add to Playlist"
      />
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    padding: 12, // Increased padding for better touch target
    zIndex: 10, // Ensure it sits above other elements
  },
  menuContent: {
    backgroundColor: AppColors.backgroundCard,
    borderRadius: 12,
  },
  menuItemTitle: {
    color: AppColors.textPrimary,
    fontSize: 15,
  },
});
