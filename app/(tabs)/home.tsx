import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Modal, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View, type ViewToken } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import HomeHeader from "@/components/home/HomeHeader";
import type { HomeFeedFilters } from "@/components/home/FilterModal";
import MapContainer from "@/components/home/MapContainer";
import EventFeedCard from "@/components/home/EventFeedCard";
import PeopleToFollow, { SuggestedUser } from "@/components/home/PeopleToFollow";
import StoryCarousel, { HomeTabsRow, StoryData } from "@/components/home/StoryCarousel";
import ParticipatedWindowsList from "@/components/home/ParticipatedWindowsList";
import CommentsModal from "@/components/post/CommentsModal";
import FeedPost, { PostData } from "@/components/post/FeedPost";
import ShareModal from "@/components/post/ShareModal";
import RepostFeedCard from "@/components/post/RepostFeedCard";

import {
  consumePendingNewMoment,
  deleteMoment,
  getFeedMoments,
  getFeedReposts,
  shareMoment,
  type FeedAudience,
  type Moment,
  type MomentInteractionSummary,
  type MomentTimelineItem,
  type RepostPayload,
} from "@/lib/moments";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageFileUrl } from "@/lib/storage";
import {
  acknowledgePendingVideoMomentUpload,
  usePendingVideoMomentUploads,
  type PendingVideoMomentUpload,
} from "@/lib/pendingMomentUploads";
import { usePendingVideoMomentSync, type VideoMomentSyncOutcome } from "@/lib/pendingVideoMomentSync";
import { getDiscoverStories, getFeedStories, getFriendStories } from "@/lib/stories";
import { buildStoryRow, groupStoriesByAuthor, SELF_TILE_ID } from "@/lib/storyRow";
import { getSeenStoryIds } from "@/lib/storySeen";
import { getSuggestedUsers } from "@/lib/users";
import { getFeedEvents, type EventResponse } from "@/lib/events";
import {
  getEventFilterSectionEvents,
  getEventFilterSectionHeading,
  getMixedFeedEvents,
  isLatestEventRequest,
  shouldShowEventFilterEmptyState,
  shouldShowEventFilterSection,
} from "@/lib/eventFeedLoading";
import {
  buildEventFilterRequestParams,
  createEmptyEventFilters,
  getEventLocationFilterKey,
  hasActiveEventFilters,
  mergeCategoryIntoEventFilters,
  normalizeEventCategoryFilter,
  setCategoryInEventFilters,
  type SharedEventFilters,
} from "@/lib/eventFilters";
import type { EventCategory } from "@/constants/eventCategories";
import { applySmartFeedAuthorDiversity, getSmartFeedCreatorId } from "@/lib/smartFeedDiversity";
import { useAuthStore } from "@/stores/authStore";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const SUGGESTED_USERS_INSERT_AFTER = 4;
const REFRESH_TIMEOUT_MS = 10000;
const FEED_LOADING_RECOVERY_TIMEOUT_MS = 45000;
const FEED_VIDEO_VIEWABILITY_THRESHOLD = 60;

type FeedItem =
  | { type: 'pending_video_upload'; id: string; data: PendingVideoMomentUpload }
  | { type: 'video_processing'; id: string; data: PostData }
  | { type: 'post'; id: string; data: PostData }
  | { type: 'event'; id: string; data: EventResponse }
  | { type: 'repost'; id: string; data: MomentTimelineItem }
  | { type: 'suggested_users'; id: string; data: SuggestedUser[] }
  // Purely a visual boundary between the filtered Event section above and the
  // normal Smart Feed content below — carries no data of its own.
  | { type: 'your_feed_header'; id: string };

// A server Moment whose video is still `queued`/`processing` renders the
// same skeleton as a local pending upload instead of FeedPost's own black
// "Video queued for processing" / "Processing video" placeholder — that
// placeholder remains reserved for cases the user can act on (a `failed`
// post with its Retry button), never for a state that resolves on its own.
const isUnresolvedVideoPost = (post: PostData) => (
  post.mediaItems?.some((item) => (
    item.type === 'video' &&
    (item.processingStatus === 'queued' || item.processingStatus === 'processing')
  )) ?? false
);

const buildFeedItems = (
  posts: PostData[],
  events: EventResponse[],
  reposts: MomentTimelineItem[],
  suggestedUsers: SuggestedUser[],
  pendingVideoUploads: PendingVideoMomentUpload[],
): FeedItem[] => {
  type ContentItem =
    | { type: 'post'; id: string; data: PostData; sortTime: number; smartFeedScore?: number }
    | { type: 'event'; id: string; data: EventResponse; sortTime: number; smartFeedScore?: number }
    | { type: 'repost'; id: string; data: MomentTimelineItem; sortTime: number; smartFeedScore?: number };

  const compareContentItems = (left: ContentItem, right: ContentItem) => {
    if (typeof left.smartFeedScore === 'number' && typeof right.smartFeedScore === 'number') {
      const scoreDelta = right.smartFeedScore - left.smartFeedScore;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }
    }

    return right.sortTime - left.sortTime;
  };

  const rankedContentItems: ContentItem[] = [
    ...posts.map((post) => ({
      type: 'post' as const,
      id: `moment-${post.id}`,
      data: post,
      sortTime: post.createdAt ? new Date(post.createdAt).getTime() : 0,
      smartFeedScore: post.smartFeedScore,
    })),
    ...events.map((event) => ({
      type: 'event' as const,
      id: `event-${event.id}`,
      data: event,
      sortTime: new Date(event.createdAt).getTime(),
      smartFeedScore: event.smartFeedScore,
    })),
    ...reposts.map((share) => ({
      type: 'repost' as const,
      id: `repost-${share.id}`,
      data: share,
      sortTime: new Date(share.createdAt).getTime(),
      smartFeedScore: share.smartFeedScore,
    })),
  ].sort(compareContentItems);

  // Post-sort diversity pass only — the smartFeedScore/sortTime ranking
  // above is unchanged; this only interleaves items after the fact so no
  // more than SMART_FEED_DIVERSITY.maxConsecutiveSameAuthor consecutive
  // cards share a creator. See app/lib/smartFeedDiversity.ts.
  const contentItems = applySmartFeedAuthorDiversity(
    rankedContentItems,
    (item) => getSmartFeedCreatorId(item.data),
  );

  const items: FeedItem[] = pendingVideoUploads
    .filter((upload) => upload.status !== 'succeeded')
    .map((upload) => ({
      type: 'pending_video_upload' as const,
      id: upload.id,
      data: upload,
    }));
  let contentCount = 0;

  for (const item of contentItems) {
    if (item.type === 'post') {
      items.push(
        isUnresolvedVideoPost(item.data)
          ? { type: 'video_processing', id: item.id, data: item.data }
          : { type: 'post', id: item.id, data: item.data },
      );
    } else if (item.type === 'event') {
      items.push({ type: 'event', id: item.id, data: item.data });
    } else {
      items.push({ type: 'repost', id: item.id, data: item.data });
    }

    contentCount++;

    if (contentCount === SUGGESTED_USERS_INSERT_AFTER && suggestedUsers.length > 0) {
      items.push({ type: 'suggested_users', id: 'feed-suggested-users', data: suggestedUsers });
    }
  }

  if (contentCount > 0 && contentCount < SUGGESTED_USERS_INSERT_AFTER && suggestedUsers.length > 0) {
    items.push({ type: 'suggested_users', id: 'feed-suggested-users', data: suggestedUsers });
  }

  return items;
};

