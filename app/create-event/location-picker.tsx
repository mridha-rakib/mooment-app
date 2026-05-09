import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';

export default function LocationPickerScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Map</Text>
        <View style={{ width: 40 }} /> {/* Spacer to balance header */}
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
          <Text style={[styles.searchText, { color: colors.text }]}>Los Angeles, CA</Text>
        </View>
      </View>

      {/* Map Content (Simulated) */}
      <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
        <Image 
          source={isDark ? require('../../assets/images/dark-map.png') : require('../../assets/images/map_bg.png')} 
          style={styles.mapPlaceholder}
          resizeMode="cover"
        />
        
        {/* Pin Marker */}
        <View style={styles.markerContainer}>
          <View style={[styles.markerCircle, { borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.2)' }]}>
            <View style={[styles.markerDot, { backgroundColor: colors.primary }]} />
          </View>
          <View style={[styles.markerStem, { backgroundColor: colors.primary }]} />
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.confirmButtonText, { color: colors.background }]}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 10,
  },
  searchBox: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchText: {
    fontSize: 15,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  markerContainer: {
    alignItems: 'center',
    zIndex: 20,
  },
  markerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markerStem: {
    width: 2,
    height: 16,
    marginTop: -1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
