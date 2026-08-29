import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View, Text, type ListRenderItem, type RefreshControlProps, type ViewToken } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { MomentInteractionSummary, MomentTimelineItem } from "@/lib/moments";
import type { EventResponse, ProfileEventGroups } from "@/lib/events";
import EventFeedCard from "../home/EventFeedCard";
import FeedPost, { PostData } from "../post/FeedPost";
import RepostFeedCard from "../post/RepostFeedCard";
import ProfileEvents from "./ProfileEvents";
import { ProfileFeedSkeletonList } from "./ProfileSkeletons";
import { ProfileTabType } from "./ProfileTabs";
import type { ProfileEventsFilter } from "./ProfileEvents";

type ProfileContentProps = {
  activeTab: ProfileTabType;
  posts: PostData[];
  reposts?: MomentTimelineItem[];
  onCommentPress: (post: PostData) => void;
  onSharePress: (post: PostData) => void;
  onDeletePost?: (post: PostData) => void;
  onShareUpdated?: (share: MomentTimelineItem) => void;
  onShareDeleted?: (shareId: string) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  isOwnProfile?: boolean;
  profileUserId: string;
  profileIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  onRepostSuccess?: () => void;
  profileEvents: ProfileEventGroups;
  onProfileEventsChange?: (events: ProfileEventGroups) => void;
  profileFeedEvents?: EventResponse[];
  listHeaderComponent?: React.ReactElement;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  onLoadMoreFeed?: () => void;
  isFeedLoadingMore?: boolean;
  onLoadMoreEvents?: (filter: "active" | "past") => void;
  isEventsLoadingMore?: boolean;
  feedLoading?: boolean;
  eventsLoading?: boolean;
  eventsError?: string | null;
  onRetryEvents?: () => void;
};

const PROFILE_VIDEO_VIEWABILITY_THRESHOLD = 60;

const hasVideoMedia = (post: PostData) => (
  post.mediaItems?.some((item) => item.type === 'video' && Boolean(item.uri?.trim())) ?? false
);

const hasRepostVideoMedia = (share: MomentTimelineItem) => (
  share.moment.mediaItems?.some((item) => item.type === 'video' && Boolean((item.url ?? item.storageKey)?.trim())) ?? false
);

