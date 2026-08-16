import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getParticipatedEvents, type ParticipatedEvent, type ParticipatedWindow } from "@/lib/eventWindows";
import { getStorageFileUrl } from "@/lib/storage";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_COLORS = {
  scheduled: "#3B82F6",
  open: "#16A34A",
  closed: "#71717A",
  cancelled: "#DC2626",
} as const;

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
};

const formatWindowRange = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const startDate = formatDate(startsAt);
  return sameDay
    ? `${startDate} · ${formatTime(startsAt)} - ${formatTime(endsAt)}`
    : `${startDate}, ${formatTime(startsAt)} - ${formatDate(endsAt)}, ${formatTime(endsAt)}`;
};

// Participated-only by construction: this screen only ever renders
// event.participatedWindows, which the backend already restricted to
// Windows where the current user has an accepted post — it never fetches
// or displays the event's full Window list (see AttendeeEventWindowsTab /
// HostEventWindowsTab for that, unmodified and unrelated to this screen).
export default function ParticipatedWindowsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ eventId: string; event?: string }>();
  const [event, setEvent] = useState<ParticipatedEvent | null>(() => {
    if (!params.event) return null;
    try {
      return JSON.parse(params.event) as ParticipatedEvent;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!event);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (event) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    getParticipatedEvents()
      .then((events) => {
        if (cancelled) return;
        const match = events.find((candidate) => candidate.id === params.eventId);
        if (match) {
          setEvent(match);
        } else {
          setLoadError("This event's participated Windows are no longer available.");
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getAuthErrorMessage(error, "Unable to load this event's Windows."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [event, params.eventId]);

  const openWindow = (window: ParticipatedWindow) => {
    if (!window.canViewPosts) {
      Alert.alert("Locked", "Available after the event ends.");
      return;
    }

    router.push({
      pathname: "/event-screen/window-gallery",
      params: { eventId: params.eventId, windowId: window.id, title: window.title ?? "" },
    });
  };

  const imageUri = event?.bannerImageKey ? getStorageFileUrl(event.bannerImageKey) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {event?.name || "Participated Windows"}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : loadError || !event ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError ?? "Event not found."}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.banner} contentFit="cover" /> : null}
          {formatDate(event.scheduledAt) ? (
            <Text style={[styles.eventDate, { color: colors.textSecondary }]}>{formatDate(event.scheduledAt)}</Text>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {event.participatedWindows.length} participated {event.participatedWindows.length === 1 ? "Window" : "Windows"}
          </Text>

          {event.participatedWindows.map((window) => {
            const statusColor = STATUS_COLORS[window.computedStatus];
            const locked = !window.canViewPosts;

            return (
              <TouchableOpacity
                key={window.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openWindow(window)}
                activeOpacity={0.85}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {window.title?.trim() || "Untitled window"}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {window.computedStatus[0].toUpperCase() + window.computedStatus.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                  {formatWindowRange(window.startsAt, window.endsAt)}
                </Text>
                <View style={styles.cardFooter}>
                  <Feather name={locked ? "lock" : "unlock"} size={14} color={locked ? colors.textSecondary : colors.success} />
                  <Text style={[styles.cardFooterText, { color: locked ? colors.textSecondary : colors.success }]}>
                    {locked ? "Available after the event ends" : "Tap to view"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { alignItems: "center", borderRadius: 10, height: 36, justifyContent: "center", width: 36 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", marginHorizontal: 8 },
  headerPlaceholder: { width: 36 },
  loading: { marginVertical: 48 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 30, gap: 10 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  content: { padding: 20, paddingBottom: 60 },
  banner: { width: "100%", aspectRatio: 16 / 9, borderRadius: 10, marginBottom: 12 },
  eventDate: { fontSize: 13, marginBottom: 18 },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 10 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  statusBadge: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  timeText: { fontSize: 12.5, marginTop: 8 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  cardFooterText: { fontSize: 12.5, fontWeight: "600" },
});
