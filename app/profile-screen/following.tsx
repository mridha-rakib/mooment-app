import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import { followUser, getUserFollowing, unfollowUser, type ProfileFollowUserResponse } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const getHandle = (username?: string) => (username ? `@${username.replace(/^@/, "")}` : "@xenog");

export default function FollowingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const authUser = useAuthStore((state) => state.user);
  const userId = params.userId ?? authUser?.id;
  const [following, setFollowing] = useState<ProfileFollowUserResponse[]>([]);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failedAvatarIds, setFailedAvatarIds] = useState(new Set<string>());

  useEffect(() => {
    let isMounted = true;

    const loadFollowing = async () => {
      if (!userId) {
        setFollowing([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const users = await getUserFollowing(userId);

        if (isMounted) {
          setFollowing(users);
        }
      } catch {
        if (isMounted) {
          setFollowing([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFollowing();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const toggleFollow = async (targetUser: ProfileFollowUserResponse) => {
    if (pendingUserIds.includes(targetUser.id) || targetUser.id === authUser?.id) {
      return;
    }

    const wasFollowing = targetUser.isFollowing;

    setFollowing((current) => current.map((user) => (
      user.id === targetUser.id ? { ...user, isFollowing: !wasFollowing } : user
    )));
    setPendingUserIds((current) => [...current, targetUser.id]);

    try {
      const follow = wasFollowing ? await unfollowUser(targetUser.id) : await followUser(targetUser.id);

      setFollowing((current) => current.map((user) => (
        user.id === targetUser.id ? { ...user, isFollowing: follow.isFollowing } : user
      )));
    } catch (error) {
      setFollowing((current) => current.map((user) => (
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Following</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : following.length === 0 ? (
        <View style={styles.stateContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Not following anyone yet</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
          {following.map((user) => {
            const avatarUri = user.avatarKey ? getStorageFileUrl(user.avatarKey) : user.avatarUrl;
            return (
            <View key={user.id} style={[styles.userItem, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                style={styles.userClickableArea}
                onPress={() => openProfile(user)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
                  {avatarUri && !failedAvatarIds.has(user.id) ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatar}
                      onError={() => setFailedAvatarIds((prev) => new Set([...prev, user.id]))}
                    />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: colors.card }]}>
                      <Text style={[styles.avatarInitial, { color: colors.text }]}>
                        {user.name.trim().charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                  )}
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
                    { backgroundColor: colors.primary },
                    user.isFollowing && [styles.followingBtn, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                  disabled={pendingUserIds.includes(user.id)}
                  onPress={() => toggleFollow(user)}
                >
                  <Text style={[
                    styles.followBtnText,
                    { color: colors.background },
                    user.isFollowing && [styles.followingBtnText, { color: colors.text }],
                  ]}>
                    {user.isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            );
          })}
        </ScrollView>
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
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
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
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingBtn: {
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  followingBtnText: {},
});
