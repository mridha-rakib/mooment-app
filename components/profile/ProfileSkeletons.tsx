import React from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { SkeletonBlock, useSkeletonPulse } from "@/components/ui/Skeleton";

// Avatar skeleton matches UserAvatar's size={80}/borderRadius 40 exactly,
// so it sits inside ProfileHeader's unchanged 86x86 avatarBorder ring.
export function ProfileAvatarSkeleton() {
  const { isDark } = useTheme();
  const pulse = useSkeletonPulse();
  return <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.avatar} />;
}

// Reserves the same four-column row as ProfileHeader's real stats
// (statBox/statLabel geometry) without shifting columns.
export function ProfileStatsRowSkeleton() {
  const { isDark } = useTheme();
  const pulse = useSkeletonPulse();
  return (
    <View style={styles.statsRow}>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.statColumn}>
          <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.statValue} />
          <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.statLabel} />
        </View>
      ))}
    </View>
  );
}

// Matches ProfileBio's name (18/bold) / handle (13) / bio (13, lineHeight 18) stack.
export function ProfileIdentityTextSkeleton() {
  const { isDark } = useTheme();
  const pulse = useSkeletonPulse();
  return (
    <View>
      <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.nameLine} />
      <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.handleLine} />
      <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.bioLineFull} />
      <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.bioLineShort} />
    </View>
  );
}

// Card geometry copied from the Home Feed's FeedSkeletonCard convention
// (same component renders both posts and profile events via EventFeedCard).
function ProfileCardSkeleton({ pulse, isDark }: { pulse: Animated.Value; isDark: boolean }) {
  return (
    <View style={[styles.card, !isDark && styles.cardLight]}>
      <View style={styles.cardHeader}>
        <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.cardAvatar} />
        <View style={styles.cardAuthor}>
          <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.cardAuthorLine} />
          <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.cardTimeLine} />
        </View>
      </View>
      <SkeletonBlock pulse={pulse} isDark={isDark} style={styles.cardMedia} />
    </View>
  );
}

export function ProfileFeedSkeletonList() {
  const { isDark } = useTheme();
  const pulse = useSkeletonPulse();
  return (
    <View style={styles.list} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((item) => (
        <ProfileCardSkeleton key={item} pulse={pulse} isDark={isDark} />
      ))}
    </View>
  );
}

export function ProfileEventsSkeletonList() {
  const { isDark } = useTheme();
  const pulse = useSkeletonPulse();
  return (
    <View style={styles.list} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1].map((item) => (
        <ProfileCardSkeleton key={item} pulse={pulse} isDark={isDark} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statColumn: {
    alignItems: "center",
  },
  statValue: {
    width: 24,
    height: 14,
    borderRadius: 4,
  },
  statLabel: {
    width: 46,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  nameLine: {
    width: 140,
    height: 14,
    borderRadius: 6,
    marginBottom: 6,
  },
  handleLine: {
    width: 90,
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  bioLineFull: {
    width: "92%",
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  bioLineShort: {
    width: "60%",
    height: 10,
    borderRadius: 5,
  },
  list: {
    paddingTop: 10,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(17, 17, 17, 0.85)",
  },
  cardLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  cardAuthor: {
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  cardAuthorLine: {
    width: "54%",
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  cardTimeLine: {
    width: "32%",
    height: 10,
    borderRadius: 5,
  },
  cardMedia: {
    width: "100%",
    aspectRatio: 1,
  },
});
