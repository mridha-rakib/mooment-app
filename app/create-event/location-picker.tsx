import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { MAPBOX_PUBLIC_TOKEN } from '@/lib/mapbox';
import { APP_MAP_STYLE_URL, SATELLITE_MAP_STYLE_URL } from '@/lib/mapStyles';
import {
  reverseGeocodeLocation,
  searchLocations,
  type LocationSearchContext,
  type LocationSearchResult,
} from '@/lib/locationSearch';
import { useEventDraftStore } from '@/stores/eventDraftStore';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

type MapViewMode = 'map2d' | 'map3d' | 'satellite2d' | 'satellite3d';
type CameraPreset = {
  animationDuration: number;
  heading: number;
  pitch: number;
  zoomLevel: number;
};

const TERRAIN_SOURCE_ID = 'create-event-mapbox-dem';
const TERRAIN_SOURCE_URL = 'mapbox://mapbox.mapbox-terrain-dem-v1';

const DEFAULT_LOCATION: LocationSearchResult = {
  address: '',
  id: 'default-location',
  isVenue: false,
  label: '',
  latitude: 23.764288,
  longitude: 90.38896,
  name: '',
};

const getLocationSelectionKey = (location: LocationSearchResult) =>
  [
    location.providerId ?? location.id,
    location.latitude.toFixed(6),
    location.longitude.toFixed(6),
  ].join(':');

