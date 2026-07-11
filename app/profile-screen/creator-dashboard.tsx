import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { getMyEvents, type EventResponse } from "@/lib/events";
import { getMyEarningsSummary, type CreatorEarningsSummary } from "@/lib/payments";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";
import { Feather } from "@expo/vector-icons";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const fmt = (n: number) => `$${n.toFixed(2)}`;

const formatEventDate = (scheduledAt?: string | null): string => {
  if (!scheduledAt) return "";
  try {
    const d = new Date(scheduledAt);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

const formatEventTime = (scheduledAt?: string | null): string => {
  if (!scheduledAt) return "";
  try {
    const d = new Date(scheduledAt);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
};

const getBannerUri = (event: EventResponse): string | null => {
  const key = event.bannerImageKey ?? event.bannerOriginalImageKey;
  if (!key) return null;
  try {
    return getStorageFileUrl(key);
  } catch {
    return null;
  }
};

export default function CreatorDashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const startCreateSession = useEventDraftStore((state) => state.startCreateSession);

  const [events, setEvents] = useState<EventResponse[]>([]);
  const [summary, setSummary] = useState<CreatorEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [evts, earn] = await Promise.all([getMyEvents(), getMyEarningsSummary()]);
      setEvents(evts);
      setSummary(earn);
    } catch {
      // silently handle errors; state stays at previous value
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const totalTicketsSold = summary?.earnings.filter((e) => e.itemType === "ticket" && e.status !== "refunded").length ?? 0;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Creator Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() =>
                requireBusinessAccountForEvent({
                  user,
                  completedProfileTypes,
                  updateProfile,
                  router,
                  onReady: () => {
                    startCreateSession();
                    router.push("/create-event");
                  },
                })
              }
            >
              <HugeiconsIcon icon={Calendar01Icon} size={20} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/profile-screen/withdraw")}
            >
              <Feather name="arrow-up-circle" size={20} color={colors.textSecondary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Main Balance */}
          <View style={styles.balanceSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Total Lifetime Earnings</Text>
            <Text style={[styles.mainBalance, { color: colors.text }]}>{fmt(summary?.totalEarnedAmount ?? 0)}</Text>

            <View style={styles.balanceSplit}>
              <View style={styles.balanceColumn}>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Pending{"\n"}(Held)</Text>
                <Text style={[styles.subBalance, { color: colors.text }]}>{fmt(summary?.heldAmount ?? 0)}</Text>
              </View>
              <Feather name="arrow-right" size={16} color={colors.textSecondary} style={styles.arrowIcon} />
              <View style={styles.balanceColumn}>
                <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Available{"\n"}to Withdraw</Text>
                <Text style={[styles.subBalance, { color: colors.success ?? colors.text }]}>{fmt(summary?.eligibleAmount ?? 0)}</Text>
              </View>
              {(summary?.pendingWithdrawalAmount ?? 0) > 0 && (
                <>
                  <Feather name="arrow-right" size={16} color={colors.textSecondary} style={styles.arrowIcon} />
                  <View style={styles.balanceColumn}>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>In Transit{"\n"}(Withdrawing)</Text>
                    <Text style={[styles.subBalance, { color: colors.warning ?? colors.text }]}>{fmt(summary?.pendingWithdrawalAmount ?? 0)}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Earnings */}
          <View style={styles.earningsSection}>
            <View style={styles.earningItem}>
              <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
              <Text style={[styles.earningAmount, { color: colors.text }]}>{fmt(summary?.totalEarnedAmount ?? 0)}</Text>
            </View>
            <View style={styles.earningItem}>
              <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>Withdrawn</Text>
              <Text style={[styles.earningAmount, { color: colors.text }]}>{fmt(summary?.withdrawnAmount ?? 0)}</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tickets Sold</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalTicketsSold}</Text>
            </View>
            <View style={styles.statColumn}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Events</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{events.length}</Text>
            </View>
          </View>

          {/* All Events List */}
          <View style={styles.eventsSection}>
            <Text style={[styles.eventsTitle, { color: colors.text }]}>All Events</Text>

            {events.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events yet. Create your first event!</Text>
              </View>
            ) : (
              events.map((event) => {
                const bannerUri = getBannerUri(event);
                const dateStr = formatEventDate(event.scheduledAt);
                const timeStr = formatEventTime(event.scheduledAt);
                const isPrivate = event.privacy === "locked" || event.privacy === "private";
                const totalCapacity = event.tickets.reduce((sum, t) => sum + t.capacity, 0);

                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() =>
                      router.push({
                        pathname: "/profile-screen/event-dashboard",
                        params: { eventId: event.id, eventName: event.name ?? "Event" },
                      })
                    }
                  >
                    {bannerUri ? (
                      <Image source={{ uri: bannerUri }} style={styles.eventImage} />
                    ) : (
                      <View style={[styles.eventImagePlaceholder, { backgroundColor: colors.border }]} />
                    )}
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                        {event.name ?? "Untitled Event"}
                      </Text>
                      <Text style={[styles.eventDetails, { color: colors.textSecondary }]}>
                        {dateStr}
                        {timeStr ? `  •  ${timeStr}` : ""}
                        {isPrivate ? (
                          <>
                            {"  •  "}
                            <Feather name="lock" size={10} color={colors.textSecondary} />
                          </>
                        ) : null}
                      </Text>
                      <View style={styles.eventBottom}>
                        <Text style={[styles.statusBadge, { color: colors.textSecondary }]}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Text>
                        {totalCapacity > 0 && (
                          <Text style={[styles.goingText, { color: colors.textSecondary }]}>
                            {"  •  "}
                            {totalCapacity} capacity
                          </Text>
                        )}
                      </View>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.textSecondary} style={styles.eventChevron} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Chart Section */}
          <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Total Sales</Text>
              <TouchableOpacity style={styles.chartFilter}>
                <Text style={[styles.chartFilterText, { color: colors.textSecondary }]}>Year</Text>
                <Feather name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.chartArea}>
              <View style={styles.yAxis}>
                <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$1k</Text>
                <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$750</Text>
                <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$500</Text>
                <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$250</Text>
                <Text style={[styles.axisLabel, { color: colors.textSecondary }]}>$0</Text>
              </View>

              <View style={styles.barsContainer}>
                <View style={styles.gridLines}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={[styles.gridLine, { backgroundColor: colors.border }]} />
                  ))}
                </View>
                <View style={styles.barsRow}>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, i) => (
                    <View key={month} style={styles.barWrapper}>
                      <View style={[styles.bar, { height: `${[60, 80, 50, 70, 90, 85][i]}%`, backgroundColor: colors.primary }]} />
                      <Text style={[styles.xLabel, { color: colors.textSecondary }]}>{month}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  actionRow: { flexDirection: "row", gap: 15, marginBottom: 30 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { fontSize: 12, fontWeight: "600" },
  balanceSection: { marginBottom: 30 },
  sectionLabel: { fontSize: 12, marginBottom: 8 },
  mainBalance: { fontSize: 32, fontWeight: "bold", marginBottom: 20 },
  balanceSplit: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceColumn: { flex: 1 },
  subLabel: { fontSize: 11, lineHeight: 16, marginBottom: 4 },
  subBalance: { fontSize: 18, fontWeight: "bold" },
  arrowIcon: { marginHorizontal: 15 },
  earningsSection: { marginBottom: 30, gap: 20 },
  earningItem: {},
  earningLabel: { fontSize: 12, marginBottom: 4 },
  earningAmount: { fontSize: 24, fontWeight: "bold" },
  statsRow: { flexDirection: "row", marginBottom: 30 },
  statColumn: { flex: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: "bold" },
  eventsSection: { marginBottom: 30 },
  eventsTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 15 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  eventImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  eventImagePlaceholder: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  eventDetails: { fontSize: 10, marginBottom: 6 },
  eventBottom: { flexDirection: "row", alignItems: "center" },
  statusBadge: { fontSize: 10 },
  goingText: { fontSize: 10 },
  eventChevron: { marginLeft: 10 },
  chartSection: { borderRadius: 16, padding: 20, borderWidth: 1 },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  chartTitle: { fontSize: 14, fontWeight: "bold" },
  chartFilter: { flexDirection: "row", alignItems: "center", gap: 4 },
  chartFilterText: { fontSize: 12 },
  chartArea: { flexDirection: "row", height: 200 },
  yAxis: { justifyContent: "space-between", paddingRight: 15, paddingBottom: 20 },
  axisLabel: { fontSize: 10 },
  barsContainer: { flex: 1, position: "relative" },
  gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", paddingBottom: 20 },
  gridLine: { height: 1, width: "100%" },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 10,
  },
  barWrapper: { alignItems: "center", width: 24, height: "100%", justifyContent: "flex-end" },
  bar: { width: 8, borderRadius: 4, marginBottom: 10 },
  xLabel: { fontSize: 10 },
});
