import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barAnims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.5),
    new Animated.Value(0.7),
    new Animated.Value(0.4),
    new Animated.Value(0.6),
  ]).current;

  useEffect(() => {
    // Pulse animation for the logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Equalizer bar animations
    barAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 0.5 + 0.5,
            duration: 300 + index * 100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: Math.random() * 0.3 + 0.2,
            duration: 300 + index * 100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Auto-finish after 3 seconds
    const timer = setTimeout(() => {
      onFinish?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Logo with ring */}
      <View style={styles.logoContainer}>
        <Animated.View
          style={[styles.logoRing, { transform: [{ scale: pulseAnim }] }]}
        />
        <View style={styles.logoBox}>
          <Ionicons
            name="musical-note"
            size={40}
            color={AppColors.accentCyan}
          />
        </View>
      </View>

      {/* App Name */}
      <Text style={styles.appName}>M U S E</Text>

      {/* Equalizer animation */}
      <View style={styles.equalizer}>
        {barAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.eqBar,
              {
                transform: [{ scaleY: anim }],
                backgroundColor:
                  index % 2 === 0 ? AppColors.accentPurple : "#C084FC",
              },
            ]}
          />
        ))}
      </View>

      {/* Loading text */}
      <Text style={styles.loadingText}>LOADING LIBRARY</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: AppColors.accentCyan,
    opacity: 0.5,
  },
  logoBox: {
    width: 70,
    height: 70,
    backgroundColor: "#1A2A2A",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "300",
    color: AppColors.textPrimary,
    letterSpacing: 8,
    marginBottom: 48,
  },
  equalizer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 50,
    gap: 6,
    marginBottom: 80,
  },
  eqBar: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  loadingText: {
    position: "absolute",
    bottom: 60,
    fontSize: 12,
    color: AppColors.textSecondary,
    letterSpacing: 2,
  },
});