export default function LocationPickerScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const currentLocation = useEventDraftStore((state) => state.location);
  const setStepThree = useEventDraftStore((state) => state.setStepThree);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const searchRequestId = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);
  const initialLocation: LocationSearchResult = {
    ...DEFAULT_LOCATION,
    address: currentLocation.address || currentLocation.searchLabel || DEFAULT_LOCATION.address,
    id: 'draft-location',
    isVenue: Boolean(currentLocation.venue),
    label: currentLocation.searchLabel || currentLocation.address || DEFAULT_LOCATION.label,
    latitude: typeof currentLocation.latitude === 'number' ? currentLocation.latitude : DEFAULT_LOCATION.latitude,
    longitude: typeof currentLocation.longitude === 'number' ? currentLocation.longitude : DEFAULT_LOCATION.longitude,
    name: currentLocation.venue || currentLocation.searchLabel || currentLocation.address || DEFAULT_LOCATION.name,
  };
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult>(initialLocation);
  const selectedLocationRef = useRef<LocationSearchResult>(initialLocation);
  const [query, setQuery] = useState(initialLocation.label);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingInitialLocation, setIsResolvingInitialLocation] = useState(false);
  const [mapMode, setMapMode] = useState<MapViewMode>('map2d');
  const is3DMode = mapMode === 'map3d' || mapMode === 'satellite3d';
  const isSatelliteMode = mapMode === 'satellite2d' || mapMode === 'satellite3d';
  const isSatellite3DMode = mapMode === 'satellite3d';
  const cameraPreset: CameraPreset = isSatellite3DMode
    ? { animationDuration: 1100, heading: -34, pitch: 68, zoomLevel: 17.15 }
    : is3DMode
      ? { animationDuration: 950, heading: -28, pitch: 64, zoomLevel: 16.7 }
      : { animationDuration: 700, heading: 0, pitch: 0, zoomLevel: 14 };
  const mapStyleUrl = isSatelliteMode
    ? SATELLITE_MAP_STYLE_URL
    : APP_MAP_STYLE_URL;
  const mapModeLabel = {
    map2d: '2D',
    map3d: '3D',
    satellite2d: 'SAT',
    satellite3d: 'SAT 3D',
  }[mapMode];
  const mapModeIcon = {
    map2d: 'map-outline',
    map3d: 'cube-outline',
    satellite2d: 'earth-outline',
    satellite3d: 'business-outline',
  }[mapMode];

  const getSelectedSearchContext = (location = selectedLocation): LocationSearchContext | null => {
    if (!location.label && location.id === 'default-location') {
      return null;
    }

    return {
      label: location.label,
      latitude: location.latitude,
      longitude: location.longitude,
    };
  };

  useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  useEffect(() => {
    const hasCoordinates = typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number';

    if (hasCoordinates) {
      return;
    }

    let isMounted = true;

    setIsResolvingInitialLocation(true);
    getCurrentLocationIfPermissionGranted()
      .then(async (location) => {
        if (!location) {
          return null;
        }

        const reverseLocation = await reverseGeocodeLocation(location.latitude, location.longitude).catch(() => null);

        return {
          address: reverseLocation?.address || reverseLocation?.label || 'Current Location',
          id: 'current-location',
          isVenue: false,
          label: reverseLocation?.label || reverseLocation?.address || 'Current Location',
          latitude: location.latitude,
          longitude: location.longitude,
          matchLabel: 'Current location',
          name: reverseLocation?.name || 'Current Location',
        } satisfies LocationSearchResult;
      })
      .then((location) => {
        if (!isMounted || !location) {
          return;
        }

        setSelectedLocation(location);
        selectedLocationRef.current = location;
        setQuery(location.label);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsResolvingInitialLocation(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentLocation.latitude, currentLocation.longitude]);

  useEffect(() => {
    cameraRef.current?.setCamera({
      animationDuration: cameraPreset.animationDuration,
      animationMode: 'easeTo',
      centerCoordinate: [selectedLocation.longitude, selectedLocation.latitude],
      heading: cameraPreset.heading,
      pitch: cameraPreset.pitch,
      zoomLevel: cameraPreset.zoomLevel,
    });
  }, [
    cameraPreset.animationDuration,
    cameraPreset.heading,
    cameraPreset.pitch,
    cameraPreset.zoomLevel,
    selectedLocation.latitude,
    selectedLocation.longitude,
  ]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2 || trimmedQuery === selectedLocation.label) {
      setResults([]);
      setIsSearching(false);
      searchAbortRef.current?.abort();
      return;
    }

    const timeoutId = setTimeout(() => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      const requestId = searchRequestId.current + 1;
      searchRequestId.current = requestId;
      setIsSearching(true);

      searchLocations(trimmedQuery, getSelectedSearchContext(), { signal: controller.signal })
        .then((locations) => {
          if (requestId === searchRequestId.current) {
            setResults(locations);
          }
        })
        .catch(() => {
          if (requestId === searchRequestId.current && !controller.signal.aborted) {
            setResults([]);
          }
        })
        .finally(() => {
          if (requestId === searchRequestId.current) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      clearTimeout(timeoutId);
      searchAbortRef.current?.abort();
    };
  }, [query, selectedLocation.label, selectedLocation.latitude, selectedLocation.longitude]);

  const handleSelectLocation = (location: LocationSearchResult) => {
    const currentSelection = selectedLocationRef.current;

    if (
      getLocationSelectionKey(currentSelection) === getLocationSelectionKey(location) &&
      query === location.label
    ) {
      return;
    }

    searchAbortRef.current?.abort();
    searchRequestId.current += 1;
    selectedLocationRef.current = location;
    setSelectedLocation(location);
    setQuery(location.label);
    setResults([]);
    setIsSearching(false);
    Keyboard.dismiss();
  };

  const resolveTypedLocation = async () => {
    const trimmedQuery = query.trim();
    const currentSelection = selectedLocationRef.current;

    if (trimmedQuery.length < 2 || trimmedQuery === currentSelection.label) {
      return currentSelection;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setIsSearching(true);

    try {
      const [location] = await searchLocations(trimmedQuery, getSelectedSearchContext(), {
        signal: controller.signal,
      });

      if (requestId === searchRequestId.current && !controller.signal.aborted && location) {
        selectedLocationRef.current = location;
        setSelectedLocation(location);
        setQuery(location.label);
        setResults([]);
        return location;
      }
    } catch {
      return selectedLocationRef.current;
    } finally {
      if (requestId === searchRequestId.current) {
        setIsSearching(false);
      }
    }

    return selectedLocationRef.current;
  };

  const handleSubmitSearch = async () => {
    const location = await resolveTypedLocation();
    handleSelectLocation(location);
  };

  const handleConfirm = async () => {
    const location = await resolveTypedLocation();

    setStepThree({
      location: {
        ...currentLocation,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        searchLabel: location.label,
        venue: location.isVenue ? location.name : currentLocation.venue,
      },
    });
    router.back();
  };

  const handleToggle3DMode = () => {
    setMapMode((value) => {
      if (value === 'map2d') {
        return 'map3d';
      }

      if (value === 'map3d') {
        return 'satellite2d';
      }

      if (value === 'satellite2d') {
        return 'satellite3d';
      }

      return 'map2d';
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Map</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            autoCorrect={false}
            placeholder="Search location"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSubmitSearch}
          />
          {isSearching && <ActivityIndicator color={colors.textSecondary} size="small" />}
        </View>
        {results.length > 0 && (
          <View style={[styles.resultsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {results.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[styles.resultItem, { borderBottomColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => handleSelectLocation(location)}
              >
                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                  {location.name}
                </Text>
                {location.matchLabel && (
                  <Text style={[styles.resultTag, { color: colors.primary }]} numberOfLines={1}>
                    {location.matchLabel}
                  </Text>
                )}
                <Text style={[styles.resultAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                  {location.address}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.mapContainer, { backgroundColor: colors.background }]}>
        <Mapbox.MapView
          key={mapStyleUrl}
          style={styles.map}
          styleURL={mapStyleUrl}
          logoEnabled={false}
          attributionEnabled={false}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          {isSatelliteMode && (
            <Mapbox.RasterLayer
              id="satellite"
              existing
              style={{
                rasterBrightnessMax: 0.4,
                rasterSaturation: -0.15,
              }}
            />
          )}
          {is3DMode && (
            <>
              <Mapbox.RasterDemSource
                id={TERRAIN_SOURCE_ID}
                url={TERRAIN_SOURCE_URL}
                tileSize={512}
                maxZoomLevel={14}
              />
              <Mapbox.Terrain
                sourceID={TERRAIN_SOURCE_ID}
                style={{
                  exaggeration: isSatelliteMode ? 1.16 : 1.08,
                }}
              />
              <Mapbox.Light
                style={{
                  anchor: 'viewport',
                  color: isSatelliteMode ? '#FFFFFF' : '#F6EEFF',
                  intensity: isSatelliteMode ? 0.42 : 0.36,
                  position: [1.25, 210, 42],
                }}
              />
              <Mapbox.Atmosphere
                style={{
                  color: isSatelliteMode ? '#DDE8F8' : '#CAB8E3',
                  highColor: isSatelliteMode ? '#AFC8F4' : '#8E7BB4',
                  horizonBlend: isSatelliteMode ? 0.12 : 0.08,
                  range: [-1.5, 4.5],
                  spaceColor: isSatelliteMode ? '#06111E' : '#040407',
                  starIntensity: 0.04,
                  verticalRange: [0, 600],
                }}
              />
            </>
          )}
          <Mapbox.Camera
            ref={cameraRef}
            animationDuration={cameraPreset.animationDuration}
            animationMode="easeTo"
            centerCoordinate={[selectedLocation.longitude, selectedLocation.latitude]}
            heading={cameraPreset.heading}
            pitch={cameraPreset.pitch}
            zoomLevel={cameraPreset.zoomLevel}
          />
          {is3DMode && (
            <Mapbox.FillExtrusionLayer
              id="create-event-buildings-3d"
              sourceID="composite"
              sourceLayerID="building"
              minZoomLevel={13}
              maxZoomLevel={22}
              style={{
                fillExtrusionBase: ['coalesce', ['get', 'min_height'], 0],
                fillExtrusionBaseAlignment: 'terrain',
                fillExtrusionColor: isSatelliteMode ? '#D6DBE6' : isDark ? '#8290AE' : '#BFAFD0',
                fillExtrusionEdgeRadius: isSatelliteMode ? 0.28 : 0.2,
                fillExtrusionHeight: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  13,
                  0,
                  15.5,
                  ['coalesce', ['get', 'height'], 26],
                ],
                fillExtrusionHeightAlignment: 'terrain',
                fillExtrusionOpacity: isSatelliteMode ? 0.58 : 0.68,
                fillExtrusionVerticalGradient: true,
                fillExtrusionAmbientOcclusionIntensity: isSatelliteMode ? 0.32 : 0.26,
                fillExtrusionAmbientOcclusionRadius: 3.5,
                fillExtrusionRoundedRoof: true,
              }}
            />
          )}
          <Mapbox.MarkerView
            coordinate={[selectedLocation.longitude, selectedLocation.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.markerContainer}>
              <View style={[styles.markerCircle, { borderColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0,0,0,0.2)' }]}>
                <View style={[styles.markerDot, { backgroundColor: colors.primary }]} />
              </View>
              <View style={[styles.markerStem, { backgroundColor: colors.primary }]} />
            </View>
          </Mapbox.MarkerView>
        </Mapbox.MapView>
        <TouchableOpacity
          style={[styles.modeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.85}
          onPress={handleToggle3DMode}
        >
          <Ionicons name={mapModeIcon as any} size={17} color={colors.text} />
          <Text style={[styles.modeButtonText, { color: colors.text }]}>{mapModeLabel}</Text>
        </TouchableOpacity>
        {isResolvingInitialLocation && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>

      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.confirmButton, { backgroundColor: buttonBackground(colors) }]}
          onPress={handleConfirm}
        >
          <Text style={[styles.confirmButtonText, { color: buttonForeground(colors) }]}>Confirm</Text>
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    margin: 0,
    padding: 0,
  },
  resultsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    left: 16,
    maxHeight: 230,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
    top: 72,
    zIndex: 30,
  },
  resultItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultTag: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  resultAddress: {
    fontSize: 12,
    marginTop: 3,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 24,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
