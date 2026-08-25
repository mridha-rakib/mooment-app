import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { getMapEvents, getHashtagEvents, type EventResponse } from '@/lib/events';
import { getStorageFileUrl } from '@/lib/storage';
import { getSuggestedUsers } from '@/lib/users';
import { getHashtagMoments, type Moment } from '@/lib/moments';
import { getHashtagSearchIntent, isSearchSectionVisible, type SearchFilter } from '@/lib/searchHashtagIntent';
import { getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { safeBack } from '@/lib/navigation';
import UserAvatar from '@/components/ui/UserAvatar';

const HASHTAG_CHECK_DEBOUNCE_MS = 350;
// Never block hashtag search on a slow/stalled GPS fix — same cap used by the hashtag
// results screen (discover-screen/hashtag.tsx) for the same silent, non-prompting lookup.
const LOCATION_LOOKUP_TIMEOUT_MS = 4000;

type SearchSection = {
  filter: Parameters<typeof isSearchSectionVisible>[0];
  resultCount: number;
  render: () => ReactNode;
};
type SearchPerson = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string | null;
};
type SearchEvent = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
};
type SearchPost = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
};

const FILTERS: SearchFilter[] = ['All', 'People', 'Events', 'Hashtags'];
const SEARCH_RESULT_LIMIT = 50;
// Stable reference (not a fresh `[]` literal per render) so the postsSectionList ternary
// doesn't destabilize the searchSections useMemo's dependency array.
const EMPTY_SEARCH_POSTS: SearchPost[] = [];

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
    return "Date TBA";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${day} • ${time}`;
};

const getEventSubtitle = (event: EventResponse) => {
  const host = event.host?.name || event.host?.username;
  const location = event.location?.venue || event.location?.address || event.location?.searchLabel;

  return [host, formatEventSchedule(event.scheduledAt), location].filter(Boolean).join(" • ");
};

const toSearchEvent = (event: EventResponse): SearchEvent => ({
  id: event.id,
  title: event.name || "Untitled Event",
  subtitle: getEventSubtitle(event),
  imageUrl: resolveStorageUrl(event.bannerImageKey),
});

// Ordering is preserved exactly as the backend returns it (Smart Feed-ranked when enabled,
// recency otherwise) — this is a display mapping only, no re-sorting happens here.
const toSearchPost = (moment: Moment): SearchPost => {
  const thumbnailMedia = moment.mediaItems.find((item) => item.type === 'image' && item.url);
  const caption = moment.caption?.trim();

  return {
    id: moment.id,
    title: moment.author?.name || moment.author?.username || 'Someone',
    subtitle: caption || 'Shared a post',
    imageUrl: thumbnailMedia?.url ?? null,
  };
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

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('All');
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hashtagMatchedPosts, setHashtagMatchedPosts] = useState<SearchPost[]>([]);
  const [hashtagMatchedEvents, setHashtagMatchedEvents] = useState<SearchEvent[]>([]);
  const [isHashtagChecking, setIsHashtagChecking] = useState(false);

  const query = searchQuery.trim().toLowerCase();
  // Selecting a tab is the user's explicit search-scope choice — it must never be changed
  // by typing. getHashtagSearchIntent only reads `activeFilter` to decide search BEHAVIOR
  // (does this tab's section treat plain text as a hashtag keyword?); it never calls
  // setActiveFilter.
  const { isExplicitHashtagIntent, hashtagSectionQuery } = getHashtagSearchIntent(searchQuery, activeFilter);
  const hasHashtagMatches = hashtagMatchedPosts.length > 0 || hashtagMatchedEvents.length > 0;

  useEffect(() => {
    if (!hashtagSectionQuery) {
      setHashtagMatchedPosts([]);
      setHashtagMatchedEvents([]);
      setIsHashtagChecking(false);
      return;
    }

    let cancelled = false;
    setIsHashtagChecking(true);

    const timer = setTimeout(() => {
      void (async () => {
        const location = await getLocationForHashtagSearch();
        // Both calls hit the real hashtag-match backend paths (never a client-filtered
        // generic snapshot) — match-first eligibility happens entirely server-side; this
        // only maps and displays whatever the backend already decided matches and how it
        // already ordered them (Smart Feed-ranked posts, nearby-first events).
        const [momentsResult, eventsResult] = await Promise.allSettled([
          getHashtagMoments(hashtagSectionQuery, SEARCH_RESULT_LIMIT),
          getHashtagEvents(hashtagSectionQuery, {
            limit: SEARCH_RESULT_LIMIT,
            ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
          }),
        ]);

        if (cancelled) {
          return;
        }

        setHashtagMatchedPosts(momentsResult.status === 'fulfilled' ? momentsResult.value.map(toSearchPost) : []);
        setHashtagMatchedEvents(eventsResult.status === 'fulfilled' ? eventsResult.value.map(toSearchEvent) : []);
        setIsHashtagChecking(false);
      })();
    }, HASHTAG_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hashtagSectionQuery]);

  const loadSearchData = useCallback(async (isMounted: () => boolean) => {
    setIsLoading(true);

    const [peopleResult, eventsResult] = await Promise.allSettled([
      getSuggestedUsers(SEARCH_RESULT_LIMIT),
      getMapEvents({ limit: SEARCH_RESULT_LIMIT }),
    ]);

    if (!isMounted()) {
      return;
    }

    setPeople(peopleResult.status === 'fulfilled'
      ? peopleResult.value.map(user => ({
          id: user.id,
          name: user.name,
          handle: user.username ? `@${user.username}` : '@xenog',
          avatarUrl: user.avatarUrl,
        }))
      : []);
    setEvents(eventsResult.status === 'fulfilled' ? eventsResult.value.map(toSearchEvent) : []);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void loadSearchData(() => isMounted);

      return () => {
        isMounted = false;
      };
    }, [loadSearchData]),
  );

  const filteredPeople = useMemo(
    () => people.filter(
      p => p.name.toLowerCase().includes(query) || p.handle.toLowerCase().includes(query)
    ),
    [people, query],
  );
  const filteredEvents = useMemo(
    () => events.filter(
      e => e.title.toLowerCase().includes(query) || e.subtitle.toLowerCase().includes(query)
    ),
    [events, query],
  );
  // The Events section is shared by the "All" and "Events" tabs. Its own intent rule is
  // independent of which tab is active or of the Hashtags-tab-implied rule above: an
  // explicit `#` switches it to real Event-hashtag results; plain text always stays normal
  // Event text search, even while the Hashtags tab happens to be selected.
  const eventsSectionList = isExplicitHashtagIntent ? hashtagMatchedEvents : filteredEvents;
  // Inline Posts only ever reflects explicit `#` intent (the same rule the Events section
  // uses) — this is additive to the existing Hashtags-tab shortcut card, not a replacement,
  // and is scoped to the All tab only via the 'PostsInline' visibility rule below.
  const postsSectionList = isExplicitHashtagIntent ? hashtagMatchedPosts : EMPTY_SEARCH_POSTS;
  const searchSections = useMemo<SearchSection[]>(() => [
    {
      filter: 'Hashtags',
      resultCount: hasHashtagMatches ? 1 : 0,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Hashtag posts</Text>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push({ pathname: '/discover-screen/hashtag', params: { tag: hashtagSectionQuery } })}
          >
            <View style={[styles.hashtagIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.hashtagIconText, { color: colors.primary }]}>#</Text>
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>#{hashtagSectionQuery}</Text>
              <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>View related posts and events</Text>
            </View>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      filter: 'PostsInline',
      resultCount: postsSectionList.length,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Posts</Text>
          {postsSectionList.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.listItem}
              onPress={() => router.push({
                pathname: '/post-screen/view-post',
                params: { postId: post.id },
              })}
            >
              {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={[styles.squareImage, { borderColor: colors.border }]} />
              ) : (
                <View style={[styles.squareImage, styles.squareImagePlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Feather name="message-square" size={20} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{post.title}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{post.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      filter: 'People',
      resultCount: filteredPeople.length,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>People you know</Text>
          {filteredPeople.map((person) => (
            <TouchableOpacity 
              key={person.id} 
              style={styles.listItem}
              onPress={() => router.push({
                pathname: '/profile-screen/user-profile',
                params: {
                  userId: person.id,
                  name: person.name,
                  isFollowing: "false",
                  ...(person.avatarUrl ? { avatar: person.avatarUrl } : {}),
                },
              })}
            >
              <UserAvatar uri={person.avatarUrl} name={person.name} size={52} style={styles.personAvatar} />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{person.name}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{person.handle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      filter: 'Events',
      resultCount: eventsSectionList.length,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Events</Text>
          {eventsSectionList.map((event) => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.listItem}
              onPress={() => router.push({
                pathname: '/event-screen/event',
                params: { eventId: event.id },
              })}
            >
              {event.imageUrl ? (
                <Image source={{ uri: event.imageUrl }} style={[styles.squareImage, { borderColor: colors.border }]} />
              ) : (
                <View style={[styles.squareImage, styles.squareImagePlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Feather name="calendar" size={20} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{event.title}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{event.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
  ], [colors.border, colors.card, colors.primary, colors.text, colors.textSecondary, eventsSectionList, filteredPeople, hasHashtagMatches, hashtagSectionQuery, postsSectionList, router]);

  const visibleSections = searchSections.filter(
    section => isSearchSectionVisible(section.filter, activeFilter),
  );
  const hasResults = visibleSections.some(section => section.resultCount > 0);
  // While a hashtag-intent query's real-data check is in flight, keep the loading state
  // instead of briefly flashing "No Result Found" for a query that turns out to have
  // matches — results must only ever appear once real data confirms them.
  const isBusy = isLoading || (Boolean(hashtagSectionQuery) && isHashtagChecking);

  const renderContent = () => {
    if (isBusy) {
      return (
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      );
    }

    if (!hasResults) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No Result Found</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {visibleSections
          .filter(section => section.resultCount > 0)
          .map(section => (
            <React.Fragment key={section.filter}>{section.render()}</React.Fragment>
          ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        
        {/* Search Header Bar */}
        <View style={styles.headerRow}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity onPress={() => safeBack(router, '/(tabs)/explore')} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips — always visible so the user-selected tab stays visibly active
            regardless of query text or result count; only an explicit tap changes it. */}
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.textSecondary },
                    isActive && [styles.activeFilterChip, { backgroundColor: colors.text, borderColor: colors.text }]
                  ]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: colors.textSecondary },
                    isActive && [styles.activeFilterChipText, { color: colors.background }]
                  ]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Dynamic Content */}
        {renderContent()}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  cancelBtn: {
    marginLeft: 16,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filtersWrapper: {
    height: 42,
    marginBottom: 20,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 38,
  },
  activeFilterChip: {
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeFilterChipText: {
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 18,
    textTransform: 'capitalize',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  personAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  squareImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 14,
    borderWidth: 1,
  },
  squareImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagIcon: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginRight: 14,
    width: 52,
  },
  hashtagIconText: {
    fontSize: 24,
    fontWeight: '800',
  },
  listTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  listSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyStateContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  emptyStateText: {
    fontSize: 14,
  },
});
