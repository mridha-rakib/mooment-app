import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import { getBlockedUsers, unblockUser, type BlockedUserResponse } from "@/lib/users";
import { navigateToProfile } from "@/lib/profileNavigation";
import { useAuthStore } from "@/stores/authStore";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 30;

const getHandle = (username?: string) => (username ? `@${username.replace(/^@/, "")}` : "");

const mergeUniqueUsers = (current: BlockedUserResponse[], incoming: BlockedUserResponse[]) => {
  const seen = new Set(current.map((user) => user.id));
  const next = [...current];

  incoming.forEach((user) => {
    if (!seen.has(user.id)) {
      seen.add(user.id);
      next.push(user);
    }
  });

  return next;
};

export default function BlockedAccountsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [users, setUsers] = useState<BlockedUserResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);

  const pendingUserIdSet = useMemo(() => new Set(pendingUserIds), [pendingUserIds]);

  const load = useCallback(async (nextPage = 1, mode: "initial" | "refresh" | "more" = "initial") => {
    if (mode === "initial") setIsLoading(true);
    if (mode === "refresh") setIsRefreshing(true);
    if (mode === "more") setIsLoadingMore(true);
    if (nextPage === 1) setError(null);

    try {
      const result = await getBlockedUsers(nextPage, PAGE_SIZE);
      setUsers((current) => (nextPage === 1 ? result.users : mergeUniqueUsers(current, result.users)));
      setPage(nextPage);
      setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
    } catch (loadError) {
      if (nextPage === 1) {
        setUsers([]);
        setError(getAuthErrorMessage(loadError, "Unable to load blocked accounts."));
      } else {
        Alert.alert("Blocked Accounts", getAuthErrorMessage(loadError, "Unable to load more blocked accounts."));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  const refresh = useCallback(() => {
    if (isLoading || isRefreshing) return;
    void load(1, "refresh");
  }, [isLoading, isRefreshing, load]);

  const loadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    void load(page + 1, "more");
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, load, page]);

  const confirmUnblock = (user: BlockedUserResponse) => {
    if (pendingUserIdSet.has(user.id)) return;

    Alert.alert(
      "Unblock this account?",
      "They may be able to find your profile and interact with you again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          style: "destructive",
          onPress: () => {
            void handleUnblock(user);
          },
        },
      ],
    );
  };

  const handleUnblock = async (user: BlockedUserResponse) => {
    if (pendingUserIdSet.has(user.id)) return;

    setPendingUserIds((current) => [...current, user.id]);

    try {
      await unblockUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (unblockError) {
      Alert.alert("Unable to unblock", getAuthErrorMessage(unblockError, "Please try again."));
    } finally {
      setPendingUserIds((current) => current.filter((id) => id !== user.id));
    }
  };

  const renderUser = ({ item }: { item: BlockedUserResponse }) => {
    const avatarUri = item.avatarKey ? getStorageFileUrl(item.avatarKey) : item.avatarUrl;
    const isPending = pendingUserIdSet.has(item.id);

    return (
      <View style={[styles.userItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.userClickableArea}
          activeOpacity={0.7}
          onPress={() => navigateToProfile(router, currentUserId, {
            userId: item.id,
            name: item.name,
            avatar: avatarUri ?? "",
          })}
        >
          <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
            <UserAvatar uri={avatarUri} name={item.name} size={40} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {getHandle(item.username) ? (
              <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                {getHandle(item.username)}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unblockBtn,
            { borderColor: isDark ? "#AC86D4" : colors.primary },
            isPending && styles.disabledBtn,
          ]}
          activeOpacity={0.8}
          disabled={isPending}
          onPress={() => confirmUnblock(item)}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={isDark ? "#AC86D4" : colors.primary} />
          ) : (
            <Text style={[styles.unblockBtnText, { color: isDark ? "#AC86D4" : colors.primary }]}>
              Unblock
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const emptyState = error ? (
    <View style={styles.center}>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity
        style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => load(1)}
      >
        <Text style={[styles.retryBtnText, { color: colors.text }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.center}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No blocked accounts</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Accounts you block will appear here.
      </Text>
    </View>
  );

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Blocked Accounts</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Spinner color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            users.length === 0 ? styles.emptyListContent : null,
            { paddingBottom: Math.max(insets.bottom + 24, 40) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={colors.textSecondary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={emptyState}
          ListFooterComponent={isLoadingMore ? (
            <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} />
          ) : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  userClickableArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 12,
  },
  unblockBtn: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    minWidth: 76,
    paddingHorizontal: 10,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  unblockBtnText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
