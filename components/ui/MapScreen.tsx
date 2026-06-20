import { useTheme } from "@/hooks/useTheme";
import { EVENT_CATEGORIES } from "@/constants/eventCategories";
import { getCategoryColor } from "@/constants/categoryColors";
import {
  Add01Icon,
  Remove01Icon,
  SatelliteIcon,
  Target01Icon,
  TrafficIncidentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import Mapbox from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { usePlanStore } from "@/stores/planStore";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CinematicButton from "./CinematicButton";
import EventPreviewModal from "./EventPreviewModal";

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const SATELLITE_STYLE_URL = "mapbox://styles/mapbox/satellite-streets-v12";
const TRAFFIC_DARK_STYLE_URL = "mapbox://styles/mapbox/traffic-night-v2";
const DEFAULT_MAP_CENTER: [number, number] = [-73.935242, 40.73061];
const DEFAULT_ZOOM_LEVEL = 12;
const USER_LOCATION_ZOOM_LEVEL = 14;

type MapViewMode = "traffic" | "satellite";

export type MapMarkerData = {
  id: string;
  latitude: number;
  longitude: number;
  image: string;
  label: string;
  glowColor: string;
  category?: string | null;
  scheduledAt?: string | null;
  hostName?: string | null;
  distance?: string | null;
  isLive?: boolean;
  eventDate?: string | null;
  eventTime?: string | null;
  location?: string | null;
  attendeesCount?: number;
  ageLimit?: string | null;
  price?: string | null;
  ticketsAvailable?: string | null;
  ticketSalesEndDate?: string | null;
};

type MapScreenProps = {
  markers: MapMarkerData[];
  onBack?: () => void;
  logoText?: string;
  onUserLocationChange?: (coordinate: [number, number]) => void;
};

const MapMarker = ({
  coordinate,
  image,
  label,
  glowColor,
  onPress,
}: {
  coordinate: [number, number];
  image: string;
  label: string;
  glowColor: string;
  onPress: () => void;
}) => {
  return (
    <Mapbox.MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <TouchableOpacity
        style={[styles.eventMarkerButton, { shadowColor: glowColor }]}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} event` : "Event marker"}
      >
        <View style={[styles.eventMarkerFrame, { borderColor: glowColor }]}>
          <Image source={{ uri: image }} style={styles.markerImage} resizeMode="cover" />
        </View>
      </TouchableOpacity>
    </Mapbox.MarkerView>
  );
};

export default function MapScreen({
  markers = [],
  onUserLocationChange,
}: MapScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const plans = usePlanStore((state) => state.plans);
  const restorePlans = usePlanStore((state) => state.restorePlans);
  const sharedLocation = useAuthStore((state) =>
    state.user?.currentLocationSharingEnabled ? state.user.currentLocation : null,
  );
  const sharedLongitude = sharedLocation?.longitude;
  const sharedLatitude = sharedLocation?.latitude;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const currentZoomRef = React.useRef(DEFAULT_ZOOM_LEVEL);
  const hasInitialUserLocationCenteredRef = React.useRef(false);
  const userHasExploredMapRef = React.useRef(false);
  const [mapMode, setMapMode] = useState<MapViewMode>("traffic");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const isSatellite = mapMode === "satellite";
  const currentMapStyle = isSatellite
    ? SATELLITE_STYLE_URL
    : TRAFFIC_DARK_STYLE_URL;
  const mapModeLabel = {
    traffic: "Traffic View",
    satellite: "Satellite View",
  }[mapMode];
  const mapModeIcon = {
    traffic: TrafficIncidentIcon,
    satellite: SatelliteIcon,
  }[mapMode];
  const mapShadeStyle = {
    traffic: styles.mapShadeTraffic,
    satellite: styles.mapShadeSatellite,
  }[mapMode];
  const lastReportedLocationRef = React.useRef<string | null>(null);
  const [selectedThemeColor, setSelectedThemeColor] = useState("#8E54E9");
  const defaultCameraCenter: [number, number] =
    userLocation ??
    (markers && markers.length > 0
      ? [markers[0].longitude, markers[0].latitude]
      : DEFAULT_MAP_CENTER);

  const applyUserLocation = React.useCallback(
    (coordinate: [number, number]) => {
      setUserLocation(coordinate);

      const reportKey = `${coordinate[0].toFixed(4)},${coordinate[1].toFixed(4)}`;

      if (lastReportedLocationRef.current !== reportKey) {
        lastReportedLocationRef.current = reportKey;
        onUserLocationChange?.(coordinate);
      }
    },
    [onUserLocationChange],
  );

  React.useEffect(() => {
    if (typeof sharedLongitude === "number" && typeof sharedLatitude === "number") {
      applyUserLocation([sharedLongitude, sharedLatitude]);
    }
  }, [applyUserLocation, sharedLatitude, sharedLongitude]);

  React.useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);

  React.useEffect(() => {
    restorePlans();
  }, [restorePlans]);

  const centerOnUserLocation = React.useCallback(
    (coordinate: [number, number], animationDuration: number) => {
      currentZoomRef.current = USER_LOCATION_ZOOM_LEVEL;
      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        heading: 0,
        pitch: 0,
        zoomLevel: USER_LOCATION_ZOOM_LEVEL,
        animationDuration,
      });
    },
    [],
  );

  React.useEffect(() => {
    if (
      !userLocation ||
      hasInitialUserLocationCenteredRef.current ||
      userHasExploredMapRef.current
    ) {
      return;
    }

    hasInitialUserLocationCenteredRef.current = true;
    centerOnUserLocation(userLocation, 650);
  }, [centerOnUserLocation, userLocation]);

  const categories = ["All", ...EVENT_CATEGORIES];
  const visibleMarkers = React.useMemo(
    () =>
      selectedCategory === "All"
        ? markers
        : markers.filter((marker) => marker.category === selectedCategory),
    [markers, selectedCategory],
  );

  const handleMarkerPress = (marker: MapMarkerData) => {
    setSelectedMarker(marker);
    setSelectedThemeColor(marker.glowColor);
    setModalVisible(true);
  };

  const handleViewEvent = () => {
    if (!selectedMarker?.id) {
      return;
    }

    setModalVisible(false);
    router.push({
      pathname: "/event-screen/event",
      params: { eventId: selectedMarker.id },
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
    ? plans.find((p) => p.eventId === selectedMarker.id) ?? null
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
    if (typeof state.properties.zoom === "number") {
      currentZoomRef.current = state.properties.zoom;
    }

    if (state.gestures.isGestureActive) {
      userHasExploredMapRef.current = true;
    }
  }, []);

  const handleZoomIn = () => {
    userHasExploredMapRef.current = true;
    const nextZoom = Math.min(currentZoomRef.current + 1, 20);
    currentZoomRef.current = nextZoom;
    cameraRef.current?.zoomTo(nextZoom, 250);
  };

  const handleZoomOut = () => {
    userHasExploredMapRef.current = true;
    const nextZoom = Math.max(currentZoomRef.current - 1, 1);
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
    if (userLocation) {
      centerOnUserLocation(userLocation, 1000);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            const catColor = cat === "All" ? "#8E54E9" : getCategoryColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryBtn,
                  isActive
                    ? { backgroundColor: catColor, borderColor: catColor, borderWidth: 1 }
                    : styles.categoryBtnInactive,
                ]}
              >
                {cat !== "All" && (
                  <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(cat) }]} />
                )}
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.65)" },
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
          logoEnabled={false}
          attributionEnabled={false}
          pitchEnabled={true}
          rotateEnabled={true}
          onCameraChanged={handleCameraChanged}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: defaultCameraCenter,
              heading: 0,
              pitch: 0,
              zoomLevel: DEFAULT_ZOOM_LEVEL,
            }}
          />

          {visibleMarkers.map((marker) => (
            <MapMarker
              key={marker.id}
              coordinate={[marker.longitude, marker.latitude]}
              image={marker.image}
              label={marker.label}
              glowColor={marker.glowColor}
              onPress={() => handleMarkerPress(marker)}
            />
          ))}

          <Mapbox.UserLocation
            visible={true}
            onUpdate={(location) => {
              if (location.coords) {
                applyUserLocation([
                  location.coords.longitude,
                  location.coords.latitude,
                ]);
              }
            }}
          />
        </Mapbox.MapView>

        <View pointerEvents="none" style={[styles.mapShade, mapShadeStyle]} />

        <View style={styles.mapControlsLeft}>
          <CinematicButton icon={Add01Icon} onPress={handleZoomIn} />
          <CinematicButton icon={Remove01Icon} onPress={handleZoomOut} />
        </View>

        <View style={styles.mapControlsRight}>
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
        themeColor={selectedMarker?.glowColor ?? selectedThemeColor}
        eventTitle={selectedMarker?.label}
        hostName={selectedMarker?.hostName ?? undefined}
        distance={selectedMarker?.distance ?? undefined}
        isLive={selectedMarker?.isLive}
        eventDate={selectedMarker?.eventDate ?? undefined}
        eventTime={selectedMarker?.eventTime ?? undefined}
        location={selectedMarker?.location ?? undefined}
        attendeesCount={selectedMarker?.attendeesCount}
        ageLimit={selectedMarker?.ageLimit ?? undefined}
        price={selectedMarker?.price ?? undefined}
        ticketsAvailable={selectedMarker?.ticketsAvailable ?? undefined}
        ticketSalesEndDate={selectedMarker?.ticketSalesEndDate ?? undefined}
        onAddToCalendar={handleAddToCalendar}
        onViewEvent={handleViewEvent}
        isAddedToCalendar={!!existingPlan}
        onViewInCalendar={handleViewInCalendar}
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
  eventMarkerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    elevation: 12,
  },
  eventMarkerFrame: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    borderColor: "#9CA3AF",
    backgroundColor: "#080808",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  markerImage: {
    width: "100%",
    height: "100%",
  },
  topHeader: {
    width: "100%",
    zIndex: 10,
    backgroundColor: "#000000",
    paddingBottom: 10,
  },
  mapArea: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  mapShade: {
    ...StyleSheet.absoluteFillObject,
  },
  mapShadeTraffic: {
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  mapShadeSatellite: {
    backgroundColor: "rgba(0,0,0,0.26)",
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
  },
  mapControlsRight: {
    position: "absolute",
    bottom: 20,
    right: 20,
    gap: 12,
    alignItems: "flex-end",
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
