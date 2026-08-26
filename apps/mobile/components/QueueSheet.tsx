import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import { Ionicons } from "@expo/vector-icons";
import {
  impactAsync,
  ImpactFeedbackStyle,
  notificationAsync,
  NotificationFeedbackType,
} from "expo-haptics";
import { Platform } from "react-native";
import React, { useMemo } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface QueueSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export const QueueSheet: React.FC<QueueSheetProps> = ({
  visible,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const {
    song: currentSong,
    playlist,
    playList,
    removeFromQueue,
    clearQueue,
    moveInQueue,
  } = useAudioContext();

  const currentIndex = useMemo(
    () =>
      currentSong
        ? playlist.findIndex((s) => s?.id === currentSong.id)
        : -1,
    [playlist, currentSong],
  );

  // Split into sections
  const previous = useMemo(
    () => (currentIndex >= 0 ? playlist.slice(0, currentIndex) : []),
    [playlist, currentIndex],
  );
  const nowPlaying = useMemo(
    () => (currentIndex >= 0 ? playlist[currentIndex] : currentSong),
    [playlist, currentIndex, currentSong],
  );
  const nextUp = useMemo(
    () =>
      currentIndex >= 0 ? playlist.slice(currentIndex + 1) : playlist,
    [playlist, currentIndex],
  );

  const handlePlaySong = (song: NonNullable<Song>, index: number) => {
    playList(playlist, index);
  };

  const triggerHaptic = (type: "light" | "medium" | "warning") => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    switch (type) {
      case "light":
        void impactAsync(ImpactFeedbackStyle.Light);
        break;
      case "medium":
        void impactAsync(ImpactFeedbackStyle.Medium);
        break;
      case "warning":
        void notificationAsync(NotificationFeedbackType.Warning);
        break;
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    triggerHaptic("light");
    moveInQueue(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= playlist.length - 1) return;
    triggerHaptic("light");
    moveInQueue(index, index + 1);
  };

  const renderSongItem = (
    song: NonNullable<Song>,
    globalIndex: number,
    sectionLabel?: string,
  ) => {
    const isCurrentlyPlaying = currentSong?.id === song.id;

    return (
      <View style={styles.songRow}>
        {/* Artwork */}
        {song.cover || song.artworkUrl ? (
          <Image
            source={{ uri: song.cover ?? song.artworkUrl }}
            style={styles.songArtwork}
          />
        ) : (
          <View style={[styles.songArtwork, styles.songArtworkPlaceholder]}>
            <Ionicons
              name="musical-note"
              size={14}
              color={AppColors.textSecondary}
            />
          </View>
        )}

        {/* Song info */}
        <View style={styles.songInfo}>
          <Text
            style={[
              styles.songTitle,
              isCurrentlyPlaying && styles.songTitleActive,
            ]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist ?? "Unknown artist"}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.songActions}>
          {sectionLabel !== "previous" && (
            <>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleMoveUp(globalIndex)}
                disabled={globalIndex <= 0}
                hitSlop={6}
              >
                <Ionicons
                  name="chevron-up"
                  size={18}
                  color={
                    globalIndex <= 0
                      ? AppColors.textSecondary + "40"
                      : AppColors.textPrimary
                  }
                />
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => handleMoveDown(globalIndex)}
                disabled={globalIndex >= playlist.length - 1}
                hitSlop={6}
              >
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={
                    globalIndex >= playlist.length - 1
                      ? AppColors.textSecondary + "40"
                      : AppColors.textPrimary
                  }
                />
              </Pressable>
            </>
          )}
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              triggerHaptic("warning");
              removeFromQueue(globalIndex);
            }}
            hitSlop={6}
          >
            <Ionicons name="close" size={18} color="#FF453A" />
          </Pressable>
        </View>
      </View>
    );
  };

  const isEmpty = playlist.length === 0 || (!nowPlaying && nextUp.length === 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Drag handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Queue</Text>
            <Text style={styles.headerCount}>{playlist.length} songs</Text>
          </View>
          {playlist.length > 0 && (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                triggerHaptic("warning");
                clearQueue();
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="#FF453A"
              />
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="list-outline"
              size={40}
              color={AppColors.textSecondary}
            />
            <Text style={styles.emptyTitle}>Queue is empty</Text>
            <Text style={styles.emptySubtitle}>
              Add songs from your library to build a queue
            </Text>
          </View>
        ) : (
          <FlatList
            data={[]}
            renderItem={null}
            ListHeaderComponent={
              <View style={styles.listContent}>
                {/* Now Playing */}
                {nowPlaying && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Ionicons
                        name="play"
                        size={14}
                        color={AppColors.accentCyan}
                      />
                      <Text style={styles.sectionTitle}>Now Playing</Text>
                    </View>
                    {renderSongItem(
                      nowPlaying,
                      currentIndex >= 0 ? currentIndex : 0,
                      "current",
                    )}
                  </View>
                )}

                {/* Next Up */}
                {nextUp.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Next Up</Text>
                    {nextUp.map((song, i) => {
                      if (!song) return null;
                      const globalIdx = currentIndex + 1 + i;
                      return (
                        <View key={`${song.id}-${globalIdx}`}>
                          {renderSongItem(song, globalIdx, "next")}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Previously */}
                {previous.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Previously</Text>
                    {previous.map((song, i) => {
                      if (!song) return null;
                      return (
                        <View key={`${song.id}-${i}`}>
                          {renderSongItem(song, i, "previous")}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
  },
  dragHandleContainer: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#494454",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2d3449",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.textPrimary,
  },
  headerCount: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FF453A15",
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF453A",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  listContent: {
    paddingBottom: 16,
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  songArtwork: {
    width: 44,
    height: 44,
    borderRadius: 6,
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
    fontSize: 15,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  songTitleActive: {
    color: AppColors.accentCyan,
  },
  songArtist: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  songActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionBtn: {
    padding: 6,
  },
});
