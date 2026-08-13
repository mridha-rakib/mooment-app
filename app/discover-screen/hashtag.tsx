import FeedPost, { type PostData } from '@/components/post/FeedPost';
import { useTheme } from '@/hooks/useTheme';
import { normalizeHashtag } from '@/lib/hashtags';
import { safeBack } from '@/lib/navigation';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { getHashtagMoments } from '@/lib/moments';
import { getHashtagEvents, type EventResponse } from '@/lib/events';
import { getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { getHashtagResultSections } from '@/lib/hashtagResultSections';
import { getStorageFileUrl } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HASHTAG_VIDEO_VIEWABILITY_THRESHOLD = 60;
const HASHTAG_EVENTS_LIMIT = 20;
// Never block hashtag search on a slow/stalled GPS fix — cap how long we wait for a
// silent (no permission-prompt) location read before falling back to non-nearby ordering.
const LOCATION_LOOKUP_TIMEOUT_MS = 4000;

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

const getLocationForHashtagSearch = async (): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    return await Promise.race([
      getCurrentLocationIfPermissionGranted(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_LOOKUP_TIMEOUT_MS)),
    ]);
  } catch {
    return null;
  }
};

export default function HashtagPostsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tag?: string }>();
  const tag = normalizeHashtag(typeof params.tag === 'string' ? params.tag : '');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);

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

  // Posts (Moments) and Events are independent, additive result sets for the same
  // hashtag — Moment hashtag search behavior here is unchanged from before this feature;
  // Events are a new, separately-fetched addition rendered above the existing post list.
  const loadResults = useCallback(async () => {
    if (!tag) {
      setPosts([]);
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const [momentsResult, eventsResult] = await Promise.allSettled([
      getHashtagMoments(tag, 100),
      (async () => {
        const location = await getLocationForHashtagSearch();
        return getHashtagEvents(tag, {
          limit: HASHTAG_EVENTS_LIMIT,
          ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
        });
      })(),
    ]);

    setPosts(momentsResult.status === 'fulfilled'
      ? momentsResult.value
          .map((moment) => mapMomentToPost(moment, { storageUrlResolver: getStorageFileUrl }))
          .filter((post): post is PostData => Boolean(post))
      : []);
    setEvents(eventsResult.status === 'fulfilled' ? eventsResult.value : []);
    setIsLoading(false);
  }, [tag]);

  useEffect(() => { void loadResults(); }, [loadResults]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadResults();
    setIsRefreshing(false);
  };

  const { showEvents, showPosts } = getHashtagResultSections(events.length, posts.length);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => safeBack(router, '/(tabs)/explore')} style={[styles.backButton, { backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>#{tag}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : !showEvents && !showPosts ? (
        <View style={styles.center}><Text style={{ color: colors.textSecondary }}>No posts or events found for #{tag}.</Text></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => <FeedPost post={item} isActiveVideo={activeVideoPostId === item.id} />}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          extraData={activeVideoPostId}
          ListHeaderComponent={(showEvents || showPosts) ? (
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
                          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.name || 'Untitled Event'}</Text>
                          <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>{getEventSubtitle(event)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              {showPosts && (
                <View style={styles.eventsSection}>
                  <Text style={[styles.eventsSectionTitle, { color: colors.textSecondary }]}>Posts</Text>
                </View>
              )}
            </>
          ) : null}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={styles.bottomSpace} />}
        />
      )}
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
  eventsSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  eventsSectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 18, textTransform: 'capitalize' },
  eventListItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  eventImage: { width: 52, height: 52, borderRadius: 12, marginRight: 14, borderWidth: 1 },
  eventImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  eventTextContainer: { flex: 1, justifyContent: 'center' },
  eventTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  eventSubtitle: { fontSize: 13, lineHeight: 18 },
});
