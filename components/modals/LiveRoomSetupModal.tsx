import { useTheme } from "@/hooks/useTheme";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Tick01Icon } from "@hugeicons/core-free-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { createLiveRoom } from "@/lib/liveRooms";

interface LiveRoomSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LiveRoomSetupModal({
  visible,
  onClose,
}: LiveRoomSetupModalProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [roomName, setRoomName] = useState("");
  const [allowAll, setAllowAll] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        keyboardHeight.value = withTiming(e.endCoordinates.height, {
          duration: 250,
        });
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        keyboardHeight.value = withTiming(0, { duration: 250 });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      paddingBottom:
        keyboardHeight.value > 0
          ? keyboardHeight.value
          : insets.bottom + 20,
    };
  });

  const handleContinue = async () => {
    const title = roomName.trim();

    if (!title || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const liveRoom = await createLiveRoom({
        title,
        allowAllParticipantsToSpeak: allowAll,
      });

      setRoomName("");
      setAllowAll(true);
      onClose();
      router.push({
        pathname: "/live-screen/live-room-screen",
        params: {
          id: liveRoom.id,
          title: liveRoom.title,
          allowAllParticipantsToSpeak: String(liveRoom.allowAllParticipantsToSpeak),
        },
      });
    } catch (error) {
      Alert.alert(
        "Unable to create room",
        getAuthErrorMessage(error, "Please check the room details and try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!isSubmitting) {
          onClose();
        }
      }}
    >
      <TouchableOpacity
        style={[
          styles.overlay,
          { backgroundColor: isDark ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)" },
        ]}
        activeOpacity={1}
        onPress={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      >
        <BlurView
          intensity={40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[
            styles.sheet,
            animatedStyle,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.text }]} />

            {/* Title */}
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Name your Room
            </Text>

            {/* Room name input */}
            <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Room name"
                placeholderTextColor={colors.textSecondary}
                value={roomName}
                onChangeText={setRoomName}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                editable={!isSubmitting}
                autoFocus={visible}
              />
            </View>

            {/* Allow participants toggle */}
            <View style={[styles.toggleRow, { backgroundColor: colors.card }]}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Allow all participants to speak
                </Text>
                <Text
                  style={[styles.toggleDesc, { color: colors.textSecondary }]}
                >
                  You can always change this in the Live Room
                </Text>
              </View>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => {
                  if (!isSubmitting) {
                    setAllowAll(!allowAll);
                  }
                }}
                style={[
                  styles.checkbox, 
                  { borderColor: colors.textSecondary },
                  allowAll && { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary }
                ]}
              >
                {allowAll && <HugeiconsIcon icon={Tick01Icon} size={18} color="#000000" />}
              </TouchableOpacity>
            </View>

            {/* Cancel / Continue buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.card }]}
                onPress={() => {
                  if (!isSubmitting) {
                    onClose();
                  }
                }}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.cancelText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.continueBtn,
                  { backgroundColor: colors.primary },
                  (!roomName.trim() || isSubmitting) && [
                    styles.continueBtnDisabled,
                    { backgroundColor: colors.border },
                  ],
                ]}
                onPress={handleContinue}
                disabled={!roomName.trim() || isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <Text
                    style={[
                      styles.continueText,
                      { color: colors.background },
                      !roomName.trim() && [
                        styles.continueTextDisabled,
                        { color: colors.textSecondary },
                      ],
                    ]}
                  >
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 24,
  },

  inputWrap: {
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { fontSize: 15 },

  /* Toggle row */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
    gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontWeight: "600", fontSize: 14, marginBottom: 3 },
  toggleDesc: { fontSize: 12, lineHeight: 17 },

  /* Buttons */
  actionRow: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelText: { fontWeight: "600", fontSize: 15 },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  continueBtnDisabled: {},
  continueText: { fontWeight: "bold", fontSize: 15 },
  continueTextDisabled: {},
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

