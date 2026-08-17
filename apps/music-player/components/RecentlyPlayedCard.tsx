import { AppColors } from "@/constants/theme";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Song } from "@/constants/types";
import useAudioContext from "@/hooks/store/audioContext";

interface RecentlyPlayedCardProps {
  song: NonNullable<Song>;
}

const RecentlyPlayedCardComponent: React.FC<RecentlyPlayedCardProps> = ({
  song,
}) => {
  const setSong = useAudioContext((state) => state.setSong);

  return (
    <Pressable style={styles.container} onPress={() => setSong(song)}>
      {song.cover ? (
        <Image source={{ uri: song.cover }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder]}>
          <Text style={styles.placeholderText}>🎵</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {song.artist || "Unknown Artist"}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 140,
    marginRight: 12,
  },
  cover: {
    width: 140,
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
  },
  placeholder: {
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 36,
  },
  title: {
    color: AppColors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  artist: {
    color: AppColors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});

// Memoize to prevent re-renders in horizontal list
export const RecentlyPlayedCard = React.memo(RecentlyPlayedCardComponent);
RecentlyPlayedCard.displayName = "RecentlyPlayedCard";
