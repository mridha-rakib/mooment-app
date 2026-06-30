import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCategoryColor } from "@/constants/categoryColors";
import { getNowModeEvents, type NowEventStatus, type NowModeEventResponse } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  cardBorder: "rgba(255,255,255,0.06)",
  primary: "#B2ABBA",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  liveGreen: "#0DC143",
  liveGreenBg: "rgba(20,37,22,0.88)",
  startingSoonColor: "#F59E0B",
  startingSoonBg: "rgba(40,32,10,0.88)",
  lastCallColor: "#EF4444",
  lastCallBg: "rgba(40,10,10,0.88)",
};

const RADIUS_OPTIONS = [
  { label: "1 mi", km: 1.609 },
  { label: "3 mi", km: 4.828 },
  { label: "5 mi", km: 8.047 },
  { label: "10 mi", km: 16.093 },
  { label: "20 mi", km: 32.187 },
];

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "live_now", label: "Live Now" },
  { key: "starting_soon", label: "Starting Soon" },
  { key: "last_call", label: "Last Call" },
] as const;

type StatusFilter = "all" | NowEventStatus;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop";

const MILES_PER_KM = 0.621371;

const toRadians = (v: number) => (v * Math.PI) / 180;

const getDistanceMiles = (
  from: [number, number],
  to: [number, number],
): number => {
  const R = 6371;
  const dLat = toRadians(to[1] - from[1]);
  const dLon = toRadians(to[0] - from[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from[1])) *
      Math.cos(toRadians(to[1])) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * MILES_PER_KM;
};

const formatDistance = (
  userLoc: [number, number] | null,
  eventLoc: [number, number],
): string => {
  if (!userLoc) return "nearby";
  const mi = getDistanceMiles(userLoc, eventLoc);
  if (mi < 0.1) return "< 0.1 mi";
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
};

const formatEventDate = (scheduledAt?: string | null): string => {
  if (!scheduledAt) return "Date TBA";
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
};

const formatEventTime = (scheduledAt?: string | null): string => {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
};

const getStatusConfig = (
  status: NowEventStatus,
): { label: string; color: string; bg: string } => {
  if (status === "live_now") {
    return { label: "Live Now", color: COLORS.liveGreen, bg: COLORS.liveGreenBg };
  }
  if (status === "starting_soon") {
    return { label: "Starting Soon", color: COLORS.startingSoonColor, bg: COLORS.startingSoonBg };
  }
  return { label: "Last Call", color: COLORS.lastCallColor, bg: COLORS.lastCallBg };
};

const getHostName = (event: NowModeEventResponse): string =>
  (event.host?.username || event.host?.name || `user-${event.userId.slice(-4)}`).replace(/^@/, "");

