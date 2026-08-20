import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import {
  followUser,
  getUserFollowers,
  getUserFollowing,
  unfollowUser,
  type ProfileFollowUserResponse,
} from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const getHandle = (username?: string) => (username ? `@${username.replace(/^@/, "")}` : "@xenog");
const PAGE_SIZE = 30;

type ProfileFollowListProps = {
  userId?: string;
  type: "followers" | "following";
};

export default function ProfileFollowList({ userId, type }: ProfileFollowListProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<ProfileFollowUserResponse[]>([]);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadUsers = useCallback(async (nextPage = 1) => {
    if (!userId) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    if (nextPage === 1) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const result = type === "followers"
        ? await getUserFollowers(userId, undefined, PAGE_SIZE, nextPage)
        : await getUserFollowing(userId, undefined, PAGE_SIZE, nextPage);
      setUsers((current) => nextPage === 1 ? result.users : [...current, ...result.users]);
      setPage(nextPage);
      setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
    } catch {
      if (nextPage === 1) {
        setUsers([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [type, userId]);

  useEffect(() => {
    void loadUsers(1);
  }, [loadUsers]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    void loadUsers(page + 1);
  }, [hasMore, isLoading, isLoadingMore, loadUsers, page]);

  const toggleFollow = async (targetUser: ProfileFollowUserResponse) => {
    if (pendingUserIds.includes(targetUser.id) || targetUser.id === authUser?.id) {
      return;
    }

    const wasFollowing = targetUser.isFollowing;

    setUsers((current) => current.map((user) => (
      user.id === targetUser.id ? { ...user, isFollowing: !wasFollowing } : user
    )));
    setPendingUserIds((current) => [...current, targetUser.id]);

    try {
      const follow = wasFollowing ? await unfollowUser(targetUser.id) : await followUser(targetUser.id);

      setUsers((current) => current.map((user) => (
        user.id === targetUser.id ? { ...user, isFollowing: follow.isFollowing } : user
      )));
    } catch (error) {
      setUsers((current) => current.map((user) => (
        user.id === targetUser.id ? { ...user, isFollowing: wasFollowing } : user
      )));
      Alert.alert(
        wasFollowing ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setPendingUserIds((current) => current.filter((id) => id !== targetUser.id));
    }
  };

  const openProfile = (user: ProfileFollowUserResponse) => {
    const avatarUri = user.avatarKey ? getStorageFileUrl(user.avatarKey) : (user.avatarUrl ?? "");
    router.push({
      pathname: "/profile-screen/user-profile",
      params: {
        userId: user.id,
        name: user.name,
        avatar: avatarUri,
        isFollowing: String(user.isFollowing),
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {type === "followers" ? "No followers yet" : "Not following anyone yet"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(user) => user.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      onEndReachedThreshold={0.4}
      onEndReached={loadMore}
      ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} /> : null}
      renderItem={({ item: user }) => {
        const avatarUri = user.avatarKey ? getStorageFileUrl(user.avatarKey) : user.avatarUrl;
        return (
          <View key={user.id} style={[styles.userItem, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.userClickableArea}
              onPress={() => openProfile(user)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
                <UserAvatar uri={avatarUri} name={user.name} size={40} />
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{getHandle(user.username)}</Text>
              </View>
            </TouchableOpacity>
            {user.id !== authUser?.id && (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  { borderColor: isDark ? "#AC86D4" : colors.primary },
                  user.isFollowing && [
                    styles.followingBtn,
                    { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" },
                  ],
                ]}
                disabled={pendingUserIds.includes(user.id)}
                onPress={() => toggleFollow(user)}
              >
                <Text style={[
                  styles.followBtnText,
                  { color: isDark ? "#AC86D4" : colors.primary },
                  user.isFollowing && [styles.followingBtnText, { color: colors.textSecondary }],
                ]}>
                  {user.isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    padding: 2,
    marginRight: 15,
  },
  userClickableArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 12,
  },
  followBtn: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  followingBtn: {
    borderWidth: 0,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  followingBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
