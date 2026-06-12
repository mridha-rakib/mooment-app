import { useTheme } from "@/hooks/useTheme";
import { EVENT_CATEGORIES } from "@/constants/eventCategories";
import {
  Add01Icon,
  Remove01Icon,
  SatelliteIcon,
  Target01Icon,
} from "@hugeicons/core-free-icons";
import Mapbox from "@rnmapbox/maps";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
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

const MOOMENT_MAPBOX_PUBLIC_TOKEN =
  "***REMOVED***";
Mapbox.setAccessToken(MOOMENT_MAPBOX_PUBLIC_TOKEN);

const EVENT_MARKER_BORDER_COLOR = "#5C30BB";
const SATELLITE_3D_STYLE_URL = "mapbox://styles/mapbox/satellite-streets-v12";
const TERRAIN_SOURCE_ID = "event-mapbox-dem";
const TERRAIN_SOURCE_URL = "mapbox://mapbox.mapbox-terrain-dem-v1";
const SATELLITE_3D_HEADING = -26;
const SATELLITE_3D_PITCH = 62;
const SATELLITE_3D_MIN_ZOOM = 12.8;

type MapViewMode = "normal" | "satellite" | "satellite3d";

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
  onPress,
}: {
  coordinate: [number, number];
  image: string;
  label: string;
  onPress: () => void;
}) => {
  return (
    <Mapbox.MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
      <TouchableOpacity
        style={styles.eventMarkerButton}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label} event` : "Event marker"}
      >
        <View style={styles.eventMarkerFrame}>
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
  const { colors, isDark } = useTheme();
  const sharedLocation = useAuthStore((state) =>
    state.user?.currentLocationSharingEnabled ? state.user.currentLocation : null,
  );
  const sharedLongitude = sharedLocation?.longitude;
  const sharedLatitude = sharedLocation?.latitude;
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const cameraRef = React.useRef<Mapbox.Camera>(null);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [mapMode, setMapMode] = useState<MapViewMode>("normal");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const isSatellite = mapMode === "satellite" || mapMode === "satellite3d";
  const isSatellite3D = mapMode === "satellite3d";
  const currentMapStyle = isSatellite
    ? SATELLITE_3D_STYLE_URL
    : isDark
      ? Mapbox.StyleURL.Dark
      : Mapbox.StyleURL.Light;
  const cameraZoomLevel = isSatellite3D
    ? Math.max(zoomLevel, SATELLITE_3D_MIN_ZOOM)
    : zoomLevel;
  const lastReportedLocationRef = React.useRef<string | null>(null);

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
    Mapbox.setAccessToken(MOOMENT_MAPBOX_PUBLIC_TOKEN);
  }, []);
  const [selectedThemeColor, setSelectedThemeColor] = useState("#8E54E9");

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

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, 20));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 1));
  };

  const toggleMapStyle = () => {
    setMapMode((currentMode) => {
      if (currentMode === "normal") {
        return "satellite";
      }

      if (currentMode === "satellite") {
        setZoomLevel((currentZoom) => Math.max(currentZoom, SATELLITE_3D_MIN_ZOOM));
        return "satellite3d";
      }

      return "normal";
    });
  };

  const handleMyLocation = () => {
    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        heading: isSatellite3D ? SATELLITE_3D_HEADING : 0,
        pitch: isSatellite3D ? SATELLITE_3D_PITCH : 0,
        zoomLevel: isSatellite3D ? Math.max(zoomLevel, 14.5) : 14,
        animationDuration: 1000,
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Categories - Only show categories here as HomeHeader is now separate */}
      <View style={styles.topHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryBtn,
                {
                  backgroundColor:
                    selectedCategory === cat
                      ? colors.text
                      : isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)",
                },
                selectedCategory !== cat && {
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  {
                    color:
                      selectedCategory === cat
                        ? colors.background
                        : colors.text,
                  },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map Content Area */}
      <View style={styles.mapArea}>
        <Mapbox.MapView
          key={mapMode === "normal" ? currentMapStyle : mapMode}
          style={styles.map}
          styleURL={currentMapStyle}
          logoEnabled={false}
          attributionEnabled={false}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          {isSatellite3D && (
            <>
              <Mapbox.RasterDemSource
                id={TERRAIN_SOURCE_ID}
                url={TERRAIN_SOURCE_URL}
                tileSize={512}
                maxZoomLevel={14}
              />
              <Mapbox.Terrain
                sourceID={TERRAIN_SOURCE_ID}
                style={{ exaggeration: 1.16 }}
              />
              <Mapbox.Light
                style={{
                  anchor: "viewport",
                  color: "#FFFFFF",
                  intensity: 0.42,
                  position: [1.25, 210, 42],
                }}
              />
              <Mapbox.Atmosphere
                style={{
                  color: "#DDE8F8",
                  highColor: "#AFC8F4",
                  horizonBlend: 0.12,
                  range: [-1.5, 4.5],
                  spaceColor: "#06111E",
                  starIntensity: 0.04,
                  verticalRange: [0, 600],
                }}
              />
            </>
          )}

          <Mapbox.Camera
            ref={cameraRef}
            animationDuration={isSatellite3D ? 950 : 650}
            animationMode="easeTo"
            heading={isSatellite3D ? SATELLITE_3D_HEADING : 0}
            pitch={isSatellite3D ? SATELLITE_3D_PITCH : 0}
            zoomLevel={cameraZoomLevel}
            centerCoordinate={
              userLocation ??
              (markers && markers.length > 0
                ? [markers[0].longitude, markers[0].latitude]
                : [-73.935242, 40.73061])
            }
          />

          {/* Markers */}
          {visibleMarkers.map((marker) => (
            <MapMarker
              key={marker.id}
              coordinate={[marker.longitude, marker.latitude]}
              image={marker.image}
              label={marker.label}
              onPress={() => handleMarkerPress(marker)}
            />
          ))}

          {isSatellite3D && (
            <Mapbox.FillExtrusionLayer
              id="event-map-buildings-3d"
              sourceID="composite"
              sourceLayerID="building"
              minZoomLevel={13}
              maxZoomLevel={22}
              style={{
                fillExtrusionBase: ["coalesce", ["get", "min_height"], 0],
                fillExtrusionBaseAlignment: "terrain",
                fillExtrusionColor: "#D6DBE6",
                fillExtrusionEdgeRadius: 0.28,
                fillExtrusionHeight: [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0,
                  15.5,
                  ["coalesce", ["get", "height"], 26],
                ],
                fillExtrusionHeightAlignment: "terrain",
                fillExtrusionOpacity: 0.58,
                fillExtrusionVerticalGradient: true,
                fillExtrusionAmbientOcclusionIntensity: 0.32,
                fillExtrusionAmbientOcclusionRadius: 3.5,
                fillExtrusionRoundedRoof: true,
              }}
            />
          )}

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

        {/* Map Controls */}
        <View style={styles.mapControlsLeft}>
          <CinematicButton icon={Add01Icon} onPress={handleZoomIn} />
          <CinematicButton icon={Remove01Icon} onPress={handleZoomOut} />
        </View>

        <View style={styles.mapControlsRight}>
          <CinematicButton icon={SatelliteIcon} onPress={toggleMapStyle} />
          <CinematicButton icon={Target01Icon} onPress={handleMyLocation} />
        </View>
      </View>

      {/* Event Preview Modal */}
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
        onViewEvent={handleViewEvent}
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
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  eventMarkerFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: EVENT_MARKER_BORDER_COLOR,
    backgroundColor: "#111111",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  markerImage: {
    width: "100%",
    height: "100%",
  },
  currentLocationOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  },
  currentLocationInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#007AFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
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
    backgroundColor: "#1a1a1a", // Fallback color to see if mapArea is rendering
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  categoryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  categoryText: {
    fontSize: 14,
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
  },
});
