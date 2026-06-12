import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getEventTicket, type EventResponse, type EventTicketPayload } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400";

const resolveStorageUrl = (key?: string | null, fallback = DEFAULT_BANNER) => {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};

const formatPrice = (ticket?: EventTicketPayload | null) => {
  if (!ticket || ticket.type === "free" || ticket.price <= 0) {
    return "Free";
  }

  return `£${ticket.price.toLocaleString("en-GB", {
    minimumFractionDigits: Number.isInteger(ticket.price) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(ticket.price) ? 0 : 2,
  })}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Date TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });

  return `${dateLabel} • ${timeLabel}`;
};

const getHostHandle = (event?: EventResponse | null) => {
  const handle = event?.host?.username?.trim().replace(/^@+/, "");

  return handle ? `@${handle}` : "";
};

const TicketDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; ticketId?: string; mode?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const loadEventForEdit = useEventDraftStore((state) => state.loadFromEvent);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const eventId = typeof params.eventId === "string" ? params.eventId : null;
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : null;
  const isHostMode = params.mode === "host" || Boolean(event && currentUser?.id === event.userId);

  const ticket = useMemo(() => {
    if (!event) {
      return null;
    }

    return event.tickets.find((item) => item.id === ticketId) ?? null;
  }, [event, ticketId]);

  const bannerImageUri = resolveStorageUrl(event?.bannerOriginalImageKey ?? event?.bannerImageKey, DEFAULT_BANNER);
  const hostAvatarUri = resolveStorageUrl(event?.host?.avatarUrl ?? event?.host?.avatarKey, DEFAULT_AVATAR);
  const hostHandle = getHostHandle(event);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadTicket = async () => {
        if (!eventId || !ticketId) {
          setErrorMessage("Ticket details are unavailable.");
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
          const loadedEvent = await getEventTicket(eventId, ticketId);

          if (!isActive) {
            return;
          }

          setEvent(loadedEvent);
        } catch (error) {
          if (!isActive) {
            return;
          }

          setErrorMessage(getAuthErrorMessage(error, "Unable to load ticket details."));
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadTicket();

      return () => {
        isActive = false;
      };
    }, [eventId, ticketId]),
  );

  const handleEditTicket = () => {
    if (!event || !ticket || !isHostMode) {
      return;
    }

    loadEventForEdit(event);

    const draftTicket = useEventDraftStore
      .getState()
      .tickets.find((item) => item.id === ticket.id);

    if (!draftTicket) {
      Alert.alert("Unable to edit ticket", "Please try again.");
      return;
    }

    router.push({
      pathname: "/create-event/ticket-details",
      params: { localId: draftTicket.localId },
    });
  };

  const details = [
    { label: "Ticket", value: ticket?.name ?? "Ticket unavailable" },
    { label: "Available", value: `${ticket?.capacity ?? 0} left` },
    { label: "Price", value: formatPrice(ticket) },
    { label: "Sales end", value: formatDateTime(ticket?.salesEndAt) },
    { label: "Event", value: event?.name ?? "Event unavailable" },
    { label: "Date and time", value: formatDateTime(event?.scheduledAt) },
    { label: "Venue", value: event?.location?.venue ?? "Venue TBA" },
    { label: "Address", value: event?.location?.address ?? event?.location?.searchLabel ?? "Address TBA" },
  ];

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorMessage || !event || !ticket) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <BackButton color={colors.text} onPress={() => router.back()} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ticket not found</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {errorMessage ?? "This ticket is no longer available."}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (isHostMode ? 104 : 160) }}
      >
        <View style={styles.hero}>
          <Image source={{ uri: bannerImageUri }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.72)", colors.background]}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
            <BackButton color="#FFFFFF" onPress={() => router.back()} />
            <Text style={styles.headerTitle}>Ticket Detail</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroContent}>
            {!!event.category && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{event.category}</Text>
              </View>
            )}

            <View style={styles.hostRow}>
              <Image source={{ uri: hostAvatarUri }} style={styles.hostAvatar} contentFit="cover" />
              <View style={styles.hostTextBlock}>
                <Text style={styles.hostName} numberOfLines={1}>
                  {event.host?.name ?? "Host"}
                </Text>
                {!!hostHandle && <Text style={styles.hostHandle}>{hostHandle}</Text>}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
                  {ticket.name}
                </Text>
                <Text style={[styles.eventLocation, { color: colors.textSecondary }]} numberOfLines={2}>
                  {ticket.description || "Ticket details provided by the event organizer."}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + "1A" }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.priceValue, { color: colors.text }]}>{formatPrice(ticket)}</Text>
              {ticket.type !== "free" && ticket.price > 0 && (
                <Text style={[styles.priceCaption, { color: colors.textSecondary }]}>per ticket</Text>
              )}
            </View>

            <View style={styles.detailsList}>
              {details.map((item, index) => (
                <View key={item.label}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                      {item.value}
                    </Text>
                  </View>
                  {index < details.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background + "F2" }]}>
        {isHostMode ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleEditTicket}>
            <Feather name="edit-2" size={18} color={colors.background} />
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>Edit Ticket</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push({ pathname: "/event-screen/qr-code", params: { type: "event" } })}
            >
              <Text style={[styles.primaryBtnText, { color: colors.background }]}>Show QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.danger + "1A", borderColor: colors.danger + "1A" }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Cancel ticket</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

export default TicketDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  hero: {
    height: 340,
    width: "100%",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  heroContent: {
    bottom: 22,
    left: 16,
    position: "absolute",
    right: 16,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  hostRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  hostAvatar: {
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    width: 44,
  },
  hostTextBlock: {
    flex: 1,
  },
  hostName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  hostHandle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    marginTop: -24,
    paddingHorizontal: 16,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cardTitleBlock: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  eventLocation: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  priceValue: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  priceCaption: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 5,
  },
  detailsList: {
    gap: 10,
  },
  detailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 20,
    width: 104,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  footer: {
    bottom: 0,
    gap: 12,
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0,
  },
  primaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    height: 56,
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
