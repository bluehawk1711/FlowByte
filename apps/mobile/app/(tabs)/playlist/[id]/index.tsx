import { PlaylistDetailScreen } from "@/components/screens/PlaylistDetailScreen";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

const PlaylistDetailRoute = () => {
  const { id } = useLocalSearchParams();
  void id;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PlaylistDetailScreen />
    </>
  );
};

export default PlaylistDetailRoute;
