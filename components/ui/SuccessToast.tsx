import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { setSuccessFeedbackListener } from '@/lib/successFeedback';

// Timings — enter is well under the "within 1 second" requirement.
const ENTER_MS = 220;
const EXIT_MS = 180;
const VISIBLE_MS = 2600;

// Sits just below the status bar. No dependency on SafeAreaProvider (which is
// not mounted at the app root) — a small platform constant is enough for a
// transient overlay.
const TOP_OFFSET =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 60;

/**
 * Branded, non-blocking success snackbar. Mount once, high in the tree
 * (see app/_layout.tsx). Renders nothing until notifySuccess() is called.
 *
 * - Auto-dismisses; no OK/close button.
 * - pointerEvents="none" end to end, so it never intercepts touches or
 *   blocks the screen underneath.
 */
export default function SuccessToastHost() {
  const { colors, isDark } = useTheme();

  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards async animation callbacks against a newer message that arrived
  // while the previous one was still animating out.
  const tokenRef = useRef(0);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const hide = useCallback(
    (token: number) => {
      Animated.timing(anim, {
        toValue: 0,
        duration: EXIT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && token === tokenRef.current) {
          setMounted(false);
          setMessage(null);
        }
      });
    },
    [anim],
  );

  const show = useCallback(
    (text: string) => {
      const token = ++tokenRef.current;

      clearHideTimer();
      setMessage(text);
      setMounted(true);

      // Best-effort only — never allowed to throw into the caller's flow.
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      try {
        AccessibilityInfo.announceForAccessibility?.(text);
      } catch {}

      Animated.timing(anim, {
        toValue: 1,
        duration: ENTER_MS,
        useNativeDriver: true,
      }).start();

      hideTimer.current = setTimeout(() => hide(token), VISIBLE_MS);
    },
    [anim, clearHideTimer, hide],
  );

  useEffect(() => {
    setSuccessFeedbackListener(show);
    return () => {
      setSuccessFeedbackListener(null);
      clearHideTimer();
    };
  }, [show, clearHideTimer]);

  if (!mounted || !message) {
    return null;
  }

  const surface = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View pointerEvents="none" style={[styles.overlay, { top: TOP_OFFSET }]}>
      <Animated.View
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: surface,
            borderColor: colors.border,
            shadowColor: isDark ? '#000000' : '#1A1A1A',
            opacity: anim,
            transform: [
              {
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.success }]}>
          <Feather name="check" size={13} color="#FFFFFF" />
        </View>
        <Text numberOfLines={2} style={[styles.text, { color: colors.text }]}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 460,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  text: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
