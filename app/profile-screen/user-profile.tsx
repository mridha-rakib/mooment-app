import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { PostData } from "@/components/post/FeedPost";
import ProfileView, { UserProfileData } from "@/components/profile/ProfileView";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getProfileEvents, type ProfileEventGroups } from "@/lib/events";
import { getProfileTimeline, type MomentInteractionSummary, type MomentTimelineItem } from "@/lib/moments";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageFileUrl } from "@/lib/storage";
import { getUserById, getUserProfileStats } from "@/lib/users";

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
const PAGE_SIZE = 10;

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
  const params = useLocalSearchParams<{ userId?: string; name?: string; avatar?: string; isFollowing?: string }>();
  const userId = params.userId;
  const routeIsFollowing = params.isFollowing === "true" ? true : params.isFollowing === "false" ? false : undefined;
  const [avatarUri, setAvatarUri] = useState<string | null>(params.avatar || null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [reposts, setReposts] = useState<MomentTimelineItem[]>([]);
  const [profileEvents, setProfileEvents] = useState<ProfileEventGroups>(EMPTY_PROFILE_EVENTS);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false);
  const [eventPages, setEventPages] = useState({ active: 1, past: 1 });
  const [hasMoreEvents, setHasMoreEvents] = useState({ active: false, past: false });
  const [isEventsLoadingMore, setIsEventsLoadingMore] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfileData>({
    id: userId || "unknown",
    name: params.name || FALLBACK_PROFILE_NAME,
    handle: formatNameFallbackHandle(params.name),
    avatar: params.avatar || null,
    bio: DEFAULT_BIO,
    stats: EMPTY_STATS,
    isFollowing: routeIsFollowing,
  });

  const applyTimelineItems = useCallback((items: MomentTimelineItem[], fallbackAvatar: string | null, append = false) => {
    const nextPosts = items.filter((item) => item.type === "post")
      .map((item) => mapMomentToPost(item.moment, {
        fallbackAvatar,
        createdAt: item.createdAt,
        headerLabel: item.type === "share" ? "Shared" : undefined,
        storageUrlResolver: getStorageFileUrl,
      }))
      .filter((post): post is PostData => Boolean(post));
    const nextReposts = items.filter((item) => item.type === "share");

    setPosts((current) => append ? [...current, ...nextPosts] : nextPosts);
    setReposts((current) => append ? [...current, ...nextReposts] : nextReposts);
  }, []);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const [user, timeline, stats, activeEvents, pastEvents] = await Promise.all([
        getUserById(userId),
        getProfileTimeline(userId, { page: 1, limit: PAGE_SIZE }),
        getUserProfileStats(userId),
        getProfileEvents(userId, { filter: "active", page: 1, limit: PAGE_SIZE }),
        getProfileEvents(userId, { filter: "past", page: 1, limit: PAGE_SIZE }),
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
          events: (activeEvents.pagination?.total ?? activeEvents.active.length) + (pastEvents.pagination?.total ?? pastEvents.past.length),
          reviews: stats.reviews,
          followers: stats.followers,
          following: stats.following,
        },
      });
      applyTimelineItems(timeline.items, nextAvatar);
      setFeedPage(1);
      setHasMoreFeed(Boolean(timeline.pagination && timeline.pagination.page < timeline.pagination.totalPages));
      setProfileEvents({ active: activeEvents.active, past: pastEvents.past });
      setEventPages({ active: 1, past: 1 });
      setHasMoreEvents({
        active: Boolean(activeEvents.pagination && activeEvents.pagination.page < activeEvents.pagination.totalPages),
        past: Boolean(pastEvents.pagination && pastEvents.pagination.page < pastEvents.pagination.totalPages),
      });
    } catch (error) {
      setPosts([]);
      setReposts([]);
      setProfileEvents(EMPTY_PROFILE_EVENTS);
      Alert.alert("Unable to load profile", getAuthErrorMessage(error, "Please try again."));
    }
  }, [applyTimelineItems, params.avatar, params.name, routeIsFollowing, userId]);

  const loadMoreFeed = useCallback(() => {
    if (!userId || isFeedLoadingMore || !hasMoreFeed) return;
    const nextPage = feedPage + 1;
    setIsFeedLoadingMore(true);
    void getProfileTimeline(userId, { page: nextPage, limit: PAGE_SIZE })
      .then((timeline) => {
        applyTimelineItems(timeline.items, avatarUri, true);
        setFeedPage(nextPage);
        setHasMoreFeed(Boolean(timeline.pagination && timeline.pagination.page < timeline.pagination.totalPages));
      })
      .finally(() => setIsFeedLoadingMore(false));
  }, [applyTimelineItems, avatarUri, feedPage, hasMoreFeed, isFeedLoadingMore, userId]);

  const loadMoreEvents = useCallback((filter: "active" | "past") => {
    if (!userId || isEventsLoadingMore || !hasMoreEvents[filter]) return;
    const nextPage = eventPages[filter] + 1;
    setIsEventsLoadingMore(true);
    void getProfileEvents(userId, { filter, page: nextPage, limit: PAGE_SIZE })
      .then((events) => {
        const nextEvents = filter === "active" ? events.active : events.past;
        setProfileEvents((current) => ({
          ...current,
          [filter]: [...current[filter], ...nextEvents],
        }));
        setEventPages((current) => ({ ...current, [filter]: nextPage }));
        setHasMoreEvents((current) => ({
          ...current,
          [filter]: Boolean(events.pagination && events.pagination.page < events.pagination.totalPages),
        }));
      })
      .finally(() => setIsEventsLoadingMore(false));
  }, [eventPages, hasMoreEvents, isEventsLoadingMore, userId]);

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
        onLoadMoreFeed={loadMoreFeed}
        isFeedLoadingMore={isFeedLoadingMore}
        onLoadMoreEvents={loadMoreEvents}
        isEventsLoadingMore={isEventsLoadingMore}
        onProfileEventsChange={(events) => {
          setProfileEvents(events);
          setProfileUser((current) => ({
            ...current,
            stats: {
              ...current.stats,
              events: new Set([...events.active, ...events.past].map((event) => event.id)).size,
            },
          }));
        }}
      />
    </View>
  );
}
