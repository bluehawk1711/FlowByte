import { AppColors, useThemedStyles } from "@/constants/theme";
import { Song } from "@/constants/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type CloudSongRowProps = {
  song: NonNullable<Song>;
  isPlaying?: boolean;
  index?: number;
  onPress: (song: NonNullable<Song>) => void;
  onToggleFavorite: (song: NonNullable<Song>) => void;
  onToggleDownload: (song: NonNullable<Song>) => void;
  downloading?: boolean;
};

const CloudSongRowComponent: React.FC<CloudSongRowProps> = ({
  song,
  isPlaying = false,
  index = 0,
  onPress,
  onToggleFavorite,
  onToggleDownload,
  downloading = false,
}) => {
  const styles = useThemedStyles(createStyles);
  const heartScale = useSharedValue(1);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const popHeart = () => {
    heartScale.value = withSequence(
      withSpring(1.35, { damping: 8, stiffness: 300 }),
      withTiming(1, { duration: 150 }),
    );
    onToggleFavorite(song);
  };

  const cover =
    song.cover ??
    Image.resolveAssetSource(require("@/assets/images/default-cover.png")).uri;

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isOffline = song.isDownloaded || !!song.localUri;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 12) * 40).duration(280)}
    >
      <View style={[styles.container, isPlaying && styles.activeRow]}>
        <Pressable
          style={styles.mainPressable}
          onPress={() => onPress(song)}
          android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        >
          <Image source={{ uri: cover }} style={styles.albumArt} />
          <View style={styles.textContainer}>
            <Text
              style={[styles.title, isPlaying && styles.activeText]}
              numberOfLines={1}
            >
              {song.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {song.artist ?? "Unknown Artist"}
            </Text>
          </View>
          <View style={styles.trailing}>
            {isPlaying && (
              <Ionicons name="bar-chart" size={16} color={AppColors.accentPurple} />
            )}
            <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
          </View>
        </Pressable>

        <Animated.View style={heartStyle}>
          <Pressable style={styles.actionButton} onPress={popHeart}>
            <Ionicons
              name={song.isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={song.isFavorite ? AppColors.accentCyan : AppColors.textSecondary}
            />
          </Pressable>
        </Animated.View>

        <Pressable style={styles.actionButton} onPress={() => onToggleDownload(song)}>
          {downloading ? (
            <Ionicons name="ellipsis-horizontal" size={20} color={AppColors.accentCyan} />
          ) : (
            <Ionicons
              name={isOffline ? "cloud-download" : "download-outline"}
              size={20}
              color={isOffline ? "#22C55E" : AppColors.textSecondary}
            />
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    backgroundColor: AppColors.backgroundCard,
  },
  activeRow: {
    backgroundColor: "rgba(168, 85, 247, 0.12)",
  },
  mainPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  artist: {
    fontSize: 13,
    marginTop: 2,
    color: AppColors.textSecondary,
  },
  activeText: {
    color: AppColors.accentPurple,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  duration: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  actionButton: {
    padding: 8,
  },
});

export const CloudSongRow = React.memo(CloudSongRowComponent);
CloudSongRow.displayName = "CloudSongRow";