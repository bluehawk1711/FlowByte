import { AppColors } from "@/constants/theme";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

type AlbumCardProps = {
  title: string;
  artist: string;
  coverImage?: string;
  onPress?: () => void;
};

const AlbumCardComponent: React.FC<AlbumCardProps> = ({
  title,
  artist,
  coverImage,
  onPress,
}) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      {coverImage ? (
        <Image source={{ uri: coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>🎵</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {artist}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginBottom: 20,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeholder: {
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 40,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  artist: {
    color: AppColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});

// Memoize to prevent re-renders in grid lists
export const AlbumCard = React.memo(AlbumCardComponent);
AlbumCard.displayName = "AlbumCard";
