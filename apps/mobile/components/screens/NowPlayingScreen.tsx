import { AppColors } from "@/constants/theme";
import useAudioContext from "@/hooks/store/audioContext";
import useFavourite from "@/hooks/store/favourite";
import { client } from "@/lib/api";
import { API_PREFIX } from "@/lib/sync";
import {
  downloadSong,
  isDownloaded,
  onOfflineChange,
  removeOfflineSong,
} from "@/lib/offline";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
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

import { QueueSheet } from "../QueueSheet";
import { SongActionsMenu } from "../SongActionsMenu";
import type { NormalizedLyrics } from "@flowbyte/types";
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

  const apiSongId =
    song?.source === "api"
      ? (song.apiSongId ??
        (song.id.startsWith(API_PREFIX)
          ? song.id.slice(API_PREFIX.length)
          : null))
      : null;

  const [offline, setOffline] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Track offline status for cloud songs (re-renders when downloads change).
  useEffect(() => {
    let mounted = true;
    if (!apiSongId) {
      setOffline(false);
      return;
    }
    void isDownloaded(apiSongId).then((d) => mounted && setOffline(d));
    const unsub = onOfflineChange(() => {
      void isDownloaded(apiSongId).then((d) => mounted && setOffline(d));
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [apiSongId]);

  const onToggleOffline = async () => {
    if (!song || !apiSongId) return;
    if (offline) {
      await removeOfflineSong(apiSongId);
      return;
    }
    setDownloading(true);
    try {
      await downloadSong(song);
    } finally {
      setDownloading(false);
    }
  };

  // --- Lyrics ---
  const [lyrics, setLyrics] = useState<NormalizedLyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const lyricsFlatListRef = useRef<FlatList>(null);
  const prevActiveLyricsRef = useRef<number>(-1);

  useEffect(() => {
    if (!apiSongId || !client) {
      setLyrics(null);
      return;
    }
    let cancelled = false;
    setLyricsLoading(true);
    setLyrics(null);
    void client
      .getLyrics(apiSongId)
      .then((res: NormalizedLyrics | null) => {
        if (!cancelled) setLyrics(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiSongId]);

  // Find active lyrics line based on current position
  const getActiveLyricsIndex = useCallback((): number => {
    if (!lyrics?.synced || !lyrics.lines.length) return -1;
    const posMs = position; // position is already in ms from useAudioPro
    let active = -1;
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (posMs >= lyrics.lines[i].start) active = i;
      else break;
    }
    return active;
  }, [lyrics, position]);

  const activeLyricsIndex = getActiveLyricsIndex();

  // Auto-scroll to active line
  useEffect(() => {
    if (
      activeLyricsIndex < 0 ||
      activeLyricsIndex === prevActiveLyricsRef.current
    )
      return;
    prevActiveLyricsRef.current = activeLyricsIndex;
    lyricsFlatListRef.current?.scrollToIndex({
      index: activeLyricsIndex,
      animated: true,
      viewPosition: 0.4,
    });
  }, [activeLyricsIndex]);

  // Reset active ref when lyrics change
  useEffect(() => {
    prevActiveLyricsRef.current = -1;
  }, [lyrics]);

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
        {apiSongId && (
          <View style={styles.cloudRow}>
            <View style={styles.cloudBadge}>
              <Ionicons name="cloud" size={11} color={AppColors.accentCyan} />
              <Text style={styles.cloudBadgeText}>Cloud</Text>
            </View>
            <Pressable
              style={styles.offlineButton}
              onPress={() => void onToggleOffline()}
              hitSlop={8}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={AppColors.textPrimary} />
              ) : (
                <Ionicons
                  name={offline ? "checkmark-circle" : "download-outline"}
                  size={16}
                  color={
                    offline ? AppColors.accentCyan : AppColors.textSecondary
                  }
                />
              )}
              <Text style={styles.offlineText}>
                {offline ? "Saved offline" : "Download offline"}
              </Text>
            </Pressable>
          </View>
        )}
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

      {/* Bottom actions row */}
      <View style={styles.bottomTabs}>
        {apiSongId && !lyricsLoading && lyrics && (
          <Pressable
            style={styles.bottomTab}
            onPress={() => setShowLyrics((v) => !v)}
          >
            <Ionicons
              name={showLyrics ? "chevron-down" : "mic"}
              size={20}
              color={AppColors.textSecondary}
            />
            <Text style={styles.bottomTabText}>
              {showLyrics ? "Lyrics" : "Lyrics"}
            </Text>
          </Pressable>
        )}
        <Pressable style={styles.bottomTab} onPress={() => setShowQueue(true)}>
          <Ionicons name="list" size={20} color={AppColors.textSecondary} />
          <Text style={styles.bottomTabText}>Queue</Text>
        </Pressable>
      </View>

      <QueueSheet visible={showQueue} onDismiss={() => setShowQueue(false)} />

      {/* Lyrics loading */}
      {lyricsLoading && (
        <View style={styles.lyricsLoadingContainer}>
          <ActivityIndicator size="small" color={AppColors.accentCyan} />
          <Text style={styles.lyricsLoadingText}>Loading lyrics…</Text>
        </View>
      )}

      {/* Lyrics display */}
      {showLyrics && lyrics && !lyricsLoading && (
        <View style={styles.lyricsContainer}>
          {lyrics.synced && lyrics.lines.length > 0 ? (
            <FlatList
              ref={lyricsFlatListRef}
              data={lyrics.lines}
              keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.lyricsListContent}
              renderItem={({ item: line, index: i }) => {
                const isActive = i === activeLyricsIndex;
                const isPast = activeLyricsIndex >= 0 && i < activeLyricsIndex;
                return (
                  <Text
                    style={[
                      styles.lyricsLine,
                      isActive && styles.lyricsLineActive,
                      isPast && styles.lyricsLinePast,
                    ]}
                  >
                    {line.text}
                  </Text>
                );
              }}
            />
          ) : !lyrics.synced && lyrics.lines.length > 0 ? (
            <FlatList
              data={lyrics.lines}
              keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.lyricsListContent}
              renderItem={({ item: line }) => (
                <Text style={styles.lyricsLineUnsynced}>{line.text}</Text>
              )}
            />
          ) : (
            <View style={styles.lyricsEmpty}>
              <Ionicons
                name="mic-outline"
                size={28}
                color={AppColors.textSecondary}
              />
              <Text style={styles.lyricsEmptyText}>No lyrics available</Text>
            </View>
          )}
        </View>
      )}
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
  cloudRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  cloudBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#14202B",
  },
  cloudBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },
  offlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#1A1A2E",
  },
  offlineText: {
    fontSize: 11,
    fontWeight: "500",
    color: AppColors.textSecondary,
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
    alignItems: "center",
    gap: 32,
    paddingVertical: 8,
  },
  bottomTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
  },
  bottomTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  bottomTabTextActive: {
    color: AppColors.textPrimary,
  },
  controlLabel: {
    fontSize: 10,
    color: AppColors.textSecondary,
    fontWeight: "500",
  },
  lyricsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  lyricsToggleText: {
    fontSize: 12,
    fontWeight: "500",
    color: AppColors.accentCyan,
  },
  lyricsLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  lyricsLoadingText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  lyricsContainer: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 24,
  },
  lyricsListContent: {
    paddingBottom: 20,
  },
  lyricsLine: {
    fontSize: 16,
    color: AppColors.textSecondary,
    paddingVertical: 4,
    lineHeight: 24,
  },
  lyricsLineActive: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  lyricsLinePast: {
    color: AppColors.textMuted,
  },
  lyricsLineUnsynced: {
    fontSize: 16,
    color: AppColors.textSecondary,
    paddingVertical: 6,
    lineHeight: 24,
  },
  lyricsEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lyricsEmptyText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});
