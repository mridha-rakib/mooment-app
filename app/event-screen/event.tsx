import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AboutTab from "@/components/eventTabs/AboutTab";
import AccessTab from "@/components/eventTabs/AccessTab";
import VibeTab from "@/components/eventTabs/VibeTab";
import ProductTab from "@/components/eventTabs/ProductTab";

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

const EventScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("About");

  const renderHeader = () => (
    <View style={[styles.headerActions, { top: insets.top + 10 }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.headerBtn}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#18181c", "#c1c0c5", "#18181c"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerBtnBorder}
        >
          <BlurView intensity={40} tint="dark" style={styles.headerBtnBg}>
            <Feather name="chevron-left" size={24} color={COLORS.text} />
          </BlurView>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.headerBtn} 
        activeOpacity={0.8}
        onPress={() => router.push("/event-screen/wallet")}
      > 
        <LinearGradient
          colors={["#18181c", "#c1c0c5", "#18181c"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerBtnBorder}
        >
          <BlurView intensity={40} tint="dark" style={styles.headerBtnBg}>
            <Feather name="more-horizontal" size={24} color={COLORS.text} />
          </BlurView>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
            }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <LinearGradient
            colors={[
              "rgba(14, 13, 18, 0.8)",
              "transparent",
              "rgba(14, 13, 18, 1)",
            ]}
            style={styles.gradient}
          />

          {/* Overlaid Event Meta */}
          <View style={styles.overlaidMeta}>
            <View style={styles.tagsRow}>
              <View
                style={[styles.tag, { backgroundColor: COLORS.accentPurple }]}
              >
                <Text style={styles.tagText}>Music Party</Text>
              </View>
              <View
                style={[styles.tag, { backgroundColor: COLORS.accentOrange }]}
              >
                <Text style={styles.tagText}>Busy</Text>
              </View>
            </View>

            <View style={styles.hostRow}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
                }}
                style={styles.hostAvatar}
              />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>Dj Koko</Text>
                <View style={styles.hostSubRow}>
                  <Text style={styles.hostUser}>@scfc_t</Text>
                  <Text style={styles.dotSeparator}> • </Text>
                  <Feather name="lock" size={10} color={COLORS.textMuted} />
                  <Text style={styles.privateText}> Private Event</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.followBtnSmall}>
                <Text style={styles.followBtnTextSmall}>Follow</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.attendeesStatsRow}>
              <View style={styles.avatarCluster}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
                  }}
                  style={[styles.avatarSmall, { zIndex: 3 }]}
                />
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
                  }}
                  style={[styles.avatarSmall, { zIndex: 2, marginLeft: -8 }]}
                />
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1599566150163-29194dcabd9c?q=80&w=100&auto=format&fit=crop",
                  }}
                  style={[styles.avatarSmall, { zIndex: 1, marginLeft: -8 }]}
                />
              </View>
              <Text style={styles.statsText}>
                41 going <Text style={styles.dotSeparator}>•</Text> 58 tickets
                left
              </Text>
            </View>

            <View style={styles.actionStatsRow}>
              <View style={styles.actionStat}>
                <Ionicons name="heart" size={18} color="#F2245C" />
                <Text style={styles.actionStatText}>25</Text>
              </View>
              <View style={styles.actionStat}>
                <Feather
                  name="message-circle"
                  size={18}
                  color={COLORS.textMuted}
                />
                <Text style={styles.actionStatText}>25</Text>
              </View>
              <View style={styles.actionStat}>
                <Feather name="share" size={18} color={COLORS.textMuted} />
                <Text style={styles.actionStatText}>25</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Event Title & Basic Info */}
        <View style={styles.contentPadding}>
          <Text style={styles.eventTitle}>Rooftop Session Vol.4</Text>
          <View style={styles.eventInfoRow}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>Sat, Sep 19</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="clock" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>9:00 - 11:00 PM</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>0.3mi</Text>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {["About", "Access", "Vibe", "Product"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && styles.tabItemActive,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === tab && styles.tabLabelActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Content Switching */}
        <View style={styles.contentPadding}>
          {activeTab === "About" && <AboutTab />}
          {activeTab === "Access" && <AccessTab />}
          {activeTab === "Vibe" && <VibeTab />}
          {activeTab === "Product" && <ProductTab />}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.priceValue}>£45</Text>
        </View>
        <TouchableOpacity 
          style={styles.buyBtn} 
          activeOpacity={0.8}
          onPress={() => router.push("/event-screen/checkout")}
        >
          <Text style={styles.buyBtnText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EventScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerActions: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius:100,
  },
  headerBtnBorder: {
    flex: 1,
    padding: 0.5,
    borderRadius: 100,
  },
  headerBtnBg: {
    flex: 1,
    backgroundColor: "#1e1d21",
    borderRadius:100,
    justifyContent: "center",          
    alignItems: "center",
  },
  imageContainer: {
    width: width,
    height: 480,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlaidMeta: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  hostInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  hostSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostUser: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  dotSeparator: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  privateText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  followBtnSmall: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followBtnTextSmall: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  attendeesStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCluster: {
    flexDirection: "row",
    marginRight: 10,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  statsText: {
    color: COLORS.text,
    fontSize: 13,
  },
  actionStatsRow: {
    flexDirection: "row",
    gap: 20,
  },
  actionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionStatText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  contentPadding: {
    paddingHorizontal: 16,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
  },
  eventInfoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: COLORS.text,
  },
  subTabContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  subTabBg: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    flexDirection: "row",
    padding: 4,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 18,
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
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ageTag: {
    borderWidth: 1,
    borderColor: "#FF4D4D",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  ageTagText: {
    color: "#FF4D4D",
    fontSize: 11,
    fontWeight: "bold",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  mapOverlayAvatar: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: "hidden",
  },
  mapAvatar: {
    width: "100%",
    height: "100%",
  },
  expandMapBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  additionalInfoCard: {
    backgroundColor: COLORS.card,
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
  },
  hostCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostCardName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  hostCardUser: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  followBtnLarge: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followBtnTextLarge: {
    color: COLORS.text,
    fontSize: 12,
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    zIndex: 100,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  priceValue: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  buyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buyBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
});
