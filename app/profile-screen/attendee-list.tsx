import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  getEventTicketStatItems,
  getPublicEventGoingItems,
  type EventTicketStatFilter,
  type EventTicketStatItem,
  type EventTicketStatItemStatus,
  type PublicEventGoingItem,
} from "@/lib/payments";
import { navigateToProfile } from "@/lib/profileNavigation";
import { getStorageFileUrl } from "@/lib/storage";
import { followUser, unfollowUser } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 30;
const FILTERS: EventTicketStatFilter[] = ["going", "attended", "canceled", "noShow"];

const FILTER_LABELS: Record<EventTicketStatFilter, string> = {
  going: "Going",
  attended: "Attended",
  canceled: "Canceled",
  noShow: "No show",
};

const EMPTY_TEXT: Record<EventTicketStatFilter, string> = {
  going: "No issued ticket holders are available.",
  attended: "No attendees have checked in yet.",
  canceled: "No tickets have been canceled.",
  noShow: "No no-show attendees are available.",
};

const getRouteParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
};

const getInitialFilter = (value?: string | string[]): EventTicketStatFilter => {
  const filter = getRouteParam(value);
  return FILTERS.includes(filter as EventTicketStatFilter) ? filter as EventTicketStatFilter : "going";
};

type AttendeeListItem = EventTicketStatItem | PublicEventGoingItem;

const isPrivateStatItem = (item: AttendeeListItem): item is EventTicketStatItem =>
  "status" in item;

const getAvatarUri = (avatarKey?: string | null) => {
  if (!avatarKey) return null;

  try {
    return getStorageFileUrl(avatarKey);
  } catch {
    return null;
  }
};

const getStatusState = (status: EventTicketStatItemStatus): "success" | "failed" | "pending" | "active" => {
  if (status === "checked_in") return "success";
  if (status === "refunded" || status === "canceled" || status === "failed") return "failed";
  if (status === "no_show") return "pending";
  return "active";
};

