import { AppColors } from "@/constants/theme";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AudioPro, AudioProState, useAudioPro } from "react-native-audio-pro";

type MiniPlayerProps = {
  showHeart?: boolean;
  lightTheme?: boolean;
};

const MiniPlayerComponent: React.FC<MiniPlayerProps> = ({
  showHeart = false,
  lightTheme = false,
}) => {
  const router = useRouter();
  // Get data from audio context
  const song = useAudioContext((state) => state.song);
  const isFavorite = useFavourite((state) =>
    state.songs.find((favSong) => favSong?.id === song?.id),
  );
  const { playNext } = useAudioContext();
  const { state: audioState } = useAudioPro();

  const togglePlayPause = useAudioContext((state) => state.setIsPlaying);
  const isPlaying =
    audioState === AudioProState.PLAYING ||
    audioState === AudioProState.LOADING;
  const favouriteToggle = useFavourite((state) => state.toggleSong);

  // Memoize colors to prevent re-computation
  const colors = useMemo(
    () => ({
      bg: lightTheme ? "#E8E8F0" : "#1A1A1A",
      text: lightTheme ? AppColors.textLight : AppColors.textPrimary,
      subtext: lightTheme ? "#666" : AppColors.textSecondary,
    }),
    [lightTheme],
  );

  const onPlayPause = useCallback(() => {
    if (isPlaying) {
      AudioPro.pause();
      togglePlayPause(false);
    } else {
      AudioPro.resume();
      togglePlayPause(true);
    }
  }, [isPlaying, togglePlayPause]);

  if (!song) {
    return null;
  }
  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.bg }]}
      onPress={() => router.push("/playing")}
    >
      <View style={styles.leftSection}>
        {song.cover ? (
          <Image source={{ uri: song.cover }} style={styles.albumArt} />
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
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {song.title}
          </Text>
          <Text
            style={[styles.artist, { color: colors.subtext }]}
            numberOfLines={1}
          >
            {song.artist ?? "Unknown Artist"}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        {showHeart && (
          <Pressable
            style={styles.controlButton}
            onPress={() => favouriteToggle(song)}
          >
            <Ionicons
              name="heart"
              size={22}
              color={
                isFavorite ? AppColors.accentCyan : AppColors.textSecondary
              }
            />
          </Pressable>
        )}
        <Pressable style={styles.controlButton} onPress={onPlayPause}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color={lightTheme ? AppColors.accentCyan : AppColors.textPrimary}
          />
        </Pressable>
        <Pressable style={styles.controlButton} onPress={() => playNext(true)}>
          <Ionicons
            name="play-skip-forward"
            size={22}
            color={lightTheme ? AppColors.textLight : AppColors.textPrimary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  placeholderArt: {
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlButton: {
    padding: 8,
  },
});

// Memoize component to prevent unnecessary re-renders
export const MiniPlayer = React.memo(
  MiniPlayerComponent,
  (prevProps, nextProps) => {
    // Custom comparison for MiniPlayer props
    return (
      prevProps.showHeart === nextProps.showHeart &&
      prevProps.lightTheme === nextProps.lightTheme
    );
  },
);

MiniPlayer.displayName = "MiniPlayer";
