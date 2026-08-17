import { ColorChooser } from "@/components/ColorChooser";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SettingsListItem } from "@/components/SettingsListItem";
import { AppColors } from "@/constants/theme";
import { useSettingsStore } from "@/hooks/store/settingsStore";
import useSongMetadata from "@/hooks/store/songMetadata";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Modal, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SettingsScreenProps {
  onBackPress?: () => void;
  onScanStorage?: () => void;
  onEqualizerPress?: () => void;
  onAccentColorPress?: () => void;
  onAudioQualityPress?: () => void;
  onSleepTimerPress?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBackPress,
}) => {
  const insets = useSafeAreaInsets();

  // Store
  const {
    accentColor,
    setAccentColor,
    accentPurple,
    setAccentPurple,
    accentPink,
    setAccentPink,
    // alwaysShuffle,
    // toggleAlwaysShuffle,
    // alwaysRepeat,
    // toggleAlwaysRepeat,
    // autoplayNext, // Kept in store but hidden from UI
    // toggleAutoplayNext,
    resumeOnStartup,
    toggleResumeOnStartup,
    showRandomCoverArt,
    toggleShowRandomCoverArt,
  } = useSettingsStore();

  const clearMetadata = useSongMetadata((state) => state.clearAllMetadata);
  const [activeColorPicker, setActiveColorPicker] = useState<
    "cyan" | "purple" | "pink" | null
  >(null);

  const handleClearMetadata = () => {
    Alert.alert(
      "Clear Metadata",
      "Are you sure you want to clear all custom cover arts and metadata? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearMetadata();
            Alert.alert("Success", "Metadata cleared successfully");
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBackPress}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={AppColors.textPrimary}
          />
        </Pressable>
      </View>

      <Text style={styles.title}>Settings</Text>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.section}>
          <SettingsListItem
            icon="color-palette"
            iconColor={accentColor}
            iconBgColor="#1A2A2A"
            label="Primary Color"
            description="Main app theme color"
            type="navigation"
            value={accentColor}
            onPress={() => setActiveColorPicker("cyan")}
          />
          <SettingsListItem
            icon="brush"
            iconColor={accentPurple}
            iconBgColor="#2A1A2A"
            label="Secondary Color"
            description="Used for play buttons"
            type="navigation"
            value={accentPurple}
            onPress={() => setActiveColorPicker("purple")}
          />
          <SettingsListItem
            icon="heart"
            iconColor={accentPink}
            iconBgColor="#2A1A1A"
            label="Tertiary Color"
            description="Used for favorites"
            type="navigation"
            value={accentPink}
            onPress={() => setActiveColorPicker("pink")}
          />
          <SettingsListItem
            icon="images"
            iconColor={AppColors.accentPink}
            iconBgColor="#2A1A2A"
            label="Show Random Cover Art"
            description="Use random images for missing art"
            type="toggle"
            value={showRandomCoverArt}
            onValueChange={toggleShowRandomCoverArt}
          />
        </View>

        {/* Playback Section */}
        <Text style={styles.sectionTitle}>PLAYBACK BEHAVIOR</Text>
        <View style={styles.section}>
          {/* <SettingsListItem
            icon="shuffle"
            iconColor="#A855F7"
            iconBgColor="#2A1A3A"
            label="Always Shuffle"
            description="Shuffle automatically on start"
            type="toggle"
            value={alwaysShuffle}
            onValueChange={toggleAlwaysShuffle}
          /> */}
          {/* <SettingsListItem
            icon="repeat"
            iconColor="#22C55E"
            iconBgColor="#1A2A1A"
            label="Always Repeat Playing Song"
            description="Repeat current song by default"
            type="toggle"
            value={alwaysRepeat}
            onValueChange={toggleAlwaysRepeat}
          /> */}
          <SettingsListItem
            icon="play-circle"
            iconColor="#3B82F6"
            iconBgColor="#1A1A2A"
            label="Resume Playback"
            description="Autoplay last song on app open"
            type="toggle"
            value={resumeOnStartup}
            onValueChange={toggleResumeOnStartup}
          />
        </View>

        {/* Library Section */}
        <Text style={styles.sectionTitle}>LIBRARY</Text>
        <View style={styles.section}>
          <SettingsListItem
            icon="trash-bin"
            iconColor="#EF4444"
            iconBgColor="#2A1A1A"
            label="Clear Metadata Cache"
            description="Remove all custom cover arts"
            type="value"
            value=""
            onPress={handleClearMetadata}
          />
        </View>
      </ScrollView>

      {/* Color Picker Modal */}
      <Portal>
        <Modal
          visible={!!activeColorPicker}
          onDismiss={() => setActiveColorPicker(null)}
          contentContainerStyle={styles.modalContent}
        >
          <ColorChooser
            selectedColor={
              activeColorPicker === "purple"
                ? accentPurple
                : activeColorPicker === "pink"
                  ? accentPink
                  : accentColor
            }
            onSelectColor={(color) => {
              if (activeColorPicker === "purple") setAccentPurple(color);
              else if (activeColorPicker === "pink") setAccentPink(color);
              else setAccentColor(color);

              setActiveColorPicker(null);
            }}
          />
        </Modal>
      </Portal>

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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  modalContent: {
    padding: 20,
    margin: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  miniPlayerContainer: {
    paddingBottom: 8,
  },
});
