import { AppColors, useThemedStyles } from "@/constants/theme";
import LottieView from "lottie-react-native";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SplashScreenProps {
  onFinish?: () => void;
}

/**
 * App launch splash. Shows the "Girl listening to music" Lottie animation
 * while the library/audio layer warms up, then calls `onFinish`.
 *
 * NOTE: `lottie-react-native` is a native module — requires a development
 * build (it does not run in Expo Go). Gracefully degrades to the plain logo
 * ring when the JSON fails to load.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish?.();
    }, 2600);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.animationWrap}>
        <LottieView
          source={require("@/assets/animations/girl-listening-to-music.json")}
          autoPlay
          loop
          style={styles.animation}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.appName}>F L O W B I T</Text>

      <Text style={styles.loadingText}>YOUR MUSIC, READY WHEN YOU ARE</Text>
    </View>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: AppColors.backgroundDark,
      justifyContent: "center",
      alignItems: "center",
    },
    animationWrap: {
      width: 300,
      height: 300,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    animation: {
      width: "100%",
      height: "100%",
    },
    appName: {
      fontSize: 24,
      fontWeight: "300",
      color: AppColors.textPrimary,
      letterSpacing: 8,
      marginBottom: 8,
    },
    loadingText: {
      position: "absolute",
      bottom: 60,
      fontSize: 11,
      color: AppColors.textSecondary,
      letterSpacing: 2,
    },
  });
