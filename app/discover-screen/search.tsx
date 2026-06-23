import React, { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { getMapEvents, type EventResponse } from '@/lib/events';
import { getMyProducts, type Product } from '@/lib/products';
import { getStorageFileUrl } from '@/lib/storage';
import { getSuggestedUsers } from '@/lib/users';
import { normalizeHashtag } from '@/lib/hashtags';

type SearchFilter = 'All' | 'People' | 'Events' | 'Products' | 'Hashtags';
type SearchSection = {
  filter: Exclude<SearchFilter, 'All'>;
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
type SearchProduct = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
};

const FILTERS: SearchFilter[] = ['All', 'People', 'Events', 'Products', 'Hashtags'];
const SEARCH_RESULT_LIMIT = 50;

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

const formatMoney = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

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

const getProductSubtitle = (product: Product) => {
  const discountedPrice = product.discountPercent > 0
    ? product.priceUsd * (1 - product.discountPercent / 100)
    : product.priceUsd;
  const stockLabel = product.totalProduct > 0 ? "In Stock" : "Out of Stock";

  return `${formatMoney(discountedPrice)} • ${stockLabel}`;
};

const toSearchEvent = (event: EventResponse): SearchEvent => ({
  id: event.id,
  title: event.name || "Untitled Event",
  subtitle: getEventSubtitle(event),
  imageUrl: resolveStorageUrl(event.bannerImageKey),
});

const toSearchProduct = (product: Product): SearchProduct => ({
  id: product.id,
  title: product.name,
  subtitle: getProductSubtitle(product),
  imageUrl: resolveStorageUrl(product.imageKeys[0]),
});

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('All');
  const [people, setPeople] = useState<SearchPerson[]>([]);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const query = searchQuery.toLowerCase().trim();
  const hashtagQuery = normalizeHashtag(query);

  useEffect(() => {
    let isMounted = true;

    const loadSearchData = async () => {
      setIsLoading(true);

      const [peopleResult, eventsResult, productsResult] = await Promise.allSettled([
        getSuggestedUsers(SEARCH_RESULT_LIMIT),
        getMapEvents({ limit: SEARCH_RESULT_LIMIT }),
        getMyProducts(),
      ]);

      if (!isMounted) {
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
      setProducts(productsResult.status === 'fulfilled' ? productsResult.value.map(toSearchProduct) : []);
      setIsLoading(false);
    };

    void loadSearchData();

    return () => {
      isMounted = false;
    };
  }, []);

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
  const filteredProducts = useMemo(
    () => products.filter(
      p => p.title.toLowerCase().includes(query) || p.subtitle.toLowerCase().includes(query)
    ),
    [products, query],
  );

  const searchSections = useMemo<SearchSection[]>(() => [
    {
      filter: 'Hashtags',
      resultCount: hashtagQuery ? 1 : 0,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Hashtag posts</Text>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push({ pathname: '/discover-screen/hashtag', params: { tag: hashtagQuery } })}
          >
            <View style={[styles.hashtagIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.hashtagIconText, { color: colors.primary }]}>#</Text>
            </View>
            <View style={styles.listTextContainer}>
              <Text style={[styles.listTitle, { color: colors.text }]}>#{hashtagQuery}</Text>
              <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>View related posts</Text>
            </View>
          </TouchableOpacity>
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
              onPress={() => router.push('/profile-screen/user-profile')}
            >
              {person.avatarUrl ? (
                <Image source={{ uri: person.avatarUrl }} style={styles.personAvatar} />
              ) : (
                <View style={[styles.personAvatarFallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.personAvatarInitial, { color: colors.text }]}>
                    {person.name.trim().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
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
      resultCount: filteredEvents.length,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Events</Text>
          {filteredEvents.map((event) => (
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
    {
      filter: 'Products',
      resultCount: filteredProducts.length,
      render: () => (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Products</Text>
          {filteredProducts.map((product) => (
            <TouchableOpacity 
              key={product.id} 
              style={styles.listItem}
              onPress={() => router.push({
                pathname: '/profile-screen/product-details',
                params: { productId: product.id },
              })}
            >
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={[styles.squareImage, { borderColor: colors.border }]} />
              ) : (
                <View style={[styles.squareImage, styles.squareImagePlaceholder, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Feather name="shopping-bag" size={20} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{product.title}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{product.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
  ], [colors.border, colors.card, colors.primary, colors.text, colors.textSecondary, filteredEvents, filteredPeople, filteredProducts, hashtagQuery, router]);

  const visibleSections = searchSections.filter(
    section => activeFilter === 'All' || section.filter === activeFilter,
  );
  const hasResults = visibleSections.some(section => section.resultCount > 0);

  const renderContent = () => {
    if (isLoading) {
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
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        {(isLoading || query === '' || hasResults) && (
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
        )}

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
    paddingTop: Platform.OS === 'android' ? 40 : 10,
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
  personAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarInitial: {
    fontSize: 18,
    fontWeight: '700',
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
