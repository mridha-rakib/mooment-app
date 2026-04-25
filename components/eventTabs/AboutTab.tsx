import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FullScreen from "../event/FullScreen";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentPurple: "#8E54E9",
  accentOrange: "#FF6B3D",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.1)",
};

const AboutTab = () => {
  const [subTab, setSubTab] = useState("Description");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const GALLERY_IMAGES = [
    { id: '1', uri: 'https://images.unsplash.com/photo-1531050171669-01912ad4110b?q=80&w=600&auto=format&fit=crop', type: 'image' },
    { id: '2', uri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop', type: 'image' },
    { id: '3', uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop', type: 'image' },
    { id: '4', uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop', type: 'carousel' },
    { id: '5', uri: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=600&auto=format&fit=crop', type: 'video' },
    { id: '6', uri: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600&auto=format&fit=crop', type: 'video' },
    { id: '7', uri: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=600&auto=format&fit=crop', type: 'carousel' },
    { id: '8', uri: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=600&auto=format&fit=crop', type: 'video' },
    { id: '9', uri: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop', type: 'image' },
  ];

  const renderGallery = () => (
    <View style={styles.galleryGrid}>
      {GALLERY_IMAGES.map((item) => (
        <TouchableOpacity 
          key={item.id} 
          style={styles.galleryItemContainer}
          onPress={() => setSelectedImage(item.uri)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: item.uri }} style={styles.galleryImage} />
          {item.type === "carousel" && (
            <View style={styles.galleryIcon}>
              <Ionicons name="copy" size={12} color={COLORS.text} />
            </View>
          )}
          {item.type === "video" && (
            <View style={styles.galleryIcon}>
              <Ionicons name="videocam" size={12} color={COLORS.text} />
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
      <View style={styles.subTabBg}>
        <TouchableOpacity
          onPress={() => setSubTab("Description")}
          style={[
            styles.subTabItem,
            subTab === "Description" && styles.subTabItemActive,
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              subTab === "Description" && styles.subTabTextActive,
            ]}
          >
            Description
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSubTab("Gallery")}
          style={[
            styles.subTabItem,
            subTab === "Gallery" && styles.subTabItemActive,
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              subTab === "Gallery" && styles.subTabTextActive,
            ]}
          >
            Gallery
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 20 }}>
        {subTab === "Description" ? (
          <>
            <Text style={styles.descriptionText}>
              An unforgettable rooftop experience featuring the best in house
              and techno. Doors open at 8pm. Dress code: smart casual.
            </Text>
            <View style={styles.ageTag}>
              <Text style={styles.ageTagText}>18+ only</Text>
            </View>

            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationHeader}>
                <View style={styles.locationIconBg}>
                  <Ionicons name="location" size={18} color={COLORS.text} />
                </View>
                <Text style={styles.locationCity}>New York City</Text>
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.detailLabel}>
                  Venue:{" "}
                  <Text style={styles.detailValue}>The Rooftop Lounge</Text>
                </Text>
                <Text style={styles.detailLabel}>
                  Address:{" "}
                  <Text style={styles.detailValue}>
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
                <View style={styles.mapOverlayAvatar}>
                  <Image
                    source={{
                      uri: "https://images.unsplash.com/photo-1514525253361-bee1a31f440a?q=80&w=200&auto=format&fit=crop",
                    }}
                    style={styles.mapAvatar}
                  />
                </View>
                <TouchableOpacity style={styles.expandMapBtn}>
                  <Feather name="maximize" size={16} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.additionalInfoCard}>
              <Text style={styles.cardTitle}>Additional Info</Text>
              <Text style={styles.bulletItem}>
                • Use back entrance after 10PM
              </Text>
              <Text style={styles.bulletItem}>
                • Parking available at adjacent garage - $20 flat rate
              </Text>
              <Text style={styles.bulletItem}>
                • Nearest subway 7th Ave Station
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Host</Text>
            <View style={styles.hostCard}>
              <View style={styles.hostCardHeader}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
                  }}
                  style={styles.hostCardAvatar}
                />
                <View style={styles.hostCardInfo}>
                  <Text style={styles.hostCardName}>Dj Koko</Text>
                  <Text style={styles.hostCardUser}>@scfc_t</Text>
                </View>
                <TouchableOpacity style={styles.followBtnLarge}>
                  <Text style={styles.followBtnTextLarge}>Follow</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.hostStatsRow}>
                <Text style={styles.hostStatItem}>
                  <Text style={styles.hostStatValue}>12.4K</Text> Followers
                </Text>
                <Text style={styles.hostStatItem}>
                  <Text style={styles.hostStatValue}>48</Text> Events
                </Text>
              </View>
              <Text style={styles.hostBio}>
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
  subTabBg: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 4,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  subTabItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  subTabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  subTabTextActive: {
    color: COLORS.text,
  },
  descriptionText: {
    color: COLORS.textMuted,
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
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    marginTop: 8,
  },
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  locationDetails: {
    marginBottom: 16,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    color: COLORS.text,
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
    borderColor: COLORS.text,
    overflow: "hidden",
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  bulletItem: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 8,
  },
  hostCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  hostCardUser: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  followBtnLarge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  followBtnTextLarge: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  hostStatsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 12,
  },
  hostStatItem: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  hostStatValue: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  hostBio: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.card,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
