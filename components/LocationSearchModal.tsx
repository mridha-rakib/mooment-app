import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type LocationSearchModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
};

const RECENT_LOCATIONS = [
  { id: '1', name: 'Hazrat Shahjalal International Airport', country: 'Bangladesh', distance: '34mi' },
  { id: '2', name: 'Hazrat Shahjalal International Airport', country: 'Bangladesh', distance: '34mi' },
  { id: '3', name: 'Hazrat Shahjalal International Airport', country: 'Bangladesh', distance: '34mi' },
  { id: '4', name: 'Hazrat Shahjalal International Airport', country: 'Bangladesh', distance: '34mi' },
  { id: '5', name: 'Hazrat Shahjalal International Airport', country: 'Bangladesh', distance: '34mi' },
];

export default function LocationSearchModal({ visible, onClose, onSelectLocation }: LocationSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLocations = RECENT_LOCATIONS.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
    loc.country.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Search</Text>
          </View>

          {/* Search Bar Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Feather name="search" size={18} color="#8E8E9B" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for another place"
                placeholderTextColor="#8E8E9B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Locations List */}
          <ScrollView style={styles.listContainer}>
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc, index) => (
              <View key={`${loc.id}-${index}`}>
                <TouchableOpacity 
                  style={styles.locationItem} 
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelectLocation(loc.name);
                    onClose();
                  }}
                >
                  <View style={styles.iconContainer}>
                    <Feather name="clock" size={16} color="#8E8E9B" />
                    <Text style={styles.distanceText}>{loc.distance}</Text>
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.locationName}>{loc.name}</Text>
                    <Text style={styles.countryName}>{loc.country}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.separator} />
              </View>
            ))
            ) : (
              <Text style={{color: '#8E8E9B', marginTop: 40, textAlign: 'center'}}>No locations found</Text>
            )}
          </ScrollView>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C24',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  cancelBtn: {
    marginLeft: 12,
  },
  cancelText: {
    color: '#8E8E9B',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 32,
  },
  distanceText: {
    color: '#8E8E9B',
    fontSize: 10,
    marginTop: 4,
  },
  textContainer: {
    flex: 1,
  },
  locationName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  countryName: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 48, // aligns with text
  },
});
