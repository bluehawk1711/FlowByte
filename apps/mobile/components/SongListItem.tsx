import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import { useSelectionStore } from "@/hooks/store/selectionStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SongActionsMenu } from "./SongActionsMenu";

type SongListItemProps = {
  song: Song;
  isPlaying?: boolean;
  isActive?: boolean;
  onPress: (song: NonNullable<Song>) => void;
  lightTheme?: boolean;
};

const SongListItemComponent: React.FC<SongListItemProps> = ({
  song,
  isPlaying = false,
  isActive = false,
  onPress,
  lightTheme = false,
}) => {
  const isSelectionMode = useSelectionStore((state) => state.selectionMode);
  const isSelected = useSelectionStore((state) =>
    song ? state.selectedIds.includes(song.id) : false,
  );
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);

  const colors = useMemo(
    () => ({
      bg:
        isActive || isSelected
          ? lightTheme
            ? "#F0E6F5"
            : "rgba(168, 85, 247, 0.15)"
          : "transparent",
      text: lightTheme ? AppColors.textLight : AppColors.textPrimary,
      subtext: lightTheme ? "#666" : AppColors.textSecondary,
    }),
    [isActive, isSelected, lightTheme],
  );

  if (!song) return null;

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const title = song?.title || "Unknown Title";
  const artist = song?.artist || "Unknown Artist";
  const cover =
    song?.cover ||
    Image.resolveAssetSource(require("@/assets/images/default-cover.png")).uri;
  const duration = formatDuration(song?.duration || 0);

  const handlePress = () => {
    if (isSelectionMode) {
      toggleSelection(song.id);
    } else {
      onPress(song);
    }
  };

  const handleLongPress = () => {
    toggleSelection(song.id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Pressable
        style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
        onPress={handlePress}
        onLongPress={handleLongPress}
        
        delayLongPress={200}
      >
        {isSelectionMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={24}
              color={isSelected ? AppColors.accentPurple : colors.subtext}
            />
          </View>
        )}

        {cover ? (
          <Image source={{ uri: cover }} style={styles.albumArt} />
        ) : (
          <View style={[styles.albumArt, styles.placeholderArt]}>
            <Ionicons
              name="musical-note"
              size={20}
              color={AppColors.accentCyan}
            />
          </View>
        )}

        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              { color: isActive ? AppColors.accentPurple : colors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.artist, { color: colors.subtext }]}
            numberOfLines={1}
          >
            {artist}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {isPlaying && (
            <Ionicons
              name="bar-chart"
              size={18}
              color={AppColors.accentPurple}
            />
          )}
          {duration && (
            <Text style={[styles.duration, { color: colors.subtext }]}>
              {duration}
            </Text>
          )}
        </View>
      </Pressable>
      {!isSelectionMode && (
        <SongActionsMenu song={song} menuIconColor={colors.subtext} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  placeholderArt: {
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
  },
  artist: {
    fontSize: 13,
    marginTop: 3,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  duration: {
    fontSize: 13,
  },
  checkboxContainer: {
    marginRight: 12,
  },
});

// Memoize component to prevent unnecessary re-renders
export const SongListItem = React.memo(
  SongListItemComponent,
  (prevProps, nextProps) => {
    // Custom comparison for performance-critical props
    return (
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.song?.id === nextProps.song?.id &&
      prevProps.lightTheme === nextProps.lightTheme
    );
  },
);

SongListItem.displayName = "SongListItem";
