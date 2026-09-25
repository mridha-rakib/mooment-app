import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import UserAvatar from "../ui/UserAvatar";

export type ProfileAvatarModalMode = "actions" | "preview" | null;

type ProfileAvatarModalProps = {
  mode: ProfileAvatarModalMode;
  avatar?: string | null;
  name?: string | null;
  onClose: () => void;
  onViewStory: () => void;
  onViewProfilePicture: () => void;
};

export default function ProfileAvatarModal({
  mode,
  avatar,
  name,
  onClose,
  onViewStory,
  onViewProfilePicture,
}: ProfileAvatarModalProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const previewSize = Math.min(Math.max(width - 64, 220), 360);

  if (!mode) {
    return null;
  }

  if (mode === "preview") {
    return (
      <Modal
        key="profile-avatar-preview"
        visible
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Close profile picture"
            onPress={onClose}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.previewContent}>
            <UserAvatar
              uri={avatar}
              name={name}
              size={previewSize}
              iconSize={Math.round(previewSize * 0.36)}
              style={styles.previewAvatar}
            />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      key="profile-avatar-actions"
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <SafeAreaView style={styles.sheetSafeArea} edges={["bottom"]}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(event) => event.stopPropagation()}
          >
            <TouchableOpacity
              style={[styles.action, { borderBottomColor: colors.border }]}
              activeOpacity={0.75}
              accessibilityRole="button"
              onPress={onViewStory}
            >
              <Feather name="play-circle" size={21} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>View Story</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.action, { borderBottomColor: colors.border }]}
              activeOpacity={0.75}
              accessibilityRole="button"
              onPress={onViewProfilePicture}
            >
              <Feather name="user" size={21} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>View Profile Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.action}
              activeOpacity={0.75}
              accessibilityRole="button"
              onPress={onClose}
            >
              <Feather name="x" size={21} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  sheetSafeArea: {
    width: "100%",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  sheet: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 12,
  },
  action: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  previewContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  previewAvatar: {
    backgroundColor: "#242428",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    left: 20,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32, 32, 32, 0.82)",
  },
});
