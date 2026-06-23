import { Feather } from "@expo/vector-icons";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";

Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const MAP_STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const MAP_STYLE_LIGHT = "mapbox://styles/mapbox/streets-v12";

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

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
};

const firstParam = (value: unknown): string | undefined => {
  const param = Array.isArray(value) ? value[0] : value;
  return typeof param === "string" ? param : undefined;
};

export default function ViewLocationScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const eventName = firstParam(params.eventName) ?? "Event Location";
  const locationName = firstParam(params.locationName) ?? "Event Location";
  const latParam = parseFloat(firstParam(params.latitude) ?? "");
  const lonParam = parseFloat(firstParam(params.longitude) ?? "");
  const hasCoords =
    Number.isFinite(latParam) &&
    Number.isFinite(lonParam) &&
    (latParam !== 0 || lonParam !== 0);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "denied" | "ready">("loading");

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/home");
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationStatus("denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        setUserLocation({ latitude: userLat, longitude: userLon });
        if (hasCoords) {
          const km = haversineKm(userLat, userLon, latParam, lonParam);
          setDistance(formatDistance(km));
        }
      } catch {
        setLocationStatus("denied");
        return;
      }
      setLocationStatus("ready");
    })();
  }, [hasCoords, latParam, lonParam]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {eventName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Map */}
      {hasCoords ? (
        <Mapbox.MapView
          style={styles.map}
          styleURL={isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          attributionEnabled={false}
          logoEnabled={false}
        >
          <Mapbox.Camera
            centerCoordinate={[lonParam, latParam]}
            zoomLevel={14}
            animationDuration={0}
          />

          {/* Event location pin */}
          <Mapbox.PointAnnotation id="event-pin" coordinate={[lonParam, latParam]}>
            <View style={styles.eventPin}>
              <Feather name="map-pin" size={16} color="#FFFFFF" />
            </View>
          </Mapbox.PointAnnotation>

          {/* User's current location */}
          {userLocation && (
            <Mapbox.PointAnnotation
              id="user-pin"
              coordinate={[userLocation.longitude, userLocation.latitude]}
            >
              <View style={styles.userPinOuter}>
                <View style={styles.userPinInner} />
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      ) : (
        <View style={styles.noMap}>
          <Feather name="map" size={36} color={colors.textSecondary} />
          <Text style={[styles.noMapText, { color: colors.textSecondary }]}>
            Map coordinates are not available for this event.
          </Text>
        </View>
      )}

      {/* Bottom info card */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={16} color={colors.primary} style={styles.infoIcon} />
          <Text style={[styles.locationName, { color: colors.text }]} numberOfLines={2}>
            {locationName}
          </Text>
        </View>

        {locationStatus === "loading" && hasCoords && (
          <View style={styles.distanceRow}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
              Calculating distance…
            </Text>
          </View>
        )}

        {locationStatus === "denied" && (
          <View style={styles.distanceRow}>
            <Feather name="alert-circle" size={14} color={colors.textSecondary} style={styles.infoIcon} />
            <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
              Enable location access to see distance
            </Text>
          </View>
        )}

        {distance && locationStatus === "ready" && (
          <View style={styles.distanceRow}>
            <Feather name="navigation" size={14} color={colors.textSecondary} style={styles.infoIcon} />
            <Text style={[styles.distanceText, { color: colors.textSecondary }]}>{distance}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontWeight: "700",
    fontSize: 17,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  map: {
    flex: 1,
  },
  noMap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  noMapText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  eventPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8E54E9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userPinOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(66, 133, 244, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#4285F4",
  },
  userPinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4285F4",
  },
  infoCard: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    lineHeight: 20,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distanceText: {
    fontSize: 13,
  },
});
