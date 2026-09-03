import { AppColors, useThemedStyles } from "@/constants/theme";
import useSaved, {
  isYouTubeUrl,
  parseYouTubeUrl,
  type SavedYouTubeItem,
} from "@/lib/saved";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight } from "react-native-reanimated";

export const SavedScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useSaved((s) => s.items);
  const addItem = useSaved((s) => s.addItem);
  const removeItem = useSaved((s) => s.removeItem);
  const clearAll = useSaved((s) => s.clearAll);

  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({ videos: true, playlists: true });

  const openInBrowser = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  };

  const handleAdd = () => {
    if (!urlInput.trim()) return;
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed) {
      setError("Enter a valid YouTube video or playlist link");
      return;
    }
    setError(null);
    addItem({
      url: urlInput.trim(),
      videoId: parsed.videoId,
      playlistId: parsed.playlistId,
      isPlaylist: parsed.isPlaylist,
      title: parsed.isPlaylist ? "YouTube playlist" : "YouTube video",
    });
    setUrlInput("");
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear saved items",
      "Remove all saved YouTube links from this device?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearAll },
      ],
    );
  };

  const handleRemoveItem = (item: SavedYouTubeItem) => {
    Alert.alert("Remove item", `Remove "${item.title}" from saved?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeItem(item.id),
      },
    ]);
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Group items
  const playlists = useMemo(
    () => items.filter((i) => i.isPlaylist),
    [items],
  );
  const videos = useMemo(
    () => items.filter((i) => !i.isPlaylist),
    [items],
  );

  const hasItems = items.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={AppColors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title}>Saved</Text>
        {hasItems && (
          <View style={styles.headerRight}>
            <Text style={styles.countText}>
              {items.length} {items.length === 1 ? "item" : "items"}
            </Text>
            <Pressable style={styles.clearButton} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        )}
      </View>

      {/* URL Input */}
      <View style={styles.addBox}>
        <Ionicons name="logo-youtube" size={18} color="#FF4E45" />
        <TextInput
          style={styles.addInput}
          value={urlInput}
          onChangeText={(t) => {
            setUrlInput(t);
            if (error) setError(null);
          }}
          placeholder="Paste YouTube link…"
          placeholderTextColor={AppColors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.addButton,
            !isYouTubeUrl(urlInput) && styles.addButtonDisabled,
          ]}
          disabled={!isYouTubeUrl(urlInput)}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={20} color={AppColors.textPrimary} />
        </Pressable>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {hasItems ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View style={styles.listContent}>
              {/* Playlists Section */}
              {playlists.length > 0 && (
                <View style={styles.section}>
                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => toggleSection("playlists")}
                  >
                    <Ionicons name="list" size={18} color={AppColors.accentCyan} />
                    <Text style={styles.sectionTitle}>Playlists</Text>
                    <Text style={styles.sectionCount}>{playlists.length}</Text>
                    <Ionicons
                      name={
                        expandedSections.playlists
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={18}
                      color={AppColors.textSecondary}
                    />
                  </Pressable>
                  {expandedSections.playlists &&
                    playlists.map((item, index) => (
                      <Animated.View
                        key={item.id}
                        entering={FadeInRight.delay(index * 40).duration(250)}
                      >
                        <SavedItemRow
                          item={item}
                          onOpen={() => void openInBrowser(item.url)}
                          onRemove={() => handleRemoveItem(item)}
                        />
                      </Animated.View>
                    ))}
                </View>
              )}

              {/* Videos Section */}
              {videos.length > 0 && (
                <View style={styles.section}>
                  <Pressable
                    style={styles.sectionHeader}
                    onPress={() => toggleSection("videos")}
                  >
                    <Ionicons name="play-circle" size={18} color={AppColors.accentCyan} />
                    <Text style={styles.sectionTitle}>Videos</Text>
                    <Text style={styles.sectionCount}>{videos.length}</Text>
                    <Ionicons
                      name={
                        expandedSections.videos
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={18}
                      color={AppColors.textSecondary}
                    />
                  </Pressable>
                  {expandedSections.videos &&
                    videos.map((item, index) => (
                      <Animated.View
                        key={item.id}
                        entering={FadeInRight.delay(index * 40).duration(250)}
                      >
                        <SavedItemRow
                          item={item}
                          onOpen={() => void openInBrowser(item.url)}
                          onRemove={() => handleRemoveItem(item)}
                        />
                      </Animated.View>
                    ))}
                </View>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons
            name="bookmark-outline"
            size={48}
            color={AppColors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No saved items</Text>
          <Text style={styles.emptyText}>
            Save YouTube videos and playlists above to watch them later.
          </Text>
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Saved Item Row
// ---------------------------------------------------------------------------

function SavedItemRow({
  item,
  onOpen,
  onRemove,
}: {
  item: SavedYouTubeItem;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const thumbnail = item.thumbnail;

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowMain} onPress={onOpen}>
        {/* Thumbnail */}
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons
              name={item.isPlaylist ? "list" : "play-circle"}
              size={20}
              color={AppColors.textSecondary}
            />
          </View>
        )}

        {/* Info */}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.isPlaylist ? "Playlist" : "Video"} ·{" "}
            {new Date(item.savedAt).toLocaleDateString()}
          </Text>
        </View>
      </Pressable>

      {/* Actions */}
      <View style={styles.rowActions}>
        <Pressable
          style={styles.actionBtn}
          onPress={onOpen}
          hitSlop={8}
        >
          <Ionicons
            name="open-outline"
            size={18}
            color={AppColors.textSecondary}
          />
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={onRemove}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  backButton: {
    padding: 6,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  clearButton: {
    padding: 6,
  },
  addBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#14141E",
  },
  addInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.accentPurple,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  errorText: {
    marginHorizontal: 16,
    marginBottom: 4,
    fontSize: 12,
    color: "#F87171",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginRight: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: "#14141E",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: 56,
    height: 42,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    backgroundColor: "#2A2A3A",
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
    color: AppColors.textSecondary,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionBtn: {
    padding: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});