const hasVideoMedia = (post: PostData) => (
  post.mediaItems?.some((item) => item.type === 'video' && Boolean(item.uri?.trim())) ?? false
);

const hasVideoRepostMedia = (share: MomentTimelineItem) => (
  share.originalItem?.type !== 'event' &&
  share.moment.mediaItems?.some((item) => (
    item.type === 'video' &&
    Boolean(item.url?.trim() || item.storageKey?.trim())
  ))
);

const hasVideoFeedItem = (item?: FeedItem) => {
  if (!item) {
    return false;
  }

  if (item.type === 'post') {
    return hasVideoMedia(item.data);
  }

  if (item.type === 'repost') {
    return hasVideoRepostMedia(item.data);
  }

  return false;
};

function FeedSkeletonBlock({ pulse, style, isDark }: { pulse: Animated.Value; style: object; isDark: boolean }) {
  return (
    <Animated.View
      style={[
        styles.feedSkeletonBlock,
        style,
        { opacity: pulse, backgroundColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)" },
      ]}
    />
  );
}

function FeedSkeletonCard({ pulse, isDark }: { pulse: Animated.Value; isDark: boolean }) {
  return (
    <View style={[styles.feedSkeletonCard, !isDark && styles.feedSkeletonCardLight]}>
      <View style={styles.feedSkeletonHeader}>
        <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonAvatar} />
        <View style={styles.feedSkeletonAuthor}>
          <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonAuthorLine} />
          <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonTimeLine} />
        </View>
        <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonMenu} />
      </View>
      <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonMedia} />
      <View style={styles.feedSkeletonActions}>
        <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonAction} />
        <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonAction} />
        <FeedSkeletonBlock pulse={pulse} isDark={isDark} style={styles.feedSkeletonAction} />
      </View>
    </View>
  );
}

function FeedSkeletonList() {
  const { isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return (
    <View
      style={styles.feedSkeletonList}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1, 2].map((item) => (
        <FeedSkeletonCard key={item} pulse={pulse} isDark={isDark} />
      ))}
    </View>
  );
}

function EventFeedSkeletonList() {
  const { isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return (
    <View
      style={styles.eventSkeletonList}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[0, 1].map((item) => (
        <FeedSkeletonCard key={item} pulse={pulse} isDark={isDark} />
      ))}
    </View>
  );
}

function PendingVideoPostSkeleton() {
  const { isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <FeedSkeletonCard pulse={pulse} isDark={isDark} />
    </View>
  );
}

