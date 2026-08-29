import { getCategoryColor, getCategoryMarkerColor } from "@/constants/categoryColors";
import { EVENT_CATEGORIES, type EventCategory } from "@/constants/eventCategories";
import { useTheme } from "@/hooks/useTheme";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";
import {
  APP_MAP_STYLE_URL_LIGHT_NO_TRAFFIC,
  APP_MAP_STYLE_URL_NO_TRAFFIC,
  SATELLITE_MAP_STYLE_URL,
} from "@/lib/mapStyles";
import type { EventMapViewport } from "@/lib/mapEventRequests";
import {
  getCarouselIndexByMarkerId,
  getCoordinateDistanceMeters,
  getNearestEventSequence,
  isValidCarouselCoordinate,
  markerMatchesCategory,
  resolveCarouselSelection,
  type MapCarouselMarker,
} from "@/lib/mapEventCarousel";
import {
  getBestCurrentDeviceLocation,
  isValidLocationCoordinate,
  toMapboxCoordinate,
  type CurrentLocationPayload,
  type DeviceLocationSuccessResult,
} from "@/lib/locationSharing";
import { useAuthStore } from "@/stores/authStore";
import { usePlanStore } from "@/stores/planStore";
import {
  Add01Icon,
  Remove01Icon,
  SatelliteIcon,
  Target01Icon,
  TrafficIncidentIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import type { MapState } from "@rnmapbox/maps";
import Mapbox from "@rnmapbox/maps";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Stop,
  Circle as SvgCircle,
  RadialGradient as SvgRadialGradient,
} from "react-native-svg";
import {
  MAP_MARKER_GLOW_CONFIG,
  getLivePulsePeakOpacity,
  getMarkerGlowBaseOpacity,
} from "@/constants/mapMarkerGlow";
import CinematicButton from "./CinematicButton";
import EventPreviewModal from "./EventPreviewModal";

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const DEFAULT_ZOOM_LEVEL = 12;
const USER_LOCATION_ZOOM_LEVEL = 14;
const INITIAL_CAMERA_CORRECTION_THRESHOLD_METERS = 25;
const CATEGORY_RAIL_TOP = 60;
const CATEGORY_RAIL_HEIGHT = 42;
const MAP_SCALE_BAR_OFFSET = {
  top: CATEGORY_RAIL_TOP + CATEGORY_RAIL_HEIGHT + 10,
  left: 16,
};
// Existing base glow opacities, unchanged from before check-in brightness/live
// pulse existed — kept as named constants so the same value drives both the
// visual default and the brightness/pulse calculation from one place.
const TRAFFIC_GLOW_BASE_OPACITY = 0.5;
const SATELLITE_IMAGE_GLOW_BASE_OPACITY = 0.7;
const SATELLITE_ANCHOR_GLOW_BASE_OPACITY = 0.4;
const MAP_GESTURE_SETTINGS = {
  doubleTapToZoomInEnabled: true,
  doubleTouchToZoomOutEnabled: true,
  panEnabled: true,
  pinchPanEnabled: true,
  pinchZoomEnabled: true,
  pinchZoomDecelerationEnabled: true,
  pitchEnabled: true,
  quickZoomEnabled: true,
  rotateEnabled: true,
  rotateDecelerationEnabled: true,
  simultaneousRotateAndPinchToZoomEnabled: true,
  simultaneousRotateAndPinchZoomEnabled: true,
} as const;

type MapViewMode = "traffic" | "satellite";
type UserLocationSource = "fresh" | "lastKnown" | "stored";
type CameraMoveSource = UserLocationSource | "filter";
type PendingCameraMove = {
  coordinate: [number, number];
  animationDuration: number;
  source: CameraMoveSource;
  mode: "initial" | "manual";
  zoomLevel?: number;
  reason?: "filter";
  intentKey?: string;
};

export type MapFilterRecenterIntent = {
  key: string;
  coordinate: [number, number];
  zoomLevel: number;
};

export type MapMarkerData = MapCarouselMarker & {
  id: string;
  latitude: number;
  longitude: number;
  image: string;
  label: string;
  glowColor: string;
  category?: string | null;
  categories?: string[];
  scheduledAt?: string | null;
  endAt?: string | null;
  hostName?: string | null;
  distance?: string | null;
  distanceMeters?: number | null;
  isLive?: boolean;
  eventStatus?: string | null;
  crowdStatus?: import("@/lib/events").CrowdStatus | null;
  checkedInCount?: number;
  eventDate?: string | null;
  eventTime?: string | null;
  eventEndDate?: string | null;
  eventEndTime?: string | null;
  location?: string | null;
  attendeesCount?: number;
  ageLimit?: string | null;
  price?: string | null;
  ticketsAvailable?: string | null;
  ticketSalesEndDate?: string | null;
  ticketTypeCount?: string | null;
};

type MapScreenProps = {
  markers: MapMarkerData[];
  onBack?: () => void;
  logoText?: string;
  onUserLocationChange?: (coordinate: [number, number]) => void;
  onViewportChange?: (viewport: EventMapViewport) => void;
  filterRecenterIntent?: MapFilterRecenterIntent | null;
  onFilterRecenterHandled?: (key: string) => void;
  selectedCategory?: EventCategory | null;
  onCategoryChange?: (category: EventCategory | null) => void;
};

type MapMarkerProps = {
  coordinate: [number, number];
  image: string;
  label: string;
  glowColor: string;
  onPress: () => void;
  isSatellite: boolean;
  checkedInCount?: number;
  isLive?: boolean;
  livePulseProgress: SharedValue<number>;
};

