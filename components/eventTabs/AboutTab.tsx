import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import FullScreen from "../event/FullScreen";

const { width } = Dimensions.get("window");

// Removed hardcoded COLORS to use useTheme hook

const AboutTab = () => {
  const { colors, isDark } = useTheme();
  const [subTab, setSubTab] = useState("Description");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const GALLERY_IMAGES = [
    {
      id: "1",
      uri: "https://images.unsplash.com/photo-1531050171669-01912ad4110b?q=80&w=600&auto=format&fit=crop",
      type: "image",
    },
    {
      id: "2",
      uri: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop",
      type: "image",
    },
    {
      id: "3",
      uri: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
      type: "image",
    },
    {
      id: "4",
      uri: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop",
      type: "carousel",
    },
    {
      id: "5",
      uri: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop",
      type: "video",
    },
    {
      id: "6",
      uri: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600&auto=format&fit=crop",
      type: "video",
    },
    {
      id: "7",
      uri: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600&auto=format&fit=crop",
      type: "carousel",
    },
    {
      id: "8",
      uri: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=600&auto=format&fit=crop",
      type: "video",
    },
    {
      id: "9",
      uri: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop",
      type: "image",
    },
  ];

  const renderGallery = () => (
    <View style={styles.galleryGrid}>
      {GALLERY_IMAGES.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.galleryItemContainer, { backgroundColor: colors.card }]}
          onPress={() => setSelectedImage(item.uri)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: item.uri }} style={styles.galleryImage} />
          {item.type === "carousel" && (
            <View style={styles.galleryIcon}>
              <Ionicons name="copy" size={12} color="#FFFFFF" />
            </View>
          )}
          {item.type === "video" && (
            <View style={styles.galleryIcon}>
              <Ionicons name="videocam" size={12} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View>
      <FullScreen
        visible={!!selectedImage}
        imageUri={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Sub-Tabs / Toggle */}
      <View style={styles.tabWrapper}>
        <LinearGradient
          colors={isDark ? ["#18181c", "#c1c0c5", "#18181c"] : [colors.border, colors.border, colors.border]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 1 }}
          style={styles.subTabBorder}
        >
          <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={[styles.subTabBg, { backgroundColor: isDark ? "#1c1b20" : colors.card }]}>
            <TouchableOpacity
              onPress={() => setSubTab("Description")}
              style={styles.subTabItem}
            >
              {subTab === "Description" ? (
                <LinearGradient
                  colors={isDark ? ["#18181c", "#c1c0c5", "#18181c"] : [colors.primary, colors.primary, colors.primary]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBtnBorder}
                >
                  <View style={[styles.activeBtnInner, { backgroundColor: isDark ? "#38373a" : colors.background, elevation: isDark ? 0 : 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 2 }]}>
                    <Text style={[styles.subTabText, { color: colors.text }]}>
                      Description
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={[styles.subTabText, { color: colors.textSecondary }]}>Description</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSubTab("Gallery")}
              style={styles.subTabItem}
            >
              {subTab === "Gallery" ? (
                <LinearGradient
                  colors={isDark ? ["#18181c", "#c1c0c5", "#18181c"] : [colors.primary, colors.primary, colors.primary]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBtnBorder}
                >
                  <View style={[styles.activeBtnInner, { backgroundColor: isDark ? "#38373a" : colors.background, elevation: isDark ? 0 : 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDark ? 0 : 0.1, shadowRadius: 2 }]}>
                    <Text style={[styles.subTabText, { color: colors.text }]}>
                      Gallery
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={[styles.subTabText, { color: colors.textSecondary }]}>Gallery</Text>
              )}
            </TouchableOpacity>
          </BlurView>
        </LinearGradient>
      </View>

      <View style={{ marginTop: 20 }}>
        {subTab === "Description" ? (
          <>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              An unforgettable rooftop experience featuring the best in house
              and techno. Doors open at 8pm. Dress code: smart casual.
            </Text>
            <View style={[styles.ageTag, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)" }]}>
              <Text style={[styles.ageTagText, { color: colors.text }]}>18+ only</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <View style={[styles.locationIconBg, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }]}>
                  <Ionicons name="location" size={18} color={colors.text} />
                </View>
                <Text style={[styles.locationCity, { color: colors.text }]}>New York City</Text>
              </View>
              <View style={styles.locationDetails}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Venue:{" "}
                  <Text style={[styles.detailValue, { color: colors.text }]}>The Rooftop Lounge</Text>
                </Text>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Address:{" "}
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    123 Main Street, New York, NY 1001
                  </Text>
                </Text>
              </View>

              {/* Map Preview */}
              <View style={styles.mapContainer}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop",
                  }}
                  style={styles.mapImage}
                />
                <View style={[styles.mapOverlayAvatar, { borderColor: colors.text, backgroundColor: colors.card }]}>
                  <Image
                    source={{
                      uri: "https://images.unsplash.com/photo-1514525253361-bee1a31f440a?q=80&w=200&auto=format&fit=crop",
                    }}
                    style={styles.mapAvatar}
                  />
                </View>
                <TouchableOpacity style={styles.expandMapBtn}>
                  <Feather name="maximize" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.additionalInfoCard, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)" }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Additional Info</Text>
              <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
                • Use back entrance after 10PM
              </Text>
              <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
                • Parking available at adjacent garage - $20 flat rate
              </Text>
              <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
                • Nearest subway 7th Ave Station
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Host</Text>
            <View style={[styles.hostCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.hostCardHeader}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
                  }}
                  style={styles.hostCardAvatar}
                />
                <View style={styles.hostCardInfo}>
                  <Text style={[styles.hostCardName, { color: colors.text }]}>Dj Koko</Text>
                  <Text style={[styles.hostCardUser, { color: colors.textSecondary }]}>@scfc_t</Text>
                </View>
                <TouchableOpacity style={[styles.followBtnLarge, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }]}>
                  <Text style={[styles.followBtnTextLarge, { color: colors.text }]}>Follow</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.hostStatsRow}>
                <Text style={[styles.hostStatItem, { color: colors.textSecondary }]}>
                  <Text style={[styles.hostStatValue, { color: colors.text }]}>12.4K</Text> Followers
                </Text>
                <Text style={[styles.hostStatItem, { color: colors.textSecondary }]}>
                  <Text style={[styles.hostStatValue, { color: colors.text }]}>48</Text> Events
                </Text>
              </View>
              <Text style={[styles.hostBio, { color: colors.textSecondary }]}>
                House & techno DJ. Resident at Fabric. 10+ years on the decks.
              </Text>
            </View>
          </>
        ) : (
          renderGallery()
        )}
      </View>
    </View>
  );
};

