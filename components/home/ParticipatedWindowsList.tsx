import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getParticipatedEvents, type ParticipatedEvent } from "@/lib/eventWindows";
import { getStorageFileUrl } from "@/lib/storage";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

// The Home "Windows" tab is a personal navigation/history surface, not a
// live feed — a focus-refresh (covers new participation and returning from
// a Window) is enough. It deliberately does not poll on an interval the way
// AttendeeEventWindowsTab does for a single event's live window state.
function ParticipatedWindowsList() {
  const { colors } = useTheme();
  const router = useRouter();
  const [events, setEvents] = useState<ParticipatedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setLoadError(null);
    try {
      setEvents(await getParticipatedEvents());
    } catch (error) {
      setLoadError(getAuthErrorMessage(error, "Unable to load your participated Windows."));
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Full skeleton only on the very first focus; a silent background
      // refresh on every subsequent focus (covers new participation and
      // returning from a Window's gallery) without re-blanking the list.
      void load(!hasLoadedOnceRef.current);
      hasLoadedOnceRef.current = true;
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const openEvent = (event: ParticipatedEvent) => {
    router.push({
      pathname: "/event-screen/participated-windows",
      params: { eventId: event.id, event: JSON.stringify(event) },
    });
  };

  if (isLoading) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  if (loadError) {
    return (
      <View style={styles.emptyState}>
        <Feather name="alert-circle" size={28} color={colors.danger} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Windows unavailable</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError}</Text>
        <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void load()}>
          <Feather name="refresh-cw" size={16} color={colors.text} />
          <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={[styles.emptyState, { borderColor: colors.border }]}>
        <Feather name="clock" size={30} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No participated Windows yet.</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          Events will appear here after you post in one of their Windows.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} />}
    >
      {events.map((event) => {
        const imageUri = event.bannerImageKey ? getStorageFileUrl(event.bannerImageKey) : null;
        const dateLabel = formatDate(event.scheduledAt);
        const windowCount = event.participatedWindows.length;

        return (
          <TouchableOpacity
            key={event.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => openEvent(event)}
            activeOpacity={0.85}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
            ) : (
              <View style={[styles.cardImage, styles.cardImageFallback, { backgroundColor: colors.background }]}>
                <Feather name="calendar" size={22} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{event.name || "Untitled event"}</Text>
              {dateLabel ? <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{dateLabel}</Text> : null}
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                {windowCount} participated {windowCount === 1 ? "Window" : "Windows"}
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default React.memo(ParticipatedWindowsList);

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  loading: { marginVertical: 48 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 12 },
  cardImage: { width: 56, height: 56, borderRadius: 8 },
  cardImageFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  cardMeta: { fontSize: 12.5 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 30, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4, textAlign: "center" },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 290 },
  retryButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 6 },
  retryText: { fontSize: 14, fontWeight: "600" },
});
