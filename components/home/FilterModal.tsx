import LocationSearchModal from '@/components/post/LocationSearchModal';
import { getCurrentLocationForSharing, getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { reverseGeocodeLocation, type LocationSearchResult } from '@/lib/locationSearch';
import {
  useTheme } from '@/hooks/useTheme';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React,
  { useCallback,
  useEffect,
  useRef,
  useState } from 'react';
import { Modal,
  Alert,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseHashtagFilterInput } from '@/lib/hashtags';
import { useAuthStore } from '@/stores/authStore';
import {
  mergeVisibleEventFilters,
  parseLocalDateKey,
  toLocalDateKey,
  type EventLocationFilter,
  type EventPriceFilter,
  type EventTimePeriod,
  type SharedEventFilters,
} from '@/lib/eventFilters';
import type { EventAgeRestriction } from '@/lib/events';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export type NearbyEventsFilter = EventLocationFilter;
export type HomeFeedFilters = SharedEventFilters;

export type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  activeFilters: SharedEventFilters;
  onApply: (filters: HomeFeedFilters) => void;
};

const AGE_OPTIONS = ['All Ages', '18+', '21+'];
const PRICE_OPTIONS = ['Free', '< $10', '< $50', '< $100', '$100+'];
const TIME_OPTIONS = ['Morning', 'Noon', 'Evening', 'Late Night', 'Any'];
const AGE_OPTION_TO_VALUE: Record<string, EventAgeRestriction> = {
  'All Ages': 'all_ages',
  '18+': '18_plus',
  '21+': '21_plus',
};
const AGE_VALUE_TO_OPTION: Record<EventAgeRestriction, string> = {
  all_ages: 'All Ages',
  '18_plus': '18+',
  '21_plus': '21+',
};
const PRICE_OPTION_TO_VALUE: Record<string, EventPriceFilter> = {
  Free: 'free',
  '< $10': 'lt_10',
  '< $50': 'lt_50',
  '< $100': 'lt_100',
  '$100+': 'gte_100',
};
const PRICE_VALUE_TO_OPTION: Record<EventPriceFilter, string> = {
  free: 'Free',
  lt_10: '< $10',
  lt_50: '< $50',
  lt_100: '< $100',
  gte_100: '$100+',
};
const TIME_OPTION_TO_VALUE: Record<string, EventTimePeriod> = {
  Morning: 'morning',
  Noon: 'noon',
  Evening: 'evening',
  'Late Night': 'late_night',
  Any: 'any',
};
const TIME_VALUE_TO_OPTION: Record<EventTimePeriod, string> = {
  morning: 'Morning',
  noon: 'Noon',
  evening: 'Evening',
  late_night: 'Late Night',
  any: 'Any',
};
const DEFAULT_LOCATION = {
  label: 'Los Angeles, CA',
  latitude: 34.052235,
  longitude: -118.243683,
};

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export default function FilterModal({
  visible,
  onClose,
  activeFilters,
  onApply,
}: FilterModalProps) {
  const { colors, isDark } = useTheme();
  const currentLocation = useAuthStore((state) => state.user?.currentLocation);
  const [activeAge, setActiveAge] = useState('All Ages');
  const [activePrice, setActivePrice] = useState('Free');
  const [activeTime, setActiveTime] = useState('Morning');

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [hashtags, setHashtags] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);

  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION.label);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
  });

  const [radius, setRadius] = useState(75);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  // Refs to manage async location fetch lifecycle
  const abortFetchRef = useRef(false);
  const locationResolvedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const updateRadiusRef = useRef<(x: number) => void>(null!);
  const activeNearbyFilterRef = useRef(activeFilters.nearby);
  activeNearbyFilterRef.current = activeFilters.nearby;
  const resetDraftRef = useRef(false);
  const fetchLocationRef = useRef<(silent: boolean) => Promise<void>>(null!);

  useEffect(() => {
    if (!visible) return;

    resetDraftRef.current = false;
    setActiveAge(activeFilters.ageRestriction ? AGE_VALUE_TO_OPTION[activeFilters.ageRestriction] : 'All Ages');
    setActivePrice(activeFilters.priceFilter ? PRICE_VALUE_TO_OPTION[activeFilters.priceFilter] : 'Free');
    setActiveTime(activeFilters.timePeriod ? TIME_VALUE_TO_OPTION[activeFilters.timePeriod] : 'Morning');
    setSelectedDate(parseLocalDateKey(activeFilters.selectedDate));
    setHashtags(activeFilters.hashtags.map((tag) => `#${tag}`).join(' '));
    if (activeFilters.nearby) {
      setRadius(activeFilters.nearby.radiusMiles);
      setUseCurrentLocation(activeFilters.nearby.source === 'current');
      setSelectedLocation(activeFilters.nearby.label || DEFAULT_LOCATION.label);
      setSelectedLocationCoords({
        latitude: activeFilters.nearby.latitude,
        longitude: activeFilters.nearby.longitude,
      });
      // Treat an existing 'current' filter as already resolved
      locationResolvedRef.current = activeFilters.nearby.source === 'current';
    } else {
      setRadius(75);
      setUseCurrentLocation(true);
      setSelectedLocation(DEFAULT_LOCATION.label);
      setSelectedLocationCoords({
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
      });
      locationResolvedRef.current = false;
    }
  }, [activeFilters, visible]);

  // On modal open (no active filter): silently resolve current location display
  useEffect(() => {
    if (!visible) {
      abortFetchRef.current = true;
      locationResolvedRef.current = false;
      return;
    }
    if (activeNearbyFilterRef.current) return;
    abortFetchRef.current = false;
    void fetchLocationRef.current?.(true);
  }, [visible]);

  // Fix: panResponder is created once; use a ref so callbacks always call the latest updateRadius
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => updateRadiusRef.current?.(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => updateRadiusRef.current?.(evt.nativeEvent.locationX),
    })
  ).current;

  const updateRadius = (x: number) => {
    if (trackWidth > 0) {
      let percent = Math.max(0, Math.min(1, x / trackWidth));
      setRadius(Math.round(percent * 200));
    }
  };
  updateRadiusRef.current = updateRadius;

  // Fetch current GPS location and reverse-geocode it for display.
  // silent=true: only proceeds if permission already granted (no permission prompt).
  // silent=false: requests permission if needed (called when user explicitly enables the toggle).
  const fetchAndDisplayCurrentLocation = useCallback(async (silent: boolean): Promise<void> => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      let coords: { latitude: number; longitude: number } | null = null;

      if (isFiniteCoordinate(currentLocation?.latitude) && isFiniteCoordinate(currentLocation?.longitude)) {
        coords = { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
      } else if (silent) {
        coords = await getCurrentLocationIfPermissionGranted();
      } else {
        const loc = await getCurrentLocationForSharing();
        coords = { latitude: loc.latitude, longitude: loc.longitude };
      }

      if (abortFetchRef.current || !coords) return;

      setSelectedLocationCoords(coords);

      const geocoded = await reverseGeocodeLocation(coords.latitude, coords.longitude);

      if (abortFetchRef.current) return;

      if (geocoded?.label) {
        setSelectedLocation(geocoded.label);
      }
      locationResolvedRef.current = true;
    } catch (error) {
      if (abortFetchRef.current) return;
      if (!silent) {
        setUseCurrentLocation(false);
        Alert.alert(
          'Location Error',
          error instanceof Error ? error.message : 'Unable to get your current location. Check your location settings.',
        );
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentLocation]);
  fetchLocationRef.current = fetchAndDisplayCurrentLocation;

  const handleToggleCurrentLocation = useCallback(async (value: boolean) => {
    setUseCurrentLocation(value);
    if (value) {
      locationResolvedRef.current = false;
      abortFetchRef.current = false;
      await fetchAndDisplayCurrentLocation(false);
    }
  }, [fetchAndDisplayCurrentLocation]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleReset = () => {
    resetDraftRef.current = true;
    setActiveAge('All Ages');
    setActivePrice('Free');
    setActiveTime('Morning');
    setSelectedDate(null);
    setHashtags('');
    setUseCurrentLocation(false);
    setSelectedLocation(DEFAULT_LOCATION.label);
    setSelectedLocationCoords({
      latitude: DEFAULT_LOCATION.latitude,
      longitude: DEFAULT_LOCATION.longitude,
    });
    setRadius(75);
  };

  const handleApply = async () => {
    if (isApplying) return;

    setIsApplying(true);
    try {
      const parsedHashtags = parseHashtagFilterInput(hashtags);
      const nearby = useCurrentLocation
        ? await resolveCurrentLocationFilter()
        : {
            latitude: selectedLocationCoords.latitude,
            longitude: selectedLocationCoords.longitude,
            radiusMiles: radius,
            label: selectedLocation,
            source: 'selected' as const,
          };

      onApply(mergeVisibleEventFilters(
        activeFilters,
        {
          ageRestriction: AGE_OPTION_TO_VALUE[activeAge],
          priceFilter: PRICE_OPTION_TO_VALUE[activePrice],
          selectedDate: selectedDate ? toLocalDateKey(selectedDate) : null,
          timePeriod: TIME_OPTION_TO_VALUE[activeTime],
          hashtags: parsedHashtags,
          nearby,
        },
        { clearCategory: resetDraftRef.current },
      ));
      onClose();
    } catch (error) {
      Alert.alert(
        'Unable to apply filters',
        error instanceof Error ? error.message : 'Please check your location settings and try again.',
      );
    } finally {
      setIsApplying(false);
    }
  };

  const resolveCurrentLocationFilter = async (): Promise<NearbyEventsFilter> => {
    const location = isFiniteCoordinate(currentLocation?.latitude) && isFiniteCoordinate(currentLocation?.longitude)
      ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }
      : await getCurrentLocationForSharing();

    // Use the label already resolved via reverse geocoding; fall back to placeholder
    const label = locationResolvedRef.current ? selectedLocation : 'Current Location';

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMiles: radius,
      label,
      source: 'current',
    };
  };

  const handleSelectLocation = (location: LocationSearchResult) => {
    setSelectedLocation(location.label);
    setSelectedLocationCoords({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setUseCurrentLocation(false);
  };

  const renderPills = (options: string[], active: string, onSelect: (val: string) => void) => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
        {options.map(opt => {
          const isActive = active === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, { borderColor: colors.border }, isActive && { backgroundColor: buttonBackground(colors), borderColor: colors.primary }]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, { color: colors.textSecondary }, isActive && { color: buttonForeground(colors), fontWeight: 'bold' }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filter</Text>
            <TouchableOpacity onPress={handleReset}>
              <Text style={[styles.resetText, { color: colors.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* Age Restrictions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Age Restrictions</Text>
              {renderPills(AGE_OPTIONS, activeAge, setActiveAge)}
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Price</Text>
              {renderPills(PRICE_OPTIONS, activePrice, setActivePrice)}
            </View>

            {/* Date & Time */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Date & Time</Text>
              {renderPills(TIME_OPTIONS, activeTime, setActiveTime)}

              <TouchableOpacity
                style={[styles.inputBox, { backgroundColor: colors.card }]}
                activeOpacity={0.8}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather name="calendar" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  {selectedDate ? selectedDate.toLocaleDateString() : 'Pick a date'}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Hashtags */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Hashtags</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  value={hashtags}
                  onChangeText={setHashtags}
                  placeholder="#music #summer"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>

              <TouchableOpacity
                style={[styles.inputBox, styles.locationSearchBox, { borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => setLocationSearchVisible(true)}
              >
                <Feather name="search" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Search another location</Text>
              </TouchableOpacity>

              <View style={[styles.inputBox, styles.selectedLocationBox, { backgroundColor: isDark ? '#52525A' : '#F0F0F3' }]}>
                <Feather name="map-pin" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.inputText, { color: colors.text }]}>{selectedLocation}</Text>
              </View>

              <View style={[styles.currentLocationRow, { borderColor: colors.border }]}>
                <View style={styles.currentLocationLeft}>
                  <Feather name="target" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.inputText, { color: colors.text }]}>Current Location</Text>
                </View>
                <Switch
                  value={useCurrentLocation}
                  onValueChange={handleToggleCurrentLocation}
                  trackColor={{ false: isDark ? '#3A3A44' : '#E0E0E0', true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Radius Slider */}
              <View style={[styles.radiusContainer, { borderColor: colors.border }]}>
                <View style={styles.radiusHeader}>
                  <Text style={[styles.inputText, { color: colors.text }]}>Radius</Text>
                  <Text style={[styles.radiusValueText, { color: colors.primary }]}>{radius} miles</Text>
                </View>
                <View
                  style={[styles.sliderTrack, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]}
                  onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                  {...panResponder.panHandlers}
                >
                  <View style={[styles.sliderFill, { width: `${(radius / 200) * 100}%`, backgroundColor: colors.primary }]} />
                  <View style={[styles.sliderThumb, { left: `${(radius / 200) * 100}%`, backgroundColor: colors.text }]} />
                </View>
                <View style={styles.radiusLabels}>
                  <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>0</Text>
                  <Text style={[styles.radiusLabelText, { color: colors.textSecondary }]}>200 miles</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: buttonBackground(colors) }, isApplying && styles.disabledBtn]}
              onPress={handleApply}
              activeOpacity={0.8}
              disabled={isApplying}
            >
              <Text style={[styles.applyBtnText, { color: buttonForeground(colors) }]}>
                {isApplying ? 'Applying...' : 'Apply Filters'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>

      <LocationSearchModal
        visible={locationSearchVisible}
        onClose={() => setLocationSearchVisible(false)}
        onSelectLocation={handleSelectLocation}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 60,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  placeholderText: {
    fontSize: 14,
  },
  inputText: {
    fontSize: 14,
    flex: 1,
  },
  locationSearchBox: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  selectedLocationBox: {
  },
  currentLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 50,
    height: 56,
    marginTop: 12,
  },
  currentLocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  radiusValueText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    transform: [{ translateX: -7 }],
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  radiusLabelText: {
    fontSize: 10,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    fontWeight: 'bold',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.7,
  },
});
