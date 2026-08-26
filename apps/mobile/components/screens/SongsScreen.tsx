import { MiniPlayer } from "@/components/MiniPlayer";
import { SongListItem } from "@/components/SongListItem";
import { TabFilter } from "@/components/TabFilter";
import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import { client } from "@/lib/api";
import { toMobileSong } from "@/lib/sync";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SongRowSkeleton } from "@/components/ui/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = [
  { id: "all", label: "All Songs" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
];

export const SongsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { playList } = useAudioContext();
  const currentSong = useAudioContext((s) => s.song);
  const isPlaying = useAudioContext((s) => s.isPlaying);

  const [songs, setSongs] = useState<NonNullable<Song>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!client) return;
        const res = await client.getSongs({ pageSize: 200 });
        if (!cancelled) setSongs(res.items.map(toMobileSong).filter(Boolean) as NonNullable<Song>[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load songs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSongPress = useCallback(
    (song: NonNullable<Song>) => {
      const index = songs.findIndex((s) => s?.id === song.id);
      playList(songs, index >= 0 ? index : 0);
      router.push("/(tabs)/playing");
    },
    [songs, playList, router],
  );

  const renderSong = useCallback(
    ({ item }: { item: NonNullable<Song> }) => (
      <SongListItem
        song={item}
        isActive={currentSong?.id === item.id}
        isPlaying={currentSong?.id === item.id && isPlaying}
        onPress={handleSongPress}
      />
    ),
    [currentSong, isPlaying, handleSongPress],
  );

  const keyExtractor = useCallback(
    (item: NonNullable<Song>, index: number) => item.id || String(index),
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Songs</Text>
        <View style={styles.headerRight}>
          <Ionicons name="musical-notes" size={20} color={AppColors.accentCyan} />
          <Text style={styles.songCount}>{songs.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <TabFilter
        tabs={TABS}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        variant="chip"
      />

      {/* Content */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SongRowSkeleton key={i} delay={i * 40} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={AppColors.textSecondary} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : songs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={44} color={AppColors.textSecondary} />
          <Text style={styles.emptyText}>No songs yet</Text>
          <Text style={styles.emptySubtext}>
            Add music from YouTube or sync your cloud library.
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSong}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          extraData={[currentSong]}
        />
      )}

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer showHeart />
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  songCount: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 120,
  },
  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});
