import { AppColors, useThemedStyles } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import usePlaylist from "@/hooks/store/playlist";
import { useImagePicker } from "@/hooks/useImagePicker";
import { Ionicons } from "@expo/vector-icons";
import {
  impactAsync,
  ImpactFeedbackStyle,
  notificationAsync,
  NotificationFeedbackType,
} from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PlaylistSelectionModal from "./PlaylistSelectionModal";

interface SongActionsMenuProps {
  song?: Song;
  menuIconColor?: string;
}

interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export const SongActionsMenu: React.FC<SongActionsMenuProps> = ({
  song,
  menuIconColor = AppColors.textSecondary,
}) => {
  const styles = useThemedStyles(createStyles);
  const [menuVisible, setMenuVisible] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const playlists = usePlaylist((state) => state.playlists);
  const setPlaylists = usePlaylist((state) => state.setPlaylists);
  const insertNext = useAudioContext((state) => state.insertNext);
  const addToQueue = useAudioContext((state) => state.addToQueue);
  const favouriteToggle = useFavourite((state) => state.toggleSong);
  const favourites = useFavourite((state) => state.songs);
  const router = useRouter();

  const isFavorite = useMemo(
    () => !!song && favourites.some((f) => f?.id === song.id),
    [song, favourites],
  );

  const { pickImageForSong } = useImagePicker();

  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const triggerHaptic = useCallback((type: "light" | "medium" | "success" | "warning") => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    switch (type) {
      case "light":
        void impactAsync(ImpactFeedbackStyle.Light);
        break;
      case "medium":
        void impactAsync(ImpactFeedbackStyle.Medium);
        break;
      case "success":
        void notificationAsync(NotificationFeedbackType.Success);
        break;
      case "warning":
        void notificationAsync(NotificationFeedbackType.Warning);
        break;
    }
  }, []);

  const actions: ActionItem[] = useMemo(
    () => [
      {
        icon: "play-skip-forward" as const,
        label: "Play Next",
        onPress: () => {
          triggerHaptic("light");
          closeMenu();
          if (!song) return;
          insertNext(song);
        },
      },
      {
        icon: "list" as const,
        label: "Add to Queue",
        onPress: () => {
          triggerHaptic("light");
          closeMenu();
          if (!song) return;
          addToQueue(song);
        },
      },
      {
        icon: "add-circle-outline" as const,
        label: "Add to Playlist",
        onPress: () => {
          triggerHaptic("light");
          closeMenu();
          setPlaylistModalVisible(true);
        },
      },
      {
        icon: isFavorite ? ("heart" as const) : ("heart-outline" as const),
        label: isFavorite ? "Remove from Favourites" : "Add to Favourites",
        onPress: () => {
          triggerHaptic(isFavorite ? "warning" : "success");
          closeMenu();
          if (!song) return;
          favouriteToggle(song);
        },
      },
      {
        icon: "download-outline" as const,
        label: "Download",
        onPress: () => {
          triggerHaptic("light");
          closeMenu();
          Alert.alert("Download", "Download feature coming soon");
        },
        disabled: true,
      },
      {
        icon: "mic-outline" as const,
        label: "View Lyrics",
        onPress: () => {
          triggerHaptic("light");
          closeMenu();
          router.push("/(tabs)/playing");
        },
      },
      {
        icon: "image-outline" as const,
        label: "Add Cover Image",
        onPress: async () => {
          triggerHaptic("light");
          closeMenu();
          if (!song?.id) return;
          await pickImageForSong(song.id);
        },
      },
    ],
    [song, isFavorite, insertNext, addToQueue, favouriteToggle, closeMenu, router, pickImageForSong, triggerHaptic],
  );

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
      <Pressable style={styles.menuButton} onPress={() => setMenuVisible(true)}>
        <Ionicons name="ellipsis-vertical" size={18} color={menuIconColor} />
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={closeMenu}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={closeMenu} />

        {/* Bottom Sheet */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Drag handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Song Preview Header */}
          {song && (
            <View style={styles.songPreview}>
              {song.artworkUrl || song.cover ? (
                <Image
                  source={{ uri: song.artworkUrl ?? song.cover }}
                  style={styles.songArtwork}
                />
              ) : (
                <View style={[styles.songArtwork, styles.songArtworkPlaceholder]}>
                  <Ionicons name="musical-note" size={20} color={AppColors.textSecondary} />
                </View>
              )}
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {song.artist ?? "Unknown artist"}
                </Text>
              </View>
            </View>
          )}

          {/* Action List */}
          <ScrollView
            style={styles.actionList}
            showsVerticalScrollIndicator={false}
          >
            {actions.map((action, i) => (
              <Pressable
                key={action.label}
                style={[
                  styles.actionItem,
                  action.disabled && styles.actionItemDisabled,
                ]}
                onPress={action.disabled ? undefined : action.onPress}
              >
                <Ionicons
                  name={action.icon}
                  size={22}
                  color={
                    action.destructive
                      ? "#FF453A"
                      : action.disabled
                      ? AppColors.textSecondary + "60"
                      : AppColors.textPrimary
                  }
                />
                <Text
                  style={[
                    styles.actionLabel,
                    action.destructive && styles.actionLabelDestructive,
                    action.disabled && styles.actionLabelDisabled,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

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

const createStyles = () => StyleSheet.create({
  menuButton: {
    padding: 12,
    zIndex: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#131b2e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
  },
  dragHandleContainer: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#494454",
  },
  songPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d3449",
  },
  songArtwork: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  songArtworkPlaceholder: {
    backgroundColor: "#222a3d",
    justifyContent: "center",
    alignItems: "center",
  },
  songInfo: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  songArtist: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  actionList: {
    maxHeight: 400,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  actionItemDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    fontSize: 16,
    color: AppColors.textPrimary,
  },
  actionLabelDestructive: {
    color: "#FF453A",
  },
  actionLabelDisabled: {
    color: AppColors.textSecondary + "60",
  },
});


