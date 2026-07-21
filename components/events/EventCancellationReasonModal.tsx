import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import {
  getCancelEventModalLayoutHeight,
  getCancelEventSheetBottomPadding,
  getCancelEventSheetMaxHeight,
  shouldDismissKeyboardForCancelEventBack,
  shouldUseCancelEventKeyboardAvoidingView,
} from "@/lib/eventCancellationModalLayout";
import type { EventCancellationReasonType } from "@/lib/events";

const REASONS: EventCancellationReasonType[] = [
  "Schedule conflict",
  "Venue unavailable",
  "Safety concern",
  "Insufficient attendance",
  "Organizer issue",
  "Other",
];

type Props = {
  visible: boolean;
  pending?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    reasonType: EventCancellationReasonType;
    customReason?: string | null;
  }) => Promise<void> | void;
};

export default function EventCancellationReasonModal({ visible, pending = false, onClose, onSubmit }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const stableInsetsRef = useRef({
    top: Math.max(insets.top, 0),
    bottom: Math.max(insets.bottom, 0),
  });
  const wasVisibleRef = useRef(false);
  const keyboardVisibleRef = useRef(false);
  const [selectedReason, setSelectedReason] = useState<EventCancellationReasonType>("Schedule conflict");
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const platform = Platform.OS;

  if (visible && !wasVisibleRef.current) {
    stableInsetsRef.current = {
      top: Math.max(insets.top, 0),
      bottom: Math.max(insets.bottom, 0),
    };
  } else if (!visible) {
    stableInsetsRef.current = {
      top: Math.max(insets.top, 0),
      bottom: Math.max(insets.bottom, 0),
    };
  }
  wasVisibleRef.current = visible;

  const stableInsets = stableInsetsRef.current;
  const layoutHeight = getCancelEventModalLayoutHeight({
    platform,
    screenHeight: Dimensions.get("screen").height,
    windowHeight: Dimensions.get("window").height,
  });
  const sheetBottomPadding = getCancelEventSheetBottomPadding(stableInsets.bottom);
  const sheetMaxHeight = getCancelEventSheetMaxHeight({
    layoutHeight,
    topInset: stableInsets.top,
    bottomInset: stableInsets.bottom,
  });
  const useKeyboardAvoidingView = shouldUseCancelEventKeyboardAvoidingView(platform);

  useEffect(() => {
    if (platform !== "android" || !visible) {
      keyboardVisibleRef.current = false;
      return;
    }

    keyboardVisibleRef.current = Keyboard.isVisible();

    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisibleRef.current = true;
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisibleRef.current = false;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      keyboardVisibleRef.current = false;
    };
  }, [platform, visible]);

  const canSubmit = useMemo(
    () => selectedReason !== "Other" || customReason.trim().length > 0,
    [customReason, selectedReason],
  );

  const submit = async () => {
    if (!canSubmit || pending) {
      setError("Enter a custom reason.");
      return;
    }

    setError(null);
    await onSubmit({
      reasonType: selectedReason,
      customReason: selectedReason === "Other" ? customReason.trim() : null,
    });
  };

  const handleRequestClose = useCallback(() => {
    if (
      shouldDismissKeyboardForCancelEventBack({
        platform,
        visible,
        keyboardVisible: keyboardVisibleRef.current || Keyboard.isVisible(),
      })
    ) {
      Keyboard.dismiss();
      return;
    }

    onClose();
  }, [onClose, platform, visible]);

  const modalContent = (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={pending ? undefined : onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: isDark ? "#1E1E1E" : colors.card, maxHeight: sheetMaxHeight },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Cancel Event</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={pending} activeOpacity={0.8}>
            <Feather name="x" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: sheetBottomPadding }]}
        >
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Attendees will be refunded automatically to their original payment method.
          </Text>

          <View style={styles.reasonList}>
            {REASONS.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonButton,
                    { borderColor: selected ? colors.primary : colors.border },
                    selected && { backgroundColor: `${colors.primary}18` },
                  ]}
                  onPress={() => {
                    setSelectedReason(reason);
                    setError(null);
                  }}
                  disabled={pending}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected ? colors.primary : colors.border },
                      selected && { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text style={[styles.reasonText, { color: colors.text }]}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedReason === "Other" && (
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: error ? "#D64646" : colors.border,
                  color: colors.text,
                  backgroundColor: isDark ? "#151515" : "#FFFFFF",
                },
              ]}
              value={customReason}
              onChangeText={(value) => {
                setCustomReason(value.slice(0, 500));
                setError(null);
              }}
              placeholder="Reason"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              editable={!pending}
            />
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={pending}
            >
              <Text style={[styles.secondaryText, { color: colors.text }]}>Keep Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryAction, (!canSubmit || pending) && styles.disabledAction]}
              onPress={submit}
              disabled={!canSubmit || pending}
            >
              {pending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Cancel Event</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={pending ? undefined : handleRequestClose}>
      {useKeyboardAvoidingView ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingOverlay}
          behavior="padding"
        >
          {modalContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoidingOverlay}>{modalContent}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingOverlay: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonList: {
    gap: 8,
    marginTop: 16,
  },
  reasonButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 88,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: 8,
    color: "#D64646",
    fontSize: 12,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "800",
  },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: "#D64646",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledAction: {
    opacity: 0.55,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
