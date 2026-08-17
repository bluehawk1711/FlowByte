import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type FolderListItemProps = {
  id: string;
  name: string;
};

const FolderListItemComponent: React.FC<FolderListItemProps> = ({
  id,
  name,
}) => {
  return (
    <Pressable
      style={styles.container}
      onPress={() => router.push(`/(tabs)/folders/${id}`)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="folder" size={28} color={AppColors.accentPink} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: "#2A2A2A",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  description: {
    color: AppColors.textSecondary,
    fontSize: 13,
    marginTop: 3,
  },
  menuButton: {
    padding: 8,
  },
});

// Memoize to prevent re-renders in folder lists
export const FolderListItem = React.memo(FolderListItemComponent);
FolderListItem.displayName = "FolderListItem";
