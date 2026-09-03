import { MiniPlayer } from "@/components/MiniPlayer";
import { SongListItem } from "@/components/SongListItem";
import { AppColors, useThemedStyles } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import { client } from "@/lib/api";
import { toMobileSong } from "@/lib/sync";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SongRowSkeleton,
  ArtistCardSkeleton,
  AlbumCardSkeleton,
} from "@/components/ui/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isYouTubeUrl } from "@flowbyte/validation";

const DEBOUNCE_MS = 300;
const RECENT_SEARCHES_KEY = "flowbyte.recentSearches";
const MAX_RECENT = 10;

interface SearchResult {
  songs: Song[];
  artists: {
    id: string;
    name: string;
    artworkUrl?: string;
    songCount?: number;
  }[];
  albums: {
    id: string;
    name: string;
    artistName?: string;
    artworkUrl?: string;
    songCount?: number;
  }[];
}

// Browse categories with colors
const BROWSE_CATEGORIES = [
  { name: "Pop", color: "#E91E63" },
  { name: "Electronic", color: "#9C27B0" },
  { name: "Rock", color: "#F44336" },
  { name: "Ambient", color: "#3F51B5" },
  { name: "Hip Hop", color: "#FF9800" },
  { name: "Classical", color: "#009688" },
  { name: "Jazz", color: "#795548" },
  { name: "R&B", color: "#673AB7" },
  { name: "Indie", color: "#4CAF50" },
  { name: "Lo-fi", color: "#00BCD4" },
];

