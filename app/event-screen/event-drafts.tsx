import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
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
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { deleteEvent, getMyDraftEvents, type EventResponse } from "@/lib/events";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";

const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop";

const getBannerUri = (event: EventResponse) => {
  const key = event.bannerImageKey ?? event.bannerOriginalImageKey;
  if (!key) return DEFAULT_BANNER;
  try {
    return getStorageFileUrl(key);
  } catch {
    return DEFAULT_BANNER;
  }
};

const formatDraftDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

type DraftCardProps = {
  event: EventResponse;
  colors: Record<string, string>;
  onResume: () => void;
  onDiscard: () => void;
  isDiscarding: boolean;
};

const DraftCard = ({ event, colors, onResume, onDiscard, isDiscarding }: DraftCardProps) => (
  <TouchableOpacity
    style={[styles.card, { backgroundColor: colors.card }]}
    activeOpacity={0.75}
    onPress={onResume}
    onLongPress={onDiscard}
  >
    <Image source={{ uri: getBannerUri(event) }} style={styles.cardImage} contentFit="cover" />
    <View style={styles.cardContent}>
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
        {event.name?.trim() || "Untitled Draft"}
      </Text>
      <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
        {event.description?.trim() || "No description yet"}
      </Text>
      <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
        {formatDraftDate(event.updatedAt)}
      </Text>
    </View>
    {isDiscarding ? (
      <ActivityIndicator size="small" color={colors.textSecondary} style={styles.arrowContainer} />
    ) : (
      <View style={styles.arrowContainer}>
        <HugeiconsIcon icon={ArrowRight01Icon} size={20} color={colors.textSecondary} />
      </View>
    )}
  </TouchableOpacity>
);

export default function EventDraftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const loadFromEvent = useEventDraftStore((state) => state.loadFromEvent);
  const resetDraft = useEventDraftStore((state) => state.resetDraft);
  const lastPublishedDraftId = useEventDraftStore((state) => state.lastPublishedDraftId);
  const clearLastPublishedDraftId = useEventDraftStore((state) => state.clearLastPublishedDraftId);
  const user = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [drafts, setDrafts] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMyDraftEvents();
      setDrafts(data);
    } catch {
      Alert.alert("Unable to load drafts", "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (lastPublishedDraftId) {
        setDrafts((prev) => prev.filter((d) => d.id !== lastPublishedDraftId));
        clearLastPublishedDraftId();
      }
      void loadDrafts();
    }, [loadDrafts, lastPublishedDraftId, clearLastPublishedDraftId]),
  );

  const handleResume = (event: EventResponse) => {
    requireBusinessAccountForEvent({
      user,
      completedProfileTypes,
      updateProfile,
      router,
      onReady: () => {
        resetDraft();
        loadFromEvent(event);
        router.push("/create-event");
      },
    });
  };

  const handleDiscard = (event: EventResponse) => {
    Alert.alert(
      "Discard Draft",
      `"${event.name?.trim() || "Untitled Draft"}" will be permanently deleted. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            setDiscardingId(event.id);
            try {
              await deleteEvent(event.id);
              setDrafts((prev) => prev.filter((d) => d.id !== event.id));
            } catch (error) {
              Alert.alert("Unable to discard draft", getAuthErrorMessage(error, "Please try again."));
            } finally {
              setDiscardingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 10 }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <BackButton color={colors.text} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Drafts</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : drafts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No drafts yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Events you save as drafts will appear here
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() =>
              requireBusinessAccountForEvent({
                user,
                completedProfileTypes,
                updateProfile,
                router,
                onReady: () => router.push("/create-event"),
              })
            }
          >
            <Text style={[styles.createBtnText, { color: colors.background }]}>Create Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Tap to resume · Long press to discard
          </Text>
          {drafts.map((event) => (
            <DraftCard
              key={event.id}
              event={event}
              colors={colors}
              onResume={() => handleResume(event)}
              onDiscard={() => handleDiscard(event)}
              isDiscarding={discardingId === event.id}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  createBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 12,
  },
  hintText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    overflow: "hidden",
  },
  cardImage: {
    width: 80,
    height: 54,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 12,
  },
  cardDate: {
    fontSize: 11,
    marginTop: 2,
  },
  arrowContainer: {
    paddingLeft: 8,
  },
});
