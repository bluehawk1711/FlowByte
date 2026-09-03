import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { setupAudio } from "@/constants/audioConfig";
import { useAudioLifecycle } from "@/hooks/useAudioLifecycle";
import { useApiSync } from "@/hooks/useApiSync";
import { setStyle } from "expo-navigation-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SplashScreen } from "@/components/screens/SplashScreen";
import { useAppTheme } from "@/constants/theme";

export const unstable_settings = {
  anchor: "(tabs)",
};

setupAudio();

export default function RootLayout() {
  const [booted, setBooted] = useState(false);

  // Live theme: accent + background mode drive nav/paper/status chrome.
  const { mode } = useAppTheme();

  // Initialize audio lifecycle listeners
  useAudioLifecycle();

  // Initialize API client + cloud sync (favorites/playlists/playback)
  useApiSync();

  useEffect(() => {
    setStyle(mode === "dark" ? "dark" : "light");
  }, [mode]);

  const navTheme = mode === "dark" ? DarkTheme : DefaultTheme;
  const paperTheme = mode === "dark" ? MD3DarkTheme : MD3LightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Every themed component subscribes to the live palette via
          useThemedStyles/useAppTheme, so no keyed remount is needed. */}
      <ThemeProvider value={navTheme}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            {!booted ? (
              <SplashScreen onFinish={() => setBooted(true)} />
            ) : (
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            )}
            <StatusBar style={mode === "dark" ? "light" : "dark"} hidden={true} />
          </PaperProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
