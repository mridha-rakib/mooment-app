import LocationSearchModal from '@/components/post/LocationSearchModal';
import EventRadiusSlider from '@/components/home/EventRadiusSlider';
import LocationRecoveryState from '@/components/home/LocationRecoveryState';
import {
  getBestCurrentDeviceLocation,
  getCurrentLocationIfPermissionGranted,
  type DeviceLocationFailureStatus,
  type DeviceLocationResult,
} from '@/lib/locationSharing';
import type { LocationSearchContext, LocationSearchResult } from '@/lib/locationSearch';
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
  AppState,
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
  confirmVisibleEventFilters,
  isEventRadiusEnabled,
  isValidEventLocationFilter,
  normalizeEventRadiusMiles,
  parseLocalDateKey,
  resetEventFiltersPreservingDiscoveryCenter,
  summarizeEventFilters,
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

// Outer settle-guard so the recovery spinner can never hang even if the
// underlying platform call stalls. Comfortably above the device-location
// helper's own internal 12s GPS timeout; it does not replace it.
const FILTER_LOCATION_CHECK_TIMEOUT_MS = 15000;

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

  // Filter-scoped Current Location state. This is intentionally DECOUPLED from
  // the app-wide live-location sharing preference (user.currentLocationSharingEnabled):
  // choosing "Current Location" as the Event discovery center must never enable/
  // disable global sharing, PATCH /auth/me, start/stop the background watcher, or
  // touch OS permission beyond a normal foreground read.
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [deviceLocationCoords, setDeviceLocationCoords] = useState<DraftLocationCoords>(EMPTY_LOCATION_COORDS);
  const [locationRecovery, setLocationRecovery] = useState<DeviceLocationFailureStatus | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);

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

  const [radius, setRadius] = useState(DEFAULT_EVENT_RADIUS_MILES);
  // Distance filter active/inactive. `radius` above is only a UI anchor; when
  // this is false the applied filter carries no circular cutoff ("Any distance").
  const [radiusEnabled, setRadiusEnabled] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const resetDraftRef = useRef(false);
  const searchContextRequestIdRef = useRef(0);
  // Set synchronously by Reset to the exact filter object Apply must commit.
  // React state updates are async, so re-deriving `nearby.radiusMiles` (and the
  // cleared criteria) from local state in handleApply could otherwise leak the
  // pre-Reset values. Any subsequent draft edit invalidates it.
  const resetSnapshotRef = useRef<SharedEventFilters | null>(null);
  // Generation guard for the device-location check: only the newest request may
  // commit coords / recovery status / loading=false, so AppState recovery,
  // Retry, the toggle and Apply can never race a stale result over a newer one.
  const locationCheckIdRef = useRef(0);
  const isCheckingLocationRef = useRef(false);

  const invalidateResetSnapshot = useCallback(() => {
    resetSnapshotRef.current = null;
  }, []);

  useEffect(() => {
    if (!visible) return;

    resetDraftRef.current = false;
    resetSnapshotRef.current = null;
    // A fresh open supersedes any in-flight location check from a prior session.
    locationCheckIdRef.current += 1;
    setLocationRecovery(null);
    setIsCheckingLocation(false);
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
      // Legacy applied objects (no `radiusEnabled`) reopen as ACTIVE; only an
      // explicit `radiusEnabled: false` reopens as "Any distance".
      setRadiusEnabled(isEventRadiusEnabled(activeFilters.nearby));
      if (activeFilters.nearby.source === 'current') {
        setSelectedLocation('');
        setSelectedLocationCoords(EMPTY_LOCATION_COORDS);
        setSelectedLocationResult(null);
        setSelectedLocationShortLabel(null);
        // Reflect the applied Current Location center; reuse its coordinates so
        // re-applying an unchanged center needs no fresh GPS read.
        setUseCurrentLocation(true);
        setDeviceLocationCoords({
          latitude: activeFilters.nearby.latitude,
          longitude: activeFilters.nearby.longitude,
        });
      } else {
        setSelectedLocation(activeFilters.nearby.label);
        setSelectedLocationCoords({
          latitude: activeFilters.nearby.latitude,
          longitude: activeFilters.nearby.longitude,
        });
        setSelectedLocationResult(null);
        setSelectedLocationShortLabel(activeFilters.nearby.shortLabel ?? null);
        setUseCurrentLocation(false);
        setDeviceLocationCoords(EMPTY_LOCATION_COORDS);
      }
    } else {
      setRadius(DEFAULT_EVENT_RADIUS_MILES);
      setRadiusEnabled(false);
      setSelectedLocation('');
      setSelectedLocationCoords(EMPTY_LOCATION_COORDS);
      setSelectedLocationResult(null);
      setSelectedLocationShortLabel(null);
      setUseCurrentLocation(false);
      setDeviceLocationCoords(EMPTY_LOCATION_COORDS);
    }
  }, [activeFilters, visible]);

  useEffect(() => {
    isCheckingLocationRef.current = isCheckingLocation;
  }, [isCheckingLocation]);

  // Re-check device location when returning to a foregrounded app while the
  // recovery panel is showing (e.g. the user just enabled permission in
  // Settings). Guarded to "modal visible + Current Location intended +
  // currently unavailable + not already checking" so it never prompts, polls,
  // or stacks concurrent requests.
  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (
        state === 'active' &&
        useCurrentLocation &&
        locationRecovery &&
        !isCheckingLocationRef.current
      ) {
        void runLocationCheck();
      }
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, useCurrentLocation, locationRecovery]);

  const handleRadiusCommitted = useCallback((nextRadius: number) => {
    invalidateResetSnapshot();
    setRadius(normalizeEventRadiusMiles(nextRadius));
  }, [invalidateResetSnapshot]);

  // The first intentional touch on the slider turns the distance filter on.
  // Draft-only: nothing is fetched / committed / recentred until Apply.
  const handleActivateRadius = useCallback(() => {
    invalidateResetSnapshot();
    setRadiusEnabled(true);
  }, [invalidateResetSnapshot]);

  // Radius-only clear: back to "Any distance", anchor 75, keeping the discovery
  // centre and every other criterion. Draft-only until Apply.
  const handleClearRadiusDraft = useCallback(() => {
    invalidateResetSnapshot();
    setRadiusEnabled(false);
    setRadius(DEFAULT_EVENT_RADIUS_MILES);
  }, [invalidateResetSnapshot]);

  const clearSelectedLocationDraft = useCallback(() => {
    setSelectedLocation('');
    setSelectedLocationCoords(EMPTY_LOCATION_COORDS);
    setSelectedLocationResult(null);
    setSelectedLocationShortLabel(null);
  }, []);

  // Foreground device-location read for the Event discovery center. Uses the
  // shared helper (which requests foreground permission and reads a position)
  // but never enables/disables global live-location sharing. Returns the
  // coordinates on success, or null after recording a recoverable status.
  //
  // Concurrency-safe: each call takes a generation id and only the newest call
  // is allowed to commit coords / recovery status / loading. A superseded call
  // resolves silently, so an AppState recovery attempt, a manual Retry, the
  // toggle and Apply can never race a stale failure over a newer success (or
  // leave the spinner stuck). An outer timeout guarantees the newest call
  // always settles even if a platform call stalls.
  const runLocationCheck = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    const requestId = ++locationCheckIdRef.current;
    const isCurrent = () => requestId === locationCheckIdRef.current;
    setIsCheckingLocation(true);
    try {
      const result = await Promise.race<DeviceLocationResult>([
        getBestCurrentDeviceLocation({ requestPermission: true }),
        new Promise<DeviceLocationResult>((resolve) => {
          setTimeout(() => resolve({ status: 'timeout' }), FILTER_LOCATION_CHECK_TIMEOUT_MS);
        }),
      ]);

      if (!isCurrent()) {
        return null;
      }

      if (result.status === 'fresh' || result.status === 'lastKnown') {
        const coords = { latitude: result.location.latitude, longitude: result.location.longitude };
        setDeviceLocationCoords(coords);
        setLocationRecovery(null);
        return coords;
      }

      setLocationRecovery(result.status);
      return null;
    } catch {
      if (isCurrent()) {
        setLocationRecovery('failed');
      }
      return null;
    } finally {
      if (isCurrent()) {
        setIsCheckingLocation(false);
      }
    }
  }, []);

  const handleToggleCurrentLocation = useCallback(async (value: boolean) => {
    invalidateResetSnapshot();
    setUseCurrentLocation(value);
    setLocationRecovery(null);

    if (!value) {
      // Cancel any in-flight check so a late result can't re-open recovery.
      locationCheckIdRef.current += 1;
      setIsCheckingLocation(false);
      setDeviceLocationCoords(EMPTY_LOCATION_COORDS);
      return;
    }

    // Current Location replaces any searched place as the discovery center.
    clearSelectedLocationDraft();
    await runLocationCheck();
  }, [invalidateResetSnapshot, clearSelectedLocationDraft, runLocationCheck]);

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
      invalidateResetSnapshot();
      setSelectedDate(date);
    }
  };

  // Draft-only: clears just the date until Apply. Cancel leaves the previously
  // applied date intact; every other criterion is untouched.
  const handleClearDate = useCallback(() => {
    invalidateResetSnapshot();
    setSelectedDate(null);
  }, [invalidateResetSnapshot]);

  // Explicit, dedicated remove of a searched discovery center. Returns the
  // Event discovery center to the filter-scoped Current Location (never the
  // global live-location sharing preference; never mutates OS permission or
  // real device coordinates). If the device location cannot be acquired, the
  // existing Batch-1 recovery panel takes over and the filter criteria stay
  // intact. This is a different action from Reset — Reset's searched-center
  // semantics are unchanged.
  const handleRemoveSearchedLocation = useCallback(() => {
    invalidateResetSnapshot();
    clearSelectedLocationDraft();
    setLocationRecovery(null);
    setUseCurrentLocation(true);
    void runLocationCheck();
  }, [invalidateResetSnapshot, clearSelectedLocationDraft, runLocationCheck]);

  const handleReset = () => {
    resetDraftRef.current = true;
    // Build the authoritative reset result ONCE, synchronously, from the
    // always-current `activeFilters` prop. handleApply commits this exact
    // object, so async state batching cannot leak the pre-Reset radius or
    // criteria. APPROVED semantics: clear every non-location criterion, return
    // distance to "Any distance" (radius inactive, anchor 75), and PRESERVE any
    // valid discovery centre — current OR searched. Nothing here touches OS
    // permission, real device coordinates, or global live-location sharing.
    const snapshot = resetEventFiltersPreservingDiscoveryCenter(activeFilters);
    resetSnapshotRef.current = snapshot;

    const center = isValidEventLocationFilter(snapshot.nearby) ? snapshot.nearby : null;

    setActiveAge(null);
    setActivePrice(null);
    setActiveTime(null);
    setSelectedDate(null);
    setHashtags('');
    setRadius(DEFAULT_EVENT_RADIUS_MILES);
    setRadiusEnabled(false);
    setLocationRecovery(null);

    if (center?.source === 'current') {
      clearSelectedLocationDraft();
      setUseCurrentLocation(true);
      setDeviceLocationCoords({ latitude: center.latitude, longitude: center.longitude });
    } else if (center?.source === 'selected') {
      setUseCurrentLocation(false);
      setDeviceLocationCoords(EMPTY_LOCATION_COORDS);
      setSelectedLocation(center.label);
      setSelectedLocationCoords({ latitude: center.latitude, longitude: center.longitude });
      setSelectedLocationResult(null);
      setSelectedLocationShortLabel(center.shortLabel ?? null);
    } else {
      clearSelectedLocationDraft();
      setUseCurrentLocation(false);
      setDeviceLocationCoords(EMPTY_LOCATION_COORDS);
    }
  };

  const handleApply = async () => {
    if (isApplying) return;

    setIsApplying(true);
    try {
      // Reset produced an authoritative snapshot synchronously; commit it
      // verbatim (unless the user has since edited the draft, which clears it)
      // so a not-yet-flushed local radius/criteria value can't be re-applied.
      const resetSnapshot = resetSnapshotRef.current;
      if (resetSnapshot) {
        onApply(resetSnapshot);
        onClose();
        return;
      }

      const parsedHashtags = parseHashtagFilterInput(hashtags);
      const committedRadius = normalizeEventRadiusMiles(radius);
      const timePeriod = activeTime ? TIME_OPTION_TO_VALUE[activeTime] : undefined;
      // A manually searched location always takes priority. Otherwise, if the
      // filter-scoped Current Location toggle is on, resolve the discovery
      // center from a foreground device read (reusing coordinates already
      // acquired this session). If it cannot be resolved, surface the recovery
      // panel and keep the modal open rather than applying a broken center or
      // blocking every non-location filter.
      const hasManualLocationSelection = Boolean(selectedLocation.trim() || selectedLocationResult);
      let nearby: NearbyEventsFilter | null = null;
      if (hasManualLocationSelection) {
        nearby = resolveSelectedLocationFilter(committedRadius);
      } else if (useCurrentLocation) {
        const coords = isValidLocationCoords(deviceLocationCoords)
          ? deviceLocationCoords
          : await runLocationCheck();
        if (!coords) {
          setIsApplying(false);
          return;
        }
        nearby = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          radiusMiles: committedRadius,
          label: 'Current Location',
          source: 'current',
          radiusEnabled,
        };
      }

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
      resetSnapshotRef.current = null;
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
      radiusEnabled,
    };
  };

  const handleSelectLocation = (location: LocationSearchResult) => {
    if (!isValidLocationCoords(location)) {
      return;
    }

    invalidateResetSnapshot();
    setSelectedLocation(location.label);
    setSelectedLocationCoords({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setSelectedLocationResult(location);
    // Prefer the structured short place name over the flat label so the Feed
    // heading can safely say "Events around Barisal" without string-splitting.
    setSelectedLocationShortLabel(location.name?.trim() || location.city?.trim() || null);
    // A fresh manual selection replaces Current Location as the discovery center.
    setUseCurrentLocation(false);
    setDeviceLocationCoords(EMPTY_LOCATION_COORDS);
    setLocationRecovery(null);
  };

  // A location source is NOT required to apply Event filters. Age/price/date/
  // time/hashtag/category can be applied with nearby = null; the request simply
  // omits latitude/longitude/radiusKm.
  const isApplyDisabled = isApplying;

  // Compact, display-only line of the AUTHORITATIVE applied criteria (prop),
  // never the editable draft. "" when nothing is active.
  const appliedSummary = summarizeEventFilters(activeFilters);

  const renderPills = (options: string[], active: string | null, onSelect: (val: string | null) => void) => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillContainer}>
        {options.map(opt => {
          const isActive = active === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.pill, { borderColor: colors.border }, isActive && { backgroundColor: buttonBackground(colors), borderColor: colors.primary }]}
              onPress={() => {
                invalidateResetSnapshot();
                onSelect(toggleSingleSelectFilterValue(active, opt));
              }}
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

          {appliedSummary ? (
            <Text
              style={[styles.appliedSummary, { color: colors.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {appliedSummary}
            </Text>
          ) : null}

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

              <View style={styles.dateRow}>
                <TouchableOpacity
                  style={[styles.inputBox, styles.dateInput, { backgroundColor: colors.card }]}
                  activeOpacity={0.8}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Feather name="calendar" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                    {selectedDate ? selectedDate.toLocaleDateString() : 'Pick a date'}
                  </Text>
                </TouchableOpacity>
                {selectedDate ? (
                  <TouchableOpacity
                    style={styles.inlineClearBtn}
                    onPress={handleClearDate}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove date"
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

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
                  onChangeText={(text) => {
                    invalidateResetSnapshot();
                    setHashtags(text);
                  }}
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
                  <View style={styles.selectedLocationTextGroup}>
                    <Text style={[styles.selectedLocationCaption, { color: colors.textSecondary }]}>Searching near</Text>
                    <Text style={[styles.inputText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {selectedLocation}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.inlineClearBtn}
                    onPress={handleRemoveSearchedLocation}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove search location"
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={[styles.currentLocationRow, { borderColor: colors.border }]}>
                <View style={styles.currentLocationLeft}>
                  <Feather name="target" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                  <Text style={[styles.inputText, { color: colors.text }]}>Current Location</Text>
                </View>
                <View style={styles.currentLocationToggleGroup}>
                  {isCheckingLocation && <Spinner size="small" color={colors.textSecondary} />}
                  <Switch
                    value={useCurrentLocation}
                    onValueChange={handleToggleCurrentLocation}
                    trackColor={{ false: isDark ? '#3A3A44' : '#E0E0E0', true: colors.primary }}
                    thumbColor="#FFFFFF"
                    disabled={isCheckingLocation}
                  />
                </View>
              </View>

              {locationRecovery ? (
                <LocationRecoveryState
                  status={locationRecovery}
                  retrying={isCheckingLocation}
                  onRetry={() => {
                    void runLocationCheck();
                  }}
                />
              ) : null}

              {/* Radius Slider — owns its own live drag state so dragging doesn't
                  re-render the rest of this modal; commits to `radius` on release.
                  When `enabled` is false it shows "Any distance"; the first drag
                  gesture calls `onActivate`. `onClear` returns it to inactive. */}
              <EventRadiusSlider
                value={radius}
                enabled={radiusEnabled}
                onActivate={handleActivateRadius}
                onClear={handleClearRadiusDraft}
                onChangeCommitted={handleRadiusCommitted}
              />
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
  appliedSummary: {
    fontSize: 12,
    paddingHorizontal: 20,
    marginTop: -12,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  dateInput: {
    flex: 1,
    marginTop: 0,
  },
  inlineClearBtn: {
    width: 32,
    height: 32,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedLocationTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  selectedLocationCaption: {
    fontSize: 11,
    lineHeight: 13,
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
