import EventFeedCard from "@/components/home/EventFeedCard";
import { isEventCategory } from "@/constants/eventCategories";
import { useTheme } from "@/hooks/useTheme";
import { getFeedEvents, type EventResponse } from "@/lib/events";
import { safeBack } from "@/lib/navigation";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EventCategoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  const categoryParam = typeof params.category === "string" ? params.category : "";
  const category = isEventCategory(categoryParam) ? categoryParam : null;
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!category) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    try {
      setEvents(await getFeedEvents({ category }));
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadEvents();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => safeBack(router, '/(tabs)/explore')} style={[styles.backButton, { backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {category ?? "Events"}
        </Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>
            {category ? `No events found for ${category}.` : "No events found."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
        >
          {events.map((event) => (
            <EventFeedCard key={event.id} event={event} />
          ))}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 12,
    textAlign: "center",
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  listContent: {
    paddingTop: 16,
  },
  bottomSpace: {
    height: 40,
  },
});
