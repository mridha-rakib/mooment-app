import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Components
import HomeHeader from "@/components/home/HomeHeader";
import type { HomeFeedFilters, NearbyEventsFilter } from "@/components/home/FilterModal";
import MapContainer from "@/components/home/MapContainer";
import EventFeedCard from "@/components/home/EventFeedCard";
import PeopleToFollow, { SuggestedUser } from "@/components/home/PeopleToFollow";
import StoryCarousel, { StoryData } from "@/components/home/StoryCarousel";
import CommentsModal from "@/components/post/CommentsModal";
import FeedPost, { PostData } from "@/components/post/FeedPost";
import ShareModal from "@/components/post/ShareModal";

import { consumePendingNewMoment, deleteMoment, getFeedMoments, shareMoment } from "@/lib/moments";
import type { MomentInteractionSummary } from "@/lib/moments";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { mapMomentToPost } from "@/lib/momentPostMapper";
import { getStorageFileUrl } from "@/lib/storage";
import { getFeedStories } from "@/lib/stories";
import type { Story } from "@/lib/stories";
import { getSeenStoryIds } from "@/lib/storySeen";
import { getSuggestedUsers } from "@/lib/users";
import { getFeedEvents, type EventResponse } from "@/lib/events";
import { useAuthStore } from "@/stores/authStore";

const SUGGESTED_USERS_INSERT_AFTER = 4;
const MILES_TO_KM = 1.609344;

const groupStoriesByAuthor = (feedStories: Story[], seenStoryIds = new Set<string>(), currentUserId?: string): StoryData[] => {
  const groupedStories = new Map<string, Story[]>();

  feedStories.forEach((story) => {
    const authorId = story.author?.id ?? story.userId;
    const authorStories = groupedStories.get(authorId) ?? [];

    authorStories.push(story);
    groupedStories.set(authorId, authorStories);
  });

  return Array.from(groupedStories.entries()).map(([authorId, authorStories]) => {
    const sortedStories = [...authorStories].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const latestStory = sortedStories[sortedStories.length - 1];
    const title = latestStory.author?.name ?? 'Story';
    const storyItems = sortedStories
      .filter((story) => Boolean(story.mediaUrl))
      .map((story) => ({
        id: story.id,
        mediaUri: story.mediaUrl as string,
        durationSeconds: story.durationSeconds || 15,
        caption: story.caption,
        createdAt: story.createdAt,
      }));

    return {
      id: `story-group-${authorId}`,
      type: 'standard' as const,
      isOwnStory: currentUserId ? authorId === currentUserId : false,
      title,
      authorName: title,
      imageUri: latestStory.author?.avatarUrl ?? null,
      mediaUri: latestStory.mediaUrl,
      seen: storyItems.length > 0 && storyItems.every((story) => seenStoryIds.has(story.id)),
      storyItems,
    };
  });
};

type FeedItem =
  | { type: 'post'; id: string; data: PostData }
  | { type: 'event'; id: string; data: EventResponse }
  | { type: 'suggested_users'; id: string; data: SuggestedUser[] };

