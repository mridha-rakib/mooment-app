import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { PostData } from "@/components/post/FeedPost";
import ProfileView, { UserProfileData } from "@/components/profile/ProfileView";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getProfileTimeline, type MomentInteractionSummary } from "@/lib/moments";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageFileUrl } from "@/lib/storage";
import { getUserById, getUserProfileStats } from "@/lib/users";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400";
const DEFAULT_BIO = "Digital goodies designer everything is designed.";
const FALLBACK_PROFILE_NAME = "Mooment User";
const FALLBACK_PROFILE_HANDLE = "@mooment_user";

const EMPTY_STATS = {
  posts: 0,
  reviews: 0,
  followers: 0,
  following: 0,
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
  const params = useLocalSearchParams<{ userId?: string; name?: string; avatar?: string }>();
  const userId = params.userId;
  const [avatarUri, setAvatarUri] = useState(params.avatar || DEFAULT_AVATAR);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [profileUser, setProfileUser] = useState<UserProfileData>({
    id: userId || "unknown",
    name: params.name || FALLBACK_PROFILE_NAME,
    handle: formatNameFallbackHandle(params.name),
    avatar: params.avatar || DEFAULT_AVATAR,
    bio: DEFAULT_BIO,
    stats: EMPTY_STATS,
  });

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const [user, timeline, stats] = await Promise.all([
        getUserById(userId),
        getProfileTimeline(userId),
        getUserProfileStats(userId),
      ]);
      const resolvedUserId = user.id ?? user._id ?? userId;
      let nextAvatar = params.avatar || DEFAULT_AVATAR;

      if (user.avatarKey) {
        nextAvatar = getStorageFileUrl(user.avatarKey);
      }

      setAvatarUri(nextAvatar);
      setProfileUser({
        id: resolvedUserId,
        name: user.name?.trim() || params.name || FALLBACK_PROFILE_NAME,
        handle: formatHandle(user.username, user.email),
        avatar: nextAvatar,
        bio: user.bio?.trim() || DEFAULT_BIO,
        stats: {
          posts: timeline.stats.posts,
          reviews: stats.reviews,
          followers: stats.followers,
          following: stats.following,
        },
      });
      setPosts(
        timeline.items
          .map((item) => mapMomentToPost(item.moment, {
            fallbackAvatar: nextAvatar,
            createdAt: item.createdAt,
            headerLabel: item.type === "share" ? "Shared" : undefined,
            storageUrlResolver: getStorageFileUrl,
          }))
          .filter((post): post is PostData => Boolean(post)),
      );
    } catch (error) {
      setPosts([]);
      Alert.alert("Unable to load profile", getAuthErrorMessage(error, "Please try again."));
    }
  }, [params.avatar, params.name, userId]);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProfileView
        user={userData}
        posts={posts}
        isOwnProfile={false}
        onInteractionChange={handleInteractionChange}
        onRefresh={loadProfile}
      />
    </View>
  );
}
