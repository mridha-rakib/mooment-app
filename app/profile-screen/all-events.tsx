import BackButton from "@/components/ui/BackButton";
import EventFeedCard from "@/components/home/EventFeedCard";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  getMyJoinedEvents,
  getProfileEvents,
  type EventResponse,
  type ProfileEventGroups,
} from "@/lib/events";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type TabKey = "created" | "joined";

const PAGE_SIZE = 8;

const TAB_LABELS: Record<TabKey, string> = {
  created: "Created",
  joined: "Joined",
};

const EMPTY_PROFILE_EVENTS: ProfileEventGroups = {
  active: [],
  past: [],
};

const dedupeEvents = (events: EventResponse[]): EventResponse[] => {
  const byId = new Map<string, EventResponse>();

  for (const event of events) {
    if (!byId.has(event.id)) {
      byId.set(event.id, event);
    }
  }

  return [...byId.values()];
};

function SkeletonCard({ colors, isDark }: { colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Animated.View style={[styles.skeletonBanner, { opacity: pulse, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]} />
      <View style={styles.cardBody}>
        <Animated.View style={[styles.skeletonLineLg, { opacity: pulse, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]} />
        <Animated.View style={[styles.skeletonLineMd, { opacity: pulse, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]} />
        <Animated.View style={[styles.skeletonLineSm, { opacity: pulse, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]} />
        <View style={styles.skeletonMetaRow}>
          <Animated.View style={[styles.skeletonPill, { opacity: pulse, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]} />
          <Animated.View style={[styles.skeletonPill, { opacity: pulse, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }]} />
        </View>
      </View>
    </View>
  );
}

function EmptyState({
  activeTab,
  onPrimaryPress,
  colors,
  isDark,
}: {
  activeTab: TabKey;
  onPrimaryPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  const isCreated = activeTab === "created";
  const message = isCreated
    ? "You haven't created any events yet."
    : "You haven't joined any events yet.";
  const cta = isCreated ? "Create Event" : "Explore Events";
  const icon = isCreated ? "plus-circle" : "compass";

  return (
    <View style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyIconWrap,
          { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" },
        ]}
      >
        <Feather name={icon as any} size={34} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{message}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPrimaryPress}
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.primaryBtnText, { color: isDark ? "#000000" : "#FFFFFF" }]}>{cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
  colors,
  isDark,
}: {
  message: string;
  onRetry: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyIconWrap,
          { backgroundColor: isDark ? "rgba(255,59,48,0.12)" : "rgba(255,59,48,0.1)" },
        ]}
      >
        <Feather name="alert-triangle" size={34} color={colors.danger} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{message}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onRetry}
        style={[
          styles.retryBtn,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.retryBtnText, { color: colors.text }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AllEventsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = typeof params.userId === "string" ? params.userId : null;

  const [activeTab, setActiveTab] = useState<TabKey>("created");
  const [createdProfileEvents, setCreatedProfileEvents] = useState<ProfileEventGroups>(EMPTY_PROFILE_EVENTS);
  const [joinedEvents, setJoinedEvents] = useState<EventResponse[]>([]);
  const [createdError, setCreatedError] = useState<string | null>(null);
  const [joinedError, setJoinedError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCounts, setVisibleCounts] = useState<Record<TabKey, number>>({
    created: PAGE_SIZE,
    joined: PAGE_SIZE,
  });

  const loadAllEvents = useCallback(async () => {
    try {
      const [createdResult, joinedResult] = await Promise.allSettled([
        userId ? getProfileEvents(userId) : Promise.resolve(EMPTY_PROFILE_EVENTS),
        getMyJoinedEvents(),
      ]);

      if (createdResult.status === "fulfilled") {
        const nextCreated = createdResult.value;
        setCreatedProfileEvents(nextCreated);
        const createdCount = dedupeEvents([...nextCreated.active, ...nextCreated.past]).length;
        setVisibleCounts((current) => ({
          ...current,
          created: Math.min(current.created, Math.max(createdCount, PAGE_SIZE)),
        }));
        setCreatedError(null);
      } else {
        setCreatedError(getAuthErrorMessage(createdResult.reason, "Unable to load created events."));
      }

      if (joinedResult.status === "fulfilled") {
        const nextJoined = joinedResult.value;
        setJoinedEvents(nextJoined);
        setVisibleCounts((current) => ({
          ...current,
          joined: Math.min(current.joined, Math.max(nextJoined.length, PAGE_SIZE)),
        }));
        setJoinedError(null);
      } else {
        setJoinedError(getAuthErrorMessage(joinedResult.reason, "Unable to load joined events."));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAllEvents();
  }, [loadAllEvents]);

  const createdEvents = useMemo(
    () => dedupeEvents([...createdProfileEvents.active, ...createdProfileEvents.past]),
    [createdProfileEvents],
  );
  const activeEvents = activeTab === "created" ? createdEvents : joinedEvents;
  const activeError = activeTab === "created" ? createdError : joinedError;
  const visibleCount = visibleCounts[activeTab];
  const visibleEvents = useMemo(
    () => activeEvents.slice(0, visibleCount),
    [activeEvents, visibleCount],
  );
  const hasMoreEvents = visibleCount < activeEvents.length;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadAllEvents();
  }, [loadAllEvents]);

  const handleLoadMore = useCallback(() => {
    if (!hasMoreEvents) return;
    setVisibleCounts((current) => ({
      ...current,
      [activeTab]: Math.min(current[activeTab] + PAGE_SIZE, activeEvents.length),
    }));
  }, [activeEvents.length, activeTab, hasMoreEvents]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    void loadAllEvents();
  }, [loadAllEvents]);

  const renderItem = useCallback(
    ({ item }: { item: EventResponse }) => <EventFeedCard event={item} embedded />,
    [],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>All Events</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsRow}>
        {(["created", "joined"] as TabKey[]).map((tab) => {
          const selected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.85}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: selected
                    ? colors.card
                    : isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.04)",
                  borderColor: selected ? colors.border : "transparent",
                },
              ]}
            >
              <Text style={[styles.tabText, { color: selected ? colors.text : colors.textSecondary }]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <FlatList
          data={[0, 1, 2, 3]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <SkeletonCard colors={colors} isDark={isDark} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        />
      ) : activeError && visibleEvents.length === 0 ? (
        <ErrorState
          message={activeError}
          onRetry={handleRetry}
          colors={colors}
          isDark={isDark}
        />
      ) : (
        <FlatList
          data={visibleEvents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            visibleEvents.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleLoadMore}
          ListHeaderComponent={
            activeError && visibleEvents.length > 0 ? (
              <View
                style={[
                  styles.inlineError,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.inlineErrorText, { color: colors.textSecondary }]}>
                  {activeError}
                </Text>
                <TouchableOpacity onPress={handleRetry}>
                  <Text style={[styles.inlineErrorAction, { color: colors.primary }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              activeTab={activeTab}
              onPrimaryPress={() =>
                router.push(activeTab === "created" ? "/create-event" : "/(tabs)/explore")
              }
              colors={colors}
              isDark={isDark}
            />
          }
          ListFooterComponent={
            <View style={{ height: hasMoreEvents ? 20 : 12 }} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  bannerWrap: {
    height: 170,
    position: "relative",
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  bannerFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadgeWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusMini: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusMiniText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    maxWidth: 280,
  },
  primaryBtn: {
    minWidth: 160,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  retryBtn: {
    minWidth: 160,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "800",
  },
  inlineError: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  inlineErrorAction: {
    fontSize: 12,
    fontWeight: "700",
  },
  skeletonBanner: {
    width: "100%",
    height: 170,
  },
  skeletonLineLg: {
    height: 18,
    borderRadius: 9,
    width: "72%",
  },
  skeletonLineMd: {
    height: 14,
    borderRadius: 7,
    width: "54%",
  },
  skeletonLineSm: {
    height: 14,
    borderRadius: 7,
    width: "43%",
  },
  skeletonMetaRow: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonPill: {
    width: 92,
    height: 28,
    borderRadius: 999,
  },
});
