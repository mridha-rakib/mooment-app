import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, type RefreshControlProps } from "react-native";

import EventFeedCard from "@/components/home/EventFeedCard";
import { useTheme } from "@/hooks/useTheme";
import type { EventResponse, ProfileEventGroups } from "@/lib/events";

type ProfileEventsProps = {
  isOwnProfile?: boolean;
  profileUserId: string;
  profileIsFollowing?: boolean;
  events: ProfileEventGroups;
  onEventsChange?: (events: ProfileEventGroups) => void;
  listHeaderComponent?: React.ReactElement;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  onLoadMore?: (filter: "active" | "past") => void;
  isLoadingMore?: boolean;
};

const dedupeEvents = (events: EventResponse[]): EventResponse[] => {
  const eventById = new Map<string, EventResponse>();

  for (const event of events) {
    if (!eventById.has(event.id)) {
      eventById.set(event.id, event);
    }
  }

  return [...eventById.values()];
};

export default function ProfileEvents({
  events,
  onEventsChange,
  listHeaderComponent,
  refreshControl,
  onLoadMore,
  isLoadingMore = false,
}: ProfileEventsProps) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<"active" | "past">("active");
  const visibleEvents = useMemo(
    () => dedupeEvents(events[filter]),
    [events, filter],
  );

  const handleEventCancelled = (eventId: string) => {
    onEventsChange?.({
      active: events.active.filter((event) => event.id !== eventId),
      past: events.past.filter((event) => event.id !== eventId),
    });
  };

  const header = (
    <>
      {listHeaderComponent}
      <View style={styles.toggleWrapper}>
        <BlurView intensity={20} tint="dark" style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, filter === "active" && styles.toggleBtnActive]}
            onPress={() => setFilter("active")}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Feather name="zap" size={14} color={filter === "active" ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"} />
              <Text style={[styles.toggleText, filter === "active" && styles.toggleTextActive]}>Active Events</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, filter === "past" && styles.toggleBtnActive]}
            onPress={() => setFilter("past")}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Feather name="clock" size={14} color={filter === "past" ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"} />
              <Text style={[styles.toggleText, filter === "past" && styles.toggleTextActive]}>Past Events</Text>
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>
    </>
  );

  return (
    <FlatList
      data={visibleEvents}
      keyExtractor={(event) => event.id}
      ListHeaderComponent={header}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      onEndReachedThreshold={0.5}
      onEndReached={() => onLoadMore?.(filter)}
      renderItem={({ item }) => (
        <EventFeedCard
          event={item}
          onEventCancelled={handleEventCancelled}
        />
      )}
      ListEmptyComponent={(
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === "active" ? "No active events yet" : "No past events yet"}
            </Text>
          </View>
      )}
      ListFooterComponent={isLoadingMore ? (
        <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} />
      ) : <View style={{ height: 100 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
  },
  toggleWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(104, 104, 104, 0.1)",
    padding: 4,
    height: 40,
    alignItems: "center",
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  toggleInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(104, 104, 104, 0.4)",
  },
  toggleText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  list: {
    marginTop: 18,
  },
  listContent: {
    paddingTop: 15,
  },
  emptyContainer: {
    padding: 50,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