const formatPrice = (event: NowModeEventResponse): string => {
  const prices = event.tickets
    .map((t) => (t.type === "free" ? 0 : t.price))
    .filter((p) => Number.isFinite(p));

  if (prices.length === 0 || Math.min(...prices) <= 0) return "Free";
  const price = Math.min(...prices);
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const getBannerUri = (event: NowModeEventResponse): string => {
  if (!event.bannerImageKey) return FALLBACK_IMAGE;
  try {
    return getStorageFileUrl(event.bannerImageKey);
  } catch {
    return FALLBACK_IMAGE;
  }
};

const getHostAvatarUri = (event: NowModeEventResponse): string | null => {
  if (!event.host?.avatarUrl) return null;
  return event.host.avatarUrl;
};

type EventCardProps = {
  event: NowModeEventResponse;
  userLocation: [number, number] | null;
  onViewEvent: (eventId: string) => void;
};

const EventCard = ({ event, userLocation, onViewEvent }: EventCardProps) => {
  const statusConfig = getStatusConfig(event.nowStatus);
  const categoryColor = getCategoryColor(event.category ?? null);

  const lat = event.location?.latitude;
  const lon = event.location?.longitude;
  const eventLoc: [number, number] | null =
    typeof lat === "number" && typeof lon === "number" ? [lon, lat] : null;

  const distance = eventLoc ? formatDistance(userLocation, eventLoc) : "nearby";
  const hostAvatarUri = getHostAvatarUri(event);
  const hostName = getHostName(event);

  return (
    <View style={styles.card}>
      {/* Banner image with status badge */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getBannerUri(event) }}
          style={styles.bannerImage}
          contentFit="cover"
        />
        <View style={styles.imageOverlay} />

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Price badge */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{formatPrice(event)}</Text>
        </View>
      </View>

      {/* Event info */}
      <View style={styles.cardBody}>
        {/* Host row */}
        <View style={styles.hostRow}>
          <View style={styles.hostLeft}>
            {hostAvatarUri ? (
              <Image source={{ uri: hostAvatarUri }} style={styles.hostAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                <Feather name="user" size={14} color={COLORS.textMuted} />
              </View>
            )}
            <Text style={styles.hostName} numberOfLines={1}>
              {hostName}
            </Text>
          </View>
          {event.category ? (
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}22`, borderColor: `${categoryColor}44` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]} numberOfLines={1}>
                {event.category}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Event name */}
        <Text style={styles.eventName} numberOfLines={2}>
          {event.name ?? "Untitled Event"}
        </Text>

        {/* Date / time / distance */}
        <View style={styles.metaRow}>
          <Feather name="calendar" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{formatEventDate(event.scheduledAt)}</Text>
          {formatEventTime(event.scheduledAt) ? (
            <>
              <View style={styles.metaDot} />
              <Feather name="clock" size={12} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{formatEventTime(event.scheduledAt)}</Text>
            </>
          ) : null}
          <View style={styles.metaDot} />
          <Feather name="map-pin" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{distance}</Text>
        </View>

        {/* View button */}
        <TouchableOpacity
          style={styles.viewBtn}
          activeOpacity={0.8}
          onPress={() => onViewEvent(event.id)}
        >
          <Text style={styles.viewBtnText}>View Event</Text>
          <Feather name="arrow-right" size={14} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

type NowModeScreenProps = {
  onBack: () => void;
};

export default function NowModeScreen({ onBack }: NowModeScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<NowModeEventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedRadiusIndex, setSelectedRadiusIndex] = useState(2); // default 5 mi
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const locationRef = useRef<[number, number] | null>(null);

  const loadEvents = useCallback(
    async (loc: [number, number] | null, radiusKm: number) => {
      try {
        const params = loc
          ? { latitude: loc[1], longitude: loc[0], radiusKm, limit: 100 }
          : { limit: 100 };

        const result = await getNowModeEvents(params);

        setEvents(result);
      } catch {
        setEvents([]);
      }
    },
    [],
  );

  useEffect(() => {
    let isActive = true;

    const init = async () => {
      setIsLoading(true);

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (!isActive) return;

          const loc: [number, number] = [pos.coords.longitude, pos.coords.latitude];

          locationRef.current = loc;
          setUserLocation(loc);
          await loadEvents(loc, RADIUS_OPTIONS[selectedRadiusIndex].km);
        } else {
          await loadEvents(null, RADIUS_OPTIONS[selectedRadiusIndex].km);
        }
      } catch {
        if (isActive) {
          await loadEvents(null, RADIUS_OPTIONS[selectedRadiusIndex].km);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRadiusChange = async (index: number) => {
    setSelectedRadiusIndex(index);
    setIsLoading(true);

    try {
      await loadEvents(locationRef.current, RADIUS_OPTIONS[index].km);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEvents(locationRef.current, RADIUS_OPTIONS[selectedRadiusIndex].km);
    setIsRefreshing(false);
  };

  const handleViewEvent = (eventId: string) => {
    router.push({ pathname: "/event-screen/event", params: { id: eventId } });
  };

  const filteredEvents =
    statusFilter === "all"
      ? events
      : events.filter((e) => e.nowStatus === statusFilter);

  const liveCount = events.filter((e) => e.nowStatus === "live_now").length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.liveIndicator} />
          <Text style={styles.headerTitle}>Now</Text>
          {liveCount > 0 ? (
            <View style={styles.liveCountBadge}>
              <Text style={styles.liveCountText}>{liveCount}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Radius selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radiusRow}
      >
        {RADIUS_OPTIONS.map((opt, index) => (
          <TouchableOpacity
            key={opt.label}
            style={[styles.radiusPill, selectedRadiusIndex === index && styles.radiusPillActive]}
            onPress={() => void handleRadiusChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.radiusPillText,
                selectedRadiusIndex === index && styles.radiusPillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, statusFilter === f.key && styles.filterTabActive]}
            onPress={() => setStatusFilter(f.key as StatusFilter)}
            activeOpacity={0.7}
          >
            {f.key === "live_now" && (
              <View style={[styles.filterDot, { backgroundColor: COLORS.liveGreen }]} />
            )}
            {f.key === "starting_soon" && (
              <View style={[styles.filterDot, { backgroundColor: COLORS.startingSoonColor }]} />
            )}
            {f.key === "last_call" && (
              <View style={[styles.filterDot, { backgroundColor: COLORS.lastCallColor }]} />
            )}
            <Text
              style={[styles.filterTabText, statusFilter === f.key && styles.filterTabTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.stateText}>Finding events near you…</Text>
        </View>
      ) : filteredEvents.length === 0 ? (
        <View style={styles.stateContainer}>
          <Feather name="radio" size={36} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Nothing happening right now</Text>
          <Text style={styles.stateText}>
            {statusFilter === "all"
              ? "Try expanding the radius or check back soon."
              : "No events with this status nearby."}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={COLORS.primary}
            />
          }
        >
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              userLocation={userLocation}
              onViewEvent={handleViewEvent}
            />
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.liveGreen,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  liveCountBadge: {
    backgroundColor: COLORS.liveGreen,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  liveCountText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
  },
  radiusRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    flexDirection: "row",
  },
  radiusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  radiusPillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: COLORS.primary,
  },
  radiusPillText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  radiusPillTextActive: {
    color: "#000",
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    flexDirection: "row",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  filterTabActive: {
    backgroundColor: "rgba(178,171,186,0.15)",
    borderColor: COLORS.primary,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterTabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: COLORS.text,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  stateText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
    height: 200,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,5,15,0.35)",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priceBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
    gap: 10,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hostLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  hostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  hostAvatarFallback: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  hostName: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 130,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  eventName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "bold",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 2,
  },
  viewBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
});
