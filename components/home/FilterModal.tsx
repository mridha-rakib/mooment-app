import LocationSearchModal from '@/components/post/LocationSearchModal';
import EventRadiusSlider from '@/components/home/EventRadiusSlider';
import { getCurrentLocationForSharing, getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import type { LocationSearchContext, LocationSearchResult } from '@/lib/locationSearch';
import { useAuthStore } from '@/stores/authStore';
import { useLocationSharingStore } from '@/stores/locationSharingStore';
import { Spinner } from '@/components/ui/spinner';
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
import {
  DEFAULT_EVENT_RADIUS_MILES,
  canApplyEventFilters,
  confirmVisibleEventFilters,
  isValidEventLocationFilter,
  normalizeEventRadiusMiles,
  parseLocalDateKey,
  toLocalDateKey,
  toggleSingleSelectFilterValue,
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
type DraftLocationCoords = {
  latitude: number | null;
  longitude: number | null;
};

const EMPTY_LOCATION_COORDS: DraftLocationCoords = {
  latitude: null,
  longitude: null,
};

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isValidLocationCoords = (
  coords: DraftLocationCoords | { latitude: number; longitude: number } | null | undefined,
): coords is { latitude: number; longitude: number } =>
  Boolean(
    coords &&
      isFiniteCoordinate(coords.latitude) &&
      isFiniteCoordinate(coords.longitude) &&
      coords.latitude >= -90 &&
      coords.latitude <= 90 &&
      coords.longitude >= -180 &&
      coords.longitude <= 180,
  );

export default function FilterModal({
  visible,
  onClose,
  activeFilters,
  onApply,
}: FilterModalProps) {
  const { colors, isDark } = useTheme();
  const [activeAge, setActiveAge] = useState<string | null>(null);
  const [activePrice, setActivePrice] = useState<string | null>(null);
  const [activeTime, setActiveTime] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [hashtags, setHashtags] = useState('');

  const user = useAuthStore((state) => state.user);
  const enableLocationSharing = useLocationSharingStore((state) => state.enableSharing);
  const disableLocationSharing = useLocationSharingStore((state) => state.disableSharing);
  const isLocationSyncing = useLocationSharingStore((state) => state.isSyncing);
  // Authoritative persisted value — Apply/filter-resolution logic must always use this,
  // never the transient optimistic value below, so filter semantics stay unchanged.
  const locationSharingEnabled = Boolean(user?.currentLocationSharingEnabled);
  // Transient, display-only value: lets the Switch move the instant the user taps it
  // instead of waiting on permission/GPS/PATCH, without becoming a second source of truth.
  const [pendingLocationValue, setPendingLocationValue] = useState<boolean | null>(null);

  const [locationSearchVisible, setLocationSearchVisible] = useState(false);
  const [locationSearchContext, setLocationSearchContext] = useState<LocationSearchContext | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<DraftLocationCoords>(EMPTY_LOCATION_COORDS);
  const [selectedLocationResult, setSelectedLocationResult] = useState<LocationSearchResult | null>(null);
  // Presentation-only short place name (e.g. "Barisal") for the applied filter's
  // heading — sourced from the same selected result that supplies the coordinates,
  // carried forward across reopen so it survives even after selectedLocationResult
  // is cleared back to null. Never sent to the backend.
  const [selectedLocationShortLabel, setSelectedLocationShortLabel] = useState<string | null>(null);
  // Session-scoped: true once Reset has been pressed in this open/edit session,
  // until the user explicitly re-selects Current Location or a manual place.
  // Lets "Reset" clear the Event location filter without touching the user's
  // persisted global location-sharing preference (locationSharingEnabled).
  const [locationFilterSessionReset, setLocationFilterSessionReset] = useState(false);
  // Session reset only overrides the *displayed* draft value — it never calls the
  // sharing API, so the persisted global preference (locationSharingEnabled) is untouched.
  const useCurrentLocation = pendingLocationValue !== null
    ? pendingLocationValue
    : locationFilterSessionReset
      ? false
      : locationSharingEnabled;

  const [radius, setRadius] = useState(DEFAULT_EVENT_RADIUS_MILES);
  const [isApplying, setIsApplying] = useState(false);

  const resetDraftRef = useRef(false);
  const searchContextRequestIdRef = useRef(0);

  useEffect(() => {
    if (!visible) return;

    resetDraftRef.current = false;
    setLocationFilterSessionReset(false);
    setActiveAge(activeFilters.ageRestriction ? AGE_VALUE_TO_OPTION[activeFilters.ageRestriction] : null);
    setActivePrice(activeFilters.priceFilter ? PRICE_VALUE_TO_OPTION[activeFilters.priceFilter] : null);
    setActiveTime(
      activeFilters.timePeriod && activeFilters.timePeriod !== 'any'
        ? TIME_VALUE_TO_OPTION[activeFilters.timePeriod]
        : null,
    );
    setSelectedDate(parseLocalDateKey(activeFilters.selectedDate));
    setHashtags(activeFilters.hashtags.map((tag) => `#${tag}`).join(' '));
    if (isValidEventLocationFilter(activeFilters.nearby)) {
      setRadius(normalizeEventRadiusMiles(activeFilters.nearby.radiusMiles));
      if (activeFilters.nearby.source === 'current') {
        setSelectedLocation('');
        setSelectedLocationCoords(EMPTY_LOCATION_COORDS);
        setSelectedLocationResult(null);
        setSelectedLocationShortLabel(null);
      } else {
        setSelectedLocation(activeFilters.nearby.label);
        setSelectedLocationCoords({
          latitude: activeFilters.nearby.latitude,
          longitude: activeFilters.nearby.longitude,
        });
        setSelectedLocationResult(null);
        setSelectedLocationShortLabel(activeFilters.nearby.shortLabel ?? null);
      }
    } else {
      setRadius(DEFAULT_EVENT_RADIUS_MILES);
      setSelectedLocation('');
      setSelectedLocationCoords(EMPTY_LOCATION_COORDS);
      setSelectedLocationResult(null);
      setSelectedLocationShortLabel(null);
    }
  }, [activeFilters, visible]);

  const handleRadiusCommitted = useCallback((nextRadius: number) => {
    setRadius(normalizeEventRadiusMiles(nextRadius));
  }, []);

  const clearSelectedLocationDraft = useCallback(() => {
    setSelectedLocation('');
    setSelectedLocationCoords(EMPTY_LOCATION_COORDS);
    setSelectedLocationResult(null);
    setSelectedLocationShortLabel(null);
  }, []);

  const handleToggleCurrentLocation = useCallback(async (value: boolean) => {
    if (isLocationSyncing) {
      return;
    }

    setPendingLocationValue(value);
    if (value) {
      // Explicitly re-selecting Current Location ends any prior Reset for this session.
      setLocationFilterSessionReset(false);
    }

    try {
      if (value) {
        await enableLocationSharing();
        clearSelectedLocationDraft();
      } else {
        await disableLocationSharing();
      }
      // enableSharing()/disableSharing() only resolve after authStore.user has
      // already been updated, so it's safe to drop the transient value now.
      setPendingLocationValue(null);
    } catch (error) {
      setPendingLocationValue(null);
      Alert.alert(
        'Current Location',
        error instanceof Error ? error.message : 'Unable to update current location sharing.',
      );
    }
  }, [isLocationSyncing, enableLocationSharing, disableLocationSharing, clearSelectedLocationDraft]);

  const resolveSearchProximityContext = useCallback(async (requestId: number) => {
    try {
      const location = await getCurrentLocationIfPermissionGranted();
      if (requestId !== searchContextRequestIdRef.current) {
        return;
      }

      setLocationSearchContext(isValidLocationCoords(location)
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            label: 'Device Location',
          }
        : null);
    } catch {
      if (requestId === searchContextRequestIdRef.current) {
        setLocationSearchContext(null);
      }
    }
  }, []);

  const handleOpenLocationSearch = useCallback(() => {
    setLocationSearchVisible(true);
    setLocationSearchContext(null);
    const requestId = searchContextRequestIdRef.current + 1;
    searchContextRequestIdRef.current = requestId;
    void resolveSearchProximityContext(requestId);
  }, [resolveSearchProximityContext]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleReset = () => {
    resetDraftRef.current = true;
    setActiveAge(null);
    setActivePrice(null);
    setActiveTime(null);
    setSelectedDate(null);
    setHashtags('');
    clearSelectedLocationDraft();
    setRadius(DEFAULT_EVENT_RADIUS_MILES);
    // Clears the Event *filter* session only — does not call enable/disableLocationSharing,
    // so the user's persisted global location-sharing preference is left untouched.
    setLocationFilterSessionReset(true);
  };

  const handleApply = async () => {
    if (isApplying || !canApplyCurrentDraft) return;

    setIsApplying(true);
    try {
      const parsedHashtags = parseHashtagFilterInput(hashtags);
      const committedRadius = normalizeEventRadiusMiles(radius);
      const timePeriod = activeTime ? TIME_OPTION_TO_VALUE[activeTime] : undefined;
      // A manually searched location always takes priority: since the switch now mirrors the
      // global sharing preference, it can stay ON after the user picks a specific place.
      // Uses the authoritative persisted value (not the transient display value) so Apply
      // never resolves "current location" based on an operation that hasn't confirmed yet.
      // locationFilterSessionReset lets Reset clear the Event location filter for this
      // session without touching that persisted preference.
      const hasManualLocationSelection = Boolean(selectedLocation.trim() || selectedLocationResult);
      const nearby = hasManualLocationSelection
        ? resolveSelectedLocationFilter(committedRadius)
        : locationSharingEnabled && !locationFilterSessionReset
          ? await resolveCurrentLocationFilter(committedRadius)
          : null;

      onApply(confirmVisibleEventFilters(
        activeFilters,
        {
          ageRestriction: activeAge ? AGE_OPTION_TO_VALUE[activeAge] : undefined,
          priceFilter: activePrice ? PRICE_OPTION_TO_VALUE[activePrice] : undefined,
          selectedDate: selectedDate ? toLocalDateKey(selectedDate) : null,
          timePeriod: timePeriod && timePeriod !== 'any' ? timePeriod : undefined,
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

  const resolveSelectedLocationFilter = (radiusMiles: number): NearbyEventsFilter | null => {
    if (!selectedLocation.trim() && !selectedLocationResult) {
      return null;
    }

    if (!isValidLocationCoords(selectedLocationCoords)) {
      throw new Error('Select a valid location result before applying this filter.');
    }

    return {
      latitude: selectedLocationCoords.latitude,
      longitude: selectedLocationCoords.longitude,
      radiusMiles,
      label: selectedLocation.trim() || selectedLocationResult?.label || 'Selected Location',
      source: 'selected',
      shortLabel: selectedLocationShortLabel ?? undefined,
    };
  };

  const resolveCurrentLocationFilter = async (radiusMiles: number): Promise<NearbyEventsFilter> => {
    const location = await getCurrentLocationForSharing();

    if (!isValidLocationCoords(location)) {
      throw new Error('Unable to read a valid current location. Check Location Services and try again.');
    }

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMiles,
      label: 'Current Location',
      source: 'current',
    };
  };

  const handleSelectLocation = (location: LocationSearchResult) => {
    if (!isValidLocationCoords(location)) {
      return;
    }

    setSelectedLocation(location.label);
    setSelectedLocationCoords({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setSelectedLocationResult(location);
    // Prefer the structured short place name over the flat label so the Feed
    // heading can safely say "Events around Barisal" without string-splitting.
    setSelectedLocationShortLabel(location.name?.trim() || location.city?.trim() || null);
    // A fresh manual selection is itself an explicit location decision for this session.
    setLocationFilterSessionReset(false);
  };

  const canApplyCurrentDraft = canApplyEventFilters({
    useCurrentLocation: locationSharingEnabled,
    selectedLocationLabel: selectedLocation,
    selectedLatitude: selectedLocationCoords.latitude,
    selectedLongitude: selectedLocationCoords.longitude,
  });
  const isApplyDisabled = isApplying || !canApplyCurrentDraft;

  const renderPills = (options: string[], active: string | null, onSelect: (val: string | null) => void) => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
        {options.map(opt => {
          const isActive = active === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, { borderColor: colors.border }, isActive && { backgroundColor: buttonBackground(colors), borderColor: colors.primary }]}
              onPress={() => onSelect(toggleSingleSelectFilterValue(active, opt))}
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
                onPress={handleOpenLocationSearch}
              >
                <Feather name="search" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>Search another location</Text>
              </TouchableOpacity>

              {selectedLocation.trim() ? (
                <View style={[styles.inputBox, styles.selectedLocationBox, { backgroundColor: isDark ? '#52525A' : '#F0F0F3' }]}>
                  <Feather name="map-pin" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.inputText, { color: colors.text }]}>{selectedLocation}</Text>
                </View>
              ) : null}

              <View style={[styles.currentLocationRow, { borderColor: colors.border }]}>
                <View style={styles.currentLocationLeft}>
                  <Feather name="target" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.inputText, { color: colors.text }]}>Current Location</Text>
                </View>
                <View style={styles.currentLocationToggleGroup}>
                  {isLocationSyncing && <Spinner size="small" color={colors.textSecondary} />}
                  <Switch
                    value={useCurrentLocation}
                    onValueChange={handleToggleCurrentLocation}
                    trackColor={{ false: isDark ? '#3A3A44' : '#E0E0E0', true: colors.primary }}
                    thumbColor="#FFFFFF"
                    disabled={isLocationSyncing}
                  />
                </View>
              </View>

              {/* Radius Slider — owns its own live drag state so dragging doesn't
                  re-render the rest of this modal; commits to `radius` on release. */}
              <EventRadiusSlider value={radius} onChangeCommitted={handleRadiusCommitted} />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? '#3A3A44' : '#E0E0E0' }]} onPress={onClose} activeOpacity={0.8}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: buttonBackground(colors) }, isApplyDisabled && styles.disabledBtn]}
              onPress={handleApply}
              activeOpacity={0.8}
              disabled={isApplyDisabled}
              accessibilityState={{ disabled: isApplyDisabled }}
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
        searchContext={locationSearchContext}
        searchPurpose="area"
        onClose={() => {
          searchContextRequestIdRef.current += 1;
          setLocationSearchVisible(false);
          setLocationSearchContext(null);
        }}
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
    paddingHorizontal: 16,
    height: 56,
    marginTop: 12,
    width: '100%',
  },
  currentLocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  currentLocationToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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
