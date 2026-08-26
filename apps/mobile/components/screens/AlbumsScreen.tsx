import { MiniPlayer } from "@/components/MiniPlayer";
import { AppColors } from "@/constants/theme";
import useAudioContext from "@/hooks/store/audioContext";
import { client } from "@/lib/api";
import { toMobileSong } from "@/lib/sync";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AlbumCardSkeleton } from "@/components/ui/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Album {
  id: string;
  name: string;
  artistName?: string;
  artworkUrl?: string;
  songCount?: number;
  releaseYear?: number;
}

export const AlbumsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { playList } = useAudioContext();
  const currentSong = useAudioContext((s) => s.song);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!client) return;
        const data = await client.getAlbums();
        if (!cancelled) setAlbums(data.map((a) => ({
          id: a.id,
          name: a.name,
          artistName: a.artistName ?? undefined,
          artworkUrl: a.artworkUrl ?? undefined,
          releaseYear: a.releaseYear ?? undefined,
        })));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load albums");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const playAlbum = useCallback(
    async (album: Album) => {
      try {
        if (!client) return;
        const detail = await client.getAlbum(album.id);
        const songs = detail.songs.map(toMobileSong).filter(Boolean);
        if (songs.length > 0) {
          playList(songs, 0);
          router.push("/(tabs)/playing");
        }
      } catch {
        // Album detail fetch failed
      }
    },
    [playList, router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.card}>
              <AlbumCardSkeleton delay={i * 50} />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={AppColors.textSecondary} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="disc-outline" size={44} color={AppColors.textSecondary} />
          <Text style={styles.emptyText}>No albums yet</Text>
          <Text style={styles.emptySubtext}>
            Albums are created automatically when songs have album metadata.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
        >
          <View style={styles.grid}>
            {albums.map((album) => (
              <Pressable
                key={album.id}
                style={styles.card}
                onPress={() => playAlbum(album)}
              >
                {album.artworkUrl ? (
                  <Image source={{ uri: album.artworkUrl }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.placeholder]}>
                    <Ionicons name="disc" size={32} color={AppColors.textSecondary} />
                  </View>
                )}
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {album.name}
                </Text>
                <Text style={styles.albumArtist} numberOfLines={1}>
                  {album.artistName ?? "Unknown Artist"}
                  {album.releaseYear ? ` · ${album.releaseYear}` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer />
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
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
    justifyContent: "space-between",
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
  scrollView: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 20,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholder: {
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  albumArtist: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});
