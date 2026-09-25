import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomSheetDragDismiss } from "@/components/ui/useBottomSheetDragDismiss";
import { useTheme } from "@/hooks/useTheme";
import {
  getCancelEventKeyboardBottomInset,
  getCancelEventModalLayoutHeight,
  getCancelEventReasonInputScrollOffset,
  getCancelEventSheetMaxHeight,
  getCancelEventSheetScrollBottomPadding,
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
  const scrollViewRef = useRef<ScrollView | null>(null);
  const stableInsetsRef = useRef({
    top: Math.max(insets.top, 0),
    bottom: Math.max(insets.bottom, 0),
  });
  const wasVisibleRef = useRef(false);
  const keyboardVisibleRef = useRef(false);
  const keyboardBottomInsetRef = useRef(0);
  const scrollOffsetYRef = useRef(0);
  const scrollViewportHeightRef = useRef(0);
  const scrollContentHeightRef = useRef(0);
  const reasonInputLayoutRef = useRef<{ y: number; height: number } | null>(null);
  const reasonInputFocusedRef = useRef(false);
  const focusScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
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
  const scrollBottomPadding = getCancelEventSheetScrollBottomPadding({
    bottomInset: stableInsets.bottom,
    keyboardBottomInset,
  });
  const sheetMaxHeight = getCancelEventSheetMaxHeight({
    layoutHeight,
    topInset: stableInsets.top,
    bottomInset: stableInsets.bottom,
  });
  const useKeyboardAvoidingView = shouldUseCancelEventKeyboardAvoidingView(platform);

  const ensureReasonInputVisible = useCallback(() => {
    const reasonInputLayout = reasonInputLayoutRef.current;
    const viewportHeight = scrollViewportHeightRef.current;

    if (!reasonInputLayout || viewportHeight <= 0 || keyboardBottomInsetRef.current <= 0) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      y: getCancelEventReasonInputScrollOffset({
        currentScrollY: scrollOffsetYRef.current,
        inputY: reasonInputLayout.y,
        inputHeight: reasonInputLayout.height,
        viewportHeight,
        keyboardBottomInset: keyboardBottomInsetRef.current,
      }),
      animated: true,
    });
  }, []);

  const scheduleReasonInputVisibilityCheck = useCallback(() => {
    if (focusScrollTimeoutRef.current) {
      clearTimeout(focusScrollTimeoutRef.current);
    }

    requestAnimationFrame(ensureReasonInputVisible);
    focusScrollTimeoutRef.current = setTimeout(ensureReasonInputVisible, 220);
  }, [ensureReasonInputVisible]);

  const closeModal = useCallback(() => {
    if (pending) {
      return;
    }

    Keyboard.dismiss();
    onClose();
  }, [onClose, pending]);

  const {
    sheetTranslateY,
    dragPanHandlers,
    contentPanHandlers,
    contentTouchHandlers,
  } = useBottomSheetDragDismiss({
    visible,
    onClose: closeModal,
    canStartContentDrag: () =>
      !pending &&
      !reasonInputFocusedRef.current &&
      (scrollOffsetYRef.current <= 0 ||
        scrollContentHeightRef.current <= scrollViewportHeightRef.current + 1),
    captureContentDrag: true,
  });

  useEffect(() => {
    if (platform !== "android" || !visible) {
      keyboardVisibleRef.current = false;
      keyboardBottomInsetRef.current = 0;
      setKeyboardBottomInset(0);
      return;
    }

    keyboardVisibleRef.current = Keyboard.isVisible();

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      const nextKeyboardBottomInset = getCancelEventKeyboardBottomInset({
        platform,
        layoutHeight,
        keyboardHeight: event.endCoordinates.height,
        keyboardScreenY: event.endCoordinates.screenY,
      });

      keyboardVisibleRef.current = true;
      keyboardBottomInsetRef.current = nextKeyboardBottomInset;
      setKeyboardBottomInset(nextKeyboardBottomInset);
      if (reasonInputFocusedRef.current) {
        scheduleReasonInputVisibilityCheck();
      }
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisibleRef.current = false;
      keyboardBottomInsetRef.current = 0;
      setKeyboardBottomInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      keyboardVisibleRef.current = false;
      keyboardBottomInsetRef.current = 0;
      setKeyboardBottomInset(0);
      if (focusScrollTimeoutRef.current) {
        clearTimeout(focusScrollTimeoutRef.current);
        focusScrollTimeoutRef.current = null;
      }
    };
  }, [layoutHeight, platform, scheduleReasonInputVisibilityCheck, visible]);

  useEffect(() => {
    if (!visible) {
      reasonInputFocusedRef.current = false;
      keyboardBottomInsetRef.current = 0;
      scrollOffsetYRef.current = 0;
      setKeyboardBottomInset(0);
      if (focusScrollTimeoutRef.current) {
        clearTimeout(focusScrollTimeoutRef.current);
        focusScrollTimeoutRef.current = null;
      }
    }
  }, [visible]);

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

    closeModal();
  }, [closeModal, platform, visible]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
    scrollViewportHeightRef.current = event.nativeEvent.layout.height;
    if (reasonInputFocusedRef.current) {
      scheduleReasonInputVisibilityCheck();
    }
  }, [scheduleReasonInputVisibilityCheck]);

  const handleReasonInputLayout = useCallback((event: LayoutChangeEvent) => {
    reasonInputLayoutRef.current = {
      y: event.nativeEvent.layout.y,
      height: event.nativeEvent.layout.height,
    };
    if (reasonInputFocusedRef.current) {
      scheduleReasonInputVisibilityCheck();
    }
  }, [scheduleReasonInputVisibilityCheck]);

  const modalContent = (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={pending ? undefined : closeModal} />
      <Animated.View
        {...contentPanHandlers}
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? "#1E1E1E" : colors.card,
            maxHeight: sheetMaxHeight,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View style={styles.header} {...contentPanHandlers}>
          <View style={styles.headerTitleDragArea} {...dragPanHandlers}>
            <Text style={[styles.title, { color: colors.text }]}>Cancel Event</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal} disabled={pending} activeOpacity={0.8}>
            <Feather name="x" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          {...contentPanHandlers}
          {...contentTouchHandlers}
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onLayout={handleScrollLayout}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScroll}
          onContentSizeChange={(_width, height) => {
            scrollContentHeightRef.current = height;
          }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
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
              onLayout={handleReasonInputLayout}
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
              onFocus={() => {
                reasonInputFocusedRef.current = true;
                scheduleReasonInputVisibilityCheck();
              }}
              onBlur={() => {
                reasonInputFocusedRef.current = false;
              }}
            />
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: colors.border }]}
              onPress={closeModal}
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
      </Animated.View>
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
  headerTitleDragArea: {
    flex: 1,
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
