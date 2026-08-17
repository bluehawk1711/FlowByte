import { CloudSongRow } from "@/components/CloudSongRow";
import { MiniPlayer } from "@/components/MiniPlayer";
import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import { useApiSync } from "@/hooks/useApiSync";
import { client } from "@/lib/api";
import { fetchCloudLibrary, toggleCloudFavorite } from "@/lib/cloud";
import { downloadSong, removeOfflineSong } from "@/lib/offline";
import { resolvePlaybackUrl } from "@/lib/playback";
import useAudioContext from "@/hooks/store/audioContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const CloudScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, syncing } = useApiSync();

  const [songs, setSongs] = useState<NonNullable<Song>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSong = useAudioContext((s) => s.song);
  const playList = useAudioContext((s) => s.playList);

  const load = useCallback(async (q?: string) => {
    if (!client) return;
    setIsLoading(true);
    try {
      const rows = await fetchCloudLibrary(q);
      setSongs(rows);
    } catch (e) {
      Alert.alert("Flowbyte Cloud", `Could not load library: ${String(e)}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, load]);

  const onSearch = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => void load(text.trim()), 350);
  };

  const playAll = () => {
    if (songs.length === 0) return;
    playList(songs, 0);
  };

  const onPlay = async (song: NonNullable<Song>) => {
    await resolvePlaybackUrl(song);
    playList(songs, songs.findIndex((s) => s.id === song.id));
  };

  const onToggleFavorite = async (song: NonNullable<Song>) => {
    const isFavorite = await toggleCloudFavorite(song);
    setSongs((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, isFavorite } : s)),
    );
  };

  const onToggleDownload = async (song: NonNullable<Song>) => {
    const apiSongId = song.apiSongId ?? song.id.replace("api:", "");
    const isOffline = song.isDownloaded || !!song.localUri;
    if (isOffline) {
      await removeOfflineSong(apiSongId);
      setSongs((prev) =>
        prev.map((s) =>
          s.id === song.id ? { ...s, isDownloaded: false, downloadStatus: "none" } : s,
        ),
      );
      return;
    }
    setDownloadingIds((prev) => new Set(prev).add(apiSongId));
    try {
      await downloadSong(song);
      setSongs((prev) =>
        prev.map((s) =>
          s.id === song.id ? { ...s, isDownloaded: true, downloadStatus: "downloaded" } : s,
        ),
      );
    } catch (e) {
      Alert.alert("Offline", `Download failed: ${String(e)}`);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(apiSongId);
        return next;
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Cloud</Text>
        <View style={styles.headerActions}>
          {signedIn && songs.length > 0 && (
            <Pressable style={styles.actionButton} onPress={playAll}>
              <Ionicons name="play-circle" size={26} color={AppColors.accentCyan} />
            </Pressable>
          )}
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push("/(tabs)/downloads")}
          >
            <Ionicons
              name="cloud-download-outline"
              size={24}
              color={AppColors.textPrimary}
            />
          </Pressable>
        </View>
      </View>

      {signedIn ? (
        <>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={AppColors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={onSearch}
              placeholder="Search cloud library"
              placeholderTextColor={AppColors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => onSearch("")}>
                <Ionicons name="close-circle" size={18} color={AppColors.textSecondary} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={() => void load(query.trim())}
                tintColor={AppColors.accentCyan}
              />
            }
          >
            {syncing && (
              <Text style={styles.syncingText}>Syncing with server...</Text>
            )}
            {songs.map((song, index) => (
              <CloudSongRow
                key={song.id}
                song={song}
                index={index}
                isPlaying={currentSong?.id === song.id}
                downloading={downloadingIds.has(song.apiSongId ?? song.id.replace("api:", ""))}
                onPress={onPlay}
                onToggleFavorite={onToggleFavorite}
                onToggleDownload={onToggleDownload}
              />
            ))}
            {!isLoading && songs.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="cloud-offline-outline" size={40} color={AppColors.textSecondary} />
                <Text style={styles.emptyText}>
                  {query ? "No songs match your search" : "Your cloud library is empty"}
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <View style={styles.signedOut}>
          <Ionicons name="cloud-outline" size={56} color={AppColors.textSecondary} />
          <Text style={styles.signedOutTitle}>Not signed in</Text>
          <Text style={styles.signedOutBody}>
            Connect your Flowbyte account to browse, stream and download your cloud
            library.
          </Text>
          <Pressable
            style={styles.signInButton}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <Text style={styles.signInButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.miniPlayerContainer}>
        <MiniPlayer showHeart={true} />
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
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#14141E",
  },
  searchInput: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingTop: 4,
  },
  syncingText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: "center",
    marginVertical: 6,
  },
  empty: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  signedOut: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  signedOutTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  signedOutBody: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  signInButton: {
    marginTop: 12,
    backgroundColor: AppColors.accentCyan,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  signInButtonText: {
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});