import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, ViewStyle } from "react-native";

// Mirrors the pulse timing/opacity range already used by the Home Feed,
// All Events, and About-tab gallery skeletons (650ms per leg, 0.55 -> 1.0).
export function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return pulse;
}

type SkeletonBlockProps = {
  pulse: Animated.Value;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ pulse, isDark, style }: SkeletonBlockProps) {
  return (
    <Animated.View
      style={[
        styles.block,
        style,
        { opacity: pulse, backgroundColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)" },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});
