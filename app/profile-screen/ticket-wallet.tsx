import { Feather, Ionicons } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.05)",
  tabBg: "rgba(255, 255, 255, 0.05)",
  tabActive: "rgba(255, 255, 255, 0.15)",
};

const TicketWalletScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Shared");

  const sections = [
    {
      title: "Tonight",
      items: [
        {
          id: "1",
          eventTitle: "Rooftop Session Vol.4",
          host: "DJ Koko",
          sharedBy: {
            name: "Talha Rahman",
            avatar: "https://i.pravatar.cc/150?u=talha",
          },
          location: "New York City",
          dateTime: "Sat, Sep 9 • 9:00 - 4:00 PM",
          address: "123 Main Street, New York, NY 1001",
          image: "https://images.unsplash.com/photo-1514525253361-bee8a187499b?q=80&w=400&auto=format&fit=crop",
          status: "Active",
        },
      ],
    },
    {
      title: "Upcoming",
      items: [
        {
          id: "2",
          eventTitle: "Rooftop Session Vol.4",
          host: "DJ Koko",
          sharedBy: {
            name: "Talha Rahman",
            avatar: "https://i.pravatar.cc/150?u=talha",
          },
          location: "New York City",
          dateTime: "Sat, Sep 9 • 9:00 - 4:00 PM",
          address: "123 Main Street, New York, NY 1001",
          image: "https://images.unsplash.com/photo-1514525253361-bee8a187499b?q=80&w=400&auto=format&fit=crop",
          status: "Active",
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Ticket Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          {["Shared", "Active", "Used", "Canceled"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.cardContainer}>
                {/* Shared By Info */}
                <View style={styles.sharedInfo}>
                  <Image source={{ uri: item.sharedBy.avatar }} style={styles.avatar} />
                  <Text style={styles.sharedText}>
                    Shared by <Text style={styles.sharedName}>{item.sharedBy.name}</Text>
                  </Text>
                </View>

                <TouchableOpacity style={styles.card} activeOpacity={0.9}>
                  {/* Card Header */}
                  <LinearGradient
                    colors={["rgba(212, 176, 235, 0.12)", "rgba(19, 19, 26, 0)"]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardHeader}
                  >
                    <View>
                      <Text style={styles.eventTitle}>{item.eventTitle}</Text>
                      <Text style={styles.hostText}>by {item.host}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </LinearGradient>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <Image source={{ uri: item.image }} style={styles.ticketImage} />
                    <View style={styles.ticketInfo}>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                        <Text style={styles.locationText}>{item.location}</Text>
                      </View>
                      <Text style={styles.dateTimeText}>{item.dateTime}</Text>
                      <Text style={styles.addressText} numberOfLines={2}>
                        {item.address}
                      </Text>
                      
                      <TouchableOpacity 
                        style={styles.viewTicketBtn}
                        onPress={() => router.push("/event-screen/ticket-detail")}
                      >
                        <Text style={styles.viewTicketText}>View Ticket</Text>
                        <Feather name="arrow-right" size={14} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default TicketWalletScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tabWrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.tabBg,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.tabActive,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  sharedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
  },
  sharedText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  sharedName: {
    color: COLORS.text,
    fontWeight: "600",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  hostText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.accentGreen,
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  ticketImage: {
    width: 100,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  ticketInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  dateTimeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  addressText: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  viewTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignSelf: "flex-start",
  },
  viewTicketText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
