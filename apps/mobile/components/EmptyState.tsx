import { AppColors, useThemedStyles } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const EmptyState = ({ title }: { title: string }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.noHistoryText}>{title}</Text>
    </View>
  );
};

export default EmptyState;

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noHistoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
});
