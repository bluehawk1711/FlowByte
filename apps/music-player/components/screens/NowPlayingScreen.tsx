import { AppColors } from "@/constants/theme";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AudioPro, AudioProState, useAudioPro } from "react-native-audio-pro";
import { Slider } from "react-native-awesome-slider";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SongActionsMenu } from "../SongActionsMenu";
const { width } = Dimensions.get("window");
const ARTWORK_SIZE = width - 64;

export const NowPlayingScreen = () => {
  const {
    playlist,
    song,
    setIsPlaying,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
    playNext,
    playPrevious,
  } = useAudioContext();

  const insets = useSafeAreaInsets();

  const isFavorite = useFavourite((state) =>
    state.songs.find((favSong) => favSong?.id === song?.id),
  );
  const favouriteToggle = useFavourite((state) => state.toggleSong);

  // AudioPro hook for reactive state
  const { state: audioState, position, duration } = useAudioPro();
  const isPlaying =
    audioState === AudioProState.PLAYING ||
    audioState === AudioProState.LOADING;

  const router = useRouter();

  // Slider values
  const progress = useSharedValue(0);
  const min = useSharedValue(0);
  const max = useSharedValue(1);

  // Sync slider with audio position
  useEffect(() => {
    progress.value = position / 1000;
    max.value = duration / 1000 || 1;
  }, [position, duration, progress, max]);

  const onPlayPause = () => {
    if (isPlaying) {
      AudioPro.pause();
      setIsPlaying(false);
    } else {
      AudioPro.resume();
      setIsPlaying(true);
    }
  };

  const onClose = () => {
    router.back();
  };

  // Format time in mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle slider seek
  const handleSliderChange = useCallback((value: number) => {
    AudioPro.seekTo(value * 1000); // Convert s to ms
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom - 24 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={onClose}>
          <Ionicons
            name="chevron-down"
            size={28}
            color={AppColors.textPrimary}
          />
        </Pressable>
        <SongActionsMenu song={song} menuIconColor={"#e3e3e3ff"} />
      </View>

      {/* Album Artwork */}
      <View style={styles.artworkContainer}>
        {song?.cover ? (
          <Image
            source={{ uri: song.cover }}
            style={styles.artwork}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.artwork, styles.placeholderArt]}>
            <View style={styles.placeholderContent}>
              <View style={styles.synthwaveSun} />
              <View style={styles.synthwaveMountains} />
            </View>
          </View>
        )}
      </View>

      {/* Song Info */}
      <View style={styles.songInfo}>
        <View style={styles.songTitleRow}>
          <Text style={styles.songTitle} numberOfLines={1} ellipsizeMode="tail">
            {song?.title}
          </Text>
          <Pressable onPress={() => favouriteToggle(song)}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={
                isFavorite ? AppColors.accentCyan : AppColors.textSecondary
              }
            />
          </Pressable>
        </View>
        <Text style={styles.artistName} numberOfLines={1}>
          {song?.artist}
        </Text>
      </View>

      {/* Progress Slider */}
      <View style={styles.progressContainer}>
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            progress={progress}
            minimumValue={min}
            maximumValue={max}
            onSlidingComplete={handleSliderChange}
            theme={{
              minimumTrackTintColor: AppColors.accentCyan,
              maximumTrackTintColor: AppColors.textSecondary,
              bubbleBackgroundColor: AppColors.accentCyan,
            }}
            thumbWidth={14}
            containerStyle={{ borderRadius: 4 }}
          />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position / 1000)}</Text>
          <Text style={styles.timeText}>{formatTime(duration / 1000)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable
          disabled={playlist.length < 1}
          style={styles.controlButton}
          onPress={toggleShuffle}
        >
          <View style={{ alignItems: "center", gap: 4 }}>
            <Ionicons
              name="shuffle"
              size={24}
              color={shuffle ? AppColors.accentCyan : AppColors.textSecondary}
            />
            <Text style={styles.controlLabel}>Shuffle</Text>
          </View>
        </Pressable>

        <Pressable
          disabled={playlist.length < 1}
          style={styles.controlButton}
          onPress={playPrevious}
        >
          <Ionicons
            name="play-skip-back"
            size={28}
            color={AppColors.textPrimary}
          />
        </Pressable>

        <Pressable style={styles.playButton} onPress={onPlayPause}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={32}
            color={AppColors.textPrimary}
          />
        </Pressable>

        <Pressable
          disabled={playlist.length < 1}
          style={styles.controlButton}
          onPress={() => playNext(true)}
        >
          <Ionicons
            name="play-skip-forward"
            size={28}
            color={AppColors.textPrimary}
          />
        </Pressable>

        <Pressable
          disabled={playlist.length < 1}
          style={styles.controlButton}
          onPress={toggleRepeat}
        >
          <View style={{ alignItems: "center", gap: 4 }}>
            <Ionicons
              name="repeat"
              size={24}
              color={repeat ? AppColors.accentCyan : AppColors.textSecondary}
            />
            <Text style={styles.controlLabel}>Loop</Text>
          </View>
        </Pressable>
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
    marginBottom: 16,
  },
  headerButton: {
    padding: 8,
  },
  artworkContainer: {
    flex: 1,
    justifyContent: "flex-end", // Push content down in the available space
    alignItems: "center",
    marginBottom: 24, // Increase margin for better spacing from controls
  },
  artwork: {
    width: "100%", // Flexible width
    height: "100%", // Flexible height
    aspectRatio: 1, // Maintain square aspect ratio
    maxHeight: ARTWORK_SIZE, // Limit max size to original design
    borderRadius: 20,
  },
  placeholderArt: {
    backgroundColor: "#1A1A2E",
    overflow: "hidden",
  },
  placeholderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  synthwaveSun: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FF69B4",
    opacity: 0.8,
  },
  synthwaveMountains: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 100,
    backgroundColor: "#00CED1",
    opacity: 0.3,
  },
  songInfo: {
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  songTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  songTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    flex: 1,
    marginRight: 16,
  },
  artistName: {
    fontSize: 16,
    color: AppColors.accentCyan,
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 32,
  },
  sliderContainer: {
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  timeText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 24,
    marginBottom: 40,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.accentPurple,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: AppColors.accentPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
  },
  bottomTab: {
    padding: 8,
  },
  bottomTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textSecondary,
    letterSpacing: 1,
  },
  bottomTabTextActive: {
    color: AppColors.textPrimary,
  },
  controlLabel: {
    fontSize: 10,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
});
