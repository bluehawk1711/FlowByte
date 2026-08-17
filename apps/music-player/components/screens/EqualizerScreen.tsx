import { EQSlider } from "@/components/EQSlider";
import { AppColors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRESETS = [
  { id: "custom", label: "Custom" },
  { id: "bass", label: "Bass Boost" },
  { id: "rock", label: "Rock" },
  { id: "jazz", label: "Jazz" },
  { id: "pop", label: "Pop" },
  { id: "classical", label: "Classical" },
];

const FREQUENCIES = ["60Hz", "230Hz", "910Hz", "4kHz", "14kHz"];

interface EqualizerScreenProps {
  onBackPress?: () => void;
  onSavePreset?: () => void;
  onReset?: () => void;
}

export const EqualizerScreen: React.FC<EqualizerScreenProps> = ({
  onBackPress,
  onSavePreset,
  onReset,
}) => {
  const insets = useSafeAreaInsets();
  const [isEnabled, setIsEnabled] = useState(true);
  const [activePreset, setActivePreset] = useState("custom");
  const [eqValues, setEqValues] = useState([60, 50, 40, 30, 55]);
  const [bassBoost, setBassBoost] = useState(30);
  const [virtualizerEnabled, setVirtualizerEnabled] = useState(false);

  // Animated bars for visualizer
  const barAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(Math.random()))
  ).current;

  useEffect(() => {
    if (isEnabled) {
      barAnims.forEach((anim, index) => {
        const animate = () => {
          Animated.sequence([
            Animated.timing(anim, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 200 + Math.random() * 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: Math.random() * 0.5 + 0.1,
              duration: 200 + Math.random() * 300,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]).start(() => animate());
        };
        setTimeout(() => animate(), index * 50);
      });
    }
  }, [isEnabled]);

  const handleEqChange = (index: number, value: number) => {
    const newValues = [...eqValues];
    newValues[index] = value;
    setEqValues(newValues);
    setActivePreset("custom");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={AppColors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Equalizer</Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>On</Text>
          <TouchableOpacity
            style={[styles.toggle, isEnabled && styles.toggleEnabled]}
            onPress={() => setIsEnabled(!isEnabled)}
          >
            <View
              style={[
                styles.toggleThumb,
                isEnabled && styles.toggleThumbEnabled,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Visualizer */}
        <View style={styles.visualizer}>
          {barAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.visualizerBar,
                {
                  transform: [{ scaleY: anim }],
                  opacity: isEnabled ? 1 : 0.3,
                },
              ]}
            />
          ))}
        </View>

        {/* Presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsContainer}
        >
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetChip,
                activePreset === preset.id && styles.presetChipActive,
              ]}
              onPress={() => setActivePreset(preset.id)}
            >
              <Text
                style={[
                  styles.presetText,
                  activePreset === preset.id && styles.presetTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* EQ Sliders */}
        <View style={styles.slidersContainer}>
          {FREQUENCIES.map((freq, index) => (
            <EQSlider
              key={freq}
              frequency={freq}
              value={eqValues[index]}
              onValueChange={(value) => handleEqChange(index, value)}
            />
          ))}
        </View>

        {/* Bass Boost & Virtualizer */}
        <View style={styles.extraControls}>
          <View style={styles.controlCard}>
            <Text style={styles.controlLabel}>Bass Boost</Text>
            <Text style={styles.controlValue}>{bassBoost}%</Text>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${bassBoost}%` }]} />
            </View>
          </View>

          <View style={styles.controlCard}>
            <Text style={styles.controlLabel}>Virtualizer</Text>
            <Text
              style={[
                styles.controlValue,
                {
                  color: virtualizerEnabled
                    ? AppColors.accentCyan
                    : AppColors.textSecondary,
                },
              ]}
            >
              {virtualizerEnabled ? "On" : "Off"}
            </Text>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  { width: virtualizerEnabled ? "100%" : "0%" },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.resetButton} onPress={onReset}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={onSavePreset}>
            <Ionicons name="save" size={20} color={AppColors.textLight} />
            <Text style={styles.saveText}>Save Preset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3A3A3A",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleEnabled: {
    backgroundColor: AppColors.accentCyan,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  toggleThumbEnabled: {
    alignSelf: "flex-end",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  visualizer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 100,
    gap: 4,
    marginVertical: 24,
  },
  visualizerBar: {
    width: 8,
    height: 60,
    backgroundColor: AppColors.accentCyan,
    borderRadius: 4,
  },
  presetsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 32,
  },
  presetChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    marginRight: 10,
  },
  presetChipActive: {
    backgroundColor: AppColors.accentCyan,
    borderColor: AppColors.accentCyan,
  },
  presetText: {
    fontSize: 14,
    fontWeight: "500",
    color: AppColors.textSecondary,
  },
  presetTextActive: {
    color: AppColors.textLight,
  },
  slidersContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  extraControls: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 32,
  },
  controlCard: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  controlLabel: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginBottom: 4,
  },
  controlValue: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.accentCyan,
    marginBottom: 12,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: "#3A3A3A",
    borderRadius: 2,
  },
  sliderFill: {
    height: "100%",
    backgroundColor: AppColors.accentCyan,
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    alignItems: "center",
  },
  resetText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    backgroundColor: AppColors.accentCyan,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.textLight,
  },
});