export default AboutTab;

const styles = StyleSheet.create({
  tabWrapper: {
    padding: 1, // border thickness
    borderRadius: 12,
  },
  subTabBorder: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 0.5,
  },
  subTabBg: {
    flexDirection: "row",
    backgroundColor: "#1c1b20",
    borderRadius: 11,
    padding: 6,
    height: 50,
    overflow: "hidden",
    gap: 4,
  },
  subTabItem: {
    flex: 1,
    alignItems: "stretch", // Stretch to fill height
    justifyContent: "center",
    borderRadius: 8,
  },
  activeBtnBorder: {
    flex: 1, // Use flex instead of height 100% for better behavior in stretch
    borderRadius: 8,
    padding: 0.5,
  },
  activeBtnInner: {
    backgroundColor: "#38373a",
    borderRadius: 7,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subTabText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  subTabTextActive: {
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  ageTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 24,
  },
  ageTagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  locationCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationCity: {
    fontSize: 16,
    fontWeight: "bold",
  },
  locationDetails: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontWeight: "500",
  },
  mapContainer: {
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlayAvatar: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
  },
  mapAvatar: {
    width: "100%",
    height: "100%",
  },
  expandMapBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  additionalInfoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 13,
    marginBottom: 8,
  },
  hostCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  hostCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  hostCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  hostCardInfo: {
    flex: 1,
  },
  hostCardName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  hostCardUser: {
    fontSize: 13,
  },
  followBtnLarge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  followBtnTextLarge: {
    fontSize: 13,
    fontWeight: "600",
  },
  hostStatsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 12,
  },
  hostStatItem: {
    fontSize: 13,
  },
  hostStatValue: {
    fontWeight: "bold",
  },
  hostBio: {
    fontSize: 13,
    lineHeight: 18,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  galleryItemContainer: {
    width: (width - 48) / 3,
    aspectRatio: 0.75, // Oval shape
    borderRadius: 60, // High border radius for oval look
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryIcon: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: [{ translateX: -12 }],
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
