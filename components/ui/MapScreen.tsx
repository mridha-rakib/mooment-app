import { useTheme } from "@/hooks/useTheme";
import { EVENT_CATEGORIES } from "@/constants/eventCategories";
import { getCategoryColor, CATEGORY_COLORS } from "@/constants/categoryColors";
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
  const [zoomLevel, setZoomLevel] = useState(12);
  const [mapMode, setMapMode] = useState<MapViewMode>("satellite");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const isSatellite = mapMode === "satellite" || mapMode === "satellite3d";
  const isSatellite3D = mapMode === "satellite3d";
  const currentMapStyle = isSatellite
    ? SATELLITE_STYLE_URL
    : Mapbox.StyleURL.Dark;
  const cameraZoomLevel = isSatellite3D
    ? Math.max(zoomLevel, SATELLITE_3D_MIN_ZOOM)
    : zoomLevel;
  const lastReportedLocationRef = React.useRef<string | null>(null);
  const [selectedThemeColor, setSelectedThemeColor] = useState("#8E54E9");

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
                  color: "#0A1628",
                  highColor: "#1A2F50",
                  horizonBlend: 0.1,
                  range: [-1.5, 4.5],
                  spaceColor: "#020810",
                  starIntensity: 0.08,
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
                fillExtrusionColor: "#0D1117",
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
                fillExtrusionOpacity: 0.72,
                fillExtrusionVerticalGradient: true,
                fillExtrusionAmbientOcclusionIntensity: 0.45,
                fillExtrusionAmbientOcclusionRadius: 4,
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

        <View style={styles.mapControlsLeft}>
          <CinematicButton icon={Add01Icon} onPress={handleZoomIn} />
          <CinematicButton icon={Remove01Icon} onPress={handleZoomOut} />
        </View>

        <View style={styles.mapControlsRight}>
          <CinematicButton icon={SatelliteIcon} onPress={toggleMapStyle} />
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
  },
});
