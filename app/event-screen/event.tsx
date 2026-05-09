import AboutTab from "@/components/eventTabs/AboutTab";
import AccessTab from "@/components/eventTabs/AccessTab";
import ProductTab from "@/components/eventTabs/ProductTab";
import VibeTab from "@/components/eventTabs/VibeTab";
import BackButton from "@/components/ui/BackButton";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const { width } = Dimensions.get("window");

const EventScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("About");

  const renderHeader = () => (
    <View style={[styles.headerActions, { top: insets.top + 10 }]}>
      <BackButton color={colors.text} />
      <BackButton
        iconName="more-horizontal"
        onPress={() => router.push("/event-screen/wallet")}
        color={colors.text}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
              isDark ? "rgba(14, 13, 18, 0.8)" : "rgba(255, 255, 255, 0.5)",
              "transparent",
              colors.background,
            ]}
            style={styles.gradient}
          />

          {/* Overlaid Event Meta */}
          <View style={styles.overlaidMeta}>
            <View style={styles.tagsRow}>
              <View
                style={[styles.tag, { backgroundColor: "#8E54E9" }]}
              >
                <Text style={[styles.tagText, { color: "#FFFFFF" }]}>Music Part </Text>
              </View>
              <View
                style={[styles.tag, { backgroundColor: "#FF6B3D" }]}
              >
                <Text style={[styles.tagText, { color: "#FFFFFF" }]}>Busy</Text>
              </View>
            </View>

            <View style={styles.hostRow}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
                }}
                style={[styles.hostAvatar, { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }]}
              />
              <View style={styles.hostInfo}>
                <Text style={[styles.hostName, { color: colors.text }]}>Dj Koko</Text>
                <View style={styles.hostSubRow}>
                  <Text style={[styles.hostUser, { color: colors.textSecondary }]}>@scfc_t</Text>
                  <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}> • </Text>
                  <Feather name="lock" size={10} color={colors.textSecondary} />
                  <Text style={[styles.privateText, { color: colors.textSecondary }]}> Private Event</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.followBtnSmall, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.05)" }]}>
                <Text style={[styles.followBtnTextSmall, { color: colors.text }]}>Follow</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.attendeesStatsRow}>
              <View style={styles.avatarCluster}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
                  }}
                  style={[styles.avatarSmall, { zIndex: 3, borderColor: colors.background }]}
                />
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
                  }}
                  style={[styles.avatarSmall, { zIndex: 2, marginLeft: -8, borderColor: colors.background }]}
                />
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1599566150163-29194dcabd9c?q=80&w=100&auto=format&fit=crop",
                  }}
                  style={[styles.avatarSmall, { zIndex: 1, marginLeft: -8, borderColor: colors.background }]}
                />
              </View>
              <Text style={[styles.statsText, { color: colors.text }]}>
                41 going <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>•</Text> 58 tickets
                left
              </Text>
            </View>

            <View style={styles.actionStatsRow}>
              <View style={styles.actionStat}>
                <Ionicons name="heart" size={18} color="#F2245C" />
                <Text style={[styles.actionStatText, { color: colors.text }]}>25</Text>
              </View>
              <View style={styles.actionStat}>
                <Feather
                  name="message-circle"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={[styles.actionStatText, { color: colors.text }]}>25</Text>
              </View>
              <View style={styles.actionStat}>
                <Feather name="share" size={18} color={colors.textSecondary} />
                <Text style={[styles.actionStatText, { color: colors.text }]}>25</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Event Title & Basic Info */}
        <View style={styles.contentPadding}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>Rooftop Session Vol.4</Text>
          <View style={styles.eventInfoRow}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Sat, Sep 19</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="clock" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>9:00 - 11:00 PM</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>0.3mi</Text>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {["About", "Access", "Vibe", "Product"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && { borderBottomColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab ? colors.text : colors.textSecondary },
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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>From</Text>
          <Text style={[styles.priceValue, { color: colors.text }]}>£45</Text>
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={() => router.push("/event-screen/checkout")}
        >
          <Text style={[styles.buyBtnText, { color: colors.background }]}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EventScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  hostInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  hostSubRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostUser: {
    fontSize: 12,
  },
  dotSeparator: {
    fontSize: 12,
  },
  privateText: {
    fontSize: 12,
  },
  followBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followBtnTextSmall: {
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
  },
  statsText: {
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
    fontSize: 13,
    fontWeight: "600",
  },
  contentPadding: {
    paddingHorizontal: 16,
  },
  eventTitle: {
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
    fontSize: 13,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
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
    fontSize: 12,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  buyBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buyBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