const buildFeedItems = (
  posts: PostData[],
  events: EventResponse[],
  suggestedUsers: SuggestedUser[],
): FeedItem[] => {
  type ContentItem =
    | { type: 'post'; id: string; data: PostData; sortTime: number }
    | { type: 'event'; id: string; data: EventResponse; sortTime: number };

  const contentItems: ContentItem[] = [
    ...posts.map((post) => ({
      type: 'post' as const,
      id: `moment-${post.id}`,
      data: post,
      sortTime: post.createdAt ? new Date(post.createdAt).getTime() : 0,
    })),
    ...events.map((event) => ({
      type: 'event' as const,
      id: `event-${event.id}`,
      data: event,
      sortTime: new Date(event.createdAt).getTime(),
    })),
  ].sort((a, b) => b.sortTime - a.sortTime);

  const items: FeedItem[] = [];
  let contentCount = 0;

  for (const item of contentItems) {
    if (item.type === 'post') {
      items.push({ type: 'post', id: item.id, data: item.data });
    } else {
      items.push({ type: 'event', id: item.id, data: item.data });
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

export default function HomeFeed() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const userId = useAuthStore((state) => state.user?.id);
  const [commentModalVisible, setCommentModalVisible] = React.useState(false);
  const [shareModalVisible, setShareModalVisible] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedType, setSelectedType] = useState('Feed');
  const [stories, setStories] = useState<StoryData[]>([{ id: 'add-story', type: 'add' }]);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [feedMomentPosts, setFeedMomentPosts] = useState<PostData[]>([]);
  const [feedEvents, setFeedEvents] = useState<EventResponse[]>([]);
  const [activeHashtags, setActiveHashtags] = useState<string[]>([]);
  const [nearbyEventFilter, setNearbyEventFilter] = useState<NearbyEventsFilter | null>(null);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [selectedCommentPost, setSelectedCommentPost] = useState<PostData | null>(null);
  const [selectedSharePost, setSelectedSharePost] = useState<PostData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const feedRequestIdRef = useRef(0);
  const params = useLocalSearchParams();

  useEffect(() => {
    if (params.showSuccess === "true") {
      setShowSuccessModal(true);
      router.setParams({ showSuccess: undefined });
    }

    if (params.view === 'map') {
      setSelectedType('Map');
      router.setParams({ view: undefined });
    }
  }, [params.showSuccess, params.view]);

  const loadStories = useCallback(async () => {
    try {
      const [feedStories, seenStoryIds] = await Promise.all([
        getFeedStories(),
        getSeenStoryIds(),
      ]);
      setStories([
        { id: 'add-story', type: 'add' },
        ...groupStoriesByAuthor(feedStories, seenStoryIds, userId),
      ]);
    } catch {
      setStories([{ id: 'add-story', type: 'add' }]);
    }
  }, [userId]);

  const loadFeed = useCallback(async () => {
    const requestId = ++feedRequestIdRef.current;
    setIsFeedLoading(true);
    const [momentsResult, eventsResult] = await Promise.allSettled([
      getFeedMoments({ hashtags: activeHashtags }),
      getFeedEvents(nearbyEventFilter
        ? {
            latitude: nearbyEventFilter.latitude,
            longitude: nearbyEventFilter.longitude,
            radiusKm: nearbyEventFilter.radiusMiles * MILES_TO_KM,
            limit: 100,
          }
        : {}),
    ]);

    if (requestId !== feedRequestIdRef.current) return;

    if (momentsResult.status === "fulfilled") {
      setFeedMomentPosts(
        momentsResult.value
          .map((moment) => mapMomentToPost(moment, {
            storageUrlResolver: getStorageFileUrl,
          }))
          .filter((post): post is PostData => Boolean(post)),
      );
    } else {
      setFeedMomentPosts([]);
    }

    setFeedEvents(
      (nearbyEventFilter || activeHashtags.length === 0) && eventsResult.status === "fulfilled"
        ? eventsResult.value
        : [],
    );
    setIsFeedLoading(false);
  }, [activeHashtags, nearbyEventFilter]);

  const handleFilterChange = useCallback((filters: HomeFeedFilters) => {
    setActiveHashtags(filters.hashtags);
    setNearbyEventFilter(filters.nearby);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadStories(), loadFeed()]);
    setIsRefreshing(false);
  }, [loadFeed, loadStories]);

  useFocusEffect(
    useCallback(() => {
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
      void loadFeed();
    }, [loadFeed, loadStories]),
  );

  useEffect(() => {
    let isMounted = true;

    const loadSuggestedUsers = async () => {
      try {
        const users = await getSuggestedUsers(10);

        if (!isMounted) return;

        setSuggestedUsers(users.map((user) => ({
          id: user.id,
          name: user.name,
          avatarUri: user.avatarUrl?.trim() || (user.avatarKey ? getStorageFileUrl(user.avatarKey) : null),
          isFollowing: user.isFollowing,
        })));
      } catch {
        if (isMounted) {
          setSuggestedUsers([]);
        }
      }
    };

    void loadSuggestedUsers();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleCommentPress = (post: PostData) => {
    setSelectedCommentPost(post);
    setCommentModalVisible(true);
  };

  const handleSharePress = (post: PostData) => {
    setSelectedSharePost(post);
    setShareModalVisible(true);
  };

  const handleRepost = useCallback(async () => {
    if (!selectedSharePost) return;

    try {
      const share = await shareMoment(selectedSharePost.id);

      applyInteractionSummary(selectedSharePost.id, {
        momentId: selectedSharePost.id,
        likesCount: share.moment.likesCount,
        commentsCount: share.moment.commentsCount,
        sharesCount: share.moment.sharesCount,
        isLiked: share.moment.isLiked,
      });
      setShareModalVisible(false);
      setSelectedSharePost(null);
      Alert.alert('Reposted', 'This post now appears on your timeline.');
    } catch (error) {
      Alert.alert('Unable to repost', getAuthErrorMessage(error, 'Please try sharing this post again.'));
    }
  }, [applyInteractionSummary, selectedSharePost]);

  const handleAuthorFollowChange = useCallback((authorId: string, isFollowing: boolean) => {
    setFeedMomentPosts((currentPosts) => currentPosts.map((post) => (
      post.authorId === authorId ? { ...post, isFollowing } : post
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

  const feedItems = buildFeedItems(feedMomentPosts, feedEvents, suggestedUsers);

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <HomeHeader
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          activeHashtags={activeHashtags}
          activeNearbyFilter={nearbyEventFilter}
          onFilterChange={handleFilterChange}
          overlay={selectedType === 'Map'}
        />

        {selectedType === 'Feed' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <StoryCarousel stories={stories} />

            {nearbyEventFilter ? (
              <View style={styles.nearbyEventsSection}>
                <Text style={[styles.nearbyEventsTitle, { color: '#B3B3B3' }]}>Nearby Events you can join</Text>
                {!isFeedLoading && feedEvents.length === 0 ? (
                  <Text style={[styles.nearbyEventsEmptyText, { color: colors.textSecondary }]}>
                    No nearby active or upcoming events found.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {feedItems.map((item) => {
              if (item.type === 'post') {
                return (
                  <FeedPost
                    key={item.id}
                    post={item.data}
                    onCommentPress={handleCommentPress}
                    onSharePress={handleSharePress}
                    onViewMapPress={() => setSelectedType('Map')}
                    onAuthorFollowChange={handleAuthorFollowChange}
                    onInteractionChange={applyInteractionSummary}
                    onDeletePress={handleDeletePost}
                  />
                );
              }
              if (item.type === 'event') {
                return <EventFeedCard key={item.id} event={item.data} />;
              }
              if (item.type === 'suggested_users') {
                return <PeopleToFollow key={item.id} users={item.data} />;
              }
              return null;
            })}

            <View style={{ height: 100 }} />
          </ScrollView>
        ) : (
          <MapContainer onBack={() => setSelectedType('Feed')} />
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
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/profile-screen/edit-profile');
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.background }]}>Add My Profile</Text>
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
  nearbyEventsTitle: {
    fontSize: 16,
    fontWeight: "400",
    letterSpacing: -0.08,
    lineHeight: 16,
  },
  nearbyEventsEmptyText: {
    fontSize: 13,
    marginTop: 8,
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
