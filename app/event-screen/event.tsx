import AboutTab from "@/components/eventTabs/AboutTab";
import AccessTab from "@/components/eventTabs/AccessTab";
import ProductTab from "@/components/eventTabs/ProductTab";
import VibeTab from "@/components/eventTabs/VibeTab";
import BackButton from "@/components/ui/BackButton";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Comment02Icon, Share01Icon, FavouriteIcon, MoreHorizontalIcon, Flag01Icon, Bookmark01Icon, Delete02Icon } from "@hugeicons/core-free-icons";

const { width } = Dimensions.get("window");

const EventScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("About");
  const [accessTab, setAccessTab] = useState("Tickets");
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const isHostMode = params.mode === "host";

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            // Logic to delete the event
            console.log("Event deleted");
            router.back();
          } 
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.headerActions, { top: insets.top + 10 }]}>
      <BackButton color={colors.text}  onPress={() => router.back()}/>
      <BackButton
        iconName={MoreHorizontalIcon}
        onPress={() => setMenuVisible(true)}
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
            pointerEvents="none"
            colors={["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0)"]}
            locations={[0, 1]}
            style={styles.topShade}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(92, 48, 187, 0.1)",
              "rgba(0, 0, 0, 0.72)",
              "#000000",
            ]}
            locations={[0, 0.48, 1]}
            start={{ x: 0.95, y: 0 }}
            end={{ x: 0.18, y: 1 }}
            style={styles.gradient}
          />

          {/* Overlaid Event Meta */}
          <View style={styles.overlaidMeta}>
            <View style={styles.tagsRow}>
              <View
                style={[styles.tag, { backgroundColor: "#8E54E9" }]}
              >
                <Text style={[styles.tagText, { color: "#FFFFFF" }]}>Music Party</Text>
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
              <TouchableOpacity 
                style={[
                  styles.followBtnSmall, 
                  { backgroundColor: isFollowing ? colors.primary : (isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.05)") }
                ]}
                onPress={() => setIsFollowing(!isFollowing)}
              >
                <Text style={[styles.followBtnTextSmall, { color: isFollowing ? "#FFF" : colors.text }]}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
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
                <HugeiconsIcon icon={FavouriteIcon} size={18} color="#F2245C" />
                <Text style={[styles.actionStatText, { color: colors.text }]}>25</Text>
              </View>
              <View style={styles.actionStat}>
                <HugeiconsIcon
                  icon={Comment02Icon}
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={[styles.actionStatText, { color: colors.text }]}>25</Text>
              </View>
              <View style={styles.actionStat}>
                <HugeiconsIcon icon={Share01Icon} size={18} color={colors.textSecondary} />
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
        {isHostMode ? (
          <TouchableOpacity
            style={[styles.startEventBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() => router.push("/profile-screen/event-dashboard")}
          >
            <Text style={[styles.buyBtnText, { color: colors.background }]}>Start The Event</Text>
          </TouchableOpacity>
        ) : (
          <>
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
          </>
        )}
      </View>

      {/* More Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContent, { backgroundColor: isDark ? "#4A4A4A" : colors.card, top: insets.top + 60 }]}>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                console.log("Reported");
              }}
              activeOpacity={0.7}
            >
              <HugeiconsIcon icon={Flag01Icon} size={20} color="#FFF" />
              <Text style={[styles.menuItemText, { color: "#FFF" }]}>Report</Text>
            </TouchableOpacity>
            
            <View style={styles.menuSeparator} />

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setMenuVisible(false);
                console.log("Saved");
              }}
              activeOpacity={0.7}
            >
              <HugeiconsIcon icon={Bookmark01Icon} size={20} color="#FFF" />
              <Text style={[styles.menuItemText, { color: "#FFF" }]}>Save</Text>
            </TouchableOpacity>

            <View style={styles.menuSeparator} />

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <HugeiconsIcon icon={Delete02Icon} size={20} color="#FFF" />
              <Text style={[styles.menuItemText, { color: "#FFF" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    height: 302,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  topShade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 130,
  },
  gradient: {
    position: "absolute",
    left: 0,
    top: 62,
    width: 440,
    height: 240,
  },
  overlaidMeta: {
    position: "absolute",
    bottom: 14,
    left: 20,
    right: 20,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  hostAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },
  hostInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostName: {
    fontSize: 15,
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
    paddingVertical: 8,
    borderRadius: 18,
  },
  followBtnTextSmall: {
    fontSize: 12,
    fontWeight: "600",
  },
  attendeesStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 18,
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
    justifyContent: "space-between",
    borderBottomWidth: 1,
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  subTabWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  startEventBtn: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    paddingVertical: 14,
  },
  buyBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  /* More Menu Styles */
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContent: {
    position: "absolute",
    right: 16,
    width: 140,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuSeparator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 8,
  },
});