export default function AttendeeListScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventId?: string | string[];
    eventName?: string | string[];
    initialFilter?: string | string[];
    mode?: string | string[];
  }>();
  const authUser = useAuthStore((state) => state.user);
  const eventId = getRouteParam(params.eventId);
  const eventName = getRouteParam(params.eventName);
  const isPublicGoingMode = getRouteParam(params.mode) === "publicGoing";
  const [selectedFilter, setSelectedFilter] = useState<EventTicketStatFilter>(() => getInitialFilter(params.initialFilter));
  const [items, setItems] = useState<AttendeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const pendingUserIdsRef = useRef(new Set<string>());

  const title = eventName || "Attendee List";

  const setUserPending = useCallback((userId: string, pending: boolean) => {
    const next = new Set(pendingUserIdsRef.current);

    if (pending) {
      next.add(userId);
    } else {
      next.delete(userId);
    }

    pendingUserIdsRef.current = next;
    setPendingUserIds([...next]);
  }, []);

  const loadItems = useCallback(async (nextPage = 1, refreshing = false, filter: EventTicketStatFilter) => {
    const requestId = ++requestIdRef.current;

    if (!eventId) {
      setItems([]);
      setErrorMessage("Attendee list is unavailable for this event.");
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      return;
    }

    if (nextPage === 1 && refreshing) {
      setIsRefreshing(true);
    } else if (nextPage === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    setErrorMessage(null);

    try {
      const result = isPublicGoingMode
        ? await getPublicEventGoingItems(eventId, {
          page: nextPage,
          limit: PAGE_SIZE,
        })
        : await getEventTicketStatItems(eventId, {
          status: filter,
          page: nextPage,
          limit: PAGE_SIZE,
        });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems((current) => {
        if (nextPage === 1) {
          return result.tickets;
        }

        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...result.tickets.filter((item) => !existingIds.has(item.id))];
      });
      setPage(nextPage);
      setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
    } catch (error) {
      if (__DEV__) {
        console.log("[AttendeeList] load failed", { eventId, filter, isPublicGoingMode, error });
      }
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (nextPage === 1) {
        setItems([]);
      }
      setErrorMessage(getAuthErrorMessage(error, "Unable to load attendee list."));
    } finally {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, [eventId, isPublicGoingMode]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(false);
    void loadItems(1, false, selectedFilter);
  }, [loadItems, selectedFilter]);

  const selectFilter = (filter: EventTicketStatFilter) => {
    setFilterMenuVisible(false);
    if (filter === selectedFilter) {
      return;
    }
    setSelectedFilter(filter);
  };

  const refresh = useCallback(() => {
    void loadItems(1, true, selectedFilter);
  }, [loadItems, selectedFilter]);

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    void loadItems(page + 1, false, selectedFilter);
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, loadItems, page, selectedFilter]);

  const openProfile = useCallback((
    attendee: NonNullable<AttendeeListItem["attendee"]>,
    avatarUri: string | null,
  ) => {
    navigateToProfile(router, authUser?.id, {
      userId: attendee.id,
      name: attendee.name,
      avatar: avatarUri ?? "",
      isFollowing: attendee.isFollowing,
    });
  }, [authUser?.id, router]);

  const applyFollowState = (userId: string, isFollowing: boolean) => {
    setItems((current) => current.map((item) => (
      item.attendee?.id === userId
        ? { ...item, attendee: { ...item.attendee, isFollowing } }
        : item
    )));
  };

  const toggleFollow = async (item: AttendeeListItem) => {
    const attendee = item.attendee;
    if (!attendee || attendee.id === authUser?.id || pendingUserIdsRef.current.has(attendee.id)) {
      return;
    }

    const wasFollowing = Boolean(attendee.isFollowing);
    applyFollowState(attendee.id, !wasFollowing);
    setUserPending(attendee.id, true);

    try {
      const follow = wasFollowing ? await unfollowUser(attendee.id) : await followUser(attendee.id);
      applyFollowState(attendee.id, follow.isFollowing);
    } catch (error) {
      applyFollowState(attendee.id, wasFollowing);
      Alert.alert(
        wasFollowing ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setUserPending(attendee.id, false);
    }
  };

  const renderStatusIcon = (status: EventTicketStatItemStatus) => {
    const state = getStatusState(status);
    if (state === "success") {
      return (
        <View style={[styles.statusCircle, { backgroundColor: "#10231D" }]}>
          <Feather name="check" size={18} color="#26C08F" />
        </View>
      );
    }

    if (state === "failed") {
      return (
        <View style={[styles.statusCircle, { backgroundColor: "#2D1515" }]}>
          <Feather name="x" size={18} color="#D44343" />
        </View>
      );
    }

    return (
      <View style={[styles.statusCircle, { backgroundColor: "rgba(179, 179, 179, 0.2)" }]}>
        <Feather name="minus" size={18} color="#FFFFFF" />
      </View>
    );
  };

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      );
    }

    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          {errorMessage ?? (isPublicGoingMode ? EMPTY_TEXT.going : EMPTY_TEXT[selectedFilter])}
        </Text>
        {errorMessage ? (
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.border }]}
            onPress={() => void loadItems(1, false, selectedFilter)}
          >
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [colors.border, colors.text, colors.textSecondary, errorMessage, isLoading, isPublicGoingMode, loadItems, selectedFilter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Attendee List
        </Text>
        <View style={styles.headerRight}>
          {!isPublicGoingMode ? (
            <TouchableOpacity
              style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open attendee filter"
              onPress={() => setFilterMenuVisible(true)}
            >
              <Feather name="filter" size={16} color={colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={1}>
        {title}
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, items.length === 0 ? styles.emptyListContent : null]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} /> : null}
        ItemSeparatorComponent={() => <View style={[styles.separator, { borderBottomColor: "#B3B3B3" }]} />}
        renderItem={({ item }) => {
          const attendee = item.attendee;
          const avatarUri = getAvatarUri(attendee?.avatarKey ?? null);
          const username = attendee?.username?.trim();
          const isSelf = Boolean(attendee?.id && attendee.id === authUser?.id);
          const isFollowing = Boolean(attendee?.isFollowing);
          const isPending = Boolean(attendee?.id && pendingUserIds.includes(attendee.id));

          return (
            <View style={styles.row}>
              {attendee ? (
                <TouchableOpacity
                  style={styles.userSection}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${attendee.name || "attendee"} profile`}
                  onPress={() => openProfile(attendee, avatarUri)}
                >
                  <View style={styles.avatarBorder}>
                    <UserAvatar uri={avatarUri} name={attendee.name} size={52} />
                  </View>
                  <View style={styles.userText}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {attendee.name.trim() || "Attendee"}
                    </Text>
                    <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                      {username ? `@${username.replace(/^@+/, "")}` : "@xenog"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.userSection}>
                  <View style={styles.avatarBorder}>
                    <UserAvatar uri={avatarUri} name="Attendee" size={52} />
                  </View>
                  <View style={styles.userText}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      Attendee
                    </Text>
                    <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                      @xenog
                    </Text>
                  </View>
                </View>
              )}

              {!isPublicGoingMode && isPrivateStatItem(item) ? renderStatusIcon(item.status) : null}

              <View style={styles.followArea}>
                {attendee && !isSelf ? (
                  <TouchableOpacity
                    style={[
                      isFollowing ? styles.followingBtn : styles.followBtn,
                      isFollowing
                        ? { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }
                        : { borderColor: isDark ? "#AC86D4" : colors.primary },
                      isPending && styles.followBtnDisabled,
                    ]}
                    activeOpacity={0.8}
                    disabled={isPending}
                    onPress={() => toggleFollow(item)}
                  >
                    {isFollowing ? null : <Feather name="plus" size={12} color={isDark ? "#AC86D4" : colors.primary} />}
                    <Text
                      style={[
                        isFollowing ? styles.followingBtnText : styles.followBtnText,
                        { color: isFollowing ? colors.textSecondary : isDark ? "#AC86D4" : colors.primary },
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={filterMenuVisible && !isPublicGoingMode}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterMenuVisible(false)}
        >
          <View style={[styles.filterMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={styles.filterOption}
                accessibilityRole="button"
                accessibilityLabel={`Show ${FILTER_LABELS[filter]} ticket holders`}
                onPress={() => selectFilter(filter)}
              >
                <Text style={[styles.filterOptionText, { color: colors.text }]}>
                  {FILTER_LABELS[filter]}
                </Text>
                {selectedFilter === filter ? <Feather name="check" size={16} color={colors.text} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  eventName: {
    paddingHorizontal: 20,
    marginBottom: 12,
    fontSize: 12,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingVertical: 12,
    gap: 12,
  },
  userSection: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#C05178",
    alignItems: "center",
    justifyContent: "center",
  },
  userText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  userName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  userHandle: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  followArea: {
    width: 84,
    alignItems: "flex-end",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 8,
    height: 20,
    justifyContent: "center",
  },
  followingBtn: {
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 8,
    borderWidth: 0,
  },
  followBtnDisabled: {
    opacity: 0.65,
  },
  followBtnText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    letterSpacing: 0,
    marginLeft: 4,
  },
  followingBtnText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 0,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 14,
  },
  retryBtn: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "flex-end",
    paddingTop: 86,
    paddingRight: 20,
  },
  filterMenu: {
    width: 180,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  filterOption: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
