import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

const FILTERS = ['All', 'Trending', 'People', 'Events', 'Products'];

const MOCK_PEOPLE = [
  { id: '1', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
];

const MOCK_EVENTS = [
  { id: '1', title: 'Rooftop Session Vol 4', subtitle: 'DJ Kojo • Tonight • 9pm • 0.3mi', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop' },
  { id: '2', title: 'Rooftop Session Vol 4', subtitle: 'DJ Kojo • Tonight • 9pm • 0.3mi', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=150&auto=format&fit=crop' },
  { id: '3', title: 'Rooftop Session Vol 4', subtitle: 'DJ Kojo • Tonight • 9pm • 0.3mi', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=150&auto=format&fit=crop' },
];

const MOCK_PRODUCTS = [
  { id: '1', title: 'Nova Merch Tee', subtitle: 'by DJ Kojo • £25 • In Stock', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=150&auto=format&fit=crop' },
  { id: '2', title: 'Nova Merch Tee', subtitle: 'by DJ Kojo • £25 • In Stock', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=150&auto=format&fit=crop' },
  { id: '3', title: 'Nova Merch Tee', subtitle: 'by DJ Kojo • £25 • In Stock', image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=150&auto=format&fit=crop' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const query = searchQuery.toLowerCase().trim();

  const filteredPeople = MOCK_PEOPLE.filter(
    p => p.name.toLowerCase().includes(query) || p.handle.toLowerCase().includes(query)
  );
  const filteredEvents = MOCK_EVENTS.filter(
    e => e.title.toLowerCase().includes(query) || e.subtitle.toLowerCase().includes(query)
  );
  const filteredProducts = MOCK_PRODUCTS.filter(
    p => p.title.toLowerCase().includes(query) || p.subtitle.toLowerCase().includes(query)
  );

  const hasResults = filteredPeople.length > 0 || filteredEvents.length > 0 || filteredProducts.length > 0;

  const renderContent = () => {
    if (query !== '' && !hasResults) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No Result Found</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* People Section */}
        {(activeFilter === 'All' || activeFilter === 'People') && filteredPeople.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>People you know</Text>
            {filteredPeople.map((person) => (
            <TouchableOpacity 
              key={person.id} 
              style={styles.listItem}
              onPress={() => router.push('/profile-screen/user-profile')}
            >
              <Image source={{ uri: person.avatar }} style={styles.personAvatar} />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{person.name}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{person.handle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        )}

        {/* Events Section */}
        {(activeFilter === 'All' || activeFilter === 'Events' || activeFilter === 'Trending') && filteredEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Events</Text>
          {filteredEvents.map((event) => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.listItem}
              onPress={() => router.push('/event-screen/event')}
            >
              <Image source={{ uri: event.image }} style={[styles.squareImage, { borderColor: colors.border }]} />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{event.title}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{event.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        )}

        {/* Products Section */}
        {(activeFilter === 'All' || activeFilter === 'Products' || activeFilter === 'Trending') && filteredProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Products</Text>
          {filteredProducts.map((product) => (
            <TouchableOpacity 
              key={product.id} 
              style={styles.listItem}
              onPress={() => router.push('/event-screen/product/details')}
            >
              <Image source={{ uri: product.image }} style={[styles.squareImage, { borderColor: colors.border }]} />
              <View style={styles.listTextContainer}>
                <Text style={[styles.listTitle, { color: colors.text }]}>{product.title}</Text>
                <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{product.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        )}
        
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
        {!(query !== '' && !hasResults) && (
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
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  cancelBtn: {
    marginLeft: 16,
  },
  cancelText: {
    fontSize: 14,
  },
  filtersWrapper: {
    height: 36,
    marginBottom: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterChip: {
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilterChipText: {
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  personAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  squareImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
  },
  listTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 12,
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
