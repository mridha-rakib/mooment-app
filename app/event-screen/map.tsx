import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import Mapbox from "@rnmapbox/maps";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const EVENT_MARKER_BORDER_COLOR = "#5C30BB";
const USER_MARKER_COLOR = "#2F80ED";

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const parseCoordinate = (value: string | string[] | undefined) => {
  const numericValue = Number(firstParam(value));
  return Number.isFinite(numericValue) ? numericValue : null;
};

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMiles = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const startLatitude = toRadians(from.latitude);
  const endLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const formatDistance = (miles: number) => {
  if (miles < 0.1) {
    return `${Math.max(1, Math.round(miles * 5280))} ft from you`;
  }

  if (miles < 10) {
    return `${miles.toFixed(1)} mi from you`;
  }

  return `${Math.round(miles)} mi from you`;
};

export default function EventMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    eventLatitude?: string;
    eventLongitude?: string;
    eventTitle?: string;
    eventVenue?: string;
    eventAddress?: string;
    markerImage?: string;
    userLatitude?: string;
    userLongitude?: string;
  }>();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const eventLatitude = parseCoordinate(params.eventLatitude);
  const eventLongitude = parseCoordinate(params.eventLongitude);
  const userLatitude = parseCoordinate(params.userLatitude);
  const userLongitude = parseCoordinate(params.userLongitude);
  const hasEventCoordinates = isFiniteCoordinate(eventLatitude) && isFiniteCoordinate(eventLongitude);
  const hasUserCoordinates = isFiniteCoordinate(userLatitude) && isFiniteCoordinate(userLongitude);
  const eventCoordinate: [number, number] | null = hasEventCoordinates ? [eventLongitude, eventLatitude] : null;
  const userCoordinate: [number, number] | null = hasUserCoordinates ? [userLongitude, userLatitude] : null;
  const eventTitle = firstParam(params.eventTitle)?.trim() || "Event location";
  const eventVenue = firstParam(params.eventVenue)?.trim() || "";
  const eventAddress = firstParam(params.eventAddress)?.trim() || "";
  const markerImage = firstParam(params.markerImage)?.trim() || "";
  const distanceLabel = useMemo(() => {
    if (!hasEventCoordinates || !hasUserCoordinates) {
      return null;
    }

    return formatDistance(
      getDistanceMiles(
        { latitude: userLatitude, longitude: userLongitude },
        { latitude: eventLatitude, longitude: eventLongitude },
      ),
    );
  }, [eventLatitude, eventLongitude, hasEventCoordinates, hasUserCoordinates, userLatitude, userLongitude]);
  const routeShape = useMemo(() => {
    if (!eventCoordinate || !userCoordinate) {
      return null;
    }

    return {
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: [userCoordinate, eventCoordinate],
      },
      properties: {},
    };
  }, [eventCoordinate, userCoordinate]);

  useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !eventCoordinate) {
      return;
    }

    if (userCoordinate) {
      const northEast: [number, number] = [
        Math.max(eventCoordinate[0], userCoordinate[0]),
        Math.max(eventCoordinate[1], userCoordinate[1]),
      ];
      const southWest: [number, number] = [
        Math.min(eventCoordinate[0], userCoordinate[0]),
        Math.min(eventCoordinate[1], userCoordinate[1]),
      ];

      cameraRef.current?.fitBounds(northEast, southWest, [110, 60, 220, 60], 800);
      return;
    }

    cameraRef.current?.setCamera({
      animationDuration: 600,
      animationMode: "easeTo",
      centerCoordinate: eventCoordinate,
      zoomLevel: 15,
    });
  }, [eventCoordinate, mapLoaded, userCoordinate]);

  const recenterMap = () => {
    if (!eventCoordinate) {
      return;
    }

    if (userCoordinate) {
      const northEast: [number, number] = [
        Math.max(eventCoordinate[0], userCoordinate[0]),
        Math.max(eventCoordinate[1], userCoordinate[1]),
      ];
      const southWest: [number, number] = [
        Math.min(eventCoordinate[0], userCoordinate[0]),
        Math.min(eventCoordinate[1], userCoordinate[1]),
      ];

      cameraRef.current?.fitBounds(northEast, southWest, [110, 60, 220, 60], 800);
      return;
    }

    cameraRef.current?.setCamera({
      animationDuration: 600,
      animationMode: "easeTo",
      centerCoordinate: eventCoordinate,
      zoomLevel: 15,
    });
  };

  if (!eventCoordinate) {
    return (
      <View style={[styles.container, styles.fallbackContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.roundButton, { top: insets.top + 12, left: 18 }]}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Ionicons name="map-outline" size={32} color={colors.textSecondary} />
        <Text style={[styles.fallbackTitle, { color: colors.text }]}>Map unavailable</Text>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          This event does not have map coordinates.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled
        pitchEnabled
        onDidFinishLoadingMap={() => setMapLoaded(true)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          animationDuration={0}
          centerCoordinate={eventCoordinate}
          zoomLevel={hasUserCoordinates ? 13 : 15}
        />

        {routeShape && (
          <Mapbox.ShapeSource id="event-distance-line-source" shape={routeShape}>
            <Mapbox.LineLayer
              id="event-distance-line"
              style={{
                lineCap: "round",
                lineColor: EVENT_MARKER_BORDER_COLOR,
                lineDasharray: [2, 1.5],
                lineOpacity: 0.9,
                lineWidth: 3,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {userCoordinate && (
          <Mapbox.MarkerView coordinate={userCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userMarkerOuter} accessibilityLabel="Your location">
              <View style={styles.userMarkerInner} />
            </View>
          </Mapbox.MarkerView>
        )}

        <Mapbox.MarkerView coordinate={eventCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.eventMarkerButton} accessibilityLabel={`${eventTitle} location`}>
            {markerImage ? (
              <Image source={{ uri: markerImage }} style={styles.eventMarkerImage} contentFit="cover" />
            ) : (
              <View style={styles.eventMarkerDot} />
            )}
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.roundButton} activeOpacity={0.85} onPress={() => router.back()}>
          <Feather name="chevron-left" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundButton} activeOpacity={0.85} onPress={recenterMap}>
          <Feather name="crosshair" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoCard, { bottom: insets.bottom + 18, backgroundColor: colors.card }]}>
        {!!distanceLabel && (
          <View style={styles.distancePill}>
            <Feather name="navigation" size={14} color="#FFFFFF" />
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          </View>
        )}
        <Text style={[styles.infoTitle, { color: colors.text }]} numberOfLines={1}>
          {eventTitle}
        </Text>
        {!!eventVenue && (
          <Text style={[styles.infoLine, { color: colors.textSecondary }]} numberOfLines={1}>
            Venue: {eventVenue}
          </Text>
        )}
        {!!eventAddress && (
          <Text style={[styles.infoLine, { color: colors.textSecondary }]} numberOfLines={2}>
            Address: {eventAddress}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  fallbackText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 18,
    position: "absolute",
    right: 18,
    top: 0,
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(17, 17, 17, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  eventMarkerButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: EVENT_MARKER_BORDER_COLOR,
    borderRadius: 30,
    borderWidth: 3,
    height: 60,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    width: 60,
  },
  eventMarkerImage: {
    height: "100%",
    width: "100%",
  },
  eventMarkerDot: {
    backgroundColor: EVENT_MARKER_BORDER_COLOR,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  userMarkerOuter: {
    alignItems: "center",
    backgroundColor: "rgba(47, 128, 237, 0.24)",
    borderColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    shadowColor: USER_MARKER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    width: 34,
  },
  userMarkerInner: {
    backgroundColor: USER_MARKER_COLOR,
    borderColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16,
  },
  infoCard: {
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    left: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: "absolute",
    right: 18,
  },
  distancePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: EVENT_MARKER_BORDER_COLOR,
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  distanceText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  infoLine: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
});