export default function HomeFeed() {
  const insets = useSafeAreaInsets();
  const { colors, theme: activeTheme } = useTheme();
  const userId = useAuthStore((state) => state.user?.id);
  const [commentModalVisible, setCommentModalVisible] = React.useState(false);
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedType, setSelectedType] = useState('Feed');
  const [feedAudience, setFeedAudience] = useState<FeedAudience>("discover");
  // Independent of feedAudience — "windows" never touches the Discover/
  // Friends feed state or its data loading below. Discover/Friends behavior
  // is unchanged; this is purely an additional, additive tab.
  const [homeAudience, setHomeAudience] = useState<FeedAudience | "windows">("discover");
  const [stories, setStories] = useState<StoryData[]>([
    { id: SELF_TILE_ID, type: 'add', isSelfTile: true, hasOwnStory: false },
  ]);
  const [friendStories, setFriendStories] = useState<StoryData[]>([
    { id: SELF_TILE_ID, type: 'add', isSelfTile: true, hasOwnStory: false },
  ]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [feedMomentPosts, setFeedMomentPosts] = useState<PostData[]>([]);
  const [feedEvents, setFeedEvents] = useState<EventResponse[]>([]);
  const [feedReposts, setFeedReposts] = useState<MomentTimelineItem[]>([]);
  const [appliedEventFilters, setAppliedEventFilters] = useState<SharedEventFilters>(() => createEmptyEventFilters());
  const [pendingMapFilterRecenterKey, setPendingMapFilterRecenterKey] = useState<string | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [hasFeedLoadedOnce, setHasFeedLoadedOnce] = useState(false);
  const [isEventFilterLoading, setIsEventFilterLoading] = useState(false);
  const [selectedCommentPost, setSelectedCommentPost] = useState<PostData | null>(null);
  const [selectedSharePost, setSelectedSharePost] = useState<PostData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFeedVideoItemId, setActiveFeedVideoItemId] = useState<string | null>(null);
  const pendingVideoUploads = usePendingVideoMomentUploads();
  const feedRequestIdRef = useRef(0);
  const eventRequestIdRef = useRef(0);
  const feedLoadingRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const feedScrollRef = useRef<FlatList>(null);
  const activeFeedVideoItemIdRef = useRef<string | null>(null);
  const appliedEventFiltersRef = useRef(appliedEventFilters);
  const appliedNearbyFilterKeyRef = useRef(getEventLocationFilterKey(appliedEventFilters.nearby));
  const feedAudienceRef = useRef(feedAudience);
  const activeThemeRef = useRef(activeTheme);
  const previousThemeRef = useRef(activeTheme);
  const feedRuntimeSnapshotRef = useRef({
    feedMomentPostsLength: 0,
    feedEventsLength: 0,
    feedRepostsLength: 0,
    suggestedUsersLength: 0,
    feedItemsLength: 0,
    shouldShowFeedSkeleton: false,
  });
  const didMountEventFilterEffectRef = useRef(false);
  // Tracks suggestion cards removed from `suggestedUsers` because a follow
  // action (optimistic or confirmed) targeted that user, keyed by user id.
  // Lets a same-user unfollow/rollback restore the exact original card
  // instead of leaving it gone until the next suggestions refetch.
  const pendingSuggestionRemovalsRef = useRef<Map<string, SuggestedUser>>(new Map());
  const params = useLocalSearchParams<{ showSuccess?: string; view?: string; category?: string | string[] }>();

  useEffect(() => {
    appliedEventFiltersRef.current = appliedEventFilters;
    appliedNearbyFilterKeyRef.current = getEventLocationFilterKey(appliedEventFilters.nearby);
  }, [appliedEventFilters]);

  useEffect(() => {
    feedAudienceRef.current = feedAudience;
  }, [feedAudience]);

  activeThemeRef.current = activeTheme;

  useEffect(() => {
    if (!__DEV__) return;

    const previousTheme = previousThemeRef.current;
    if (previousTheme === activeTheme) {
      return;
    }

    previousThemeRef.current = activeTheme;
    const snapshot = feedRuntimeSnapshotRef.current;
    console.log('[XENOG_THEME_CHANGE]', {
      previousTheme,
      activeTheme,
      feedItemsLength: snapshot.feedItemsLength,
      feedMomentPostsLength: snapshot.feedMomentPostsLength,
      feedEventsLength: snapshot.feedEventsLength,
      feedRepostsLength: snapshot.feedRepostsLength,
      isFeedLoading,
      isRefreshing,
      isEventFilterLoading,
      shouldShowFeedSkeleton: snapshot.shouldShowFeedSkeleton,
      selectedType,
    });
  }, [activeTheme, isEventFilterLoading, isFeedLoading, isRefreshing, selectedType]);

  useEffect(() => {
    if (!__DEV__) return;

    console.log('[XENOG_HOME_MOUNT]', {
      activeTheme: activeThemeRef.current,
    });

    return () => {
      console.log('[XENOG_HOME_UNMOUNT]', {
        activeTheme: activeThemeRef.current,
      });
    };
  }, []);

  const clearFeedLoadingRecoveryTimer = useCallback(() => {
    if (feedLoadingRecoveryTimerRef.current) {
      clearTimeout(feedLoadingRecoveryTimerRef.current);
      feedLoadingRecoveryTimerRef.current = null;
    }
  }, []);

  const armFeedLoadingRecoveryTimer = useCallback((requestId: number) => {
    clearFeedLoadingRecoveryTimer();
    feedLoadingRecoveryTimerRef.current = setTimeout(() => {
      feedLoadingRecoveryTimerRef.current = null;
      const isLatest = isLatestEventRequest(requestId, feedRequestIdRef.current);

      if (__DEV__) {
        console.log('[XENOG_LOAD_FEED_RECOVERY]', {
          requestId,
          currentRequestId: feedRequestIdRef.current,
          isLatest,
        });
      }

      if (isLatest) {
        setIsFeedLoading(false);
      }
    }, FEED_LOADING_RECOVERY_TIMEOUT_MS);
  }, [clearFeedLoadingRecoveryTimer]);

  useEffect(() => clearFeedLoadingRecoveryTimer, [clearFeedLoadingRecoveryTimer]);

  const beginEventFilterTransition = useCallback(() => {
    eventRequestIdRef.current += 1;
    setIsEventFilterLoading(true);
  }, []);

  const setActiveFeedVideoItemIdIfChanged = useCallback((itemId: string | null) => {
    if (activeFeedVideoItemIdRef.current === itemId) {
      return;
    }

    activeFeedVideoItemIdRef.current = itemId;
    setActiveFeedVideoItemId(itemId);
  }, []);

  const beginAudienceTransition = useCallback(() => {
    const requestId = ++feedRequestIdRef.current;
    setActiveFeedVideoItemIdIfChanged(null);
    setIsFeedLoading(true);
    armFeedLoadingRecoveryTimer(requestId);
    setIsEventFilterLoading(false);
    setFeedMomentPosts([]);
    setFeedEvents([]);
    setFeedReposts([]);
  }, [armFeedLoadingRecoveryTimer, setActiveFeedVideoItemIdIfChanged]);

  const feedViewabilityConfig = useRef({
    itemVisiblePercentThreshold: FEED_VIDEO_VIEWABILITY_THRESHOLD,
    minimumViewTime: 120,
  }).current;

  const onViewableFeedItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const nextActiveVideoPost = viewableItems
      .filter((viewToken) => (
        viewToken.isViewable &&
        hasVideoFeedItem(viewToken.item)
      ))
      .sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER))[0];

    setActiveFeedVideoItemIdIfChanged(nextActiveVideoPost?.item.id ?? null);
  }).current;

  useEffect(() => {
    if (params.showSuccess === "true") {
      setShowSuccessModal(true);
      router.setParams({ showSuccess: undefined });
    }

    if (params.view === 'map') {
      setSelectedType('Map');
      router.setParams({ view: undefined });
    }

    const category = normalizeEventCategoryFilter(
      Array.isArray(params.category) ? params.category[0] : params.category,
    );

    if (category) {
      const nextFilters = mergeCategoryIntoEventFilters(appliedEventFiltersRef.current, category);

      if (nextFilters !== appliedEventFiltersRef.current) {
        beginEventFilterTransition();
        setAppliedEventFilters(nextFilters);
      }
      router.setParams({ category: undefined });
    } else if (params.category !== undefined) {
      router.setParams({ category: undefined });
    }
  }, [beginEventFilterTransition, params.category, params.showSuccess, params.view]);

  const loadStories = useCallback(async () => {
    try {
      const [discover, friends, seenStoryIds] = await Promise.all([
        getDiscoverStories().catch(() => getFeedStories()),
        getFriendStories().catch(() => []),
        getSeenStoryIds(),
      ]);
      setStories(buildStoryRow(groupStoriesByAuthor(discover, seenStoryIds, userId)));
      setFriendStories(buildStoryRow(groupStoriesByAuthor(friends, seenStoryIds, userId)));
    } catch {
      setStories([{ id: SELF_TILE_ID, type: 'add', isSelfTile: true, hasOwnStory: false }]);
      setFriendStories([{ id: SELF_TILE_ID, type: 'add', isSelfTile: true, hasOwnStory: false }]);
    }
  }, [userId]);

  const loadFeedEvents = useCallback(async (audience: FeedAudience) => {
    const requestId = ++eventRequestIdRef.current;
    setIsEventFilterLoading(true);
    try {
      const events = await getFeedEvents(buildEventFilterRequestParams(appliedEventFiltersRef.current, {
        limit: 100,
        audience,
      }));

      if (!isLatestEventRequest(requestId, eventRequestIdRef.current)) return;

      setFeedEvents(events);
    } catch {
      // Preserve the existing feed events if an event-only refresh fails.
    } finally {
      if (isLatestEventRequest(requestId, eventRequestIdRef.current)) {
        setIsEventFilterLoading(false);
      }
    }
  }, []);

  const loadFeed = useCallback(async (audience: FeedAudience = feedAudienceRef.current) => {
    const requestId = ++feedRequestIdRef.current;
    const eventRequestId = eventRequestIdRef.current;
    const beforeSnapshot = feedRuntimeSnapshotRef.current;
    if (__DEV__) {
      console.log('[XENOG_LOAD_FEED_START]', {
        requestId,
        currentRequestId: feedRequestIdRef.current,
        audience,
        activeTheme: activeThemeRef.current,
        feedMomentPostsLength: beforeSnapshot.feedMomentPostsLength,
        feedEventsLength: beforeSnapshot.feedEventsLength,
        feedRepostsLength: beforeSnapshot.feedRepostsLength,
        suggestedUsersLength: beforeSnapshot.suggestedUsersLength,
        feedItemsLength: beforeSnapshot.feedItemsLength,
      });
      console.log('[XENOG_LOAD_FEED]', {
        phase: 'start',
        requestId,
        activeTheme: activeThemeRef.current,
        beforeLength: beforeSnapshot.feedItemsLength,
        afterLength: beforeSnapshot.feedItemsLength,
        isLatest: true,
      });
    }
    setIsFeedLoading(true);
    armFeedLoadingRecoveryTimer(requestId);
    try {
      const eventFilters = appliedEventFiltersRef.current;
      const eventRequestParams = buildEventFilterRequestParams(eventFilters, { limit: 100, audience });
      const [momentsResult, eventsResult, repostsResult] = await Promise.allSettled([
        getFeedMoments({
          hashtags: eventFilters.hashtags,
          audience,
          latitude: eventRequestParams.latitude,
          longitude: eventRequestParams.longitude,
          radiusKm: eventRequestParams.radiusKm,
        }),
        getFeedEvents(eventRequestParams),
        getFeedReposts(50, audience),
      ]);
      const isLatestSettled = isLatestEventRequest(requestId, feedRequestIdRef.current);
      const settledAfterLength = (
        (momentsResult.status === "fulfilled" ? momentsResult.value.length : beforeSnapshot.feedMomentPostsLength) +
        (eventsResult.status === "fulfilled" ? eventsResult.value.length : beforeSnapshot.feedEventsLength) +
        (repostsResult.status === 'fulfilled' ? repostsResult.value.length : beforeSnapshot.feedRepostsLength)
      );

      if (__DEV__) {
        console.log('[XENOG_LOAD_FEED_SETTLED]', {
          requestId,
          isLatest: isLatestSettled,
          momentsStatus: momentsResult.status,
          eventsStatus: eventsResult.status,
          repostsStatus: repostsResult.status,
          momentsCount: momentsResult.status === "fulfilled" ? momentsResult.value.length : undefined,
          eventsCount: eventsResult.status === "fulfilled" ? eventsResult.value.length : undefined,
          repostsCount: repostsResult.status === 'fulfilled' ? repostsResult.value.length : undefined,
        });
        console.log('[XENOG_LOAD_FEED]', {
          phase: 'settled',
          requestId,
          activeTheme: activeThemeRef.current,
          beforeLength: beforeSnapshot.feedItemsLength,
          afterLength: settledAfterLength,
          isLatest: isLatestSettled,
        });
      }

      if (!isLatestSettled) {
        return;
      }

      if (momentsResult.status === "fulfilled") {
        setFeedMomentPosts(
          momentsResult.value
            .map((moment) => mapMomentToPost(moment, {
              storageUrlResolver: getStorageFileUrl,
            }))
            .filter((post): post is PostData => Boolean(post)),
        );
      }

      if (
        eventsResult.status === "fulfilled" &&
        isLatestEventRequest(eventRequestId, eventRequestIdRef.current)
      ) {
        setFeedEvents(eventsResult.value);
      }

      if (repostsResult.status === 'fulfilled') {
        setFeedReposts(repostsResult.value);
      }

      if (
        momentsResult.status === "fulfilled" ||
        eventsResult.status === "fulfilled" ||
        repostsResult.status === 'fulfilled'
      ) {
        setHasFeedLoadedOnce(true);
      }
    } finally {
      const isLatestFinally = isLatestEventRequest(requestId, feedRequestIdRef.current);

      if (__DEV__) {
        console.log('[XENOG_LOAD_FEED_FINALLY]', {
          requestId,
          currentRequestId: feedRequestIdRef.current,
          isLatest: isLatestFinally,
          willClearIsFeedLoading: isLatestFinally,
        });
        console.log('[XENOG_LOAD_FEED]', {
          phase: 'finally',
          requestId,
          activeTheme: activeThemeRef.current,
          beforeLength: beforeSnapshot.feedItemsLength,
          afterLength: feedRuntimeSnapshotRef.current.feedItemsLength,
          isLatest: isLatestFinally,
        });
      }

      if (isLatestFinally) {
        clearFeedLoadingRecoveryTimer();
        setIsFeedLoading(false);
        setIsEventFilterLoading(false);
      }
    }
  }, [armFeedLoadingRecoveryTimer, clearFeedLoadingRecoveryTimer]);

  useEffect(() => {
    if (!didMountEventFilterEffectRef.current) {
      didMountEventFilterEffectRef.current = true;
      return;
    }

    void loadFeedEvents(feedAudienceRef.current);
  }, [appliedEventFilters, loadFeedEvents]);

  const handleAudienceChange = useCallback((audience: FeedAudience) => {
    if (audience === feedAudience) {
      return;
    }

    beginAudienceTransition();
    setFeedAudience(audience);
    void loadFeed(audience);
  }, [beginAudienceTransition, feedAudience, loadFeed]);

  // Discover/Friends still flow through the exact handleAudienceChange above
  // (unchanged) — "windows" only ever changes homeAudience, never touching
  // feedAudience/loadFeed/the Moment+Event+Repost feed state at all.
  const handleHomeAudienceChange = useCallback((tab: FeedAudience | "windows") => {
    setHomeAudience(tab);
    if (tab !== "windows") {
      handleAudienceChange(tab);
    }
  }, [handleAudienceChange]);

  const handleFilterChange = useCallback((filters: HomeFeedFilters) => {
    const nextNearbyKey = getEventLocationFilterKey(filters.nearby);
    beginEventFilterTransition();
    setPendingMapFilterRecenterKey(
      nextNearbyKey && nextNearbyKey !== appliedNearbyFilterKeyRef.current
        ? nextNearbyKey
        : null,
    );
    setAppliedEventFilters(filters);
  }, [beginEventFilterTransition]);

  const handleClearEventFilters = useCallback(() => {
    beginEventFilterTransition();
    setPendingMapFilterRecenterKey(null);
    setAppliedEventFilters(createEmptyEventFilters());
  }, [beginEventFilterTransition]);

  const handleMapFilterRecenterHandled = useCallback((key: string) => {
    setPendingMapFilterRecenterKey((currentKey) => (
      currentKey === key ? null : currentKey
    ));
  }, []);

  const handleMapCategoryChange = useCallback((category: EventCategory | null) => {
    const nextFilters = setCategoryInEventFilters(appliedEventFiltersRef.current, category);

    if (nextFilters !== appliedEventFiltersRef.current) {
      beginEventFilterTransition();
      setAppliedEventFilters(nextFilters);
    }
  }, [beginEventFilterTransition]);

  const loadSuggestedUsers = useCallback(async () => {
    try {
      const users = await getSuggestedUsers(10);

      // A fresh fetch is authoritative — any locally-tracked removal is
      // superseded by whatever the backend now says.
      pendingSuggestionRemovalsRef.current.clear();

      setSuggestedUsers(users.map((user) => ({
        id: user.id,
        name: user.name,
        avatarUri: user.avatarUrl?.trim() || (user.avatarKey ? getStorageFileUrl(user.avatarKey) : null),
        isFollowing: user.isFollowing,
      })));
    } catch {
      // Keep whatever suggestions are already on screen rather than wiping
      // them out because a secondary refresh request failed.
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      await Promise.race([
        Promise.all([loadStories(), loadFeed(feedAudience), loadSuggestedUsers()]),
        new Promise((resolve) => setTimeout(resolve, REFRESH_TIMEOUT_MS)),
      ]);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [feedAudience, loadFeed, loadStories, loadSuggestedUsers]);

  const refreshFeedAfterRepost = useCallback(async () => {
    await loadFeed(feedAudience);
    requestAnimationFrame(() => {
      feedScrollRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, [feedAudience, loadFeed]);

  useFocusEffect(
    useCallback(() => {
      if (__DEV__) {
        console.log('[XENOG_HOME_FOCUS]', {
          activeTheme: activeThemeRef.current,
          feedAudience,
          feedItemsLength: feedRuntimeSnapshotRef.current.feedItemsLength,
        });
      }

      const pendingMoment = consumePendingNewMoment();

      if (pendingMoment) {
        const mappedPost = mapMomentToPost(pendingMoment, {
          storageUrlResolver: getStorageFileUrl,
        });

        if (mappedPost) {
          setFeedMomentPosts((current) => [mappedPost, ...current.filter((p) => p.id !== mappedPost.id)]);
        }
      }

      void loadStories();
      void loadFeed(feedAudience);

      return () => {
        if (__DEV__) {
          console.log('[XENOG_HOME_BLUR]', {
            activeTheme: activeThemeRef.current,
            feedAudience,
          });
        }
        setActiveFeedVideoItemIdIfChanged(null);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      };
    }, [feedAudience, loadFeed, loadStories, setActiveFeedVideoItemIdIfChanged]),
  );

  useEffect(() => {
    if (selectedType !== 'Feed') {
      setActiveFeedVideoItemIdIfChanged(null);
    }
  }, [selectedType, setActiveFeedVideoItemIdIfChanged]);

  useEffect(() => {
    if (selectedType !== 'Feed' && pendingVideoUploads.some((upload) => upload.status !== 'succeeded')) {
      setSelectedType('Feed');
    }
  }, [pendingVideoUploads, selectedType]);

  useEffect(() => {
    void loadSuggestedUsers();
  }, [loadSuggestedUsers]);

  const applyInteractionSummary = useCallback((postId: string, summary: MomentInteractionSummary) => {
    const applyToPost = (post: PostData) => ({
      ...post,
      likesCount: summary.likesCount,
      commentsCount: summary.commentsCount,
      sharesCount: summary.sharesCount,
      isLiked: summary.isLiked,
    });

    setFeedMomentPosts((currentPosts) => currentPosts.map((post) => (
      post.id === postId ? applyToPost(post) : post
    )));
    setSelectedCommentPost((currentPost) => (
      currentPost?.id === postId ? applyToPost(currentPost) : currentPost
    ));
    setSelectedSharePost((currentPost) => (
      currentPost?.id === postId ? applyToPost(currentPost) : currentPost
    ));
  }, []);

  const handleCommentPress = useCallback((post: PostData) => {
    setSelectedCommentPost(post);
    setCommentModalVisible(true);
  }, []);

  const handleViewMapPress = useCallback(() => {
    setSelectedType('Map');
  }, []);

  const handleSharePress = useCallback((post: PostData) => {
    if (shareModalVisible && selectedSharePost?.id === post.id) {
      return;
    }

    setSelectedSharePost(post);
    setShareModalVisible(true);
  }, [selectedSharePost?.id, shareModalVisible]);

  const handleRepost = useCallback(async (payload: RepostPayload) => {
    if (!selectedSharePost) return;

    try {
      const share = await shareMoment(selectedSharePost.id, payload);

      applyInteractionSummary(selectedSharePost.id, {
        momentId: selectedSharePost.id,
        likesCount: share.moment.likesCount,
        commentsCount: share.moment.commentsCount,
        sharesCount: share.moment.sharesCount,
        isLiked: share.moment.isLiked,
      });
      setFeedReposts((current) => [share, ...current.filter((item) => item.id !== share.id)]);
      setShareModalVisible(false);
      setSelectedSharePost(null);
      await refreshFeedAfterRepost();
    } catch (error) {
      Alert.alert('Unable to repost', getAuthErrorMessage(error, 'Please try sharing this post again.'));
      throw error;
    }
  }, [applyInteractionSummary, refreshFeedAfterRepost, selectedSharePost]);

  // Single canonical propagation point for a follow-state change on any user,
  // regardless of which surface (feed author card, event host card, or
  // People-to-follow) originated it — every other currently-loaded
  // representation of that same user id is reconciled here so no surface is
  // left showing stale Follow/Following state.
  const handleAuthorFollowChange = useCallback((authorId: string, isFollowing: boolean) => {
    setFeedMomentPosts((currentPosts) => currentPosts.map((post) => (
      post.authorId === authorId ? { ...post, isFollowing } : post
    )));

    setFeedEvents((currentEvents) => currentEvents.map((event) => (
      event.host && event.host.id === authorId
        ? { ...event, host: { ...event.host, isFollowing } }
        : event
    )));

    setSuggestedUsers((currentSuggestions) => {
      if (isFollowing) {
        // The suggestions endpoint never returns already-followed users, so
        // the smallest correct reconciliation is to drop the card rather
        // than leave an obsolete "Follow" suggestion for someone already
        // followed.
        const match = currentSuggestions.find((user) => user.id === authorId);
        if (!match) {
          return currentSuggestions;
        }
        pendingSuggestionRemovalsRef.current.set(authorId, match);
        return currentSuggestions.filter((user) => user.id !== authorId);
      }

      // isFollowing === false: only restore a card we ourselves removed
      // (an unfollow, or a rollback of a failed follow) — never fabricate
      // suggestion data that didn't come from the backend.
      const removed = pendingSuggestionRemovalsRef.current.get(authorId);
      if (!removed || currentSuggestions.some((user) => user.id === authorId)) {
        return currentSuggestions;
      }
      pendingSuggestionRemovalsRef.current.delete(authorId);
      return [...currentSuggestions, removed];
    });
  }, []);

  // Immediate local reflection of a Report+Block flow's block step
  // succeeding — the reported item itself already shows its own
  // Report+Block success placeholder (handled inside FeedPost/EventFeedCard,
  // not here), so this only needs to drop the newly-blocked owner's *other*
  // already-rendered content from the currently mounted Feed. The backend's
  // existing excludeUserIds filtering remains authoritative on the next
  // natural refetch — this is not a second persistent filtering system.
  const handleUserBlockedFromReport = useCallback((blockedOwnerId: string) => {
    setFeedMomentPosts((currentPosts) => currentPosts.filter((post) => post.authorId !== blockedOwnerId));
    setFeedEvents((currentEvents) => currentEvents.filter((event) => event.userId !== blockedOwnerId));
    setFeedReposts((currentReposts) => currentReposts.filter((share) => (
      share.moment.userId !== blockedOwnerId && share.sharedBy?.id !== blockedOwnerId
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
                setFeedMomentPosts((currentPosts) => currentPosts.filter((p) => p.id !== post.id));
                setCommentModalVisible(false);
                setShareModalVisible(false);
                setSelectedCommentPost(null);
                setSelectedSharePost(null);
              } catch (error) {
                Alert.alert('Unable to delete post', getAuthErrorMessage(error, 'Please try again.'));
              }
            })();
          },
        },
      ],
    );
  }, []);

  // Caption-only edit of the authenticated user's own Post — patches the
  // existing Feed item by id in place (never appended/reordered as new,
  // never touches createdAt/Smart Feed freshness). Mirrors the
  // mapMomentToPost + map-by-id pattern already used by
  // handleVideoMomentResolved below.
  const handlePostUpdated = useCallback((updatedMoment: Moment) => {
    const mappedPost = mapMomentToPost(updatedMoment, { storageUrlResolver: getStorageFileUrl });

    if (!mappedPost) {
      return;
    }

    setFeedMomentPosts((current) => current.map((post) => (
      post.id === mappedPost.id ? mappedPost : post
    )));
    setSelectedCommentPost((currentPost) => (
      currentPost?.id === mappedPost.id ? mappedPost : currentPost
    ));
    setSelectedSharePost((currentPost) => (
      currentPost?.id === mappedPost.id ? mappedPost : currentPost
    ));
  }, []);

  // Edits ONLY the authenticated user's own repost commentary — patches the
  // existing repost by share id in place, never the embedded original
  // content, never reordered/duplicated, never touches share.createdAt.
  const handleShareUpdated = useCallback((updatedShare: MomentTimelineItem) => {
    setFeedReposts((current) => current.map((share) => (
      share.id === updatedShare.id ? updatedShare : share
    )));
  }, []);

  useEffect(() => {
    const succeededUploads = pendingVideoUploads.filter((upload) => upload.status === 'succeeded' && upload.moment);

    if (succeededUploads.length === 0) {
      return;
    }

    succeededUploads.forEach((upload) => {
      const post = upload.moment
        ? mapMomentToPost(upload.moment, { storageUrlResolver: getStorageFileUrl })
        : null;

      if (post) {
        setFeedMomentPosts((currentPosts) => [post, ...currentPosts.filter((currentPost) => currentPost.id !== post.id)]);
      }

      acknowledgePendingVideoMomentUpload(upload.id);
    });
  }, [pendingVideoUploads]);

  // Targeted background sync for the specific Feed video posts still stuck
  // at queued/processing (freshly published, or picked up from a normal
  // Feed load) — never a full Feed refetch, never a global poll.
  const unresolvedVideoMomentIds = useMemo(
    () => feedMomentPosts.filter(isUnresolvedVideoPost).map((post) => post.id),
    [feedMomentPosts],
  );

  const handleVideoMomentResolved = useCallback((momentId: string, outcome: VideoMomentSyncOutcome) => {
    if (outcome.type === 'not_found') {
      setFeedMomentPosts((current) => current.filter((post) => post.id !== momentId));
      return;
    }

    if (outcome.type === 'error_exhausted') {
      // Surface the existing failed/retry placeholder instead of polling
      // forever on a permanently broken status request.
      setFeedMomentPosts((current) => current.map((post) => (
        post.id === momentId
          ? {
              ...post,
              mediaItems: post.mediaItems?.map((item) => (
                item.type === 'video' && (item.processingStatus === 'queued' || item.processingStatus === 'processing')
                  ? { ...item, processingStatus: 'failed' as const }
                  : item
              )),
            }
          : post
      )));
      return;
    }

    const mappedPost = mapMomentToPost(outcome.moment, { storageUrlResolver: getStorageFileUrl });

    setFeedMomentPosts((current) => (
      mappedPost
        ? current.map((post) => (post.id === momentId ? mappedPost : post))
        : current.filter((post) => post.id !== momentId)
    ));
  }, []);

  usePendingVideoMomentSync(unresolvedVideoMomentIds, handleVideoMomentResolved);

  const hasAppliedEventFilters = useMemo(
    () => hasActiveEventFilters(appliedEventFilters),
    [appliedEventFilters],
  );
  const showEventFilterSection = shouldShowEventFilterSection(hasAppliedEventFilters, isEventFilterLoading);
  const eventFilterSectionEvents = useMemo(
    () => getEventFilterSectionEvents(feedEvents, hasAppliedEventFilters, isEventFilterLoading),
    [feedEvents, hasAppliedEventFilters, isEventFilterLoading],
  );
  const mixedFeedEvents = useMemo(
    () => getMixedFeedEvents(feedEvents, showEventFilterSection, isEventFilterLoading),
    [feedEvents, isEventFilterLoading, showEventFilterSection],
  );
  const feedItems = useMemo(() => {
    const nonEventFeedItems = buildFeedItems(
      feedMomentPosts,
      mixedFeedEvents,
      feedReposts,
      suggestedUsers,
      pendingVideoUploads,
    );

    if (!showEventFilterSection) {
      return nonEventFeedItems;
    }

    const eventSectionItems: FeedItem[] = eventFilterSectionEvents.map((event) => ({
      type: 'event' as const,
      id: `event-section-${event.id}`,
      data: event,
    }));

    // Only shown while the filtered section above is visible AND there's normal
    // feed content below it to distinguish from — never on the unfiltered feed.
    const yourFeedHeaderItems: FeedItem[] = nonEventFeedItems.length > 0
      ? [{ type: 'your_feed_header' as const, id: 'your-feed-header' }]
      : [];

    return [...eventSectionItems, ...yourFeedHeaderItems, ...nonEventFeedItems];
  }, [
    eventFilterSectionEvents,
    feedMomentPosts,
    feedReposts,
    mixedFeedEvents,
    pendingVideoUploads,
    showEventFilterSection,
    suggestedUsers,
  ]);
  const showEventFilterEmptyState = shouldShowEventFilterEmptyState({
    hasAppliedEventFilters,
    isEventLoading: isEventFilterLoading,
    isFeedLoading,
    eventCount: feedEvents.length,
  });
  const shouldShowFeedSkeleton = selectedType === 'Feed' && !hasFeedLoadedOnce && isFeedLoading && feedItems.length === 0 && !isRefreshing;
  feedRuntimeSnapshotRef.current = {
    feedMomentPostsLength: feedMomentPosts.length,
    feedEventsLength: feedEvents.length,
    feedRepostsLength: feedReposts.length,
    suggestedUsersLength: suggestedUsers.length,
    feedItemsLength: feedItems.length,
    shouldShowFeedSkeleton,
  };
  useEffect(() => {
    if (!__DEV__) return;

    console.log('[XENOG_FEED_STATE]', {
      activeTheme,
      selectedType,
      homeAudience,
      feedAudience,
      isFeedLoading,
      isRefreshing,
      isEventFilterLoading,
      hasFeedLoadedOnce,
      feedMomentPostsLength: feedMomentPosts.length,
      feedEventsLength: feedEvents.length,
      feedRepostsLength: feedReposts.length,
      suggestedUsersLength: suggestedUsers.length,
      feedItemsLength: feedItems.length,
      shouldShowFeedSkeleton,
    });
  }, [
    activeTheme,
    selectedType,
    homeAudience,
    feedAudience,
    isFeedLoading,
    isRefreshing,
    isEventFilterLoading,
    hasFeedLoadedOnce,
    feedMomentPosts.length,
    feedEvents.length,
    feedReposts.length,
    suggestedUsers.length,
    feedItems.length,
    shouldShowFeedSkeleton,
  ]);
  const feedListExtraData = useMemo(
    () => ({ activeFeedVideoItemId, activeTheme }),
    [activeFeedVideoItemId, activeTheme],
  );

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.type === 'post') {
      return (
        <FeedPost
          post={item.data}
          onCommentPress={handleCommentPress}
          onSharePress={handleSharePress}
          onViewMapPress={handleViewMapPress}
          onAuthorFollowChange={handleAuthorFollowChange}
          onInteractionChange={applyInteractionSummary}
          onDeletePress={handleDeletePost}
          onPostUpdated={handlePostUpdated}
          onAuthorBlocked={handleUserBlockedFromReport}
          isActiveVideo={activeFeedVideoItemId === item.id}
        />
      );
    }
    if (item.type === 'pending_video_upload' || item.type === 'video_processing') {
      return <PendingVideoPostSkeleton />;
    }
    if (item.type === 'event') {
      return (
        <EventFeedCard
          event={item.data}
          onRepostSuccess={refreshFeedAfterRepost}
          onHostBlocked={handleUserBlockedFromReport}
          onHostFollowChange={handleAuthorFollowChange}
        />
      );
    }
    if (item.type === 'repost') {
      return (
        <RepostFeedCard
          share={item.data}
          onRepostSuccess={refreshFeedAfterRepost}
          onShareUpdated={handleShareUpdated}
          isActiveVideo={activeFeedVideoItemId === item.id}
        />
      );
    }
    if (item.type === 'suggested_users') {
      return <PeopleToFollow users={item.data} onFollowChange={handleAuthorFollowChange} />;
    }
    if (item.type === 'your_feed_header') {
      return (
        <View style={styles.yourFeedHeaderSection}>
          <View style={[styles.yourFeedDivider, { backgroundColor: colors.border }]} />
          <Text style={[styles.yourFeedTitle, { color: '#B3B3B3' }]}>Your Feed</Text>
        </View>
      );
    }
    return null;
  }, [
    activeFeedVideoItemId,
    applyInteractionSummary,
    colors.border,
    handleAuthorFollowChange,
    handleCommentPress,
    handleDeletePost,
    handlePostUpdated,
    handleSharePress,
    handleShareUpdated,
    handleUserBlockedFromReport,
    handleViewMapPress,
    refreshFeedAfterRepost,
  ]);

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HomeHeader
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          activeFilters={appliedEventFilters}
          onFilterChange={handleFilterChange}
          overlay={selectedType === 'Map'}
        />

        {selectedType === 'Feed' ? (
          <HomeTabsRow
            // Visual selection must come from the single canonical
            // homeAudience value, not feedAudience — feedAudience only
            // drives Discover/Friends data fetching and is left untouched
            // (still whatever it was last set to) while Windows is active,
            // which previously left the Discover/Friends pill highlighted
            // at the same time as Windows.
            activeTab={homeAudience === 'windows' ? null : homeAudience}
            onActiveTabChange={handleHomeAudienceChange}
            showWindowsTab
            isWindowsActive={homeAudience === 'windows'}
            onWindowsPress={() => handleHomeAudienceChange('windows')}
          />
        ) : null}

        {homeAudience === 'windows' && selectedType === 'Feed' ? (
          <ParticipatedWindowsList />
        ) : selectedType === 'Feed' ? (
          <FlatList
            ref={feedScrollRef}
            data={feedItems}
            keyExtractor={(item) => item.id}
            extraData={feedListExtraData}
            showsVerticalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            updateCellsBatchingPeriod={40}
            windowSize={7}
            viewabilityConfig={feedViewabilityConfig}
            onViewableItemsChanged={onViewableFeedItemsChanged}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={(
              <>
                <StoryCarousel
                  stories={stories}
                  friendStories={friendStories}
                  activeTab={feedAudience}
                />
                {showEventFilterSection ? (
                  <View style={styles.nearbyEventsSection}>
                    <View style={styles.nearbyEventsHeaderRow}>
                      <Text style={[styles.nearbyEventsTitle, { color: '#B3B3B3' }]}>
                        {getEventFilterSectionHeading(appliedEventFilters.nearby)}
                      </Text>
                      {hasAppliedEventFilters ? (
                        <TouchableOpacity
                          style={[styles.clearEventFiltersButton, { borderColor: colors.border }]}
                          activeOpacity={0.75}
                          onPress={handleClearEventFilters}
                          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="Clear filters"
                        >
                          <Text style={[styles.clearEventFiltersText, { color: colors.textSecondary }]}>Clear filters</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    {isEventFilterLoading ? (
                      <EventFeedSkeletonList />
                    ) : showEventFilterEmptyState ? (
                      <Text style={[styles.nearbyEventsEmptyText, { color: colors.textSecondary }]}>
                        No nearby active or upcoming events found.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
            ListEmptyComponent={shouldShowFeedSkeleton ? <FeedSkeletonList /> : null}
            ListFooterComponent={shouldShowFeedSkeleton ? null : <View style={{ height: 100 }} />}
            renderItem={renderFeedItem}
          />
        ) : (
          <MapContainer
            onBack={() => setSelectedType('Feed')}
            eventFilters={appliedEventFilters}
            filterRecenterKey={pendingMapFilterRecenterKey}
            onFilterRecenterHandled={handleMapFilterRecenterHandled}
            onCategoryChange={handleMapCategoryChange}
          />
        )}
      </View>

      <CommentsModal
        visible={commentModalVisible}
        onClose={() => {
          setCommentModalVisible(false);
          setSelectedCommentPost(null);
        }}
        momentId={selectedCommentPost?.id}
        likesCount={selectedCommentPost?.likesCount ?? 0}
        sharesCount={selectedCommentPost?.sharesCount ?? 0}
        onInteractionChange={(summary) => applyInteractionSummary(summary.momentId, summary)}
      />

      <ShareModal
        visible={shareModalVisible}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedSharePost(null);
        }}
        onRepost={selectedSharePost ? handleRepost : undefined}
        shareUrl={selectedSharePost ? `https://mooment.app/moments/${selectedSharePost.id}` : undefined}
        item={selectedSharePost ? {
          type: 'post',
          id: selectedSharePost.id,
          preview: selectedSharePost.caption,
          imageUrl: selectedSharePost.mediaItems?.[0]?.uri ?? selectedSharePost.mediaUris?.[0],
          authorName: selectedSharePost.authorName,
        } : undefined}
      />

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.starContainer}>
              <Feather name="star" size={60} color={colors.text} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>One Last step</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              We just need a few quick details to personalized your experience and get your account fully ready to go
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: buttonBackground(colors) }]}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/profile-screen/edit-profile');
              }}
            >
              <Text style={[styles.modalButtonText, { color: buttonForeground(colors) }]}>Add My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  container: {
    flex: 1,
    paddingTop: 24,
  },
  nearbyEventsSection: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  nearbyEventsHeaderRow: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nearbyEventsTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: -0.08,
    lineHeight: 16,
  },
  clearEventFiltersButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearEventFiltersText: {
    fontSize: 12,
    fontWeight: "600",
  },
  nearbyEventsEmptyText: {
    fontSize: 13,
    marginTop: 8,
  },
  yourFeedHeaderSection: {
    marginTop: 4,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  yourFeedDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  yourFeedTitle: {
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: -0.08,
    lineHeight: 16,
  },
  feedSkeletonList: {
    paddingBottom: 100,
  },
  eventSkeletonList: {
    paddingTop: 8,
  },
  feedSkeletonCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(17, 17, 17, 0.85)",
  },
  feedSkeletonCardLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEF",
  },
  feedSkeletonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: 12,
  },
  feedSkeletonBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  feedSkeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  feedSkeletonAuthor: {
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
  },
  feedSkeletonAuthorLine: {
    width: "54%",
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  feedSkeletonTimeLine: {
    width: "32%",
    height: 10,
    borderRadius: 5,
  },
  feedSkeletonMenu: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  feedSkeletonMedia: {
    width: "100%",
    aspectRatio: 1,
  },
  feedSkeletonActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 18,
  },
  feedSkeletonAction: {
    width: 42,
    height: 14,
    borderRadius: 7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#13131A",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  starContainer: {
    marginBottom: 32,
    marginTop: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  modalSubtitle: {
    color: "#8E8E9B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: "#B59EBE",
    width: "100%",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#17121B",
    fontSize: 16,
    fontWeight: "bold",
  },
});
