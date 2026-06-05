import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProfileView, { UserProfileData } from "@/components/profile/ProfileView";
import { PostData } from "@/components/post/FeedPost";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { deleteMoment, getProfileTimeline, shareMoment } from "@/lib/moments";
import type { MomentInteractionSummary } from "@/lib/moments";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageDownloadUrl, getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { Alert, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';
const DEFAULT_BIO = 'Digital goodies designer everything is designed.';
const FALLBACK_PROFILE_NAME = 'Mooment User';
const FALLBACK_PROFILE_HANDLE = '@mooment_user';

const PROFILE_STATS = {
  posts: 0,
  reviews: 12,
  followers: 1200,
  following: 450,
};

const formatHandle = (username?: string | null, email?: string | null) => {
  const normalizedUsername = username?.trim().replace(/^@/, "");

  if (normalizedUsername) {
    return `@${normalizedUsername}`;
  }

  const emailHandle = email?.split("@")[0]?.trim();

  return emailHandle ? `@${emailHandle}` : FALLBACK_PROFILE_HANDLE;
};

export default function ProfileTab() {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [avatarUri, setAvatarUri] = useState(DEFAULT_AVATAR);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [profileStats, setProfileStats] = useState(PROFILE_STATS);

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!user?.avatarKey) {
        setAvatarUri(DEFAULT_AVATAR);
        return;
      }

      try {
        const url = await getStorageDownloadUrl(user.avatarKey);

        if (isMounted) {
          setAvatarUri(url);
        }
      } catch {
        if (isMounted) {
          setAvatarUri(DEFAULT_AVATAR);
        }
      }
    };

    void loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [user?.avatarKey]);

  const loadTimeline = useCallback(async () => {
    if (!user?.id) {
      setPosts([]);
      setProfileStats(PROFILE_STATS);
      return;
    }

    try {
      const timeline = await getProfileTimeline(user.id);

      setPosts(
        timeline.items
          .map((item) => mapMomentToPost(item.moment, {
            fallbackAvatar: avatarUri,
            createdAt: item.createdAt,
            headerLabel: item.type === 'share' ? 'Shared by you' : undefined,
            storageUrlResolver: getStorageFileUrl,
          }))
          .filter((post): post is PostData => Boolean(post)),
      );
      setProfileStats((currentStats) => ({
        ...currentStats,
        posts: timeline.stats.posts,
      }));
    } catch {
      setPosts([]);
      setProfileStats(PROFILE_STATS);
    }
  }, [avatarUri, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadTimeline();
    }, [loadTimeline]),
  );

  const profileUser = useMemo<UserProfileData>(() => {
    const displayName = user?.name?.trim() || FALLBACK_PROFILE_NAME;

    return {
      id: user?.id ?? 'me',
      name: displayName,
      handle: formatHandle(user?.username, user?.email),
      avatar: avatarUri,
      bio: user?.bio?.trim() || DEFAULT_BIO,
      stats: profileStats,
    };
  }, [avatarUri, profileStats, user?.bio, user?.email, user?.id, user?.name, user?.username]);

  const handleRepost = useCallback(
    async (post: PostData) => {
      try {
        await shareMoment(post.id);
        await loadTimeline();
        Alert.alert('Reposted', 'This post now appears on your timeline.');
      } catch (error) {
        Alert.alert('Unable to repost', getAuthErrorMessage(error, 'Please try sharing this post again.'));
      }
    },
    [loadTimeline],
  );

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

  const handleDeletePost = useCallback((post: PostData) => {
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMoment(post.id);
                setPosts((currentPosts) => currentPosts.filter((currentPost) => currentPost.id !== post.id));
                setProfileStats((currentStats) => ({
                  ...currentStats,
                  posts: Math.max(0, currentStats.posts - 1),
                }));
              } catch (error) {
                Alert.alert('Unable to delete post', getAuthErrorMessage(error, 'Please try again.'));
              }
            })();
          },
        },
      ],
    );
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ProfileView
        user={profileUser}
        posts={posts}
        onRepost={handleRepost}
        onDeletePost={handleDeletePost}
        onInteractionChange={handleInteractionChange}
      />
    </View>
  );
}
