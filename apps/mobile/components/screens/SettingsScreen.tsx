import { ColorChooser } from "@/components/ColorChooser";
import { MiniPlayer } from "@/components/MiniPlayer";
import { SettingsListItem } from "@/components/SettingsListItem";
import { AppColors } from "@/constants/theme";
import { useApiSync } from "@/hooks/useApiSync";
import { getApiUrl, setApiUrl, client } from "@/lib/api";
import { useSettingsStore } from "@/hooks/store/settingsStore";
import useSongMetadata from "@/hooks/store/songMetadata";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const { signedIn, syncing, lastSync, lastSyncError, doSync, signOut, refreshAuth } =
    useApiSync();
  const [apiUrlInput, setApiUrlInput] = useState("");
  const [cloudModalVisible, setCloudModalVisible] = useState(false);
  const [authIdentifier, setAuthIdentifier] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // Google Drive state
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveModalVisible, setGdriveModalVisible] = useState(false);

  useEffect(() => {
    void client?.getGoogleDriveStatus().then((s) => setGdriveConnected(s.connected)).catch(() => {});
  }, []);

  const handleSignIn = async () => {
    if (!authIdentifier || !authPassword) {
      Alert.alert("Flowbyte Cloud", "Enter your email/username and password");
      return;
    }
    setAuthBusy(true);
    try {
      await (await import("@/lib/api")).client?.login({
        usernameOrEmail: authIdentifier.trim(),
        password: authPassword,
      });
      await refreshAuth();
      await doSync({ silent: true });
      setAuthBusy(false);
      setCloudModalVisible(false);
      Alert.alert("Flowbyte Cloud", "Signed in");
    } catch (e) {
      setAuthBusy(false);
      Alert.alert("Flowbyte Cloud", `Sign in failed: ${String(e)}`);
    }
  };

  const handleRegister = async () => {
    if (!authIdentifier || !authPassword) {
      Alert.alert("Flowbyte Cloud", "Enter your email and a password");
      return;
    }
    if (!authIdentifier.includes("@")) {
      Alert.alert("Flowbyte Cloud", "Use your email address to create an account");
      return;
    }
    setAuthBusy(true);
    try {
      const email = authIdentifier.trim();
      await (await import("@/lib/api")).client?.register({
        username: email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user",
        email,
        password: authPassword,
      });
      await refreshAuth();
      setAuthBusy(false);
      setCloudModalVisible(false);
      Alert.alert("Flowbyte Cloud", "Account created");
    } catch (e) {
      setAuthBusy(false);
      Alert.alert("Flowbyte Cloud", `Could not create account: ${String(e)}`);
    }
  };

  useEffect(() => {
    let mounted = true;
    getApiUrl().then((url) => {
      if (mounted) setApiUrlInput(url);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveApiUrl = async () => {
    try {
      await setApiUrl(apiUrlInput.trim() || "");
      await refreshAuth();
      Alert.alert("Flowbyte Cloud", "API URL saved");
      setCloudModalVisible(false);
    } catch (e) {
      Alert.alert("Flowbyte Cloud", `Could not save API URL: ${String(e)}`);
    }
  };

  const handleSyncNow = async () => {
    try {
      await doSync();
      Alert.alert(
        "Flowbyte Cloud",
        lastSyncError
          ? `Synced with warnings: ${lastSyncError}`
          : "Library synced",
      );
    } catch (e) {
      Alert.alert("Flowbyte Cloud", `Sync failed: ${String(e)}`);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Flowbyte Cloud",
      "Sign out of Flowbyte? Local files and downloads stay on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ],
    );
  };

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

  const handleConnectGoogleDrive = async () => {
    setGdriveLoading(true);
    try {
      const res = await client?.getGoogleDriveAuthUrl();
      if (res?.url) {
        Linking.openURL(res.url);
        Alert.alert(
          "Google Drive",
          "Complete sign-in in your browser, then return to the app.",
        );
      }
    } catch {
      Alert.alert("Google Drive", "Failed to get auth URL");
    } finally {
      setGdriveLoading(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    Alert.alert(
      "Google Drive",
      "Disconnect Google Drive? Your files will remain in your Drive.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            setGdriveLoading(true);
            try {
              await client?.disconnectGoogleDrive();
              setGdriveConnected(false);
              Alert.alert("Google Drive", "Disconnected");
            } catch {
              Alert.alert("Google Drive", "Failed to disconnect");
            } finally {
              setGdriveLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCheckGdriveStatus = async () => {
    try {
      const s = await client?.getGoogleDriveStatus();
      setGdriveConnected(s?.connected ?? false);
      if (s?.connected) {
        Alert.alert("Google Drive", "Connected");
      } else {
        Alert.alert("Google Drive", "Not connected yet. Sign in via browser first.");
      }
    } catch {
      Alert.alert("Google Drive", "Failed to check status");
    }
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

        {/* Flowbyte Cloud Section */}
        <Text style={styles.sectionTitle}>FLOWBYTE CLOUD</Text>
        <View style={styles.section}>
          {signedIn ? (
            <SettingsListItem
              icon="cloud-done"
              iconColor="#3B82F6"
              iconBgColor="#1A2A3A"
              label="Signed In"
              description={
                lastSyncError
                  ? `Last sync had errors: ${lastSyncError}`
                  : lastSync
                    ? `Synced ${new Date(lastSync).toLocaleTimeString()}`
                    : "Sync pending"
              }
              type="navigation"
              value=""
              onPress={() => setCloudModalVisible(true)}
            />
          ) : (
            <SettingsListItem
              icon="cloud-outline"
              iconColor="#3B82F6"
              iconBgColor="#1A2A3A"
              label="Not Signed In"
              description="Connect to your Flowbyte library"
              type="navigation"
              value=""
              onPress={() => setCloudModalVisible(true)}
            />
          )}
          {signedIn && (
            <>
              <SettingsListItem
                icon="sync"
                iconColor="#22C55E"
                iconBgColor="#1A2A1A"
                label={syncing ? "Syncing..." : "Sync Now"}
                description="Sync favorites and playlists"
                type="navigation"
                value=""
                onPress={handleSyncNow}
              />
              <SettingsListItem
                icon="log-out"
                iconColor="#EF4444"
                iconBgColor="#2A1A1A"
                label="Sign Out"
                description="Keep local files on device"
                type="navigation"
                value=""
                onPress={handleSignOut}
              />
            </>
          )}
        </View>

        {/* Google Drive Section */}
        <Text style={styles.sectionTitle}>GOOGLE DRIVE</Text>
        <View style={styles.section}>
          {gdriveConnected ? (
            <>
              <SettingsListItem
                icon="cloud-done"
                iconColor="#4285F4"
                iconBgColor="#1A2A3A"
                label="Connected"
                description="Files stored in Google Drive"
                type="navigation"
                value=""
                onPress={handleCheckGdriveStatus}
              />
              <SettingsListItem
                icon="cloud-upload"
                iconColor="#22C55E"
                iconBgColor="#1A2A1A"
                label="Check Status"
                description="Verify connection"
                type="navigation"
                value=""
                onPress={handleCheckGdriveStatus}
              />
              <SettingsListItem
                icon="cloud-offline"
                iconColor="#EF4444"
                iconBgColor="#2A1A1A"
                label="Disconnect"
                description="Remove Google Drive access"
                type="navigation"
                value=""
                onPress={handleDisconnectGoogleDrive}
              />
            </>
          ) : (
            <SettingsListItem
              icon="cloud-outline"
              iconColor="#4285F4"
              iconBgColor="#1A2A3A"
              label={gdriveLoading ? "Connecting..." : "Connect Google Drive"}
              description="Store your library in the cloud"
              type="navigation"
              value=""
              onPress={handleConnectGoogleDrive}
            />
          )}
        </View>
      </ScrollView>

      {/* Flowbyte Cloud Modal */}
      <Portal>
        <Modal
          visible={cloudModalVisible}
          onDismiss={() => setCloudModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.cloudModal}>
            <Text style={styles.cloudModalTitle}>Flowbyte Cloud</Text>
            <Text style={styles.cloudModalLabel}>API URL</Text>
            <TextInput
              style={styles.cloudInput}
              value={apiUrlInput}
              onChangeText={setApiUrlInput}
              placeholder="https://api.example.com"
              placeholderTextColor={AppColors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.cloudModalActions}>
              <Pressable style={styles.cloudModalButton} onPress={handleSaveApiUrl}>
                <Text style={styles.cloudModalButtonText}>Save</Text>
              </Pressable>
            </View>

            {!signedIn && (
              <>
                <Text style={styles.cloudModalLabel}>Email or username</Text>
                <TextInput
                  style={styles.cloudInput}
                  value={authIdentifier}
                  onChangeText={setAuthIdentifier}
                  placeholder="you@example.com"
                  placeholderTextColor={AppColors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.cloudModalLabel}>Password</Text>
                <TextInput
                  style={styles.cloudInput}
                  value={authPassword}
                  onChangeText={setAuthPassword}
                  placeholder="••••••••"
                  placeholderTextColor={AppColors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <View style={styles.cloudModalActions}>
                  <Pressable
                    style={[styles.cloudModalButton, styles.cloudModalButtonSecondary]}
                    onPress={handleRegister}
                    disabled={authBusy}
                  >
                    <Text style={styles.cloudModalButtonText}>Create Account</Text>
                  </Pressable>
                  <Pressable
                    style={styles.cloudModalButton}
                    onPress={handleSignIn}
                    disabled={authBusy}
                  >
                    <Text style={styles.cloudModalButtonText}>
                      {authBusy ? "Working..." : "Sign In"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {signedIn && (
              <Text style={styles.cloudModalHint}>
                Connected. Favorites and playlists sync automatically.
              </Text>
            )}
          </View>
        </Modal>
      </Portal>

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
  cloudModal: {
    width: "100%",
    maxWidth: 360,
  },
  cloudModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  cloudModalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  cloudInput: {
    backgroundColor: "#1E1E2E",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: AppColors.textPrimary,
    fontSize: 15,
  },
  cloudModalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 8,
  },
  cloudModalButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cloudModalButtonSecondary: {
    backgroundColor: "#2A2A3A",
  },
  cloudModalButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  cloudModalHint: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 16,
    textAlign: "center",
  },
  miniPlayerContainer: {
    paddingBottom: 8,
  },
});
