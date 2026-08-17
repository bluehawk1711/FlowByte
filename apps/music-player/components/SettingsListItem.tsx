import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

type SettingsItemType = "toggle" | "navigation" | "value";

interface SettingsListItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  label: string;
  description?: string;
  type?: SettingsItemType;
  value?: string | boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
}

export const SettingsListItem: React.FC<SettingsListItemProps> = ({
  icon,
  iconColor = AppColors.textPrimary,
  iconBgColor = "#2A2A2A",
  label,
  description,
  type = "navigation",
  value,
  onPress,
  onValueChange,
}) => {
  const renderRightContent = () => {
    switch (type) {
      case "toggle":
        return (
          <Switch
            value={value as boolean}
            onValueChange={onValueChange}
            trackColor={{ false: "#3A3A3A", true: AppColors.accentCyan }}
            thumbColor="#FFFFFF"
          />
        );
      case "value":
        return (
          <View style={styles.valueContainer}>
            <Text style={styles.valueText}>{value as string}</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={AppColors.textSecondary}
            />
          </View>
        );
      case "navigation":
      default:
        return (
          <View style={styles.navigationContainer}>
            {typeof value === "string" && value && (
              <View style={[styles.colorDot, { backgroundColor: value }]} />
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={AppColors.textSecondary}
            />
          </View>
        );
    }
  };

  return (
    <Pressable
      style={styles.container}
      onPress={type !== "toggle" ? onPress : undefined}
      disabled={type === "toggle"}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>

      {renderRightContent()}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    marginVertical: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  label: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  description: {
    color: AppColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  valueText: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  navigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
