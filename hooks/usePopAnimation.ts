import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

type PopOptions = {
  /** Peak scale of the pop. Default 1.18 (subtle). */
  scale?: number;
};

/**
 * Subtle "pop" feedback for an icon/label that just toggled state — like,
 * follow, react, save. View-layer only: owns a single shared value and
 * nothing else. Call `pop()` synchronously alongside the existing optimistic
 * UI state change; never await anything before it.
 *
 * Honors the OS "Reduce Motion" setting: when enabled, `pop()` is a no-op and
 * the element stays at rest scale, so the state change stays fully instant.
 *
 * Usage mirrors the existing `likeIconStyle` pattern in PostInteractionBar:
 *   const { style, pop } = usePopAnimation();
 *   <Animated.View style={style}>...</Animated.View>
 */
export function usePopAnimation(options: PopOptions = {}) {
  const peak = options.scale ?? 1.18;
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pop = useCallback(() => {
    if (reduceMotion) {
      return;
    }

    // Two short springs — total well under ~400ms, never blocks and never
    // gates any state change or navigation.
    scale.value = withSequence(
      withSpring(peak, { damping: 12, stiffness: 260, mass: 0.5 }),
      withSpring(1, { damping: 14, stiffness: 220, mass: 0.5 }),
    );
  }, [peak, reduceMotion, scale]);

  return { style, pop };
}
