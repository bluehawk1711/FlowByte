import { AppColors } from "@/constants/theme";
import React from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";

interface EQSliderProps {
  frequency: string;
  value: number; // 0-100
  onValueChange?: (value: number) => void;
}

export const EQSlider: React.FC<EQSliderProps> = ({
  frequency,
  value,
  onValueChange,
}) => {
  const SLIDER_HEIGHT = 180;
  const HANDLE_SIZE = 20;

  const animatedValue = React.useRef(new Animated.Value(value)).current;

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const newValue = Math.max(
            0,
            Math.min(
              100,
              100 - ((gestureState.moveY - 100) / SLIDER_HEIGHT) * 100
            )
          );
          animatedValue.setValue(newValue);
          onValueChange?.(newValue);
        },
      }),
    [onValueChange]
  );

  const handlePosition = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [SLIDER_HEIGHT - HANDLE_SIZE, 0],
  });

  const fillHeight = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, SLIDER_HEIGHT],
  });

  return (
    <View style={styles.container}>
      <View style={styles.sliderContainer}>
        {/* Track background */}
        <View style={[styles.track, { height: SLIDER_HEIGHT }]} />

        {/* Filled portion */}
        <Animated.View
          style={[
            styles.fill,
            {
              height: fillHeight,
              bottom: 0,
            },
          ]}
        />

        {/* Handle */}
        <Animated.View
          style={[
            styles.handle,
            {
              transform: [{ translateY: handlePosition }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleInner} />
        </Animated.View>
      </View>

      <Text style={styles.frequency}>{frequency}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: 50,
  },
  sliderContainer: {
    width: 4,
    height: 180,
    position: "relative",
    justifyContent: "flex-end",
  },
  track: {
    width: 4,
    backgroundColor: "#3A3A3A",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  fill: {
    width: 4,
    backgroundColor: AppColors.accentPurple,
    borderRadius: 2,
    position: "absolute",
    left: 0,
    shadowColor: AppColors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  handle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColors.accentPurple,
    backgroundColor: AppColors.backgroundDark,
    position: "absolute",
    left: -8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: AppColors.accentPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  handleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.accentPurple,
  },
  frequency: {
    color: AppColors.textSecondary,
    fontSize: 12,
    marginTop: 12,
  },
});