export const SearchScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { playList } = useAudioContext();
  const currentSong = useAudioContext((s) => s.song);
  const isPlaying = useAudioContext((s) => s.isPlaying);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // URL detection
  const isUrl = query.trim().length > 0 && isYouTubeUrl(query.trim());

  // Load recent searches
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (raw) setRecentSearches(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const saveRecentSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || isYouTubeUrl(trimmed)) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(
        0,
        MAX_RECENT,
      );
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback(async (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(
        () => {},
      );
      return next;
    });
  }, []);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || isUrl) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        if (!client) return;
        const res = await client.search({ query: query.trim() });
        setResults({
          songs: res.songs.map(toMobileSong),
          artists: res.artists.map((a: { id: string; name: string; artworkUrl?: string | null }) => ({
            ...a,
            artworkUrl: a.artworkUrl ?? undefined,
          })),
          albums: res.albums.map((a: { id: string; name: string; artistName?: string | null; artworkUrl?: string | null }) => ({
            ...a,
            artistName: a.artistName ?? undefined,
            artworkUrl: a.artworkUrl ?? undefined,
          })),
        });
        // Save to recent
        saveRecentSearch(query);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query, isUrl, saveRecentSearch]);

  const playSong = useCallback(
    (song: Song) => {
      if (!song) return;
      const index = results?.songs.findIndex((s) => s?.id === song.id) ?? 0;
      playList(results?.songs ?? [song], index >= 0 ? index : 0);
      router.push("/(tabs)/playing");
    },
    [results, playList, router],
  );

  const totalResults = results
    ? results.songs.length + results.artists.length + results.albums.length
    : 0;

  const hasQuery = query.trim().length > 0;

  const handleUrlAction = () => {
    Alert.alert(
      "YouTube Link Detected",
      "This looks like a YouTube URL. What would you like to do?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save to Library",
          onPress: () => {
            // Navigate to Saved screen to add
            router.push("/(tabs)/saved");
          },
        },
        {
          text: "Open in Browser",
          onPress: () => {
            // NOT ALLowed
            // const { Linking } = require("react-native");
            Linking.openURL(query.trim());
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={AppColors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Artists, songs, or paste a URL"
          placeholderTextColor={AppColors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons
              name="close-circle"
              size={18}
              color={AppColors.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* URL detected banner */}
      {isUrl && (
        <Pressable style={styles.urlBanner} onPress={handleUrlAction}>
          <Ionicons name="logo-youtube" size={20} color="#FF0000" />
          <View style={styles.urlBannerText}>
            <Text style={styles.urlBannerTitle}>YouTube link detected</Text>
            <Text style={styles.urlBannerSubtitle} numberOfLines={1}>
              {query.trim()}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={AppColors.textSecondary}
          />
        </Pressable>
      )}

      {/* Results count */}
      {hasQuery && !loading && results && !isUrl && (
        <Text style={styles.resultCount}>
          {totalResults === 0
            ? `No results for "${query.trim()}"`
            : `${totalResults} result${totalResults === 1 ? "" : "s"} for "${query.trim()}"`}
        </Text>
      )}

      {/* Loading skeleton */}
      {loading && (
        <View style={styles.skeletonContainer}>
          <Text style={styles.sectionTitle}>Songs</Text>
          {Array.from({ length: 5 }).map((_, i) => (
            <SongRowSkeleton key={`song-${i}`} delay={i * 50} />
          ))}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Artists</Text>
          <View style={styles.artistGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={`artist-${i}`} style={styles.artistCard}>
                <ArtistCardSkeleton delay={i * 50 + 250} />
              </View>
            ))}
          </View>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Albums</Text>
          <View style={styles.artistGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={`album-${i}`} style={styles.artistCard}>
                <AlbumCardSkeleton delay={i * 50 + 500} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={44}
            color={AppColors.textSecondary}
          />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      )}

      {/* Empty state — no query: show recent searches + browse grid */}
      {!hasQuery && !loading && (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.scrollContent}>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent searches</Text>
                  {recentSearches.map((term) => (
                    <Pressable
                      key={term}
                      style={styles.recentItem}
                      onPress={() => setQuery(term)}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={AppColors.textSecondary}
                      />
                      <Text style={styles.recentText} numberOfLines={1}>
                        {term}
                      </Text>
                      <Pressable
                        style={styles.recentRemove}
                        onPress={() => removeRecentSearch(term)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={AppColors.textSecondary}
                        />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Browse All */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Browse all</Text>
                <View style={styles.browseGrid}>
                  {BROWSE_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.name}
                      style={[
                        styles.browseCard,
                        { backgroundColor: cat.color + "30" },
                      ]}
                      onPress={() => setQuery(cat.name)}
                    >
                      <Text
                        style={[styles.browseCardText, { color: cat.color }]}
                      >
                        {cat.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          }
        />
      )}

      {/* No results */}
      {!loading && results && totalResults === 0 && !isUrl && (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={44}
            color={AppColors.textSecondary}
          />
          <Text style={styles.emptyText}>No results for `{query.trim()}`</Text>
        </View>
      )}

      {/* Results */}
      {results && !loading && !isUrl && (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.scrollContent}>
              {/* Songs */}
              {results.songs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Songs</Text>
                  {results.songs.map((song, i) => (
                    <SongListItem
                      key={song?.id || i}
                      song={song}
                      isActive={currentSong?.id === song?.id}
                      isPlaying={currentSong?.id === song?.id && isPlaying}
                      onPress={() => playSong(song)}
                    />
                  ))}
                </View>
              )}

              {/* Artists */}
              {results.artists.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Artists</Text>
                  <View style={styles.artistGrid}>
                    {results.artists.map((artist) => (
                      <Pressable key={artist.id} style={styles.artistCard}>
                        {artist.artworkUrl ? (
                          <Image
                            source={{ uri: artist.artworkUrl }}
                            style={styles.artistAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.artistAvatar,
                              styles.artistPlaceholder,
                            ]}
                          >
                            <Text style={styles.artistInitial}>
                              {artist.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.artistName} numberOfLines={1}>
                          {artist.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Albums */}
              {results.albums.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Albums</Text>
                  <View style={styles.artistGrid}>
                    {results.albums.map((album) => (
                      <Pressable key={album.id} style={styles.artistCard}>
                        {album.artworkUrl ? (
                          <Image
                            source={{ uri: album.artworkUrl }}
                            style={styles.artistAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.artistAvatar,
                              styles.artistPlaceholder,
                            ]}
                          >
                            <Ionicons
                              name="disc"
                              size={24}
                              color={AppColors.textSecondary}
                            />
                          </View>
                        )}
                        <Text style={styles.artistName} numberOfLines={1}>
                          {album.name}
                        </Text>
                        {album.artistName && (
                          <Text style={styles.albumArtist} numberOfLines={1}>
                            {album.artistName}
                          </Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
        />
      )}

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer showHeart />
      </View>
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#14141E",
  },
  searchInput: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    padding: 0,
  },
  urlBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FF000015",
    borderWidth: 1,
    borderColor: "#FF000030",
  },
  urlBannerText: {
    flex: 1,
  },
  urlBannerTitle: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  urlBannerSubtitle: {
    color: AppColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  resultCount: {
    paddingHorizontal: 16,
    marginBottom: 4,
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  skeletonContainer: {
    marginTop: 8,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recentText: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
  },
  recentRemove: {
    padding: 4,
  },
  browseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  browseCard: {
    width: "47%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    padding: 14,
    justifyContent: "flex-end",
  },
  browseCardText: {
    fontSize: 18,
    fontWeight: "700",
  },
  artistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  artistCard: {
    width: "30%",
    alignItems: "center",
    marginBottom: 16,
  },
  artistAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 6,
  },
  artistPlaceholder: {
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  artistInitial: {
    fontSize: 24,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
  artistName: {
    fontSize: 13,
    fontWeight: "500",
    color: AppColors.textPrimary,
    textAlign: "center",
  },
  albumArtist: {
    fontSize: 11,
    color: AppColors.textSecondary,
    textAlign: "center",
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


