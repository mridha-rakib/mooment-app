import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
  Keyboard,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
interface ReportDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onDone: (details: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function ReportDetailsModal({ visible, onClose, onDone, isSubmitting = false }: ReportDetailsModalProps) {
  const [details, setDetails] = useState('');
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const keyboardInset = useRef(new Animated.Value(0)).current;
  const sheetBottomPadding = Math.max(24 + insets.bottom, Platform.OS === 'ios' ? 40 : 24);
  const sheetTranslateY = useMemo(
    () =>
      translateY.interpolate({
        inputRange: [-72, 0],
        outputRange: [-72, 0],
        extrapolateLeft: 'clamp',
        extrapolateRight: 'extend',
      }),
    [translateY],
  );
  const combinedTranslateY = useMemo(
    () => Animated.add(sheetTranslateY, Animated.multiply(keyboardInset, -1)),
    [keyboardInset, sheetTranslateY],
  );
  const calculateKeyboardInset = useCallback(
    (endCoordinates?: { height?: number; screenY?: number }) => {
      const coveredBottom =
        typeof endCoordinates?.screenY === 'number'
          ? Math.max(0, windowHeight - endCoordinates.screenY)
          : 0;
      const metrics = Keyboard.metrics?.();
      const metricsCoveredBottom =
        metrics && typeof metrics.screenY === 'number'
          ? Math.max(0, windowHeight - metrics.screenY)
          : 0;
      const metricsHeight = metrics?.height ?? 0;
      const { height: screenHeight } = Dimensions.get('screen');
      const { height: dimensionsWindowHeight } = Dimensions.get('window');
      const dimensionsHeight = Math.max(0, screenHeight - dimensionsWindowHeight);

      return Math.max(0, coveredBottom, metricsCoveredBottom, endCoordinates?.height ?? 0, metricsHeight, dimensionsHeight);
    },
    [windowHeight],
  );
  const animateKeyboardInset = useCallback(
    (toValue: number, duration = 220) => {
      Animated.timing(keyboardInset, {
        toValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [keyboardInset],
  );
  const updateKeyboardInset = useCallback(
    (endCoordinates?: { height?: number; screenY?: number }, duration?: number) => {
      animateKeyboardInset(calculateKeyboardInset(endCoordinates), duration);
    },
    [animateKeyboardInset, calculateKeyboardInset],
  );

  const closeFromDrag = useCallback(() => {
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: 320,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      keyboardInset.setValue(0);
      onClose();
    });
  }, [keyboardInset, onClose, translateY]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          translateY.stopAnimation(() => {
            translateY.setValue(0);
          });
        },
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(Math.max(-72, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          const shouldClose = gesture.dy > 120 || gesture.vy > 0.9;

          if (shouldClose) {
            closeFromDrag();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
      }),
    [closeFromDrag, translateY],
  );

  const handleModalShow = useCallback(() => {
    translateY.setValue(0);
    keyboardInset.setValue(0);
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 220);
  }, [keyboardInset, translateY]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      updateKeyboardInset(event.endCoordinates, event.duration || 220);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      animateKeyboardInset(0, 180);
    });
    const dimensionsSubscription = Dimensions.addEventListener('change', () => {
      updateKeyboardInset();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      dimensionsSubscription.remove();
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      keyboardInset.setValue(0);
    };
  }, [animateKeyboardInset, keyboardInset, updateKeyboardInset]);

  const handleDone = async () => {
    if (!details.trim() || isSubmitting) {
      return;
    }

    try {
      await onDone(details);
      setDetails('');
      onClose();
    } catch {
      // The caller owns user-facing error feedback and may keep the sheet open.
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleModalShow}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' }]}>
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />

        <Animated.View
          style={[styles.sheetContainer, { transform: [{ translateY: combinedTranslateY }] }]}
        >
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: sheetBottomPadding }]}>
            <View {...dragResponder.panHandlers} style={styles.dragArea}>
              <View style={[styles.handle, { backgroundColor: colors.text + '33' }]} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Write down your report</Text>

            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.text }]}
                placeholder="Describe the issue (250 character limit)"
                placeholderTextColor={colors.textSecondary}
                multiline
                scrollEnabled
                blurOnSubmit={false}
                maxLength={250}
                value={details}
                onChangeText={setDetails}
                onFocus={() => setTimeout(() => updateKeyboardInset(), 50)}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPressIn={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.doneBtn,
                  { backgroundColor: buttonBackground(colors) },
                  (!details.trim() || isSubmitting) && styles.doneBtnDisabled
                ]}
                onPressIn={handleDone}
                disabled={!details.trim() || isSubmitting}
              >
                <Text style={[styles.doneBtnText, { color: buttonForeground(colors) }]}>
                  {isSubmitting ? 'Submitting...' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  handle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    borderRadius: 16,
    height: 200,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  input: {
    fontSize: 15,
    textAlignVertical: 'top',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1.5,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnDisabled: {
    opacity: 0.5,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