const MapMarker = React.memo(({
  coordinate,
  image,
  label,
  glowColor = "#D4B0EB",
  onPress,
  isSatellite,
  checkedInCount,
  isLive = false,
  livePulseProgress,
}: MapMarkerProps) => {
  const { colors } = useTheme();

  const trafficGlowBaseOpacity = getMarkerGlowBaseOpacity(TRAFFIC_GLOW_BASE_OPACITY, checkedInCount);
  const satImageGlowBaseOpacity = getMarkerGlowBaseOpacity(SATELLITE_IMAGE_GLOW_BASE_OPACITY, checkedInCount);
  const satAnchorGlowBaseOpacity = getMarkerGlowBaseOpacity(SATELLITE_ANCHOR_GLOW_BASE_OPACITY, checkedInCount);

  // Only live markers read livePulseProgress.value — Reanimated's automatic
  // dependency tracking means a marker whose worklet never touches .value in
  // its executed branch does not re-run when the shared pulse value changes,
  // so non-live markers stay fully static without any extra subscription.
  const animatedTrafficGlowStyle = useAnimatedStyle(() => {
    if (!isLive) {
      return { opacity: trafficGlowBaseOpacity };
    }

    return {
      opacity: interpolate(
        livePulseProgress.value,
        [0, 1],
        [trafficGlowBaseOpacity, getLivePulsePeakOpacity(trafficGlowBaseOpacity)],
      ),
    };
  }, [isLive, trafficGlowBaseOpacity]);

  const animatedSatImageGlowStyle = useAnimatedStyle(() => {
    if (!isLive) {
      return { opacity: satImageGlowBaseOpacity };
    }

    return {
      opacity: interpolate(
        livePulseProgress.value,
        [0, 1],
        [satImageGlowBaseOpacity, getLivePulsePeakOpacity(satImageGlowBaseOpacity)],
      ),
    };
  }, [isLive, satImageGlowBaseOpacity]);

  const animatedSatAnchorGlowStyle = useAnimatedStyle(() => {
    if (!isLive) {
      return { opacity: satAnchorGlowBaseOpacity };
    }

    return {
      opacity: interpolate(
        livePulseProgress.value,
        [0, 1],
        [satAnchorGlowBaseOpacity, getLivePulsePeakOpacity(satAnchorGlowBaseOpacity)],
      ),
    };
  }, [isLive, satAnchorGlowBaseOpacity]);

  // Additive live-only ripple rings. These do not touch the marker body or
  // the existing glow layer — they read the same shared livePulseProgress
  // value (no second animation driver), one directly and one inverted, so
  // the two rings expand out of phase for a clearer, more obviously "live"
  // pulse. Fully transparent and inert whenever isLive is false.
  const animatedLivePulseRingOuterStyle = useAnimatedStyle(() => {
    if (!isLive) {
      return { opacity: 0 };
    }

    return {
      opacity: interpolate(livePulseProgress.value, [0, 1], [0.85, 0]),
      transform: [{ scale: interpolate(livePulseProgress.value, [0, 1], [1, 2]) }],
    };
  }, [isLive]);

  const animatedLivePulseRingInnerStyle = useAnimatedStyle(() => {
    if (!isLive) {
      return { opacity: 0 };
    }

    const inverseProgress = 1 - livePulseProgress.value;

    return {
      opacity: interpolate(inverseProgress, [0, 1], [0.85, 0]),
      transform: [{ scale: interpolate(inverseProgress, [0, 1], [1, 1.5]) }],
    };
  }, [isLive]);

  if (isSatellite) {
    return (
      <Mapbox.MarkerView coordinate={coordinate} anchor={{ x: 0.15, y: 1 }} allowOverlap allowOverlapWithPuck>
        <TouchableOpacity
          style={styles.satMarkerContainer}
          onPress={onPress}
          activeOpacity={0.9}
        >
          {/* Image Radial Glow - Moved behind the bubble */}
          <Animated.View pointerEvents="none" style={[styles.satImageGlow, animatedSatImageGlowStyle]}>
            <Svg height="60" width="60" viewBox="0 0 60 60">
              <Defs>
                <SvgRadialGradient
                  id="satImageGrad"
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                >
                  <Stop offset="0%" stopColor={glowColor} stopOpacity="1" />
                  <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                </SvgRadialGradient>
              </Defs>
              <SvgCircle cx="30" cy="30" r="30" fill="url(#satImageGrad)" />
            </Svg>
          </Animated.View>

          {/* Anchor Radial Glow - Moved behind the bubble */}
          <Animated.View pointerEvents="none" style={[styles.satAnchorGlow, animatedSatAnchorGlowStyle]}>
            <Svg height="20" width="20" viewBox="0 0 20 20">
              <Defs>
                <SvgRadialGradient
                  id="satAnchorGrad"
                  cx="50%"
                  cy="50%"
                  rx="50%"
                  ry="50%"
                >
                  <Stop offset="0%" stopColor={glowColor} stopOpacity="1" />
                  <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
                </SvgRadialGradient>
              </Defs>
              <SvgCircle cx="10" cy="10" r="10" fill="url(#satAnchorGrad)" />
            </Svg>
          </Animated.View>

          <BlurView pointerEvents="none" intensity={80} tint="dark" style={styles.satBubble}>
            <LinearGradient
              colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.satImageWrapper, { borderColor: glowColor }]}>
              <Image source={{ uri: image }} style={styles.satImage} />
            </View>
            <View style={styles.satTextContainer}>
              <Text style={styles.satLabel} numberOfLines={2}>
                {label}
              </Text>
              <View style={styles.satStatsRow}>
                <Text style={styles.satStatsText}>0.4 mi</Text>
                <View style={styles.satDot} />
                <HugeiconsIcon
                  icon={UserGroupIcon}
                  size={10}
                  color="rgba(255,255,255,0.6)"
                />
                <Text style={[styles.satStatsText, { marginLeft: 2 }]}>
                  126
                </Text>
              </View>
            </View>
          </BlurView>
          <View
            pointerEvents="none"
            style={[
              styles.satAnchorPoint,
              {
                backgroundColor: "#FFFFFF",
                borderColor: glowColor,
                shadowColor: glowColor,
              },
            ]}
          />
        </TouchableOpacity>
      </Mapbox.MarkerView>
    );
  }

  return (
    <Mapbox.MarkerView coordinate={coordinate} allowOverlap allowOverlapWithPuck>
      <TouchableOpacity
        style={styles.markerContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Soft Radial Glow Layer */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowLayer,
            { transform: [{ scale: 2.5 }] },
            animatedTrafficGlowStyle,
          ]}
        >
          <Svg height="56" width="56" viewBox="0 0 56 56">
            <Defs>
              <SvgRadialGradient
                id="mainGlow"
                cx="50%"
                cy="50%"
                rx="50%"
                ry="50%"
              >
                <Stop offset="0%" stopColor={glowColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
              </SvgRadialGradient>
            </Defs>
            <SvgCircle cx="28" cy="28" r="28" fill="url(#mainGlow)" />
          </Svg>
        </Animated.View>

        {/*
          Live-only ripple rings (additive; marker body/glow unchanged).
          Rendered AFTER the glow layer so their borders draw on top of the
          soft filled glow instead of being buried underneath it — that
          draw-order was the reason the rings previously read as one blurry
          blob instead of distinct rings.
        */}
        {isLive && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.livePulseRingOuter, { borderColor: glowColor }, animatedLivePulseRingOuterStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[styles.livePulseRingInner, { borderColor: glowColor }, animatedLivePulseRingInnerStyle]}
            />
          </>
        )}

        {/* Marker-relative LIVE badge — moves with the Mapbox MarkerView, independent of selection */}
        {isLive && (
          <View pointerEvents="none" style={styles.liveBadge}>
            <View style={[styles.liveBadgeDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        )}

        <View
          style={[
            styles.imageWrapper,
            { borderColor: glowColor, backgroundColor: colors.background },
          ]}
        >
          <Image source={{ uri: image }} style={styles.markerImage} />
        </View>
        {label && (
          <View pointerEvents="none" style={styles.labelContainer}>
            <Text style={[styles.labelText, { color: "#FFFFFF" }]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Mapbox.MarkerView>
  );
});

const toLocationPayload = (
  longitude: unknown,
  latitude: unknown,
  timestamp: number | null = Date.now(),
): CurrentLocationPayload | null => {
  const location = {
    latitude,
    longitude,
    timestamp,
  } as CurrentLocationPayload;

  return isValidLocationCoordinate(location) ? location : null;
};

const isValidMapboxCoordinate = (coordinate: [number, number] | null | undefined) =>
  Boolean(coordinate && toLocationPayload(coordinate[0], coordinate[1], Date.now()));

const normalizeLongitude = (longitude: number) => {
  const normalized = ((((longitude + 180) % 360) + 360) % 360) - 180;

  return normalized === -180 && longitude > 0 ? 180 : normalized;
};

MapMarker.displayName = "MapMarker";

const EventMapMarker = React.memo(({
  marker,
  glowColor,
  isSatellite,
  onMarkerPress,
  livePulseProgress,
}: {
  marker: MapMarkerData;
  glowColor: string;
  isSatellite: boolean;
  onMarkerPress: (marker: MapMarkerData) => void;
  livePulseProgress: SharedValue<number>;
}) => {
  const handlePress = React.useCallback(() => {
    onMarkerPress(marker);
  }, [marker, onMarkerPress]);

  return (
    <MapMarker
      coordinate={[marker.longitude, marker.latitude]}
      image={marker.image}
      label={marker.label}
      glowColor={glowColor}
      onPress={handlePress}
      isSatellite={isSatellite}
      checkedInCount={marker.checkedInCount}
      isLive={marker.isLive}
      livePulseProgress={livePulseProgress}
    />
  );
});

EventMapMarker.displayName = "EventMapMarker";

const toEventMapViewport = (state: MapState): EventMapViewport | null => {
  const northEast = state.properties.bounds?.ne;
  const southWest = state.properties.bounds?.sw;
  const zoom = state.properties.zoom;

  if (
    !Array.isArray(northEast) ||
    !Array.isArray(southWest) ||
    typeof northEast[0] !== "number" ||
    typeof northEast[1] !== "number" ||
    typeof southWest[0] !== "number" ||
    typeof southWest[1] !== "number" ||
    typeof zoom !== "number" ||
    !Number.isFinite(northEast[0]) ||
    !Number.isFinite(northEast[1]) ||
    !Number.isFinite(southWest[0]) ||
    !Number.isFinite(southWest[1]) ||
    !Number.isFinite(zoom)
  ) {
    return null;
  }

  return {
    north: Math.max(northEast[1], southWest[1]),
    south: Math.min(northEast[1], southWest[1]),
    east: normalizeLongitude(northEast[0]),
    west: normalizeLongitude(southWest[0]),
    zoom,
  };
};

const getViewportCenterCoordinate = (viewport: EventMapViewport): [number, number] | null => {
  const latitude = (viewport.north + viewport.south) / 2;
  const longitude = viewport.west <= viewport.east
    ? (viewport.west + viewport.east) / 2
    : normalizeLongitude((viewport.west + viewport.east + 360) / 2);
  const coordinate: [number, number] = [normalizeLongitude(longitude), latitude];

  return isValidCarouselCoordinate(coordinate) ? coordinate : null;
};

const areCoordinatesNear = (
  from: [number, number] | null | undefined,
  to: [number, number] | null | undefined,
) =>
  Boolean(
    from &&
      to &&
      getCoordinateDistanceMeters(from, to) < INITIAL_CAMERA_CORRECTION_THRESHOLD_METERS,
  );

const toCameraCenterCoordinate = (state: MapState): [number, number] | null => {
  const properties = state.properties as MapState["properties"] & {
    center?: unknown;
    centerCoordinate?: unknown;
  };
  const rawCenter = properties.centerCoordinate ?? properties.center;

  if (
    Array.isArray(rawCenter) &&
    typeof rawCenter[0] === "number" &&
    typeof rawCenter[1] === "number"
  ) {
    const coordinate: [number, number] = [rawCenter[0], rawCenter[1]];

    if (isValidCarouselCoordinate(coordinate)) {
      return coordinate;
    }
  }

  const viewport = toEventMapViewport(state);

  return viewport ? getViewportCenterCoordinate(viewport) : null;
};

const getMarkerDisplayColor = (
  marker: MapMarkerData,
  category: EventCategory | "All",
) => getCategoryMarkerColor({
  category: marker.category,
  categories: marker.categories,
  activeCategory: category === "All" ? null : category,
});

export default function MapScreen({
  markers = [],
  onUserLocationChange,
  onViewportChange,
  filterRecenterIntent = null,
  onFilterRecenterHandled,
  selectedCategory,
  onCategoryChange,
}: MapScreenProps) {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const { colors, isDark } = useTheme();
  const plans = usePlanStore((state) => state.plans);
  const restorePlans = usePlanStore((state) => state.restorePlans);
  const sharedLocation = useAuthStore((state) =>
    state.user?.currentLocationSharingEnabled
      ? state.user.currentLocation
      : null,
  );
  const currentLocationMarkerVisible = useAuthStore((state) =>
    Boolean(state.user?.currentLocationSharingEnabled),
  );
  const sharedLongitude = sharedLocation?.longitude;
  const sharedLatitude = sharedLocation?.latitude;
  const storedLocation = React.useMemo(
    () => toLocationPayload(sharedLongitude, sharedLatitude, null),
    [sharedLatitude, sharedLongitude],
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(
    null,
  );
  const activeCategory = selectedCategory ?? "All";
  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const currentZoomRef = React.useRef(DEFAULT_ZOOM_LEVEL);
  const hasInitialUserLocationCenteredRef = React.useRef(false);
  const initialCenteredSourceRef = React.useRef<UserLocationSource | null>(null);
  const initialCenteredCoordinateRef = React.useRef<[number, number] | null>(null);
  const canCorrectInitialCenterRef = React.useRef(false);
  const userHasExploredMapRef = React.useRef(false);
  const isMountedRef = React.useRef(false);
  const isStyleLoadedRef = React.useRef(false);
  const locationRequestIdRef = React.useRef(0);
  const manualRecenterRequestIdRef = React.useRef(0);
  const isLocationRequestInFlightRef = React.useRef(false);
  const isManualRecenterInFlightRef = React.useRef(false);
  const userLocationRef = React.useRef<[number, number] | null>(null);
  const userLocationSourceRef = React.useRef<UserLocationSource | null>(null);
  const pendingCameraMoveRef = React.useRef<PendingCameraMove | null>(null);
  const lastManualRecenterCoordinateRef = React.useRef<[number, number] | null>(null);
  const handledFilterRecenterKeyRef = React.useRef<string | null>(null);
  const cameraCenterRef = React.useRef<[number, number] | null>(null);
  const [mapMode, setMapMode] = useState<MapViewMode>("traffic");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [cameraCenter, setCameraCenter] = useState<[number, number] | null>(null);
  const [, setUserLocationSource] = useState<UserLocationSource | null>(null);
  const [canUseStoredFallback, setCanUseStoredFallback] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const isSatellite = mapMode === "satellite";
  const currentMapStyle = isSatellite
    ? SATELLITE_MAP_STYLE_URL
    : isDark
      ? APP_MAP_STYLE_URL_NO_TRAFFIC
      : APP_MAP_STYLE_URL_LIGHT_NO_TRAFFIC;

  // Reset the loaded flag whenever the style URL changes so markers are
  // held back until Mapbox has fully applied the new style.
  React.useEffect(() => {
    setIsStyleLoaded(false);
    isStyleLoadedRef.current = false;
  }, [currentMapStyle]);
  const mapModeLabel = {
    traffic: "Traffic View",
    satellite: "Satellite View",
  }[mapMode];
  const mapModeIcon = {
    traffic: TrafficIncidentIcon,
    satellite: SatelliteIcon,
  }[mapMode];
  const lastReportedLocationRef = React.useRef<string | null>(null);
  const [selectedThemeColor, setSelectedThemeColor] = useState("#8E54E9");

  React.useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      locationRequestIdRef.current += 1;
      manualRecenterRequestIdRef.current += 1;
      isLocationRequestInFlightRef.current = false;
      isManualRecenterInFlightRef.current = false;
      pendingCameraMoveRef.current = null;
      lastManualRecenterCoordinateRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);

  React.useEffect(() => {
    restorePlans();
  }, [restorePlans]);

  const executeCameraMove = React.useCallback((move: PendingCameraMove) => {
    if (move.mode === "initial") {
      if (userHasExploredMapRef.current) {
        if (pendingCameraMoveRef.current?.mode === "initial") {
          pendingCameraMoveRef.current = null;
        }
        return false;
      }

      if (hasInitialUserLocationCenteredRef.current) {
        const canApplyFreshCorrection =
          canCorrectInitialCenterRef.current &&
          move.source === "fresh" &&
          !areCoordinatesNear(initialCenteredCoordinateRef.current, move.coordinate);

        if (!canApplyFreshCorrection) {
          if (
            move.source === "fresh" &&
            canCorrectInitialCenterRef.current &&
            areCoordinatesNear(initialCenteredCoordinateRef.current, move.coordinate)
          ) {
            initialCenteredSourceRef.current = "fresh";
            canCorrectInitialCenterRef.current = false;
          }

          return false;
        }
      }
    }

    if (
      !isMountedRef.current ||
      !isStyleLoadedRef.current ||
      !cameraRef.current ||
      !isValidMapboxCoordinate(move.coordinate)
    ) {
      if (pendingCameraMoveRef.current?.mode === "manual" && move.mode === "initial") {
        return false;
      }

      pendingCameraMoveRef.current = move;
      return false;
    }

    pendingCameraMoveRef.current = null;
    const zoomLevel = move.zoomLevel ?? USER_LOCATION_ZOOM_LEVEL;
    currentZoomRef.current = zoomLevel;
    cameraRef.current.setCamera({
      centerCoordinate: move.coordinate,
      heading: 0,
      pitch: 0,
      zoomLevel,
      animationDuration: move.animationDuration,
    });

    if (move.reason === "filter" && move.intentKey) {
      handledFilterRecenterKeyRef.current = move.intentKey;
      onFilterRecenterHandled?.(move.intentKey);
    }

    if (move.mode === "initial") {
      const initialSource = move.source === "filter" ? "stored" : move.source;
      hasInitialUserLocationCenteredRef.current = true;
      initialCenteredSourceRef.current = initialSource;
      initialCenteredCoordinateRef.current = move.coordinate;
      canCorrectInitialCenterRef.current = initialSource === "lastKnown";
    }

    return true;
  }, [onFilterRecenterHandled]);

  const coordinateInitialCameraMove = React.useCallback(
    (
      coordinate: [number, number] | null,
      source: UserLocationSource,
      animationDuration = 650,
    ) => {
      if (!coordinate || !isValidMapboxCoordinate(coordinate) || userHasExploredMapRef.current) {
        return false;
      }

      if (hasInitialUserLocationCenteredRef.current) {
        const canApplyFreshCorrection =
          canCorrectInitialCenterRef.current &&
          source === "fresh" &&
          !areCoordinatesNear(initialCenteredCoordinateRef.current, coordinate);

        if (!canApplyFreshCorrection) {
          if (
            source === "fresh" &&
            canCorrectInitialCenterRef.current &&
            areCoordinatesNear(initialCenteredCoordinateRef.current, coordinate)
          ) {
            initialCenteredSourceRef.current = "fresh";
            canCorrectInitialCenterRef.current = false;
          }

          return false;
        }
      }

      const pendingMove = pendingCameraMoveRef.current;
      if (
        pendingMove?.mode === "initial" &&
        pendingMove.source === source &&
        areCoordinatesNear(pendingMove.coordinate, coordinate)
      ) {
        return false;
      }

      return executeCameraMove({
        coordinate,
        animationDuration,
        source,
        mode: "initial",
      });
    },
    [executeCameraMove],
  );

  const applyUserLocation = React.useCallback(
    (location: CurrentLocationPayload, source: UserLocationSource) => {
      if (!isMountedRef.current || !isValidLocationCoordinate(location)) {
        return null;
      }

      if (
        source === "stored" &&
        userLocationSourceRef.current &&
        userLocationSourceRef.current !== "stored"
      ) {
        return null;
      }

      if (source === "lastKnown" && userLocationSourceRef.current === "fresh") {
        return null;
      }

      const coordinate = toMapboxCoordinate(location);
      const existingCoordinate = userLocationRef.current;
      const existingSource = userLocationSourceRef.current;
      const isNearExistingCoordinate = areCoordinatesNear(existingCoordinate, coordinate);

      userLocationRef.current = isNearExistingCoordinate && existingCoordinate ? existingCoordinate : coordinate;
      userLocationSourceRef.current = source;

      if (!isNearExistingCoordinate || existingSource !== source) {
        setUserLocation(userLocationRef.current);
        setUserLocationSource(source);
      }

      const reportKey = `${coordinate[0].toFixed(4)},${coordinate[1].toFixed(4)}`;

      if (lastReportedLocationRef.current !== reportKey) {
        lastReportedLocationRef.current = reportKey;
        onUserLocationChange?.(coordinate);
      }

      return coordinate;
    },
    [onUserLocationChange],
  );

  React.useEffect(() => {
    if (canUseStoredFallback && storedLocation && !userLocationRef.current) {
      const coordinate = applyUserLocation(storedLocation, "stored");
      coordinateInitialCameraMove(coordinate, "stored");
    }
  }, [applyUserLocation, canUseStoredFallback, coordinateInitialCameraMove, storedLocation]);

  const flushPendingCameraMove = React.useCallback(() => {
    const pendingMove = pendingCameraMoveRef.current;

    if (pendingMove) {
      executeCameraMove(pendingMove);
    }
  }, [executeCameraMove]);

  const handleDeviceLocationResult = React.useCallback(
    (
      result: DeviceLocationSuccessResult,
      options: { center?: boolean; animationDuration?: number } = {},
    ) => {
      const coordinate = applyUserLocation(result.location, result.status);

      if (coordinate && options.center !== false) {
        coordinateInitialCameraMove(
          coordinate,
          result.status,
          options.animationDuration ?? 650,
        );
      }
    },
    [applyUserLocation, coordinateInitialCameraMove],
  );

  const requestCurrentDeviceLocation = React.useCallback(
    async (options: { center?: boolean; animationDuration?: number; force?: boolean } = {}) => {
      if (isLocationRequestInFlightRef.current && !options.force) {
        return;
      }

      const requestId = ++locationRequestIdRef.current;
      isLocationRequestInFlightRef.current = true;
      setCanUseStoredFallback(false);

      const isCurrentRequest = () =>
        isMountedRef.current && requestId === locationRequestIdRef.current;

      try {
        const result = await getBestCurrentDeviceLocation({
          requestPermission: true,
          onTemporaryLocation: (temporaryResult) => {
            if (!isCurrentRequest()) {
              return;
            }

            handleDeviceLocationResult(temporaryResult, options);
          },
        });

        if (!isCurrentRequest()) {
          return;
        }

        if (result.status === "fresh" || result.status === "lastKnown") {
          handleDeviceLocationResult(result, options);
          return;
        }

        setCanUseStoredFallback(true);
      } finally {
        if (isCurrentRequest()) {
          isLocationRequestInFlightRef.current = false;
        }
      }
    },
    [handleDeviceLocationResult],
  );

  const centerOnManualCoordinate = React.useCallback(
    (
      coordinate: [number, number],
      source: CameraMoveSource,
      animationDuration = 1000,
      zoomLevel = USER_LOCATION_ZOOM_LEVEL,
      reason?: "filter",
      intentKey?: string,
    ) => {
      if (reason !== "filter" && areCoordinatesNear(lastManualRecenterCoordinateRef.current, coordinate)) {
        return false;
      }

      userHasExploredMapRef.current = false;
      lastManualRecenterCoordinateRef.current = coordinate;

      return executeCameraMove({
        coordinate,
        animationDuration,
        source,
        mode: "manual",
        zoomLevel,
        reason,
        intentKey,
      });
    },
    [executeCameraMove],
  );

  const handleManualDeviceLocationResult = React.useCallback(
    (
      result: DeviceLocationSuccessResult,
      requestId: number,
      animationDuration: number,
    ) => {
      if (
        !isMountedRef.current ||
        requestId !== manualRecenterRequestIdRef.current
      ) {
        return;
      }

      const coordinate = applyUserLocation(result.location, result.status);

      if (coordinate) {
        centerOnManualCoordinate(coordinate, result.status, animationDuration);
      }
    },
    [applyUserLocation, centerOnManualCoordinate],
  );

  const requestManualRecenter = React.useCallback(
    async (animationDuration = 1000) => {
      lastManualRecenterCoordinateRef.current = null;
      const existingCoordinate = userLocationRef.current;
      const existingSource = userLocationSourceRef.current;

      if (
        existingCoordinate &&
        existingSource &&
        existingSource !== "stored" &&
        isValidMapboxCoordinate(existingCoordinate)
      ) {
        centerOnManualCoordinate(existingCoordinate, existingSource, animationDuration);
      }

      if (isManualRecenterInFlightRef.current) {
        return;
      }

      const requestId = ++manualRecenterRequestIdRef.current;
      isManualRecenterInFlightRef.current = true;
      setCanUseStoredFallback(false);

      const isCurrentRequest = () =>
        isMountedRef.current && requestId === manualRecenterRequestIdRef.current;

      try {
        const result = await getBestCurrentDeviceLocation({
          requestPermission: true,
          onTemporaryLocation: (temporaryResult) => {
            handleManualDeviceLocationResult(
              temporaryResult,
              requestId,
              animationDuration,
            );
          },
        });

        if (!isCurrentRequest()) {
          return;
        }

        if (result.status === "fresh" || result.status === "lastKnown") {
          handleManualDeviceLocationResult(result, requestId, animationDuration);
        }
      } finally {
        if (isCurrentRequest()) {
          isManualRecenterInFlightRef.current = false;
        }
      }
    },
    [centerOnManualCoordinate, handleManualDeviceLocationResult],
  );

  React.useEffect(() => {
    if (!filterRecenterIntent) {
      if (pendingCameraMoveRef.current?.reason === "filter") {
        pendingCameraMoveRef.current = null;
      }
      return;
    }

    if (handledFilterRecenterKeyRef.current === filterRecenterIntent.key) {
      return;
    }

    centerOnManualCoordinate(
      filterRecenterIntent.coordinate,
      "filter",
      1000,
      filterRecenterIntent.zoomLevel,
      "filter",
      filterRecenterIntent.key,
    );
  }, [centerOnManualCoordinate, filterRecenterIntent]);

  React.useEffect(() => {
    isStyleLoadedRef.current = isStyleLoaded;

    if (isStyleLoaded) {
      flushPendingCameraMove();
    }
  }, [flushPendingCameraMove, isStyleLoaded]);

  useFocusEffect(
    React.useCallback(() => {
      void requestCurrentDeviceLocation();

      return () => {
        locationRequestIdRef.current += 1;
        isLocationRequestInFlightRef.current = false;
      };
    }, [requestCurrentDeviceLocation]),
  );

  const categories: ("All" | EventCategory)[] = ["All", ...EVENT_CATEGORIES];
  const visibleMarkers = React.useMemo(
    () =>
      activeCategory === "All"
        ? markers
        : markers.filter((marker) => markerMatchesCategory(marker, activeCategory)),
    [activeCategory, markers],
  );
  const carouselMarkers = React.useMemo(
    () => getNearestEventSequence(visibleMarkers, { userLocation, cameraCenter }),
    [cameraCenter, userLocation, visibleMarkers],
  );

  // One shared UI-thread pulse driver for every live marker, instead of an
  // animation loop per marker. It only runs while a visible marker is
  // authoritatively live, and is cancelled/reset otherwise.
  const livePulseProgress = useSharedValue(0);
  const hasLiveVisibleMarkers = React.useMemo(
    () => visibleMarkers.some((marker) => marker.isLive === true),
    [visibleMarkers],
  );

  React.useEffect(() => {
    if (!hasLiveVisibleMarkers) {
      cancelAnimation(livePulseProgress);
      livePulseProgress.value = 0;
      return;
    }

    livePulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: MAP_MARKER_GLOW_CONFIG.livePulseBrightenDurationMs,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: MAP_MARKER_GLOW_CONFIG.livePulseDimDurationMs,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(livePulseProgress);
    };
  }, [hasLiveVisibleMarkers, livePulseProgress]);

  const selectMarker = React.useCallback((marker: MapMarkerData) => {
    const displayColor = getMarkerDisplayColor(marker, activeCategory);
    const selected = { ...marker, glowColor: displayColor };

    setSelectedMarker(selected);
    setSelectedThemeColor(displayColor);

    return selected;
  }, [activeCategory]);

  const handleMarkerPress = React.useCallback((marker: MapMarkerData) => {
    selectMarker(marker);
    setModalVisible(true);
  }, [selectMarker]);

  React.useEffect(() => {
    if (!modalVisible) {
      return;
    }

    const nextMarker = resolveCarouselSelection(carouselMarkers, selectedMarker?.id);

    if (!nextMarker) {
      setModalVisible(false);
      setSelectedMarker(null);
      return;
    }

    selectMarker(nextMarker);
  }, [carouselMarkers, modalVisible, selectedMarker?.id, selectMarker]);

  const previewItems = React.useMemo(
    () => carouselMarkers.map((marker) => ({
      id: marker.id,
      themeColor: getMarkerDisplayColor(marker, activeCategory),
      eventTitle: marker.label,
      hostName: marker.hostName ?? undefined,
      distance: marker.distance ?? undefined,
      isLive: marker.isLive,
      eventStatus: marker.eventStatus,
      crowdStatus: marker.crowdStatus ?? null,
      eventDate: marker.eventDate ?? undefined,
      eventTime: marker.eventTime ?? undefined,
      eventEndDate: marker.eventEndDate ?? undefined,
      eventEndTime: marker.eventEndTime ?? undefined,
      location: marker.location ?? undefined,
      attendeesCount: marker.attendeesCount,
      ageLimit: marker.ageLimit ?? undefined,
      price: marker.price ?? undefined,
      ticketsAvailable: marker.ticketsAvailable ?? undefined,
      ticketSalesEndDate: marker.ticketSalesEndDate ?? undefined,
      ticketTypeCount: marker.ticketTypeCount ?? undefined,
    })),
    [activeCategory, carouselMarkers],
  );

  const handlePreviewEventChange = React.useCallback((eventId: string) => {
    const index = getCarouselIndexByMarkerId(carouselMarkers, eventId);
    const marker = index >= 0 ? carouselMarkers[index] : null;

    if (marker) {
      selectMarker(marker);
    }
  }, [carouselMarkers, selectMarker]);

  const handleViewEvent = () => {
    if (!selectedMarker?.id) {
      return;
    }

    setModalVisible(false);
    router.push({
      pathname: "/event-screen/event",
      params: { eventId: selectedMarker.id, source: "map" },
    });
  };

  const handleAddToCalendar = () => {
    if (!selectedMarker?.id) {
      return;
    }

    setModalVisible(false);
    router.push({
      pathname: "/plan-screen/create-plan",
      params: {
        eventId: selectedMarker.id,
        eventTitle: selectedMarker.label,
        eventLocation: selectedMarker.location ?? "Location TBA",
        eventLatitude: String(selectedMarker.latitude),
        eventLongitude: String(selectedMarker.longitude),
        eventScheduledAt: selectedMarker.scheduledAt ?? "",
        lockLocation: "true",
      },
    });
  };

  const existingPlan = selectedMarker?.id
    ? (plans.find((p) => p.eventId === selectedMarker.id) ?? null)
    : null;

  const handleViewInCalendar = () => {
    if (!existingPlan) {
      return;
    }

    setModalVisible(false);
    router.push({
      pathname: "/plan-screen/my-plan" as any,
      params: {
        focusYear: String(existingPlan.year),
        focusMonth: String(existingPlan.month),
        focusDay: String(existingPlan.day),
      },
    });
  };

  const handleCameraChanged = React.useCallback((state: MapState) => {
    const nextCameraCenter = toCameraCenterCoordinate(state);

    if (nextCameraCenter) {
      cameraCenterRef.current = nextCameraCenter;
    }

    if (typeof state.properties.zoom === "number") {
      currentZoomRef.current = state.properties.zoom;
    }

    if (state.gestures.isGestureActive) {
      userHasExploredMapRef.current = true;
      if (pendingCameraMoveRef.current?.mode === "initial") {
        pendingCameraMoveRef.current = null;
      }
    }
  }, []);

  const handleMapIdle = React.useCallback((state: MapState) => {
    const viewport = toEventMapViewport(state);

    if (viewport) {
      const nextCameraCenter = getViewportCenterCoordinate(viewport);

      if (nextCameraCenter && !areCoordinatesNear(cameraCenterRef.current, nextCameraCenter)) {
        cameraCenterRef.current = nextCameraCenter;
        setCameraCenter(nextCameraCenter);
      }

      onViewportChange?.(viewport);
    }
  }, [onViewportChange]);

  const handleZoomIn = () => {
    userHasExploredMapRef.current = true;
    const nextZoom = Math.min(currentZoomRef.current + 1, 20);
    currentZoomRef.current = nextZoom;
    cameraRef.current?.zoomTo(nextZoom, 250);
  };

  const handleZoomOut = () => {
    userHasExploredMapRef.current = true;
    const nextZoom = Math.max(currentZoomRef.current - 1, 0);
    currentZoomRef.current = nextZoom;
    cameraRef.current?.zoomTo(nextZoom, 250);
  };

  const toggleMapStyle = () => {
    setMapMode((currentMode) => {
      if (currentMode === "traffic") {
        return "satellite";
      }

      return "traffic";
    });
  };

  const handleMyLocation = () => {
    void requestManualRecenter(1000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View pointerEvents="box-none" style={styles.topHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const catColor = cat === "All" ? "#8E54E9" : getCategoryColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => onCategoryChange?.(cat === "All" ? null : cat)}
                style={[
                  styles.categoryBtn,
                  isActive
                    ? {
                        backgroundColor: catColor,
                        borderColor: catColor,
                        borderWidth: 1,
                      }
                    : isDark
                      ? styles.categoryBtnInactive
                      : styles.categoryBtnInactiveLight,
                ]}
              >
                {cat !== "All" && (
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryColor(cat) },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isActive
                        ? "#FFFFFF"
                        : isDark
                          ? "rgba(255,255,255,0.65)"
                          : "rgba(0,0,0,0.72)",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.mapArea}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={currentMapStyle}
          projection="globe"
          logoEnabled={false}
          attributionEnabled={false}
          scaleBarEnabled={true}
          scaleBarPosition={MAP_SCALE_BAR_OFFSET}
          zoomEnabled={true}
          scrollEnabled={true}
          gestureSettings={MAP_GESTURE_SETTINGS}
          pitchEnabled={true}
          rotateEnabled={true}
          requestDisallowInterceptTouchEvent={true}
          onCameraChanged={handleCameraChanged}
          onMapIdle={handleMapIdle}
          onDidFinishLoadingStyle={() => {
            isStyleLoadedRef.current = true;
            setIsStyleLoaded(true);
            flushPendingCameraMove();
          }}
        >
          <Mapbox.Camera
            ref={cameraRef}
          />

          {isStyleLoaded && visibleMarkers.map((marker) => {
            const markerGlowColor = getMarkerDisplayColor(marker, activeCategory);

            return (
              <EventMapMarker
                key={`${marker.id}-${mapMode}`}
                marker={marker}
                glowColor={markerGlowColor}
                onMarkerPress={handleMarkerPress}
                isSatellite={isSatellite}
                livePulseProgress={livePulseProgress}
              />
            );
          })}

          <Mapbox.UserLocation
            visible={currentLocationMarkerVisible}
            renderMode={Mapbox.UserLocationRenderMode.Native}
            onUpdate={(location) => {
              if (location.coords) {
                const deviceLocation = toLocationPayload(
                  location.coords.longitude,
                  location.coords.latitude,
                  location.timestamp ?? Date.now(),
                );

                if (deviceLocation) {
                  const coordinate = applyUserLocation(deviceLocation, "fresh");
                  coordinateInitialCameraMove(coordinate, "fresh");
                }
              }
            }}
          />
        </Mapbox.MapView>

        <View pointerEvents="box-none" style={[styles.mapControlsLeft, { bottom: tabBarHeight + 20 }]}>
          <CinematicButton icon={Add01Icon} onPress={handleZoomIn} />
          <CinematicButton icon={Remove01Icon} onPress={handleZoomOut} />
        </View>

        <View pointerEvents="box-none" style={[styles.mapControlsRight, { bottom: tabBarHeight + 20 }]}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={toggleMapStyle}
            style={styles.viewModeButton}
            accessibilityRole="button"
            accessibilityLabel={`Switch map mode. Current mode: ${mapModeLabel}`}
          >
            <View style={styles.viewModeIcon}>
              <HugeiconsIcon icon={mapModeIcon} size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <CinematicButton icon={Target01Icon} onPress={handleMyLocation} />
        </View>
      </View>

      <EventPreviewModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedMarker(null);
        }}
        eventItems={previewItems}
        selectedEventId={selectedMarker?.id ?? null}
        onVisibleEventChange={handlePreviewEventChange}
        themeColor={selectedMarker?.glowColor ?? selectedThemeColor}
        eventTitle={selectedMarker?.label}
        hostName={selectedMarker?.hostName ?? undefined}
        distance={selectedMarker?.distance ?? undefined}
        isLive={selectedMarker?.isLive}
        eventStatus={selectedMarker?.eventStatus}
        crowdStatus={selectedMarker?.crowdStatus ?? null}
        eventDate={selectedMarker?.eventDate ?? undefined}
        eventTime={selectedMarker?.eventTime ?? undefined}
        eventEndDate={selectedMarker?.eventEndDate ?? undefined}
        eventEndTime={selectedMarker?.eventEndTime ?? undefined}
        location={selectedMarker?.location ?? undefined}
        attendeesCount={selectedMarker?.attendeesCount}
        ageLimit={selectedMarker?.ageLimit ?? undefined}
        price={selectedMarker?.price ?? undefined}
        ticketsAvailable={selectedMarker?.ticketsAvailable ?? undefined}
        ticketSalesEndDate={selectedMarker?.ticketSalesEndDate ?? undefined}
        ticketTypeCount={selectedMarker?.ticketTypeCount ?? undefined}
        onAddToCalendar={handleAddToCalendar}
        onViewEvent={handleViewEvent}
        isAddedToCalendar={!!existingPlan}
        onViewInCalendar={handleViewInCalendar}
        livePulseProgress={livePulseProgress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  /* ── Normal (traffic) marker styles ── */
  markerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowLayer: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  imageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  /* ── Live-only ripple rings (additive) ── */
  livePulseRingOuter: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    zIndex: 1,
  },
  livePulseRingInner: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    zIndex: 1,
  },
  /* ── Live-only marker badge (additive) ── */
  liveBadge: {
    position: "absolute",
    top: -9,
    right: -32,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    zIndex: 3,
  },
  liveBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  liveBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  markerImage: {
    width: 56,
    height: 56,
  },
  labelContainer: {
    position: "absolute",
    left: 64,
    width: 100,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  /* ── Satellite marker styles ── */
  satMarkerContainer: {
    alignItems: "flex-start",
  },
  satBubble: {
    flexDirection: "row",
    alignItems: "center",
    padding: 0,
    paddingRight: 18,
    borderRadius: 30,
    overflow: "hidden",
  },
  satImageGlow: {
    position: "absolute",
    left: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: SATELLITE_IMAGE_GLOW_BASE_OPACITY,
    transform: [{ scale: 2.2 }],
  },
  satImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    overflow: "hidden",
    zIndex: 1,
  },
  satImage: {
    width: "100%",
    height: "100%",
  },
  satTextContainer: {
    marginLeft: 10,
    justifyContent: "center",
    maxWidth: 120,
  },
  satLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  satStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  satStatsText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
  },
  satDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 6,
  },
  satAnchorGlow: {
    position: "absolute",
    bottom: -10,
    left: 17,
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: SATELLITE_ANCHOR_GLOW_BASE_OPACITY,
    transform: [{ scale: 3.5 }],
  },
  satAnchorPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 15,
    marginLeft: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 2,
  },
  /* ── Layout / chrome ── */
  topHeader: {
    position: "absolute",
    top: CATEGORY_RAIL_TOP,
    left: 0,
    width: "100%",
    zIndex: 10,
    backgroundColor: "transparent",
    paddingBottom: 10,
  },
  mapArea: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 6,
  },
  categoryBtnInactive: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
  },
  categoryBtnInactiveLight: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: "rgba(0,0,0,0.08)",
    borderWidth: 1,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  mapControlsLeft: {
    position: "absolute",
    bottom: 20,
    left: 20,
    gap: 12,
    zIndex: 20,
    elevation: 20,
  },
  mapControlsRight: {
    position: "absolute",
    bottom: 20,
    right: 20,
    gap: 12,
    alignItems: "flex-end",
    zIndex: 20,
    elevation: 20,
  },
  viewModeButton: {
    height: 42,
    width: 42,
    borderRadius: 21,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,5,6,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 14,
    elevation: 10,
  },
  viewModeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
});
