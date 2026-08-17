import { AppColors } from "@/constants/theme";
import React, { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

interface Tab {
  id: string;
  label: string;
}

interface TabFilterProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  variant?: "chip" | "underline";
  lightTheme?: boolean;
}

export const TabFilter: React.FC<TabFilterProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  variant = "underline",
  lightTheme = false,
}) => {
  const isChip = variant === "chip";
  const inactiveColor = lightTheme ? "#888" : AppColors.textSecondary;

  // Memoize render function for FlatList
  const renderTab = useCallback(
    ({ item: tab }: { item: (typeof tabs)[0] }) => {
      const isActive = tab.id === activeTabId;

      if (isChip) {
        return (
          <Pressable
            style={[
              styles.chipTab,
              isActive && styles.chipTabActive,
              lightTheme && isActive && styles.chipTabActiveLight,
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: isActive
                    ? lightTheme
                      ? AppColors.textLight
                      : AppColors.textPrimary
                    : inactiveColor,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      }

      return (
        <Pressable
          style={styles.underlineTab}
          onPress={() => onTabChange(tab.id)}
          disabled={isActive}
        >
          <Text
            style={[
              styles.underlineText,
              { color: isActive ? AppColors.accentCyan : inactiveColor },
              isActive && styles.underlineTextActive,
            ]}
          >
            {tab.label}
          </Text>
          {isActive && <View style={styles.underline} />}
        </Pressable>
      );
    },
    [activeTabId, isChip, lightTheme, inactiveColor, onTabChange],
  );

  return (
    <FlatList
      data={tabs}
      renderItem={renderTab}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    height: 50,
    flexGrow: 1,
  },
  scrollView: {
    maxHeight: 60,
  },
  // Chip variant
  chipTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  chipTabActive: {
    backgroundColor: AppColors.textPrimary,
    borderColor: AppColors.textPrimary,
  },
  chipTabActiveLight: {
    backgroundColor: AppColors.textLight,
    borderColor: AppColors.textLight,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Underline variant
  underlineTab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  underlineText: {
    fontSize: 15,
    fontWeight: "500",
  },
  underlineTextActive: {
    fontWeight: "600",
  },
  underline: {
    height: 2,
    backgroundColor: AppColors.accentCyan,
    marginTop: 6,
    borderRadius: 1,
  },
});
