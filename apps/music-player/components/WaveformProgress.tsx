import { AppColors } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface WaveformProgressProps {
  currentTime: number;
  totalTime: number;
  progress: number; // 0-1
  barCount?: number;
}

export const WaveformProgress: React.FC<WaveformProgressProps> = ({
  currentTime,
  totalTime,
  progress,
  barCount = 50,
}) => {
  
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };
  const barHeights = React.useMemo(() => {
    return Array.from({ length: barCount }, () => Math.random() * 0.8 + 0.2);
  }, [barCount]);

  const activeBarIndex = Math.floor(progress * barCount);

  return (
    <View style={styles.container}>
      <View style={styles.waveformContainer}>
        {barHeights.map((height, index) => {
          const isActive = index <= activeBarIndex;
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: height * 40,
                  backgroundColor: isActive ? AppColors.accentCyan : "#3A3A3A",
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.timeContainer}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Text style={styles.time}>{formatTime(totalTime)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 24,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  time: {
    color: AppColors.textSecondary,
    fontSize: 13,
  },
});
