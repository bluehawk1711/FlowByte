import { AppColors } from "@/constants/theme";
import useSaved, {
  isYouTubeUrl,
  parseYouTubeUrl,
} from "@/lib/saved";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight } from "react-native-reanimated";

interface Row {
  id: string;
  title: string;
  sub: string;
  isPlaylist: boolean;
  onOpen: () => void;
  onRemove: () => void;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Row>);

export const SavedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useSaved((s) => s.items);
  const addItem = useSaved((s) => s.addItem);
  const removeItem = useSaved((s) => s.removeItem);
  const clearAll = useSaved((s) => s.clearAll);

  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const rows: Row[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    sub: `${item.isPlaylist ? "Playlist" : "Video"} · saved ${new Date(
      item.savedAt,
    ).toLocaleDateString()}`,
    isPlaylist: item.isPlaylist,
    onOpen: () => void openInBrowser(item.url),
    onRemove: () => removeItem(item.id),
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={AppColors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Saved</Text>
        {items.length > 0 && (
          <Pressable style={styles.clearButton} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </Pressable>
        )}
      </View>

      <View style={styles.addBox}>
        <Ionicons name="logo-youtube" size={18} color="#FF4E45" />
        <TextInput
          style={styles.addInput}
          value={urlInput}
          onChangeText={(t) => {
            setUrlInput(t);
            if (error) setError(null);
          }}
          placeholder="Paste YouTube video or playlist link…"
          placeholderTextColor={AppColors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, !isYouTubeUrl(urlInput) && styles.addButtonDisabled]}
          disabled={!isYouTubeUrl(urlInput)}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={20} color={AppColors.textPrimary} />
        </Pressable>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <AnimatedFlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="logo-youtube" size={44} color={AppColors.textSecondary} />
            <Text style={styles.emptyText}>
              Save YouTube videos and playlists here to play them later — they open
              in an in-app browser.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 40).duration(250)}>
            <View style={styles.row}>
              <Pressable style={styles.rowMain} onPress={item.onOpen}>
                <View style={styles.art}>
                  <Ionicons
                    name={item.isPlaylist ? "list" : "play-circle"}
                    size={20}
                    color={AppColors.accentCyan}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {item.sub}
                  </Text>
                </View>
              </Pressable>
              <Pressable style={styles.rowAction} onPress={item.onRemove}>
                <Ionicons name="close" size={20} color={AppColors.textSecondary} />
              </Pressable>
            </View>
          </Animated.View>
        )}
      />
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
    alignItems: "center",
    paddingHorizontal: 12,
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
    paddingBottom: 40,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: "#14141E",
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#2A2A3A",
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
    color: AppColors.textSecondary,
  },
  rowAction: {
    padding: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: AppColors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});