import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProfileView, { UserProfileData } from "@/components/profile/ProfileView";
import { PostData } from "@/components/post/FeedPost";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getMyProfileEvents, getMyTicketWalletEvents, getProfileEventsCount, type EventResponse, type ProfileEventGroups } from "@/lib/events";
import { deleteMoment, getProfileTimeline, shareMoment } from "@/lib/moments";
import type { MomentInteractionSummary, MomentTimelineItem, RepostPayload } from "@/lib/moments";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageFileUrl } from "@/lib/storage";
import { getUserProfileStats } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { Alert, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const DEFAULT_BIO = 'Digital goodies designer everything is designed.';
const FALLBACK_PROFILE_NAME = 'Mooment User';
const FALLBACK_PROFILE_HANDLE = '@mooment_user';

const PROFILE_STATS = {
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

export default function ProfileTab() {
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [reposts, setReposts] = useState<MomentTimelineItem[]>([]);
  const [profileStats, setProfileStats] = useState(PROFILE_STATS);
  const [profileEvents, setProfileEvents] = useState<ProfileEventGroups>(EMPTY_PROFILE_EVENTS);
  const [profileFeedEvents, setProfileFeedEvents] = useState<EventResponse[]>([]);

  useEffect(() => {
    if (!user?.avatarKey) {
      setAvatarUri(null);
      return;
    }

    setAvatarUri(getStorageFileUrl(user.avatarKey));
  }, [user?.avatarKey]);

  const loadTimeline = useCallback(async () => {
    if (!user?.id) {
      setPosts([]);
      setReposts([]);
      setProfileEvents(EMPTY_PROFILE_EVENTS);
      setProfileFeedEvents([]);
      setProfileStats(PROFILE_STATS);
      return;
    }

    try {
      const [timeline, stats, events, walletEvents] = await Promise.all([
        getProfileTimeline(user.id),
        getUserProfileStats(user.id),
        getMyProfileEvents(),
        getMyTicketWalletEvents(),
      ]);

      setPosts(
        timeline.items.filter((item) => item.type === 'post')
          .map((item) => mapMomentToPost(item.moment, {
            fallbackAvatar: avatarUri,
            createdAt: item.createdAt,
            headerLabel: item.type === 'share' ? 'Shared by you' : undefined,
            storageUrlResolver: getStorageFileUrl,
          }))
          .filter((post): post is PostData => Boolean(post)),
      );
      setReposts(timeline.items.filter((item) => item.type === 'share'));
      setProfileEvents(events);
      setProfileFeedEvents(walletEvents);
      setProfileStats((currentStats) => ({
        ...currentStats,
        events: getProfileEventsCount(events),
        reviews: stats.reviews,
        followers: stats.followers,
        following: stats.following,
      }));
    } catch {
      setPosts([]);
      setReposts([]);
      setProfileEvents(EMPTY_PROFILE_EVENTS);
      setProfileFeedEvents([]);
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
      accountType: user?.accountType,
    };
  }, [avatarUri, profileStats, user?.accountType, user?.bio, user?.email, user?.id, user?.name, user?.username]);

  const handleRepost = useCallback(
    async (post: PostData, payload: RepostPayload) => {
      try {
        await shareMoment(post.id, payload);
        await loadTimeline();
      } catch (error) {
        Alert.alert('Unable to repost', getAuthErrorMessage(error, 'Please try sharing this post again.'));
        throw error;
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
        reposts={reposts}
        onRepost={handleRepost}
        onDeletePost={handleDeletePost}
        onInteractionChange={handleInteractionChange}
        onRefresh={loadTimeline}
        profileEvents={profileEvents}
        profileFeedEvents={profileFeedEvents}
        onProfileEventsChange={(events) => {
          setProfileEvents(events);
          setProfileStats((currentStats) => ({
            ...currentStats,
            events: getProfileEventsCount(events),
          }));
        }}
      />
    </View>
  );
}
