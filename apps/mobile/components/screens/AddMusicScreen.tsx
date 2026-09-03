import { MiniPlayer } from "@/components/MiniPlayer";
import { AppColors, useThemedStyles } from "@/constants/theme";
import useSaved, { isYouTubeUrl, parseYouTubeUrl } from "@/lib/saved";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const AddMusicScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addItem = useSaved((s) => s.addItem);
  const items = useSaved((s) => s.items);

  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const parsed = url.trim() ? parseYouTubeUrl(url) : null;
  const valid = !!parsed;

  const handleSave = () => {
    if (!valid || !parsed) return;

    // Check for duplicates
    const isDuplicate = items.some(
      (item) =>
        item.videoId === parsed.videoId &&
        item.playlistId === parsed.playlistId,
    );
    if (isDuplicate) {
      setError("This video/playlist is already saved");
      return;
    }

    addItem({
      url: url.trim(),
      videoId: parsed.videoId,
      playlistId: parsed.playlistId,
      isPlaylist: parsed.isPlaylist,
      title: parsed.isPlaylist ? "YouTube playlist" : "YouTube video",
    });
    setSaved(true);
    setError(null);

    Alert.alert(
      "Saved!",
      parsed.isPlaylist
        ? "YouTube playlist saved. View it in Saved tab."
        : "YouTube video saved. View it in Saved tab.",
      [
        { text: "OK" },
        {
          text: "View Saved",
          onPress: () => {
            setUrl("");
            setSaved(false);
            router.push("/(tabs)/saved");
          },
        },
      ],
    );
  };

  const handleOpenInBrowser = async () => {
    if (!url.trim()) return;
    await WebBrowser.openBrowserAsync(url.trim(), {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  };

  const handlePaste = async () => {
    try {
      // React Native doesn't have a universal clipboard API in all contexts
      // The user can paste manually
    } catch {
      // Clipboard not available
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={AppColors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Add Music</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* URL Input */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>YouTube URL</Text>
          <View style={styles.inputRow}>
            <Ionicons name="logo-youtube" size={20} color="#FF4E45" />
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setError(null);
                setSaved(false);
              }}
              placeholder="Paste a YouTube video or playlist link…"
              placeholderTextColor={AppColors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={() => valid && handleSave()}
            />
            {url.length > 0 && (
              <Pressable onPress={() => { setUrl(""); setError(null); setSaved(false); }}>
                <Ionicons name="close-circle" size={18} color={AppColors.textSecondary} />
              </Pressable>
            )}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Preview info */}
        {valid && parsed && (
          <View style={styles.previewCard}>
            <View style={styles.previewIcon}>
              <Ionicons
                name={parsed.isPlaylist ? "list" : "play-circle"}
                size={28}
                color={AppColors.accentCyan}
              />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>
                {parsed.isPlaylist ? "YouTube Playlist" : "YouTube Video"}
              </Text>
              <Text style={styles.previewSub} numberOfLines={1}>
                {url.trim()}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {valid && (
          <View style={styles.actions}>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Ionicons name="bookmark" size={18} color="#000" />
              <Text style={styles.saveButtonText}>Save to Library</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleOpenInBrowser}>
              <Ionicons name="open-outline" size={18} color={AppColors.textPrimary} />
              <Text style={styles.secondaryButtonText}>Open in Browser</Text>
            </Pressable>
          </View>
        )}

        {/* Info text */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={18} color={AppColors.textSecondary} />
          <Text style={styles.infoText}>
            Save YouTube videos and playlists to access them later from the Saved tab.
            Use the Cloud tab to stream or download songs that are already in your library.
          </Text>
        </View>

        {/* Quick tips */}
        {!valid && url.length === 0 && (
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>Supported URLs</Text>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={AppColors.accentCyan} />
              <Text style={styles.tipText}>youtube.com/watch?v=...</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={AppColors.accentCyan} />
              <Text style={styles.tipText}>youtu.be/...</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={AppColors.accentCyan} />
              <Text style={styles.tipText}>youtube.com/playlist?list=...</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={16} color={AppColors.accentCyan} />
              <Text style={styles.tipText}>youtube.com/shorts/...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <MiniPlayer />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  inputSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#14141E",
  },
  input: {
    flex: 1,
    color: AppColors.textPrimary,
    fontSize: 15,
    padding: 0,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#F87171",
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#14141E",
    marginBottom: 16,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  previewSub: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  actions: {
    gap: 10,
    marginBottom: 24,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: AppColors.accentCyan,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.accentCyan,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  infoSection: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#14141E",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: AppColors.textSecondary,
    lineHeight: 18,
  },
  tipsSection: {
    marginTop: 8,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  miniPlayerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 8,
  },
});


