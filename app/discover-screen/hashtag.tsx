import FeedPost, { type PostData } from '@/components/post/FeedPost';
import { useTheme } from '@/hooks/useTheme';
import { normalizeHashtag } from '@/lib/hashtags';
import { safeBack } from '@/lib/navigation';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { getHashtagMomentsPage } from '@/lib/moments';
import { getHashtagEventsPage, type EventResponse } from '@/lib/events';
import { getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { getHashtagResultSections } from '@/lib/hashtagResultSections';
import { mergeById } from '@/lib/pagedList';
import { getStorageFileUrl } from '@/lib/storage';
import SearchStateMessage from '@/components/search/SearchStateMessage';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HASHTAG_VIDEO_VIEWABILITY_THRESHOLD = 60;
const HASHTAG_POSTS_PAGE_SIZE = 30;
const HASHTAG_EVENTS_PAGE_SIZE = 20;
// Never block hashtag search on a slow/stalled GPS fix — cap how long we wait for a
// silent (no permission-prompt) location read before falling back to non-nearby ordering.
const LOCATION_LOOKUP_TIMEOUT_MS = 4000;

type HashtagLocation = { latitude: number; longitude: number } | null;

const hasVideoMedia = (post: PostData) => (
  post.mediaItems?.some((item) => item.type === 'video' && Boolean(item.uri?.trim())) ?? false
);

const resolveStorageUrl = (key?: string | null) => {
  if (!key) {
    return null;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return null;
  }
};

const formatEventSchedule = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return 'Date TBA';
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return 'Date TBA';
  }

  const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);

  return `${day} • ${time}`;
};

const getEventSubtitle = (event: EventResponse) => {
  const host = event.host?.name || event.host?.username;
  const location = event.location?.venue || event.location?.address || event.location?.searchLabel;

  return [host, formatEventSchedule(event.scheduledAt), location].filter(Boolean).join(' • ');
};

