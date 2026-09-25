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
import { EVENT_LIFECYCLE_LABELS, type CrowdStatus, type EventLifecycle, type EventStatus } from "@/lib/events";

const CROWD_LABELS: Record<CrowdStatus, string> = {
  not_busy: "Not Busy",
  busy: "Busy",
  very_busy: "Very Busy",
};

const SUPPORTED_CROWD_STATUSES = new Set<CrowdStatus>(["not_busy", "busy", "very_busy"]);

export const isSupportedCrowdStatus = (value?: string | null): value is CrowdStatus =>
  Boolean(value && SUPPORTED_CROWD_STATUSES.has(value as CrowdStatus));

type CrowdStatusBadgeProps = {
  eventLifecycle?: EventLifecycle | null;
  // Compatibility for unmigrated surfaces. Feed and Event Detail pass the
  // canonical lifecycle field above; those are deliberately not inferred.
  eventStatus?: EventStatus | string | null;
  crowdStatus?: CrowdStatus | string | null;
  style?: StyleProp<ViewStyle>;
};

export default function CrowdStatusBadge({ eventLifecycle, eventStatus, crowdStatus, style }: CrowdStatusBadgeProps) {
  const { colors } = useTheme();
  const effectiveLifecycle = eventLifecycle ?? (eventStatus === "live" ? "live" : null);

  if (effectiveLifecycle !== "live" || !isSupportedCrowdStatus(crowdStatus)) {
    return null;
  }

  // Product decision: every crowd-status value renders in the same red
  // semantic family as "Live", regardless of severity (not_busy/busy/very_busy).
  // Background matches EventLifecycleBadge's near-opaque dark-maroon treatment
  // below so the pill stays readable over bright/busy banner artwork.
  const colorStyle = { backgroundColor: "rgba(72, 11, 10, 0.82)" };
  const textColor = colors.danger;

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
function LiveDot({ color }: { color: string }) {
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

  return <Animated.View style={[styles.liveDot, { backgroundColor: color }, animatedStyle]} />;
}

export function EventLifecycleBadge({ lifecycle, style }: { lifecycle?: EventLifecycle | null; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();

  if (!lifecycle) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[styles.liveBadge, lifecycle !== "live" && styles.nonLiveLifecycleBadge, style]}
      pointerEvents="none"
    >
      {lifecycle === "live" ? <LiveDot color={colors.danger} /> : null}
      <Text style={[styles.liveText, { color: lifecycle === "live" ? colors.danger : "#B8B8C2" }]} numberOfLines={1}>
        {EVENT_LIFECYCLE_LABELS[lifecycle]}
      </Text>
    </Animated.View>
  );
}

// Compatibility export for wallet and ticket-detail, which are outside this
// lifecycle-display migration. Feed and Event Detail use EventLifecycleBadge.
export function LiveLifecycleBadge({ eventStatus, style }: { eventStatus?: EventStatus | string | null; style?: StyleProp<ViewStyle> }) {
  return <EventLifecycleBadge lifecycle={eventStatus === "live" ? "live" : null} style={style} />;
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
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.08,
    lineHeight: 16,
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(72, 11, 10, 0.82)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  nonLiveLifecycleBadge: {
    backgroundColor: "rgba(46, 46, 50, 0.82)",
  },
  liveDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  liveText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
});
