import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { getMapEvents, getHashtagEvents, searchEvents, type EventResponse } from '@/lib/events';
import { formatEventTimeDisplay } from '@/lib/eventTimeDisplay';
import { normalizeSearchText } from '@/lib/searchText';
import { getStorageFileUrl } from '@/lib/storage';
import { getSuggestedUsers, searchPeople } from '@/lib/users';
import { getHashtagMoments, type Moment } from '@/lib/moments';
import { getHashtagSearchIntent, isSearchSectionVisible, type SearchFilter } from '@/lib/searchHashtagIntent';
import {
  getScreenSearchState,
  getSearchSourceState,
  selectCurrentRows,
  type SearchSourceState,
} from '@/lib/searchViewState';
import { getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { safeBack } from '@/lib/navigation';
import UserAvatar from '@/components/ui/UserAvatar';
import SearchStateMessage from '@/components/search/SearchStateMessage';

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
// People results are network-driven (server-ranked). Debounce keystrokes so a
// query is only sent once typing settles; a stale response can never replace a
// newer query's results (guarded by peopleRequestRef below).
const PEOPLE_SEARCH_DEBOUNCE_MS = 250;
// Events results are network-driven (server-ranked /events/search). Debounce
// keystrokes; a stale response can never replace a newer query's results
// (guarded by eventRequestRef below). Kept separate from People/Hashtag.
const EVENT_SEARCH_DEBOUNCE_MS = 250;
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

// Batch 3C.1 — compact Event-local schedule (venue timezone + short zone label);
// device-local fallback when `event.timezone` is unknown. No viewer-secondary on
// this single-line search subtitle.
const formatEventSchedule = (event: Pick<EventResponse, "scheduledAt" | "timezone">) => {
  const model = formatEventTimeDisplay({ scheduledAt: event.scheduledAt, timezone: event.timezone });
  if (!model.primaryDateShortText) {
    return "Date TBA";
  }
  const time = model.primaryZoneText
    ? `${model.primaryTimeText} ${model.primaryZoneText}`
    : model.primaryTimeText;
  return `${model.primaryDateShortText} • ${time}`;
};

const getEventSubtitle = (event: EventResponse) => {
  const host = event.host?.name || event.host?.username;
  const location = event.location?.venue || event.location?.address || event.location?.searchLabel;

  return [host, formatEventSchedule(event), location].filter(Boolean).join(" • ");
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
  // Bumped by Retry and by a real re-focus (§ background revalidation). Added to
  // every network-driven search effect's dependency list so the CURRENT derived
  // query is re-fetched without touching `searchQuery` / `activeFilter`.
  const [retryToken, setRetryToken] = useState(0);
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [peopleResults, setPeopleResults] = useState<SearchPerson[]>([]);
  // The query string the currently-applied People rows were fetched for. Rows
  // are only rendered while this still matches the derived People query, so a
  // slower older query can never flash its rows under a newer visible query.
  const [peopleResultsQuery, setPeopleResultsQuery] = useState('');
  // Non-null => the latest settled People request for this exact query failed.
  const [peopleErrorQuery, setPeopleErrorQuery] = useState<string | null>(null);
  const [isPeopleSearching, setIsPeopleSearching] = useState(false);
  const peopleRequestRef = useRef(0);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [eventResults, setEventResults] = useState<SearchEvent[]>([]);
  const [eventResultsQuery, setEventResultsQuery] = useState('');
  const [eventErrorQuery, setEventErrorQuery] = useState<string | null>(null);
  const [isEventSearching, setIsEventSearching] = useState(false);
  const eventRequestRef = useRef(0);
  // `isLoading` now means ONLY the cold first load (no data yet). Re-focus
  // refreshes run in the background and never flip it back to true, so returning
  // to a populated Search screen no longer flashes a full-screen spinner.
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const hasLoadedRef = useRef(false);
  const [hashtagMatchedPosts, setHashtagMatchedPosts] = useState<SearchPost[]>([]);
  const [hashtagMatchedEvents, setHashtagMatchedEvents] = useState<SearchEvent[]>([]);
  const [hashtagResultsQuery, setHashtagResultsQuery] = useState('');
  const [hashtagErrorQuery, setHashtagErrorQuery] = useState<string | null>(null);
  const [isHashtagChecking, setIsHashtagChecking] = useState(false);

  const query = searchQuery.trim().toLowerCase();
  // Non-empty => People results come from the server-ranked /users/search
  // endpoint; empty => keep showing the existing recommendation list. Mirrors
  // the server's leading-'@' + whitespace normalization for the "is there a
  // real query?" decision only.
  const peopleQuery = searchQuery.trim().replace(/^@+/, '').trim();
  // Selecting a tab is the user's explicit search-scope choice — it must never be changed
  // by typing. getHashtagSearchIntent only reads `activeFilter` to decide search BEHAVIOR
  // (does this tab's section treat plain text as a hashtag keyword?); it never calls
  // setActiveFilter.
  const { isExplicitHashtagIntent, hashtagSectionQuery } = getHashtagSearchIntent(searchQuery, activeFilter);
  // Hashtag-probe rows only count while they still belong to the query in play —
  // otherwise a slower older probe would keep the shortcut / inline sections
  // visible under a newer query.
  const currentHashtagPosts = selectCurrentRows(hashtagSectionQuery, hashtagResultsQuery, hashtagMatchedPosts);
  const currentHashtagEvents = selectCurrentRows(hashtagSectionQuery, hashtagResultsQuery, hashtagMatchedEvents);
  const hasHashtagMatches = currentHashtagPosts.length > 0 || currentHashtagEvents.length > 0;
  // Non-empty => Events results come from the server-ranked /events/search
  // endpoint; empty (or explicit `#` hashtag intent) => keep the existing
  // /events/map upcoming list. Punctuation-only input normalizes to '' and is
  // treated as no query (zero-query fallback), never an unrestricted search.
  const eventSearchQuery = isExplicitHashtagIntent ? '' : normalizeSearchText(searchQuery);

  useEffect(() => {
    if (!hashtagSectionQuery) {
      setHashtagMatchedPosts([]);
      setHashtagMatchedEvents([]);
      setHashtagResultsQuery('');
      setHashtagErrorQuery(null);
      setIsHashtagChecking(false);
      return;
    }

    let cancelled = false;
    setIsHashtagChecking(true);
    setHashtagErrorQuery(null);

    const timer = setTimeout(() => {
      void (async () => {
        const location = await getLocationForHashtagSearch();
        // Both calls hit the real hashtag-match backend paths (never a client-filtered
        // generic snapshot) — match-first eligibility happens entirely server-side; this
        // only maps and displays whatever the backend already decided matches and how it
        // already ordered them (Smart Feed-ranked posts, nearby-first events).
        const [momentsResult, eventsResult] = await Promise.allSettled([
          getHashtagMoments(hashtagSectionQuery, SEARCH_RESULT_LIMIT, { expand: true }),
          getHashtagEvents(hashtagSectionQuery, {
            limit: SEARCH_RESULT_LIMIT,
            expand: true,
            ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
          }),
        ]);

        if (cancelled) {
          return;
        }

        // Only a total failure (both sources rejected) is an error; a partial
        // failure still shows the side that succeeded.
        const bothFailed = momentsResult.status === 'rejected' && eventsResult.status === 'rejected';
        setHashtagMatchedPosts(momentsResult.status === 'fulfilled' ? momentsResult.value.map(toSearchPost) : []);
        setHashtagMatchedEvents(eventsResult.status === 'fulfilled' ? eventsResult.value.map(toSearchEvent) : []);
        setHashtagResultsQuery(hashtagSectionQuery);
        setHashtagErrorQuery(bothFailed ? hashtagSectionQuery : null);
        setIsHashtagChecking(false);
      })();
    }, HASHTAG_CHECK_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hashtagSectionQuery, retryToken]);

  // People results: server-ranked search when there is a real query, debounced.
  // Every run bumps peopleRequestRef; a resolved response is only applied when
  // its request id is still the latest, so a slow "ra" cannot overwrite "rak"
  // and clearing the field immediately abandons any in-flight response.
  useEffect(() => {
    if (!peopleQuery) {
      peopleRequestRef.current += 1;
      setPeopleResults([]);
      setPeopleResultsQuery('');
      setPeopleErrorQuery(null);
      setIsPeopleSearching(false);
      return;
    }

    const requestId = (peopleRequestRef.current += 1);
    setIsPeopleSearching(true);
    setPeopleErrorQuery(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const results = await searchPeople(peopleQuery, SEARCH_RESULT_LIMIT);

          if (peopleRequestRef.current !== requestId) {
            return;
          }

          // Render the backend's ranked order verbatim — no client re-sort/filter.
          setPeopleResults(results.map((user) => ({
            id: user.id,
            name: user.name,
            // Real handle only. No synthetic fallback — a user without a
            // username simply shows no handle line.
            handle: user.username ? `@${user.username}` : '',
            avatarUrl: user.avatarUrl,
          })));
          setPeopleResultsQuery(peopleQuery);
          setIsPeopleSearching(false);
        } catch {
          if (peopleRequestRef.current !== requestId) {
            return;
          }

          setPeopleResults([]);
          setPeopleResultsQuery(peopleQuery);
          setPeopleErrorQuery(peopleQuery);
          setIsPeopleSearching(false);
        }
      })();
    }, PEOPLE_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [peopleQuery, retryToken]);

  // Events results: server-ranked /events/search when there is a real query,
  // debounced. Same request-id guard shape as People (separate ref): a slow
  // "part" response can never overwrite a newer "partys", and clearing the
  // field abandons any in-flight response. Empty query => fall back to the
  // existing /events/map upcoming list (no request).
  useEffect(() => {
    if (!eventSearchQuery) {
      eventRequestRef.current += 1;
      setEventResults([]);
      setEventResultsQuery('');
      setEventErrorQuery(null);
      setIsEventSearching(false);
      return;
    }

    const requestId = (eventRequestRef.current += 1);
    setIsEventSearching(true);
    setEventErrorQuery(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const results = await searchEvents(eventSearchQuery, SEARCH_RESULT_LIMIT);

          if (eventRequestRef.current !== requestId) {
            return;
          }

          // Render the backend's ranked order verbatim — no client re-filter.
          setEventResults(results.map(toSearchEvent));
          setEventResultsQuery(eventSearchQuery);
          setIsEventSearching(false);
        } catch {
          if (eventRequestRef.current !== requestId) {
            return;
          }

          setEventResults([]);
          setEventResultsQuery(eventSearchQuery);
          setEventErrorQuery(eventSearchQuery);
          setIsEventSearching(false);
        }
      })();
    }, EVENT_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [eventSearchQuery, retryToken]);

  const loadSearchData = useCallback(async (isMounted: () => boolean, background = false) => {
    // A background refresh (re-focus / retry with data already on screen) never
    // flips the cold-load spinner back on and never wipes good data on failure.
    if (!background) {
      setIsLoading(true);
    }

    const [peopleResult, eventsResult] = await Promise.allSettled([
      getSuggestedUsers(SEARCH_RESULT_LIMIT),
      getMapEvents({ limit: SEARCH_RESULT_LIMIT }),
    ]);

    if (!isMounted()) {
      return;
    }

    if (peopleResult.status === 'fulfilled') {
      setPeople(peopleResult.value.map(user => ({
        id: user.id,
        name: user.name,
        // Real handle only — no synthetic fallback.
        handle: user.username ? `@${user.username}` : '',
        avatarUrl: user.avatarUrl,
      })));
    }
    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.map(toSearchEvent));
    }
    setLoadFailed(peopleResult.status === 'rejected' && eventsResult.status === 'rejected');
    setIsLoading(false);
    hasLoadedRef.current = true;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const isBackground = hasLoadedRef.current;

      void loadSearchData(() => isMounted, isBackground);

      // On a real re-focus (Back into an already-loaded Search screen),
      // revalidate any active search in the background so an item an admin
      // removed while the user was away drops out shortly after returning —
      // without clearing the query/tab/results or showing a cold spinner.
      if (isBackground) {
        setRetryToken((token) => token + 1);
      }

      return () => {
        isMounted = false;
      };
    }, [loadSearchData]),
  );

  const handleRetry = useCallback(() => {
    setPeopleErrorQuery(null);
    setEventErrorQuery(null);
    setHashtagErrorQuery(null);
    setLoadFailed(false);
    setRetryToken((token) => token + 1);
    if (!searchQuery.trim()) {
      void loadSearchData(() => true, false);
    }
  }, [loadSearchData, searchQuery]);

  // Real query => server-ranked People results (order preserved as returned).
  // No query => the existing recommendation list (unchanged behaviour).
  const filteredPeople = useMemo(
    () => (peopleQuery
      // Only render the People rows while they still belong to the query in the
      // input — a slower older request can never flash its rows under a newer
      // visible query (notably on the All tab, which does not spinner-gate People).
      ? selectCurrentRows(peopleQuery, peopleResultsQuery, peopleResults)
      : people.filter(
          p => p.name.toLowerCase().includes(query) || p.handle.toLowerCase().includes(query)
        )),
    [peopleQuery, peopleResultsQuery, peopleResults, people, query],
  );
  // Real query => server-ranked /events/search results (order preserved as
  // returned — the old `.includes(query)` filter is NOT re-applied, so
  // typo-corrected server rows survive). No query => the existing /events/map
  // upcoming list, filtered locally exactly as before.
  const filteredEvents = useMemo(
    () => (eventSearchQuery
      ? selectCurrentRows(eventSearchQuery, eventResultsQuery, eventResults)
      : events.filter(
          e => e.title.toLowerCase().includes(query) || e.subtitle.toLowerCase().includes(query)
        )),
    [eventSearchQuery, eventResultsQuery, eventResults, events, query],
  );
  // The Events section is shared by the "All" and "Events" tabs. Its own intent rule is
  // independent of which tab is active or of the Hashtags-tab-implied rule above: an
  // explicit `#` switches it to real Event-hashtag results; plain text always stays normal
  // Event text search, even while the Hashtags tab happens to be selected.
  const eventsSectionList = isExplicitHashtagIntent ? currentHashtagEvents : filteredEvents;
  // Inline Posts only ever reflects explicit `#` intent (the same rule the Events section
  // uses) — this is additive to the existing Hashtags-tab shortcut card, not a replacement,
  // and is scoped to the All tab only via the 'PostsInline' visibility rule below.
  const postsSectionList = isExplicitHashtagIntent ? currentHashtagPosts : EMPTY_SEARCH_POSTS;
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
                <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{person.name}</Text>
                {person.handle ? (
                  <Text style={[styles.listSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{person.handle}</Text>
                ) : null}
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
                <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{event.title}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{event.subtitle}</Text>
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

  // Per-source states for the visible sections. LOADING / ERROR / EMPTY /
  // RESULTS stay distinct: a failed request is ERROR (never a silent EMPTY),
  // and an in-flight request — or rows that still belong to an older query — is
  // LOADING (never EMPTY).
  const peopleSectionState = getSearchSourceState({
    hasQuery: Boolean(peopleQuery),
    isFetching: isPeopleSearching,
    hasError: peopleErrorQuery !== null && peopleErrorQuery === peopleQuery,
    rowsMatchQuery: peopleResultsQuery === peopleQuery,
    rowCount: filteredPeople.length,
  });
  const eventSectionState = getSearchSourceState({
    hasQuery: Boolean(eventSearchQuery),
    isFetching: isEventSearching,
    hasError: eventErrorQuery !== null && eventErrorQuery === eventSearchQuery,
    rowsMatchQuery: eventResultsQuery === eventSearchQuery,
    rowCount: filteredEvents.length,
  });
  const hashtagProbeState = getSearchSourceState({
    hasQuery: Boolean(hashtagSectionQuery),
    isFetching: isHashtagChecking,
    hasError: hashtagErrorQuery !== null && hashtagErrorQuery === hashtagSectionQuery,
    rowsMatchQuery: hashtagResultsQuery === hashtagSectionQuery,
    rowCount: currentHashtagPosts.length + currentHashtagEvents.length,
  });

  const sectionStateFor = (sectionFilter: SearchSection['filter']): SearchSourceState => {
    if (sectionFilter === 'People') return peopleSectionState;
    if (sectionFilter === 'Hashtags' || sectionFilter === 'PostsInline') return hashtagProbeState;
    // 'Events' shows hashtag-event rows under explicit `#` intent.
    return isExplicitHashtagIntent ? hashtagProbeState : eventSectionState;
  };

  const zeroQueryErrored =
    !searchQuery.trim() && loadFailed && people.length === 0 && events.length === 0;
  const screenState: SearchSourceState = zeroQueryErrored
    ? 'error'
    : getScreenSearchState(visibleSections.map(section => sectionStateFor(section.filter)));

  const renderContent = () => {
    // `isLoading` is the cold first load only; `screenState === 'loading'`
    // covers an in-flight query on an already-populated screen.
    if (isLoading || (!zeroQueryErrored && screenState === 'loading')) {
      return (
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      );
    }

    if (screenState === 'error') {
      return <SearchStateMessage variant="error" onRetry={handleRetry} />;
    }

    if (screenState === 'empty') {
      return <SearchStateMessage variant="empty" />;
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
