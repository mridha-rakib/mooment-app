import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getEventById, type EventResponse, type EventTicketPayload } from "@/lib/events";
import {
  getEventAttendanceSummary,
  getMyEarningsByEvent,
  getEventTicketStats,
  type EventAttendanceSummary,
  type EventEarningsSummary,
  type TicketStatEntry,
} from "@/lib/payments";
import { getStorageFileUrl } from "@/lib/storage";
import { Feather } from "@expo/vector-icons";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

const fmt = (n: number) => `$${n.toFixed(2)}`;

type AttendanceSummaryState =
  | { status: "idle"; data: null }
  | { status: "loading"; data: null }
  | { status: "success"; data: EventAttendanceSummary }
  | { status: "error"; data: null };

const getRouteParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
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

type TicketRowData = EventTicketPayload & {
  sold: number;
  capacity: number;
};

export default function EventDashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string | string[]; eventName?: string | string[] }>();
  const eventId = getRouteParam(params.eventId);
  const eventNameParam = getRouteParam(params.eventName);

  const [event, setEvent] = useState<EventResponse | null>(null);
  const [earnings, setEarnings] = useState<EventEarningsSummary | null>(null);
  const [ticketStats, setTicketStats] = useState<Record<string, TicketStatEntry>>({});
  const [attendanceSummaryState, setAttendanceSummaryState] = useState<AttendanceSummaryState>({
    status: "idle",
    data: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    setAttendanceSummaryState({ status: "loading", data: null });
    void getEventAttendanceSummary(eventId)
      .then((summary) => {
        setAttendanceSummaryState({ status: "success", data: summary });
      })
      .catch((error) => {
        if (__DEV__) {
          console.log("[EventDashboard] attendance summary load failed", { eventId, error });
        }
        setAttendanceSummaryState({ status: "error", data: null });
      });

    try {
      const [evt, earn, stats] = await Promise.all([
        getEventById(eventId),
        getMyEarningsByEvent(eventId),
        getEventTicketStats(eventId),
      ]);
      setEvent(evt);
      setEarnings(earn);
      setTicketStats(stats);
    } catch {
      // silently handle errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const attendanceSummary = attendanceSummaryState.status === "success" ? attendanceSummaryState.data : null;
  const attendanceAvatars = attendanceSummary?.avatars.slice(0, 3) ?? [];
  const eventName = event?.name ?? (eventNameParam || "Event");
  const bannerUri = event ? getBannerUri(event) : null;
  const goToTicketStats = useCallback(() => {
    if (!eventId) return;

    router.push({
      pathname: "/profile-screen/ticket-stat",
      params: {
        eventId,
        eventName,
      },
    });
  }, [eventId, eventName, router]);

  const goToAttendeeList = useCallback((initialFilter: "going" | "attended" | "canceled" | "noShow") => {
    if (!eventId) return;

    router.push({
      pathname: "/profile-screen/attendee-list",
      params: {
        eventId,
        eventName,
        initialFilter,
      },
    });
  }, [eventId, eventName, router]);

  const ticketRows: TicketRowData[] = (event?.tickets ?? []).map((ticket) => {
    const stat = ticketStats[ticket.id ?? ""] ?? { sold: 0, available: 0, capacity: ticket.capacity };
    return {
      ...ticket,
      sold: stat.sold,
      capacity: stat.capacity,
    };
  });

  const totalTicketsSold = ticketRows.reduce((sum, t) => sum + t.sold, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {eventName}
        </Text>
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
          {/* Banner */}
          {bannerUri && (
            <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
          )}

          {/* Earnings Top */}
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Total Earnings</Text>
              <Text style={[styles.largeBalance, { color: colors.text }]}>{fmt(earnings?.netAmount ?? 0)}</Text>
            </View>
          </View>

          {/* Payment Breakdown Card */}
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.breakdownTitle, { color: colors.text }]}>Payment Breakdown</Text>

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Gross Revenue</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>{fmt(earnings?.grossAmount ?? 0)}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Platform Fee</Text>
              <Text style={[styles.breakdownValueNeg, { color: '#D64646' }]}>-{fmt(earnings?.platformFeeAmount ?? 0)}</Text>
            </View>

            {(earnings?.refundedAmount ?? 0) > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Refunds</Text>
                <Text style={[styles.breakdownValueNeg, { color: '#D64646' }]}>-{fmt(earnings?.refundedAmount ?? 0)}</Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabelBold, { color: colors.text }]}>Net Earnings</Text>
              <Text style={[styles.breakdownValueBold, { color: colors.text }]}>{fmt(earnings?.netAmount ?? 0)}</Text>
            </View>

            {(earnings?.ticketNetAmount ?? 0) > 0 && (
              <View style={[styles.breakdownSubRow]}>
                <Text style={[styles.breakdownSubLabel, { color: colors.textSecondary }]}>  From Tickets</Text>
                <Text style={[styles.breakdownSubValue, { color: colors.textSecondary }]}>{fmt(earnings?.ticketNetAmount ?? 0)}</Text>
              </View>
            )}
            {(earnings?.productNetAmount ?? 0) > 0 && (
              <View style={styles.breakdownSubRow}>
                <Text style={[styles.breakdownSubLabel, { color: colors.textSecondary }]}>  From Products</Text>
                <Text style={[styles.breakdownSubValue, { color: colors.textSecondary }]}>{fmt(earnings?.productNetAmount ?? 0)}</Text>
              </View>
            )}
          </View>

          {/* Sales Stats */}
          <View style={[styles.statsContainer, { borderColor: colors.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tickets Sold</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalTicketsSold}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Ticket Types</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{event?.tickets.length ?? 0}</Text>
            </View>
          </View>

          {/* Location Info */}
          {event?.location && (
            <View style={[styles.locationContainer, { borderColor: colors.border }]}>
              <View style={styles.locationTop}>
                {event.privacy === "locked" || event.privacy === "private" ? (
                  <Feather name="lock" size={14} color={colors.text} />
                ) : (
                  <Feather name="map-pin" size={14} color={colors.text} />
                )}
                <Text style={[styles.cityText, { color: colors.text }]}>
                  {event.location.searchLabel ?? event.location.venue ?? "Location"}
                </Text>
              </View>
              {event.location.venue && (
                <Text style={[styles.locationDetail, { color: colors.text }]}>
                  <Text style={[styles.locationDetailLabel, { color: colors.textSecondary }]}>Venue: </Text>
                  {event.location.venue}
                </Text>
              )}
              {event.location.address && (
                <Text style={[styles.locationDetail, { color: colors.text }]}>
                  <Text style={[styles.locationDetailLabel, { color: colors.textSecondary }]}>Address: </Text>
                  {event.location.address}
                </Text>
              )}
            </View>
          )}

          {attendanceSummary && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.attendanceScroll}
              contentContainerStyle={styles.attendanceRow}
            >
              <TouchableOpacity
                style={styles.attendanceGoingGroup}
                activeOpacity={0.75}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View going ticket holders"
                onPress={() => goToAttendeeList("going")}
              >
                {attendanceAvatars.length > 0 && (
                  <View style={styles.attendanceAvatarStack}>
                    {attendanceAvatars.map((avatar, index) => (
                      <UserAvatar
                        key={avatar.userId}
                        uri={avatar.avatarUrl ?? null}
                        name={avatar.name}
                        size={20}
                        iconSize={10}
                        style={[
                          styles.attendanceAvatar,
                          index > 0 ? styles.attendanceAvatarOverlap : null,
                          { zIndex: attendanceAvatars.length - index },
                        ]}
                        textStyle={styles.attendanceAvatarText}
                      />
                    ))}
                  </View>
                )}
                <Text style={styles.attendanceText}>{attendanceSummary.going} going</Text>
              </TouchableOpacity>
              <View style={styles.attendanceSeparator} />
              <TouchableOpacity
                style={styles.attendanceMetric}
                activeOpacity={0.75}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View attended ticket holders"
                onPress={() => goToAttendeeList("attended")}
              >
                <View style={[styles.attendanceStatusIcon, { backgroundColor: "#26C08F" }]}>
                  <Feather name="check" size={9} color="#FFFFFF" />
                </View>
                <Text style={styles.attendanceText}>{attendanceSummary.attended} attended</Text>
              </TouchableOpacity>
              <View style={styles.attendanceSeparator} />
              <TouchableOpacity
                style={styles.attendanceMetric}
                activeOpacity={0.75}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View canceled ticket holders"
                onPress={() => goToAttendeeList("canceled")}
              >
                <View style={[styles.attendanceStatusIcon, { backgroundColor: "#D44343" }]}>
                  <Feather name="x" size={9} color="#FFFFFF" />
                </View>
                <Text style={styles.attendanceText}>{attendanceSummary.canceled} canceled</Text>
              </TouchableOpacity>
              <View style={styles.attendanceSeparator} />
              <TouchableOpacity
                style={styles.attendanceMetric}
                activeOpacity={0.75}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View no-show ticket holders"
                onPress={() => goToAttendeeList("noShow")}
              >
                <View style={[styles.attendanceStatusIcon, { backgroundColor: "#B3B3B3" }]}>
                  <Feather name="minus" size={9} color="#111111" />
                </View>
                <Text style={styles.attendanceText}>{attendanceSummary.noShow} No show</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Ticket Sales */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ticket Sales</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={goToTicketStats}
            >
              <Text style={[styles.seeAllText, { color: colors.text }]}>See Stat</Text>
              <HugeiconsIcon icon={ArrowRight02Icon} size={14} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Ticket List */}
          <View style={styles.ticketsList}>
            {ticketRows.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tickets configured for this event.</Text>
              </View>
            ) : (
              ticketRows.map((ticket, index) => {
                const isSoldOut = ticket.sold >= ticket.capacity && ticket.capacity > 0;
                const salesEndPassed = ticket.salesEndAt ? new Date(ticket.salesEndAt) < new Date() : false;
                const statusLabel = isSoldOut || salesEndPassed ? "Done" : "Active";
                const soldLabel = `${ticket.sold}/${ticket.capacity}`;

                return (
                  <View key={ticket.id ?? index} style={[styles.ticketCard, { borderColor: colors.border }]}>
                    <View style={styles.ticketHeader}>
                      <Text style={[styles.ticketName, { color: colors.text }]}>{ticket.name}</Text>
                      <View style={styles.ticketPills}>
                        <View style={[styles.pillGrey, { backgroundColor: isSoldOut ? colors.text : colors.card }]}>
                          <Text style={[styles.pillText, { color: isSoldOut ? colors.background : colors.text }]}>
                            {soldLabel}
                          </Text>
                        </View>
                        <View style={[styles.pillGrey, { backgroundColor: colors.card }]}>
                          <Text style={[styles.pillText, { color: colors.text }]}>{statusLabel}</Text>
                        </View>
                      </View>
                    </View>
                    {ticket.description && (
                      <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>{ticket.description}</Text>
                    )}
                    {ticket.salesEndAt && (
                      <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                        Sales end:{" "}
                        {new Date(ticket.salesEndAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    )}
                    <View style={styles.ticketFooter}>
                      <View>
                        <Text style={[styles.ticketPrice, { color: colors.text }]}>
                          {ticket.type === "free" ? "Free" : fmt(ticket.price)}
                        </Text>
                        <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>per ticket</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.ticketSubPrice, { color: colors.textSecondary }]}>Revenue</Text>
                        <Text style={[styles.ticketEarnings, { color: colors.text }]}>
                          {fmt(ticket.price * ticket.sold)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Sales Report Chart */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10, marginBottom: 15 }]}>
            Sales Report
          </Text>
          <View style={[styles.chartSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  {["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"].map((label, i) => (
                    <View key={label} style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${[60, 80, 50, 70, 90, 85][i]}%`, backgroundColor: colors.primary },
                        ]}
                      />
                      <Text style={[styles.xLabel, { color: colors.textSecondary }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold", flex: 1, textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  bannerImage: { width: "100%", height: 160, borderRadius: 12, marginBottom: 20 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  label: { fontSize: 12, marginBottom: 4 },
  largeBalance: { fontSize: 28, fontWeight: "bold" },
  breakdownCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  breakdownTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownSubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownLabel: { fontSize: 13 },
  breakdownLabelBold: { fontSize: 14, fontWeight: "600" },
  breakdownValue: { fontSize: 13, fontWeight: "500" },
  breakdownValueNeg: { fontSize: 13, fontWeight: "500" },
  breakdownValueBold: { fontSize: 16, fontWeight: "bold" },
  breakdownSubLabel: { fontSize: 12 },
  breakdownSubValue: { fontSize: 12 },
  divider: { height: 1 },
  statsContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  statBox: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: "bold" },
  locationContainer: { borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 30 },
  locationTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cityText: { fontSize: 14, fontWeight: "bold" },
  locationDetail: { fontSize: 12, marginBottom: 4 },
  locationDetailLabel: {},
  attendanceScroll: {
    marginTop: -10,
    marginBottom: 20,
  },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 20,
    gap: 6,
    paddingRight: 2,
  },
  attendanceGoingGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 20,
  },
  attendanceAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
  },
  attendanceAvatar: {
    borderWidth: 0,
  },
  attendanceAvatarOverlap: {
    marginLeft: -8,
  },
  attendanceAvatarText: {
    fontSize: 9,
  },
  attendanceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  attendanceSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D9D9D9",
  },
  attendanceMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attendanceStatusIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "bold" },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllText: { fontSize: 12 },
  ticketsList: { gap: 15, marginBottom: 30 },
  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 20, alignItems: "center" },
  emptyText: { fontSize: 13, textAlign: "center" },
  ticketCard: { borderWidth: 1, borderRadius: 12, padding: 15 },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketName: { fontSize: 16, fontWeight: "bold", flex: 1 },
  ticketPills: { flexDirection: "row", gap: 8 },
  pillGrey: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillText: { fontSize: 10, fontWeight: "600" },
  ticketDesc: { fontSize: 12, lineHeight: 18, marginBottom: 8, paddingRight: 20 },
  ticketDate: { fontSize: 11, marginBottom: 15 },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 10,
  },
  ticketPrice: { fontSize: 20, fontWeight: "bold" },
  ticketSubPrice: { fontSize: 10, marginTop: 2 },
  ticketEarnings: { fontSize: 16, fontWeight: "bold" },
  chartSection: { borderRadius: 16, padding: 20, borderWidth: 1, marginBottom: 30 },
  chartArea: { flexDirection: "row", height: 180 },
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
  barWrapper: { alignItems: "center", width: 28, height: "100%", justifyContent: "flex-end" },
  bar: { width: 8, borderRadius: 4, marginBottom: 10 },
  xLabel: { fontSize: 9 },
});
