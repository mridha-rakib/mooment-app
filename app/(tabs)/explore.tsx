import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { createRealtimeSocket } from "@/lib/realtime";
import {
  getNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/lib/notifications";
import { followUser, unfollowUser } from "@/lib/users";

const isToday = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} hr ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
};

export default function Explore() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuthStore();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());

  const socketRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      // silently ignore load errors
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadNotifications().finally(() => setIsLoading(false));
  }, [loadNotifications]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!accessToken) return;

    const socket = createRealtimeSocket({
      accessToken,
      onNotification: (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      },
    });

    socketRef.current = socket;

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [accessToken]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  }, [loadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silently ignore
    }
  }, []);

  const handleFollow = useCallback(async (actorId: string) => {
    if (followLoadingIds.has(actorId)) return;

    setFollowLoadingIds((prev) => new Set(prev).add(actorId));

    try {
      if (followingIds.has(actorId)) {
        await unfollowUser(actorId);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(actorId);
          return next;
        });
      } else {
        await followUser(actorId);
        setFollowingIds((prev) => new Set(prev).add(actorId));
      }
    } catch {
      // silently ignore
    } finally {
      setFollowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(actorId);
        return next;
      });
    }
  }, [followingIds, followLoadingIds]);

  const todayNotifications = notifications.filter((n) => isToday(n.createdAt));
  const earlierNotifications = notifications.filter((n) => !isToday(n.createdAt));
  const hasAnyNotification = notifications.length > 0;
  const hasUnread = notifications.some((n) => !n.isRead);

  const renderFollowCard = (item: NotificationItem) => {
    const actorId = item.actorId ?? "";
    const isFollowing = followingIds.has(actorId);
    const isLoadingFollow = followLoadingIds.has(actorId);

    return (
      <View
        key={item.id}
        style={[
          styles.activityCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          !item.isRead && styles.unreadCard,
        ]}
      >
        <TouchableOpacity
          style={styles.cardContent}
          activeOpacity={0.7}
          onPress={() => router.push("/profile-screen/user-profile")}
        >
          {item.actorAvatarUrl ? (
            <Image source={{ uri: item.actorAvatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
              <Feather name="user" size={20} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.mainText, { color: colors.textSecondary }]}>
              <Text style={[styles.boldText, { color: colors.text }]}>
                {item.actorUsername ? `@${item.actorUsername}` : (item.actorName ?? "Someone")}
              </Text>{" "}
              started following you
            </Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        {actorId ? (
          <TouchableOpacity
            style={[
              styles.followBtn,
              isFollowing
                ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }
                : { backgroundColor: colors.primary },
            ]}
            activeOpacity={0.8}
            onPress={() => handleFollow(actorId)}
            disabled={isLoadingFollow}
          >
            {isLoadingFollow ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.background} />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  { color: isFollowing ? colors.text : colors.background },
                ]}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderTicketCard = (item: NotificationItem) => {
    const isCreatorNotif = item.type === "ticket_creator";

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.activityCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          !item.isRead && styles.unreadCard,
        ]}
        activeOpacity={0.7}
        onPress={() => item.eventId && router.push({ pathname: "/event-screen/event", params: { eventId: item.eventId } })}
      >
        <View style={styles.cardContent}>
          <View
            style={[
              styles.ticketIconContainer,
              {
                backgroundColor: isDark
                  ? "rgba(212, 176, 235, 0.1)"
                  : "rgba(212, 176, 235, 0.2)",
              },
            ]}
          >
            <Ionicons name="ticket" size={20} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            {isCreatorNotif ? (
              <Text style={[styles.mainText, { color: colors.textSecondary }]} numberOfLines={2}>
                <Text style={[styles.boldText, { color: colors.text }]}>
                  {item.actorUsername ? `@${item.actorUsername}` : (item.actorName ?? "Someone")}
                </Text>{" "}
                purchased a ticket for{" "}
                <Text style={[styles.boldText, { color: colors.text }]}>
                  {item.eventName ?? "your event"}
                </Text>
              </Text>
            ) : (
              <Text style={[styles.mainText, { color: colors.textSecondary }]} numberOfLines={2}>
                Ticket confirmed for{" "}
                <Text style={[styles.boldText, { color: colors.text }]}>
                  {item.eventName ?? "your event"}
                </Text>
              </Text>
            )}
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderTicketShareCard = (item: NotificationItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.activityCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        !item.isRead && styles.unreadCard,
      ]}
      activeOpacity={0.7}
      onPress={() => item.eventId && router.push({ pathname: "/event-screen/event", params: { eventId: item.eventId } })}
    >
      <View style={styles.cardContent}>
        {item.actorAvatarUrl ? (
          <Image source={{ uri: item.actorAvatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
            <Feather name="user" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.mainText, { color: colors.textSecondary }]} numberOfLines={2}>
            <Text style={[styles.boldText, { color: colors.text }]}>
              {item.actorUsername ? `@${item.actorUsername}` : (item.actorName ?? "Someone")}
            </Text>{" "}
            shared a ticket with you
            {item.eventName ? (
              <>
                {" "}for{" "}
                <Text style={[styles.boldText, { color: colors.text }]}>{item.eventName}</Text>
              </>
            ) : null}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderItem = (item: NotificationItem) => {
    if (item.type === "follow") return renderFollowCard(item);
    if (item.type === "ticket_share") return renderTicketShareCard(item);
    return renderTicketCard(item);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAnyNotification) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitleCentered, { color: colors.text }]}>Activity</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.card }]}>
              <Feather name="star" size={32} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Activity yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Likes, comments, follows, tickets and rewards will show up here
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {todayNotifications.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Today</Text>
            {todayNotifications.map(renderItem)}
          </>
        )}

        {earlierNotifications.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary },
                todayNotifications.length > 0 && { marginTop: 32 },
              ]}
            >
              Earlier
            </Text>
            {earlierNotifications.map(renderItem)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerTitleCentered: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(212, 176, 235, 0.6)",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  ticketIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  mainText: {
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 100,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
});
