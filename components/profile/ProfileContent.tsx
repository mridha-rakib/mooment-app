import React from "react";
import { ActivityIndicator, FlatList, StyleSheet, View, Text, type RefreshControlProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { MomentInteractionSummary, MomentTimelineItem } from "@/lib/moments";
import type { EventResponse, ProfileEventGroups } from "@/lib/events";
import EventFeedCard from "../home/EventFeedCard";
import FeedPost, { PostData } from "../post/FeedPost";
import RepostFeedCard from "../post/RepostFeedCard";
import ProfileEvents from "./ProfileEvents";
import { ProfileTabType } from "./ProfileTabs";

type ProfileContentProps = {
  activeTab: ProfileTabType;
  posts: PostData[];
  reposts?: MomentTimelineItem[];
  onCommentPress: (post: PostData) => void;
  onSharePress: (post: PostData) => void;
  onDeletePost?: (post: PostData) => void;
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
};

export default function ProfileContent({ 
  activeTab, 
  posts, 
  reposts = [],
  onCommentPress, 
  onSharePress,
  onDeletePost,
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
}: ProfileContentProps) {
  const { colors } = useTheme();
  const feedItems = [
    ...posts.map((post) => ({ type: 'post' as const, id: post.id, createdAt: post.createdAt ?? '', post })),
    ...reposts.map((share) => ({ type: 'repost' as const, id: share.id, createdAt: share.createdAt, share })),
    ...profileFeedEvents.map((event) => ({
      type: 'event' as const,
      id: event.id,
      createdAt: event.publishedAt ?? event.createdAt ?? event.scheduledAt ?? '',
      event,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const firstEventRepostId = feedItems.find((item) => (
    item.type === 'repost' && item.share.originalItem?.type === 'event'
  ))?.id;
  
  if (activeTab === 'feed') {
    return (
      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListHeaderComponent={listHeaderComponent}
        refreshControl={refreshControl}
        onEndReachedThreshold={0.5}
        onEndReached={onLoadMoreFeed}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet</Text>
          </View>
        )}
        ListFooterComponent={isFeedLoadingMore ? (
          <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} />
        ) : <View style={{ height: 100 }} />}
        renderItem={({ item }) => {
            if (item.type === 'repost') {
              return (
                <RepostFeedCard
                  key={`repost-${item.id}`}
                  share={item.share}
                  labelOverride={isOwnProfile ? 'Shared by you' : undefined}
                  onRepostSuccess={onRepostSuccess}
                  showLoadingIndicator={item.share.originalItem?.type !== 'event' || item.id === firstEventRepostId}
                />
              );
            }

            if (item.type === 'event') {
              return <EventFeedCard key={`event-${item.id}`} event={item.event} />;
            }

            return (
              <FeedPost key={`post-${item.id}`} post={item.post} onCommentPress={onCommentPress} onSharePress={onSharePress}
                onDeletePress={onDeletePost} onInteractionChange={onInteractionChange} isOwnPost={isOwnProfile} />
            );
          }}
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
