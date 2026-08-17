import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { setupAudio } from "@/constants/audioConfig";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAudioLifecycle } from "@/hooks/useAudioLifecycle";
import { setStyle } from "expo-navigation-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

setupAudio();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize audio lifecycle listeners
  useAudioLifecycle();

  useEffect(() => {
    setStyle("auto");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <SafeAreaProvider>
          <PaperProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" hidden={true} />
          </PaperProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