const getLocationForHashtagSearch = async (): Promise<HashtagLocation> => {
  try {
    return await Promise.race([
      getCurrentLocationIfPermissionGranted(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_LOOKUP_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
};

const toPostData = (moments: Awaited<ReturnType<typeof getHashtagMomentsPage>>['moments']): PostData[] =>
  moments
    .map((moment) => mapMomentToPost(moment, { storageUrlResolver: getStorageFileUrl }))
    .filter((post): post is PostData => Boolean(post));

export default function HashtagPostsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tag?: string }>();
  const tag = normalizeHashtag(typeof params.tag === 'string' ? params.tag : '');

  const [posts, setPosts] = useState<PostData[]>([]);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [eventsCursor, setEventsCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postsError, setPostsError] = useState(false);
  const [eventsError, setEventsError] = useState(false);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [eventsLoadingMore, setEventsLoadingMore] = useState(false);
  const [postsLoadMoreError, setPostsLoadMoreError] = useState(false);
  const [eventsLoadMoreError, setEventsLoadMoreError] = useState(false);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);

  // Only the latest first-page / refresh request may apply its results, cursors
  // or error. A load-more only applies while it belongs to the same generation,
  // so an overlapping refresh always wins and a stale response can never append.
  const requestRef = useRef(0);
  // The location resolved for the first page is reused for "load more" so every
  // Event page is ordered against the same origin.
  const eventLocationRef = useRef<HashtagLocation>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: HASHTAG_VIDEO_VIEWABILITY_THRESHOLD,
    minimumViewTime: 120,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const nextActiveVideoPost = viewableItems
      .filter((viewToken) => viewToken.isViewable && hasVideoMedia(viewToken.item as PostData))
      .sort((a, b) => (a.index ?? Number.MAX_SAFE_INTEGER) - (b.index ?? Number.MAX_SAFE_INTEGER))[0];
    const nextId = (nextActiveVideoPost?.item as PostData | undefined)?.id ?? null;

    setActiveVideoPostId((current) => (current === nextId ? current : nextId));
  }).current;

  // First page (mount / tag change / pull-to-refresh / Retry). Posts (Moments)
  // and Events are independent, additive result sets for the same EXACT hashtag —
  // no prefix/morphology expansion here (that stays a Search-probe affordance).
  const loadFirstPage = useCallback(async () => {
    const generation = (requestRef.current += 1);
    setPostsLoadMoreError(false);
    setEventsLoadMoreError(false);

    if (!tag) {
      setPosts([]);
      setEvents([]);
      setPostsCursor(null);
      setEventsCursor(null);
      setPostsError(false);
      setEventsError(false);
      setIsLoading(false);
      return;
    }

    const [momentsResult, eventsResult] = await Promise.allSettled([
      getHashtagMomentsPage(tag, { limit: HASHTAG_POSTS_PAGE_SIZE }),
      (async () => {
        const location = await getLocationForHashtagSearch();
        eventLocationRef.current = location;
        return getHashtagEventsPage(tag, {
          limit: HASHTAG_EVENTS_PAGE_SIZE,
          ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        });
      })(),
    ]);

    if (requestRef.current !== generation) {
      return;
    }

    if (momentsResult.status === 'fulfilled') {
      setPosts(toPostData(momentsResult.value.moments));
      setPostsCursor(momentsResult.value.nextCursor);
      setPostsError(false);
    } else {
      setPosts([]);
      setPostsCursor(null);
      setPostsError(true);
    }

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.events);
      setEventsCursor(eventsResult.value.nextCursor);
      setEventsError(false);
    } else {
      setEvents([]);
      setEventsCursor(null);
      setEventsError(true);
    }

    setIsLoading(false);
  }, [tag]);

  useEffect(() => {
    setIsLoading(true);
    void loadFirstPage();
  }, [loadFirstPage]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadFirstPage();
    setIsRefreshing(false);
  };

  const loadMorePosts = useCallback(async () => {
    if (!tag || !postsCursor || postsLoadingMore || postsError) {
      return;
    }

    const generation = requestRef.current;
    setPostsLoadingMore(true);
    setPostsLoadMoreError(false);

    try {
      const page = await getHashtagMomentsPage(tag, {
        limit: HASHTAG_POSTS_PAGE_SIZE,
        cursor: postsCursor,
      });

      if (requestRef.current !== generation) {
        return;
      }

      const mapped = toPostData(page.moments);
      setPosts((prev) => mergeById(prev, mapped, (post) => post.id));
      setPostsCursor(page.nextCursor);
    } catch {
      if (requestRef.current === generation) {
        // Keep the rows already loaded; leave the cursor intact so Retry works.
        setPostsLoadMoreError(true);
      }
    } finally {
      if (requestRef.current === generation) {
        setPostsLoadingMore(false);
      }
    }
  }, [tag, postsCursor, postsLoadingMore, postsError]);

  const loadMoreEvents = useCallback(async () => {
    if (!tag || !eventsCursor || eventsLoadingMore || eventsError) {
      return;
    }

    const generation = requestRef.current;
    setEventsLoadingMore(true);
    setEventsLoadMoreError(false);

    try {
      const location = eventLocationRef.current;
      const page = await getHashtagEventsPage(tag, {
        limit: HASHTAG_EVENTS_PAGE_SIZE,
        cursor: eventsCursor,
        ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
      });

      if (requestRef.current !== generation) {
        return;
      }

      setEvents((prev) => mergeById(prev, page.events, (event) => event.id));
      setEventsCursor(page.nextCursor);
    } catch {
      if (requestRef.current === generation) {
        setEventsLoadMoreError(true);
      }
    } finally {
      if (requestRef.current === generation) {
        setEventsLoadingMore(false);
      }
    }
  }, [tag, eventsCursor, eventsLoadingMore, eventsError]);

  const { showEvents, showPosts } = getHashtagResultSections(events.length, posts.length);
  const bothFailed = postsError && eventsError;
  const nothingToShow = !showEvents && !showPosts;

  const renderBody = () => {
    if (isLoading) {
      return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
    }

    if (bothFailed || (nothingToShow && (postsError || eventsError))) {
      return <SearchStateMessage variant="error" onRetry={() => { void loadFirstPage(); }} />;
    }

    if (nothingToShow) {
      return <SearchStateMessage variant="empty" />;
    }

    return (
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
        renderItem={({ item }) => <FeedPost post={item} isActiveVideo={activeVideoPostId === item.id} />}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        extraData={activeVideoPostId}
        onEndReachedThreshold={0.5}
        onEndReached={() => { void loadMorePosts(); }}
        ListHeaderComponent={(
          <>
            {showEvents && (
              <View style={styles.eventsSection}>
                <Text style={[styles.eventsSectionTitle, { color: colors.textSecondary }]}>Events</Text>
                {events.map((event) => {
                  const imageUrl = resolveStorageUrl(event.bannerImageKey);

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventListItem}
                      onPress={() => router.push({ pathname: '/event-screen/event', params: { eventId: event.id } })}
                    >
                      {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={[styles.eventImage, { borderColor: colors.border }]} />
                      ) : (
                        <View style={[styles.eventImage, styles.eventImagePlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <Feather name="calendar" size={20} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.eventTextContainer}>
                        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{event.name || 'Untitled Event'}</Text>
                        <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{getEventSubtitle(event)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {eventsLoadingMore ? (
                  <View style={styles.inlineLoader}><ActivityIndicator color={colors.textSecondary} /></View>
                ) : eventsLoadMoreError ? (
                  <TouchableOpacity onPress={() => { void loadMoreEvents(); }} style={styles.loadMoreBtn}>
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Couldn&apos;t load more events. Retry</Text>
                  </TouchableOpacity>
                ) : eventsCursor ? (
                  <TouchableOpacity onPress={() => { void loadMoreEvents(); }} style={styles.loadMoreBtn}>
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load more events</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            {eventsError && showPosts && (
              <TouchableOpacity onPress={() => { void loadFirstPage(); }} style={[styles.eventsSection, styles.loadMoreBtn]}>
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Couldn&apos;t load events. Retry</Text>
              </TouchableOpacity>
            )}
            {showPosts && (
              <View style={styles.eventsSection}>
                <Text style={[styles.eventsSectionTitle, { color: colors.textSecondary }]}>Posts</Text>
              </View>
            )}
            {postsError && showEvents && (
              <TouchableOpacity onPress={() => { void loadFirstPage(); }} style={[styles.eventsSection, styles.loadMoreBtn]}>
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>Couldn&apos;t load posts. Retry</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          postsLoadingMore ? (
            <View style={styles.inlineLoader}><ActivityIndicator color={colors.textSecondary} /></View>
          ) : postsLoadMoreError ? (
            <TouchableOpacity onPress={() => { void loadMorePosts(); }} style={styles.loadMoreBtn}>
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>Couldn&apos;t load more. Retry</Text>
            </TouchableOpacity>
          ) : <View style={styles.bottomSpace} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => safeBack(router, '/(tabs)/explore')} style={[styles.backButton, { backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>#{tag}</Text>
        <View style={styles.backButton} />
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  backButton: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  title: { fontSize: 18, fontWeight: '700' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  bottomSpace: { height: 40 },
  inlineLoader: { paddingVertical: 16 },
  loadMoreBtn: { alignSelf: 'flex-start', paddingVertical: 10 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
  eventsSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  eventsSectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 18, textTransform: 'capitalize' },
  eventListItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  eventImage: { width: 52, height: 52, borderRadius: 12, marginRight: 14, borderWidth: 1 },
  eventImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  eventTextContainer: { flex: 1, justifyContent: 'center' },
  eventTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  eventSubtitle: { fontSize: 13, lineHeight: 18 },
});
