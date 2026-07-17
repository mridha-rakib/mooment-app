import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import { followUser, getUserFollowers, unfollowUser, type ProfileFollowUserResponse } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getHandle = (username?: string) => (username ? `@${username.replace(/^@/, "")}` : "@xenog");
const PAGE_SIZE = 30;

export default function FollowersScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const authUser = useAuthStore((state) => state.user);
  const userId = params.userId ?? authUser?.id;
  const [followers, setFollowers] = useState<ProfileFollowUserResponse[]>([]);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadFollowers = useCallback(async (nextPage = 1) => {
      if (!userId) {
        setFollowers([]);
        setIsLoading(false);
        return;
      }

      if (nextPage === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const result = await getUserFollowers(userId, undefined, PAGE_SIZE, nextPage);
        setFollowers((current) => nextPage === 1 ? result.users : [...current, ...result.users]);
        setPage(nextPage);
        setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
      } catch {
        if (nextPage === 1) {
          setFollowers([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }, [userId]);

  useEffect(() => {
    void loadFollowers(1);
  }, [loadFollowers]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    void loadFollowers(page + 1);
  }, [hasMore, isLoading, isLoadingMore, loadFollowers, page]);

  const toggleFollow = async (targetUser: ProfileFollowUserResponse) => {
    if (pendingUserIds.includes(targetUser.id) || targetUser.id === authUser?.id) {
      return;
    }

    const wasFollowing = targetUser.isFollowing;

    setFollowers((current) => current.map((user) => (
      user.id === targetUser.id ? { ...user, isFollowing: !wasFollowing } : user
    )));
    setPendingUserIds((current) => [...current, targetUser.id]);

    try {
      const follow = wasFollowing ? await unfollowUser(targetUser.id) : await followUser(targetUser.id);

      setFollowers((current) => current.map((user) => (
        user.id === targetUser.id ? { ...user, isFollowing: follow.isFollowing } : user
      )));
    } catch (error) {
      setFollowers((current) => current.map((user) => (
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={18} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Followers</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
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
      )}
    </SafeAreaView>
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
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
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
