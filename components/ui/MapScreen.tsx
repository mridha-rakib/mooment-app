import { useTheme } from "@/hooks/useTheme";
import Mapbox from "@rnmapbox/maps";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import EventPreviewModal from "./EventPreviewModal";

// Set Mapbox Access Token
// Mapbox access token should match the account used for the download token
const MAPBOX_PUBLIC_TOKEN = "***REMOVED***";
const MOOMENT_MAPBOX_PUBLIC_TOKEN = "***REMOVED***";
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const { width, height } = Dimensions.get("window");

export type MapMarkerData = {
  id: string;
  latitude: number;
  longitude: number;
  image: string;
  label: string;
  glowColor: string;
};

type MapScreenProps = {
  markers: MapMarkerData[];
  onBack?: () => void;
  logoText?: string;
};

const MapMarker = ({
  coordinate,
  image,
  label,
  glowColor = "#D4B0EB",
  onPress,
}: {
  coordinate: [number, number];
  image: string;
  label: string;
  glowColor: string;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Mapbox.MarkerView coordinate={coordinate}>
      <TouchableOpacity
        style={styles.markerContent}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* Soft Gradient Glow Layers */}
        <View
          style={[
            styles.glowLayer,
            {
              backgroundColor: glowColor,
              opacity: 0.15,
              transform: [{ scale: 1.4 }],
            },
          ]}
        />
        <View
          style={[
            styles.glowLayer,
            {
              backgroundColor: glowColor,
              opacity: 0.2,
              transform: [{ scale: 1.2 }],
            },
          ]}
        />
        <View
          style={[
            styles.glowLayer,
            {
              backgroundColor: glowColor,
              opacity: 0.3,
              transform: [{ scale: 1.1 }],
            },
          ]}
        />

        <View
          style={[
            styles.imageWrapper,
            { borderColor: glowColor, backgroundColor: colors.background },
          ]}
        >
          <Image source={{ uri: image }} style={styles.markerImage} />
        </View>
        {label && (
          <View style={styles.labelContainer}>
            <Text style={[styles.labelText, { color: "#FFFFFF" }]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Mapbox.MarkerView>
  );
};

export default function MapScreen({
  markers,
  onBack,
  logoText = "Mooment",
}: MapScreenProps) {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  React.useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);
  const [selectedThemeColor, setSelectedThemeColor] = useState("#8E54E9");

  const categories = [
    "All",
    "Music",
    "Nightlife",
    "Shows & Entertainment",
    "Sports",
  ];
  const MAP_BG = require("../../assets/images/Basemap image.png");

  const handleMarkerPress = (color: string) => {
    setSelectedThemeColor(color);
    setModalVisible(true);
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
          style={styles.map}
          styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Light}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Mapbox.Camera
            zoomLevel={12}
            centerCoordinate={
              markers.length > 0
                ? [markers[0].longitude, markers[0].latitude]
                : [-73.935242, 40.73061]
            }
          />

          {/* Markers */}
          {markers.map((marker) => (
            <MapMarker
              key={marker.id}
              coordinate={[marker.longitude, marker.latitude]}
              image={marker.image}
              label={marker.label}
              glowColor={marker.glowColor}
              onPress={() => handleMarkerPress(marker.glowColor)}
            />
          ))}

          <Mapbox.UserLocation visible={true} />
        </Mapbox.MapView>
      </View>

      {/* Event Preview Modal */}
      <EventPreviewModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        themeColor={selectedThemeColor}
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
  markerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
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
  markerImageContainer: {
    width: "100%",
    height: "100%",
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
});
