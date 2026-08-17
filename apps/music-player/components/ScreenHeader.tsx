import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
  }[];
  rightComponent?: React.ReactNode;
  lightTheme?: boolean;
  titleAlign?: "left" | "center";
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightActions = [],
  rightComponent,
  lightTheme = false,
  titleAlign = "left",
}) => {
  const insets = useSafeAreaInsets();
  const textColor = lightTheme ? AppColors.textLight : AppColors.textPrimary;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.leftSection}>
        {showBackButton && (
          <Pressable style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="chevron-back" size={28} color={textColor} />
          </Pressable>
        )}
        {titleAlign === "left" && (
          <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        )}
      </View>

      {titleAlign === "center" && (
        <Text style={[styles.titleCenter, { color: textColor }]}>{title}</Text>
      )}

      <View style={styles.rightSection}>
        {rightComponent}
        {rightActions.map((action, index) => (
          <Pressable
            key={index}
            style={styles.actionButton}
            onPress={action.onPress}
          >
            <Ionicons
              name={action.icon}
              size={24}
              color={action.color || textColor}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  titleCenter: {
    fontSize: 18,
    fontWeight: "600",
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
