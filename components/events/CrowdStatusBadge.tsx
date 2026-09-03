import React, { useEffect } from "react";
import { StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import type { CrowdStatus, EventStatus } from "@/lib/events";

const CROWD_LABELS: Record<CrowdStatus, string> = {
  not_busy: "Not Busy",
  busy: "Busy",
  very_busy: "Very Busy",
};

const SUPPORTED_CROWD_STATUSES = new Set<CrowdStatus>(["not_busy", "busy", "very_busy"]);

export const isSupportedCrowdStatus = (value?: string | null): value is CrowdStatus =>
  Boolean(value && SUPPORTED_CROWD_STATUSES.has(value as CrowdStatus));

type CrowdStatusBadgeProps = {
  eventStatus?: EventStatus | string | null;
  crowdStatus?: CrowdStatus | string | null;
  style?: StyleProp<ViewStyle>;
};

export default function CrowdStatusBadge({ eventStatus, crowdStatus, style }: CrowdStatusBadgeProps) {
  const { colors } = useTheme();

  if (eventStatus !== "live" || !isSupportedCrowdStatus(crowdStatus)) {
    return null;
  }

  const colorStyle =
    crowdStatus === "busy"
      ? styles.busy
      : crowdStatus === "very_busy"
        ? { backgroundColor: `${colors.danger}1A` }
        : { backgroundColor: `${colors.success}1A` };
  const textColor =
    crowdStatus === "busy"
      ? "#BB5E30"
      : crowdStatus === "very_busy"
        ? colors.danger
        : colors.success;

  return (
    // Keyed on crowdStatus so a transition (not_busy -> busy -> very_busy)
    // gently crossfades the pill instead of hard-swapping. FadeIn is skipped
    // automatically when the OS "Reduce Motion" setting is on.
    <Animated.View
      key={crowdStatus}
      entering={FadeIn.duration(220)}
      style={[styles.badge, colorStyle, style]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
        {CROWD_LABELS[crowdStatus]}
      </Text>
    </Animated.View>
  );
}

// Subtle opacity breathing on the "Live" dot. Self-contained hooks so the
// parent can keep its early `return null`. No-op under Reduce Motion.
function LiveDot() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(withTiming(0.4, { duration: 800 }), -1, true);
  }, [pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={[styles.liveDot, animatedStyle]} />;
}

export function LiveLifecycleBadge({ eventStatus, style }: { eventStatus?: string | null; style?: StyleProp<ViewStyle> }) {
  if (eventStatus !== "live") {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[styles.liveBadge, style]} pointerEvents="none">
      <LiveDot />
      <Text style={styles.liveText} numberOfLines={1}>Live</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    height: 20,
    justifyContent: "center",
    minWidth: 41,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  busy: {
    backgroundColor: "#EDE9F8",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.08,
    lineHeight: 16,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(8, 45, 22, 0.82)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveDot: {
    backgroundColor: "#18D66B",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  liveText: {
    color: "#18D66B",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
