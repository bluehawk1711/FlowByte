import React, { useEffect } from "react";
import { StyleSheet, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  delay?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%" as DimensionValue,
  height = 16,
  borderRadius = 6,
  style,
  delay = 0,
}) => {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.3, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
};

// ---------------------------------------------------------------------------
// Pre-built skeleton layouts for common patterns
// ---------------------------------------------------------------------------

/** Song row skeleton — artwork + two text lines */
export const SongRowSkeleton: React.FC<{ delay?: number }> = ({ delay }) => (
  <SkeletonRow delay={delay}>
    <Skeleton width={44} height={44} borderRadius={6} delay={delay} />
    <SkeletonCol gap={6} style={{ flex: 1 }}>
      <Skeleton width="75%" height={14} delay={delay} />
      <Skeleton width="50%" height={12} delay={delay} />
    </SkeletonCol>
    <Skeleton width={36} height={12} delay={delay} />
  </SkeletonRow>
);

/** Album grid card skeleton — square artwork + title + artist */
export const AlbumCardSkeleton: React.FC<{ delay?: number }> = ({
  delay,
}) => (
  <SkeletonCol gap={8}>
    <Skeleton width="100%" height={0} borderRadius={8} delay={delay} style={{ aspectRatio: 1 }} />
    <Skeleton width="80%" height={13} delay={delay} />
    <Skeleton width="60%" height={11} delay={delay} />
  </SkeletonCol>
);

/** Artist circle skeleton — circle + name */
export const ArtistCardSkeleton: React.FC<{ delay?: number }> = ({
  delay,
}) => (
  <SkeletonCol gap={6} style={{ alignItems: "center" }}>
    <Skeleton width={80} height={80} borderRadius={40} delay={delay} />
    <Skeleton width={60} height={12} delay={delay} />
  </SkeletonCol>
);

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

const SkeletonRow: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children }) => (
  <Animated.View style={styles.row}>{children}</Animated.View>
);

const SkeletonCol: React.FC<{
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}> = ({ children, gap = 4, style }) => (
  <Animated.View style={[{ gap }, style]}>{children}</Animated.View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#1A1A2E",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
