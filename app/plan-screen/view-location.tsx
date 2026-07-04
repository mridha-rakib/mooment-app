import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";
import { APP_MAP_STYLE_URL } from "@/lib/mapStyles";
import { getCategoryColor } from "@/constants/categoryColors";

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const USER_COLOR = "#2F80ED";

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatKm = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
};

const estimateMinutes = (km: number): string =>
  `${Math.max(1, Math.round(km * 3))} min`;

const firstParam = (value: unknown): string | undefined => {
  const param = Array.isArray(value) ? value[0] : value;
  return typeof param === "string" ? param : undefined;
};

export default function ViewLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const eventName = firstParam(params.eventName) ?? "Event Location";
  const locationName = firstParam(params.locationName) ?? "Event Location";
  const latParam = parseFloat(firstParam(params.latitude) ?? "");
  const lonParam = parseFloat(firstParam(params.longitude) ?? "");
  const eventCategory = firstParam(params.eventCategory) ?? "";
  const markerImage = firstParam(params.markerImage) ?? "";
  const hasCoords =
    Number.isFinite(latParam) &&
    Number.isFinite(lonParam) &&
    (latParam !== 0 || lonParam !== 0);

  const markerColor = getCategoryColor(eventCategory || null);
  const eventCoordinate: [number, number] | null = hasCoords ? [lonParam, latParam] : null;

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const initialFit = useRef(false);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/home");
  };

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (pos) => {
          const coord: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          setUserLocation(coord);
          if (hasCoords) {
            setDistanceKm(haversineKm(pos.coords.latitude, pos.coords.longitude, latParam, lonParam));
          }
        },
      );
    };

    startTracking();
    return () => { locationSub?.remove(); };
  }, [hasCoords, latParam, lonParam]);

  useEffect(() => {
    if (!mapLoaded || !eventCoordinate) return;

    if (userLocation) {
      if (initialFit.current) return;
      initialFit.current = true;
      const ne: [number, number] = [
        Math.max(eventCoordinate[0], userLocation[0]),
        Math.max(eventCoordinate[1], userLocation[1]),
      ];
      const sw: [number, number] = [
        Math.min(eventCoordinate[0], userLocation[0]),
        Math.min(eventCoordinate[1], userLocation[1]),
      ];
      cameraRef.current?.fitBounds(ne, sw, [80, 60, 200, 60], 800);
    } else if (!initialFit.current) {
      cameraRef.current?.setCamera({
        animationDuration: 600,
        animationMode: "easeTo",
        centerCoordinate: eventCoordinate,
        zoomLevel: 14,
      });
    }
  }, [eventCoordinate, mapLoaded, userLocation]);

  const routeShape = useMemo(() => {
    if (!eventCoordinate || !userLocation) return null;
    return {
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [userLocation, eventCoordinate],
      },
      properties: {},
    };
  }, [eventCoordinate, userLocation]);

  const startNavigation = () => {
    if (!hasCoords) return;
    const url =
      Platform.OS === "ios"
        ? `maps:0,0?daddr=${latParam},${lonParam}`
        : `https://maps.google.com/?daddr=${latParam},${lonParam}`;
    Linking.openURL(url);
  };

  if (!eventCoordinate) {
    return (
      <View style={[styles.container, styles.fallback]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          activeOpacity={0.85}
          onPress={handleBack}
        >
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Feather name="map" size={36} color="#555" />
        <Text style={styles.fallbackText}>
          Map coordinates are not available for this event.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={APP_MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled
        pitchEnabled
        onDidFinishLoadingMap={() => setMapLoaded(true)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          centerCoordinate={eventCoordinate}
          zoomLevel={14}
          animationDuration={0}
        />

        {routeShape && (
          <Mapbox.ShapeSource id="vl-route-source" shape={routeShape}>
            <Mapbox.LineLayer
              id="vl-route-line"
              style={{
                lineCap: "round",
                lineJoin: "round",
                lineColor: "#FFFFFF",
                lineOpacity: 0.85,
                lineWidth: 2.5,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {userLocation && (
          <Mapbox.MarkerView coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userMarkerOuter} accessibilityLabel="Your location">
              <View style={styles.userMarkerInner} />
            </View>
          </Mapbox.MarkerView>
        )}

        <Mapbox.MarkerView coordinate={eventCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={[styles.eventMarker, { borderColor: markerColor, shadowColor: markerColor }]}
            accessibilityLabel={eventName}
          >
            {markerImage ? (
              <Image source={{ uri: markerImage }} style={styles.eventMarkerImage} contentFit="cover" />
            ) : (
              <View style={[styles.eventMarkerDot, { backgroundColor: markerColor }]} />
            )}
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        activeOpacity={0.85}
        onPress={handleBack}
      >
        <Feather name="chevron-left" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.legendRow}>
          <View style={styles.legendLeft}>
            <View style={[styles.legendDot, { backgroundColor: USER_COLOR }]} />
            <Text style={styles.legendLabel}>Your Location</Text>
          </View>
          {distanceKm !== null && (
            <Text style={styles.legendValue}>{formatKm(distanceKm)}</Text>
          )}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendLeft}>
            <View style={[styles.legendDot, { backgroundColor: "#FFFFFF" }]} />
            <Text style={styles.legendLabel}>Event Venue</Text>
          </View>
          {distanceKm !== null && (
            <Text style={styles.legendValue}>{estimateMinutes(distanceKm)}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.navBtn} activeOpacity={0.85} onPress={startNavigation}>
          <Text style={styles.navBtnText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  fallbackText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    color: "#888888",
  },
  backBtn: {
    position: "absolute",
    left: 18,
    alignItems: "center",
    backgroundColor: "rgba(17, 17, 17, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  userMarkerOuter: {
    alignItems: "center",
    backgroundColor: "rgba(47, 128, 237, 0.24)",
    borderColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    shadowColor: USER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    width: 34,
  },
  userMarkerInner: {
    backgroundColor: USER_COLOR,
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  eventMarker: {
    alignItems: "center",
    backgroundColor: "#080808",
    borderRadius: 30,
    borderWidth: 3,
    height: 60,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    width: 60,
  },
  eventMarkerImage: {
    height: "100%",
    width: "100%",
  },
  eventMarkerDot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(14, 14, 14, 0.96)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  legendValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  navBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  navBtnText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
