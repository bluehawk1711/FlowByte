import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ColorChooserProps = {
  selectedColor: string;
  onSelectColor: (color: string) => void;
};

const PRESET_COLORS = [
  "#00F5D4", // Cyan
  "#A855F7", // Purple
  "#FF1493", // Pink
  "#22C55E", // Green
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#F59E0B", // Orange
  "#FFFFFF", // White
];

export const ColorChooser: React.FC<ColorChooserProps> = ({
  selectedColor,
  onSelectColor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Accent Color</Text>
      <View style={styles.grid}>
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.selectedOption,
            ]}
            onPress={() => onSelectColor(color)}
          >
            {selectedColor === color && (
              <Ionicons
                name="checkmark"
                size={20}
                color={color === "#FFFFFF" ? "#000" : "#FFF"}
              />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: "#FFF",
  },
});
