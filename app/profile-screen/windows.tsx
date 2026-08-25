import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import { getUserProfileWindowEvents, type ProfileWindowEventResponse } from "@/lib/users";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 20;

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

export default function ProfileWindowsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const userId = params.userId;
  const [events, setEvents] = useState<ProfileWindowEventResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!userId) {
      setLoadError("Profile unavailable.");
      setIsLoading(false);
      return;
    }

    if (append) setIsLoadingMore(true); else setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getUserProfileWindowEvents(userId, { page: nextPage, limit: PAGE_SIZE });
      setEvents((current) => (append ? [...current, ...result.events] : result.events));
      setPage(nextPage);
      setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
    } catch (error) {
      setLoadError(getAuthErrorMessage(error, "Unable to load Profile Windows."));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const openEvent = (event: ProfileWindowEventResponse) => {
    if (!userId) return;
    router.push({
      pathname: "/profile-screen/window-posts" as never,
      params: { userId, eventId: event.id, title: event.name },
    });
  };

  const renderEvent = ({ item }: { item: ProfileWindowEventResponse }) => {
    const imageUri = item.bannerImageKey ? getStorageFileUrl(item.bannerImageKey) : null;
    const dateLabel = formatDate(item.scheduledAt);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.85}
        onPress={() => openEvent(item)}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback, { backgroundColor: colors.background }]}>
            <Feather name="calendar" size={22} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.name || "Untitled event"}
          </Text>
          {dateLabel ? <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{dateLabel}</Text> : null}
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {item.windowCount} {item.windowCount === 1 ? "Window" : "Windows"}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={18} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Windows</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Windows unavailable</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void load()}>
            <Feather name="refresh-cw" size={16} color={colors.text} />
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={events.length === 0 ? styles.emptyListContent : styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!hasMore || isLoadingMore) return;
            void load(page + 1, true);
          }}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Feather name="clock" size={30} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Window activity yet.</Text>
            </View>
          )}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  loading: { marginVertical: 48 },
  listContent: { padding: 20, paddingBottom: 100 },
  emptyListContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30 },
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
  footerLoader: { paddingVertical: 18 },
});
