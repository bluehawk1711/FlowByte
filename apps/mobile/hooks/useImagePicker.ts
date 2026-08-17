import useSongMetadata from "@/hooks/store/songMetadata";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { Alert } from "react-native";

export const useImagePicker = () => {
  const setCustomCover = useSongMetadata((state) => state.setCustomCover);

  const pickImageForSong = async (songId: string) => {
    try {
      // Request permissions
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Permission to access the media library is required.",
        );
        return null;
      }

      // Launch image picker
      const result = await launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for album art
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Save URI directly to store
        setCustomCover(songId, imageUri);

        return imageUri;
      }

      return null;
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      return null;
    }
  };

  return { pickImageForSong };
};
