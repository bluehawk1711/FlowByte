import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import usePlaylist from "@/hooks/store/playlist";
import { useSelectionStore } from "@/hooks/store/selectionStore";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { usePathname, useRouter } from "expo-router";
import React, { PropsWithChildren, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import EmptyState from "./EmptyState";
import LibraryListHeader from "./LibraryListHeader";
import PlaylistSelectionModal from "./PlaylistSelectionModal";
import { SongListItem } from "./SongListItem";

type SongListProps = PropsWithChildren<{
  songs: Song[];
  isLoading?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

const SongList: React.FC<SongListProps> = ({
  songs,
  isLoading = false,
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();
  const currentSong = useAudioContext((state) => state.song);
  const isPlaying = useAudioContext((state) => state.isPlaying);
  const playList = useAudioContext((state) => state.playList);

  const selectionMode = useSelectionStore((state) => state.selectionMode);
  const selectedSongIds = useSelectionStore((state) => state.selectedIds);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);

  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);

  const playlists = usePlaylist((state) => state.playlists);
  const setPlaylists = usePlaylist((state) => state.setPlaylists);
  const toggleFavourite = useFavourite((state) => state.toggleSong);
  const favourites = useFavourite((state) => state.songs);

  const router = useRouter();
  const path = usePathname();
  const handleSongPress = useCallback(
    (asset: Song) => {
      // Selection mode toggle is now handled within SongListItem
      if (selectionMode) return;

      const index = songs.findIndex((s) => s?.id === asset?.id);

      if (index !== -1) {
        playList(songs, index);
        router.push("/(tabs)/playing");
      } else {
        // Fallback if song not found
        playList(songs, 0);
        router.push("/(tabs)/playing");
      }
    },
    [selectionMode, songs, playList, router],
  );

  const handleExitSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleSelectAll = () => {
    const allIds = songs
      .map((song) => song?.id || "")
      .filter((id) => id !== "");
    selectAll(allIds);
  };

  const handleConfirmAddToPlaylists = (selectedPlaylistIds: string[]) => {
    const selectedSongs = songs.filter(
      (song) => song?.id && selectedSongIds.includes(song.id),
    ) as Song[];

    const updatedPlaylists = playlists.map((playlist) => {
      if (selectedPlaylistIds.includes(playlist.id)) {
        // Filter out songs that are already in the playlist to avoid duplicates
        const newSongsToAdd = selectedSongs.filter(
          (song) =>
            !playlist.songs.some(
              (existingSong) => existingSong?.id === song?.id,
            ),
        );

        return {
          ...playlist,
          songs: [...playlist.songs, ...newSongsToAdd],
        };
      }
      return playlist;
    });

    setPlaylists(updatedPlaylists);
    handleExitSelection();
  };

  const handleBulkAddToFavourites = () => {
    const selectedSongs = songs.filter(
      (song) => song?.id && selectedSongIds.includes(song.id),
    ) as Song[];

    selectedSongs.forEach((song) => {
      const isFav = favourites.some((fav) => fav?.id === song?.id);
      if (!isFav) {
        toggleFavourite(song);
      }
    });
    handleExitSelection();
  };

  const renderSongItem = useCallback(
    ({ item: file }: { item: Song }) => {
      const isActive = currentSong?.id === file?.id;
      if (!file) return null;

      return (
        <SongListItem
          isPlaying={isActive && isPlaying}
          isActive={isActive}
          onPress={handleSongPress}
          song={file}
        />
      );
    },
    [currentSong, isPlaying, handleSongPress],
  );

  const renderSelectionHeader = () => {
    if (!selectionMode) return null;

    return (
      <Portal>
        <View style={[styles.selectionHeader, { paddingTop: insets.top + 10 }]}>
          <View style={styles.selectionHeaderLeft}>
            <Pressable onPress={handleExitSelection}>
              <Ionicons name="close" size={24} color={AppColors.textPrimary} />
            </Pressable>
            <Text style={styles.selectionCount}>{selectedSongIds.length}</Text>
          </View>
          <View style={styles.selectionHeaderRight}>
            <Pressable onPress={handleSelectAll} style={styles.headerAction}>
              <Ionicons
                name="checkmark-done-outline"
                size={22}
                color={AppColors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={() => setPlaylistModalVisible(true)}
              style={styles.headerAction}
            >
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={AppColors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={handleBulkAddToFavourites}
              style={styles.headerAction}
            >
              <Ionicons
                name="heart-outline"
                size={22}
                color={AppColors.textPrimary}
              />
            </Pressable>
          </View>
        </View>
      </Portal>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderSelectionHeader()}
      {path === "/" && <LibraryListHeader />}
      <FlashList
        data={songs}
        renderItem={renderSongItem}
        estimatedItemSize={75}
        keyExtractor={(item, index) => item?.id || index.toString()}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={AppColors.accentCyan} />
            </View>
          ) : (
            <EmptyState title="No Songs Here" />
          )
        }
        extraData={[currentSong]}
      />
      <PlaylistSelectionModal
        visible={playlistModalVisible}
        onDismiss={() => setPlaylistModalVisible(false)}
        onConfirm={handleConfirmAddToPlaylists}
        playlists={playlists}
        title="Add to Playlist"
        description={`Add ${selectedSongIds.length} songs to selected playlists`}
        confirmText="Add Songs"
      />
    </View>
  );
};

export default SongList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  selectionHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: AppColors.backgroundCard,
    zIndex: 100,
    elevation: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  selectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  selectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  headerAction: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
});
