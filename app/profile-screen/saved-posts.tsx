import CommentsModal from "@/components/post/CommentsModal";
import EventFeedCard from "@/components/home/EventFeedCard";
import FeedPost, { PostData } from '@/components/post/FeedPost';
import ShareModal from "@/components/post/ShareModal";
import { useTheme } from '@/hooks/useTheme';
import { getEventById, type EventResponse } from "@/lib/events";
import { getSavedMoments } from '@/lib/moments';
import type { Moment } from "@/lib/moments";
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { getStorageFileUrl } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, type ViewToken } from 'react-native';

const SAVED_POST_VIDEO_VIEWABILITY_THRESHOLD = 60;

const hasVideoMedia = (post: PostData) => (
  post.mediaItems?.some((item) => item.type === 'video' && Boolean(item.uri?.trim())) ?? false
);

type SavedPostItem = {
  type: "post";
  id: string;
  post: PostData;
};

type SavedEventItem = {
  type: "event";
  id: string;
  eventId: string;
  interactionMoment: Moment;
  event?: EventResponse;
  isLoading: boolean;
  isUnavailable: boolean;
};

type SavedListItem = SavedPostItem | SavedEventItem;

const hasText = (value?: string | null) => Boolean(value?.trim());

const isSavedEventMoment = (moment: Moment) => (
  moment.mode === "event" &&
  hasText(moment.eventId) &&
  hasText(moment.eventTitle)
);

const withSavedInteractionState = (event: EventResponse, interactionMoment: Moment): EventResponse => ({
  ...event,
  interactionMomentId: interactionMoment.id,
  likesCount: interactionMoment.likesCount,
  commentsCount: interactionMoment.commentsCount,
  sharesCount: interactionMoment.sharesCount,
  isLiked: interactionMoment.isLiked,
  isSaved: interactionMoment.isSaved,
});

export default function SavedPostsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [items, setItems] = useState<SavedListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePost, setActivePost] = useState<PostData | null>(null);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: SAVED_POST_VIDEO_VIEWABILITY_THRESHOLD,
    minimumViewTime: 120,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const nextActiveVideoPost = viewableItems
      .filter((viewToken) => (
        viewToken.isViewable &&
        (viewToken.item as SavedListItem).type === "post" &&
        hasVideoMedia((viewToken.item as SavedPostItem).post)
      ))
      .sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER))[0];

    setActiveVideoPostId((current) => {
      const nextItem = nextActiveVideoPost?.item as SavedPostItem | undefined;
      const nextId = nextItem?.post.id ?? null;
      return current === nextId ? current : nextId;
    });
  }).current;

  const loadSavedPosts = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    setIsLoading(true);

    try {
      const moments = await getSavedMoments();
      const nextItems = moments.flatMap((moment): SavedListItem[] => {
        if (isSavedEventMoment(moment) && moment.eventId) {
          return [{
            type: "event",
            id: moment.id,
            eventId: moment.eventId,
            interactionMoment: moment,
            isLoading: true,
            isUnavailable: false,
          }];
        }

        const post = mapMomentToPost(moment, { storageUrlResolver: getStorageFileUrl });

        return post ? [{ type: "post", id: post.id, post }] : [];
      });

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setItems(nextItems);
      setIsLoading(false);

      const eventIds = [...new Set(
        nextItems
          .filter((item): item is SavedEventItem => item.type === "event")
          .map((item) => item.eventId),
      )];

      if (eventIds.length === 0) {
        return;
      }

      const eventEntries = await Promise.all(
        eventIds.map(async (eventId) => {
          try {
            return [eventId, await getEventById(eventId)] as const;
          } catch {
            return [eventId, null] as const;
          }
        }),
      );

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      const eventById = new Map(eventEntries);

      setItems((current) => current.map((item) => {
        if (item.type !== "event") {
          return item;
        }

        const event = eventById.get(item.eventId);

        return {
          ...item,
          event: event ? withSavedInteractionState(event, item.interactionMoment) : undefined,
          isLoading: false,
          isUnavailable: !event,
        };
      }));
    } catch {
      // Keep the last successfully loaded list if a refresh fails.
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadSavedPosts();

    return () => {
      setActiveVideoPostId(null);
    };
  }, [loadSavedPosts]));

  const handleCommentPress = (post: PostData) => {
    setActivePost(post);
    setCommentModalVisible(true);
  };

  const handleSharePress = (post: PostData) => {
    setActivePost(post);
    setShareModalVisible(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Posts</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={isLoading ? [] : items}
        keyExtractor={(item) => item.id}
        extraData={activeVideoPostId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        removeClippedSubviews
        ListEmptyComponent={(
          isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.centerState}>
              <Feather name="bookmark" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saved posts yet</Text>
            </View>
          )
        )}
        renderItem={({ item }) => {
          if (item.type === "event") {
            return (
              <View key={item.id} style={styles.postWrapper}>
                {item.isLoading ? (
                  <ActivityIndicator style={styles.eventLoading} color={colors.primary} />
                ) : item.event && !item.isUnavailable ? (
                  <EventFeedCard
                    event={item.event}
                    onSaveChange={(interactionMomentId, isSaved) => {
                      if (!isSaved) {
                        setItems((current) => current.filter((savedItem) => savedItem.id !== interactionMomentId));
                      }
                    }}
                  />
                ) : (
                  <View style={[styles.unavailable, { borderColor: colors.border }]}>
                    <Feather name="alert-circle" size={22} color={colors.textSecondary} />
                    <Text style={[styles.unavailableText, { color: colors.textSecondary }]}>
                      The original item is no longer available.
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          const post = item.post;

          return (
            <View key={post.id} style={styles.postWrapper}>
              <FeedPost
                post={post}
                onCommentPress={handleCommentPress}
                onSharePress={handleSharePress}
                isActiveVideo={activeVideoPostId === post.id}
                onSaveChange={(postId, isSaved) => {
                  if (!isSaved) {
                    setItems((current) => current.filter((savedItem) => savedItem.id !== postId));
                    setActiveVideoPostId((current) => current === postId ? null : current);
                  }
                }}
              />
            </View>
          );
        }}
      />

      <CommentsModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        momentId={activePost?.id}
      />

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 80,
  },
  postWrapper: {
    marginBottom: 0,
  },
  eventLoading: {
    marginVertical: 36,
  },
  unavailable: {
    minHeight: 112,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  unavailableText: {
    fontSize: 13,
  },
  centerState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
