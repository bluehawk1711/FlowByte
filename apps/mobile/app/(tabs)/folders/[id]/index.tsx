import { MiniPlayer } from "@/components/MiniPlayer";
import { ScreenHeader } from "@/components/ScreenHeader";
import SongList from "@/components/SongList";
import { AppColors } from "@/constants/theme";
import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";
import { Ionicons } from "@expo/vector-icons";
import {
  Asset,
  getAlbumsAsync,
  getAssetsAsync,
  MediaType,
} from "expo-media-library";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [albumName, setAlbumName] = useState<string>("");
  const [audioFiles, setAudioFiles] = useState<Asset[]>([]);
  const [filteredAudioFiles, setFilteredAudioFiles] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const playList = useAudioContext((state) => state.playList);

  useEffect(() => {
    const fetchAudioFiles = async () => {
      try {
        setLoading(true);

        const albums = await getAlbumsAsync();
        const album = albums.find((a) => a.id === id);
        if (album) {
          setAlbumName(album.title);
        }

        // Get audio files from the album
        const assets = await getAssetsAsync({
          album: id,
          mediaType: MediaType.audio,
          first: 1000, // Get up to 1000 audio files
        });

        setAudioFiles(assets.assets);
      } catch (error) {
        console.error("Error fetching audio files:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAudioFiles();
    }
  }, [id]);

  const handleBackPress = () => {
    router.back();
  };

  const handlePlayAll = () => {
    if (audioFiles.length > 0) {
      const songs: Song[] = audioFiles.map((asset) => ({
        id: asset.id,
        title: asset.filename.replace(/\.[^/.]+$/, "") || asset.filename, // Remove file extension
        artist: undefined,
        album: albumName,
        duration: asset.duration,
        cover: undefined,
        url: asset.uri,
      }));
      playList(songs, 0);
      router.push("/(tabs)/playing");
    }
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      return;
    }
    const timeoutId = setTimeout(async () => {
      const filterAudioFIles = audioFiles.filter((asset) =>
        asset.filename.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredAudioFiles(filterAudioFIles);
    }, 200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const SONGS = searchQuery !== "" ? filteredAudioFiles : audioFiles;

  const songData: Song[] = SONGS.map((item) => ({
    id: item.id,
    title: item.filename.replace(/\.[^/.]+$/, "") || item.filename,
    artist: "Unknown Artist",
    album: albumName,
    duration: item.duration,
    cover: undefined,
    url: item.uri,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title={albumName || "Folder"}
        showBackButton
        onBackPress={handleBackPress}
        rightActions={[
          {
            icon: "search",
            onPress: () => setSearchModalVisible(!searchModalVisible),
          },
        ]}
      />
      {searchModalVisible && (
        <SearchInput
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.playAllButton} onPress={handlePlayAll}>
          <Ionicons name="play" size={18} color={AppColors.backgroundDark} />
          <Text style={styles.playAllText}>Play All</Text>
        </Pressable>
      </View>

      {/* Song Count */}
      <View style={styles.songCountContainer}>
        <Text style={styles.songCount}>
          {SONGS.length} {SONGS.length === 1 ? "song" : "songs"}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.accentCyan} />
          <Text style={styles.loadingText}>Loading songs...</Text>
        </View>
      ) : SONGS.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="musical-notes-outline"
            size={64}
            color={AppColors.textSecondary}
          />
          <Text style={styles.emptyText}>No audio files found</Text>
          <Text style={styles.emptySubtext}>
            This folder doesn&apos;t contain any audio files
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <SongList songs={songData} />
        </View>
      )}

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.accentCyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  playAllText: {
    color: AppColors.backgroundDark,
    fontWeight: "600",
    fontSize: 14,
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: AppColors.accentCyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  shuffleText: {
    color: AppColors.accentCyan,
    fontWeight: "600",
    fontSize: 14,
  },
  songCountContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  songCount: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: AppColors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: AppColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});

export function SearchInput({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <TextInput
      value={searchQuery}
      onChangeText={setSearchQuery}
      style={{
        padding: 16,
        backgroundColor: AppColors.backgroundDark,
        color: AppColors.textPrimary,
        borderWidth: 1,
        borderColor: AppColors.backgroundCardLight,
        borderRadius: 8,
        margin: 1,
      }}
      placeholder="Search"
    />
  );
}
