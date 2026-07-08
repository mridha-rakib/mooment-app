import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { PostData } from "@/components/post/FeedPost";
import ProfileView, { UserProfileData } from "@/components/profile/ProfileView";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getProfileEvents, getProfileEventsCount, type ProfileEventGroups } from "@/lib/events";
import { getProfileTimeline, type MomentInteractionSummary, type MomentTimelineItem } from "@/lib/moments";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageFileUrl } from "@/lib/storage";
import { getUserById, getUserProfileStats } from "@/lib/users";
import { isOwnProfileTarget } from "@/lib/profileNavigation";
import { useAuthStore } from "@/stores/authStore";

const DEFAULT_BIO = "Digital goodies designer everything is designed.";
const FALLBACK_PROFILE_NAME = "Mooment User";
const FALLBACK_PROFILE_HANDLE = "@mooment_user";

const EMPTY_STATS = {
  events: 0,
  reviews: 0,
  followers: 0,
  following: 0,
};

const EMPTY_PROFILE_EVENTS: ProfileEventGroups = {
  active: [],
  past: [],
};

const formatHandle = (username?: string | null, email?: string | null) => {
  const normalizedUsername = username?.trim().replace(/^@/, "");

  if (normalizedUsername) {
    return `@${normalizedUsername}`;
  }

  const emailHandle = email?.split("@")[0]?.trim();

  return emailHandle ? `@${emailHandle}` : FALLBACK_PROFILE_HANDLE;
};

const formatNameFallbackHandle = (name?: string | null) => {
  const normalizedName = name?.trim().toLowerCase().replace(/\s+/g, "_");

  return normalizedName ? `@${normalizedName}` : FALLBACK_PROFILE_HANDLE;
};

export default function UserProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const params = useLocalSearchParams<{ userId?: string; name?: string; avatar?: string; isFollowing?: string }>();
  const userId = params.userId;
  const isOwnProfile = isOwnProfileTarget(currentUserId, userId);
  const routeIsFollowing = params.isFollowing === "true" ? true : params.isFollowing === "false" ? false : undefined;
  const [avatarUri, setAvatarUri] = useState<string | null>(params.avatar || null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [reposts, setReposts] = useState<MomentTimelineItem[]>([]);
  const [profileEvents, setProfileEvents] = useState<ProfileEventGroups>(EMPTY_PROFILE_EVENTS);
  const [profileUser, setProfileUser] = useState<UserProfileData>({
    id: userId || "unknown",
    name: params.name || FALLBACK_PROFILE_NAME,
    handle: formatNameFallbackHandle(params.name),
    avatar: params.avatar || null,
    bio: DEFAULT_BIO,
    stats: EMPTY_STATS,
    isFollowing: routeIsFollowing,
  });

  const loadProfile = useCallback(async () => {
    if (!userId || isOwnProfile) {
      return;
    }

    try {
      const [user, timeline, stats, events] = await Promise.all([
        getUserById(userId),
        getProfileTimeline(userId),
        getUserProfileStats(userId),
        getProfileEvents(userId),
      ]);
      const resolvedUserId = user.id ?? user._id ?? userId;
      let nextAvatar = params.avatar || null;

      if (user.avatarKey) {
        nextAvatar = getStorageFileUrl(user.avatarKey);
      } else if (user.avatarUrl) {
        nextAvatar = user.avatarUrl;
      }

      setAvatarUri(nextAvatar);
      setProfileUser({
        id: resolvedUserId,
        name: user.name?.trim() || params.name || FALLBACK_PROFILE_NAME,
        handle: formatHandle(user.username, user.email),
        avatar: nextAvatar,
        bio: user.bio?.trim() || DEFAULT_BIO,
        accountType: user.accountType,
        isFollowing: typeof user.isFollowing === "boolean" ? user.isFollowing : routeIsFollowing,
        stats: {
          events: getProfileEventsCount(events),
          reviews: stats.reviews,
          followers: stats.followers,
          following: stats.following,
        },
      });
      setPosts(
        timeline.items.filter((item) => item.type === "post")
          .map((item) => mapMomentToPost(item.moment, {
            fallbackAvatar: nextAvatar,
            createdAt: item.createdAt,
            headerLabel: item.type === "share" ? "Shared" : undefined,
            storageUrlResolver: getStorageFileUrl,
          }))
          .filter((post): post is PostData => Boolean(post)),
      );
      setReposts(timeline.items.filter((item) => item.type === "share"));
      setProfileEvents(events);
    } catch (error) {
      setPosts([]);
      setReposts([]);
      setProfileEvents(EMPTY_PROFILE_EVENTS);
      Alert.alert("Unable to load profile", getAuthErrorMessage(error, "Please try again."));
    }
  }, [isOwnProfile, params.avatar, params.name, routeIsFollowing, userId]);

  useEffect(() => {
    if (isOwnProfile) {
      router.replace("/(tabs)/profile");
    }
  }, [isOwnProfile, router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleInteractionChange = useCallback((postId: string, summary: MomentInteractionSummary) => {
    setPosts((currentPosts) => currentPosts.map((post) => (
      post.id === postId
        ? {
            ...post,
            likesCount: summary.likesCount,
            commentsCount: summary.commentsCount,
            sharesCount: summary.sharesCount,
            isLiked: summary.isLiked,
          }
        : post
    )));
  }, []);

  const userData = useMemo<UserProfileData>(() => ({
    ...profileUser,
    avatar: avatarUri,
  }), [avatarUri, profileUser]);

  const handleFollowChange = useCallback((isFollowing: boolean) => {
    setProfileUser((current) => ({
      ...current,
      isFollowing,
      stats: {
        ...current.stats,
        followers: current.isFollowing === isFollowing
          ? current.stats.followers
          : Math.max(0, current.stats.followers + (isFollowing ? 1 : -1)),
      },
    }));
  }, []);

  if (isOwnProfile) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProfileView
        user={userData}
        posts={posts}
        reposts={reposts}
        isOwnProfile={false}
        onInteractionChange={handleInteractionChange}
        onFollowChange={handleFollowChange}
        onRefresh={loadProfile}
        profileEvents={profileEvents}
        onProfileEventsChange={(events) => {
          setProfileEvents(events);
          setProfileUser((current) => ({
            ...current,
            stats: {
              ...current.stats,
              events: getProfileEventsCount(events),
            },
          }));
        }}
      />
    </View>
  );
}