export default function ProfileContent({ 
  activeTab, 
  posts, 
  reposts = [],
  onCommentPress, 
  onSharePress,
  onDeletePost,
  onShareUpdated,
  onShareDeleted,
  onInteractionChange,
  isOwnProfile = true,
  profileUserId,
  profileIsFollowing,
  onFollowChange,
  onRepostSuccess,
  profileEvents,
  onProfileEventsChange,
  profileFeedEvents = [],
  listHeaderComponent,
  refreshControl,
  onLoadMoreFeed,
  isFeedLoadingMore = false,
  onLoadMoreEvents,
  isEventsLoadingMore = false,
  feedLoading = false,
  eventsLoading = false,
  eventsError,
  onRetryEvents,
}: ProfileContentProps) {
  const { colors } = useTheme();
  const [activeVideoItemId, setActiveVideoItemId] = useState<string | null>(null);
  const [eventsFilter, setEventsFilter] = useState<ProfileEventsFilter>("active");
  const feedItems = useMemo(() => [
    ...posts.map((post) => ({ type: 'post' as const, id: post.id, createdAt: post.createdAt ?? '', post })),
    ...reposts.map((share) => ({ type: 'repost' as const, id: share.id, createdAt: share.createdAt, share })),
    ...profileFeedEvents.map((event) => ({
      type: 'event' as const,
      id: event.id,
      createdAt: event.publishedAt ?? event.createdAt ?? event.scheduledAt ?? '',
      event,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [posts, reposts, profileFeedEvents]);
  type FeedItem = (typeof feedItems)[number];
  const firstEventRepostId = useMemo(() => feedItems.find((item) => (
    item.type === 'repost' && item.share.originalItem?.type === 'event'
  ))?.id, [feedItems]);
  const headerWithGap = useMemo(() => (
    listHeaderComponent ? (
      <>
        {listHeaderComponent}
        <View style={styles.afterTabsGap} />
      </>
    ) : undefined
  ), [listHeaderComponent]);

  const renderFeedItem = useCallback<ListRenderItem<FeedItem>>(({ item }) => {
    if (item.type === 'repost') {
      return (
        <RepostFeedCard
          key={`repost-${item.id}`}
          share={item.share}
          labelOverride={isOwnProfile ? 'Shared by you' : undefined}
          onRepostSuccess={onRepostSuccess}
          onShareUpdated={onShareUpdated}
          onShareDeleted={onShareDeleted}
          showLoadingIndicator={item.share.originalItem?.type !== 'event' || item.id === firstEventRepostId}
          isActiveVideo={activeVideoItemId === `repost-${item.id}`}
        />
      );
    }

    if (item.type === 'event') {
      return <EventFeedCard key={`event-${item.id}`} event={item.event} />;
    }

    return (
      <FeedPost key={`post-${item.id}`} post={item.post} onCommentPress={onCommentPress} onSharePress={onSharePress}
        onDeletePress={onDeletePost} onInteractionChange={onInteractionChange} isOwnPost={isOwnProfile}
        isActiveVideo={activeVideoItemId === `post-${item.id}`} />
    );
  }, [
    activeVideoItemId,
    firstEventRepostId,
    isOwnProfile,
    onCommentPress,
    onDeletePost,
    onInteractionChange,
    onRepostSuccess,
    onShareDeleted,
    onSharePress,
    onShareUpdated,
  ]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: PROFILE_VIDEO_VIEWABILITY_THRESHOLD,
    minimumViewTime: 120,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const nextActiveVideoItem = viewableItems
      .filter((viewToken) => {
        if (!viewToken.isViewable) {
          return false;
        }

        const item = viewToken.item as (typeof feedItems)[number];
        return (item.type === 'post' && hasVideoMedia(item.post))
          || (item.type === 'repost' && hasRepostVideoMedia(item.share));
      })
      .sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER))[0];

    const nextId = nextActiveVideoItem ? `${(nextActiveVideoItem.item as (typeof feedItems)[number]).type}-${(nextActiveVideoItem.item as (typeof feedItems)[number]).id}` : null;
    setActiveVideoItemId((current) => (current === nextId ? current : nextId));
  }).current;

  useEffect(() => {
    if (activeTab !== 'feed') {
      setActiveVideoItemId(null);
    }
  }, [activeTab]);
  
  if (activeTab === 'feed') {
    return (
      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={headerWithGap}
        refreshControl={refreshControl}
        onEndReachedThreshold={0.5}
        onEndReached={onLoadMoreFeed}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        extraData={activeVideoItemId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={feedLoading ? (
          <ProfileFeedSkeletonList />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet</Text>
          </View>
        )}
        ListFooterComponent={isFeedLoadingMore ? (
          <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} />
        ) : <View style={{ height: 100 }} />}
        renderItem={renderFeedItem}
      />
    );
  }

  return (
        <ProfileEvents
          isOwnProfile={isOwnProfile}
          profileUserId={profileUserId}
          profileIsFollowing={profileIsFollowing}
          events={profileEvents}
          onEventsChange={onProfileEventsChange}
          listHeaderComponent={listHeaderComponent}
          refreshControl={refreshControl}
          onLoadMore={onLoadMoreEvents}
          isLoadingMore={isEventsLoadingMore}
          isLoading={eventsLoading}
          errorMessage={eventsError}
          onRetry={onRetryEvents}
          filter={eventsFilter}
          onFilterChange={setEventsFilter}
        />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  listContent: {
    paddingTop: 10,
  },
  afterTabsGap: {
    height: 10,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 18,
  },
});
