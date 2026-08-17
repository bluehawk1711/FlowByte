import { RecentlyPlayedCard } from "@/components/RecentlyPlayedCard";
import { AppColors } from "@/constants/theme";

import useHistory from "@/hooks/store/history";
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import EmptyState from "./EmptyState";

const LibraryListHeader: React.FC = () => {
  const history = useHistory((state) => state.history);
  const clearHistory = useHistory((state) => state.clearHistory);

  const [visible, setVisible] = useState(false);

  if(history.length < 0 ){
    return null
  }

  return (
    <>
      <View style={styles.section}>
        {/* Recently Played */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <Pressable>
            <Text style={styles.viewAll} onPress={() => setVisible(true)}>
              Clear
            </Text>
          </Pressable>
        </View>

        <Portal>
          <Modal
            visible={visible}
            onDismiss={() => setVisible(false)}
            contentContainerStyle={styles.containerStyle}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons
                  name="warning-outline"
                  size={48}
                  color={AppColors.accentPink}
                />
                <Text style={styles.modalTitle}>Clear History?</Text>
                <Text style={styles.modalDescription}>
                  This will remove all recently played songs from your history.
                  This action cannot be undone.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.deleteButton]}
                  disabled={history.length === 0}
                  onPress={() => {
                    clearHistory();
                    setVisible(false);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </Portal>
        <FlatList
          data={history}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentlyPlayedList}
          ListEmptyComponent={<EmptyState title="No Songs in History" />}
          keyExtractor={(item) => item?.id || Math.random().toString()}
          renderItem={({ item }) => item && <RecentlyPlayedCard song={item} />}
        />
      </View>

      <View style={styles.section}>
        {/* All Songs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Songs</Text>
        </View>
      </View>
    </>
  );
};

export default memo(LibraryListHeader);

const styles = StyleSheet.create({
  containerStyle: {
    backgroundColor: AppColors.backgroundCard,
    width: "90%",
    margin: "auto",
    borderRadius: 20,
    padding: 24,
  },
  modalContent: {
    gap: 24,
  },
  modalHeader: {
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: AppColors.textPrimary,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: AppColors.backgroundDark,
    borderWidth: 1,
    borderColor: AppColors.accentCyan,
  },
  deleteButton: {
    backgroundColor: AppColors.accentPink,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.accentCyan,
  },
  recentlyPlayedList: {
    paddingHorizontal: 16,
  },
});
