import { SettingsScreen } from "@/components/screens";
import { useRouter } from "expo-router";
import React from "react";

export default function SettingsTab() {
  const router = useRouter();

  return (
    <SettingsScreen
      onBackPress={() => {
        router.back();
      }}
      onScanStorage={() => {
        // TODO: Trigger storage scan
      }}
      onEqualizerPress={() => {
        // TODO: Navigate to equalizer modal
      }}
      onAccentColorPress={() => {
        // TODO: Show color picker
      }}
      onAudioQualityPress={() => {
        // TODO: Show audio quality options
      }}
      onSleepTimerPress={() => {
        // TODO: Show sleep timer options
      }}
    />
  );
}
