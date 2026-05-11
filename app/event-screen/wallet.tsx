import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import SegmentedControl from "@/components/ui/SegmentedControl";
import CinematicButton from "@/components/ui/CinematicButton";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

const { width } = Dimensions.get("window");

const TicketWalletScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <CinematicButton
          onPress={() => router.back()}
          icon={ArrowLeft01Icon}
          size={24}
        />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ticket Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          options={["Shared", "Active", "Used", "Canceled"]}
          selectedOption={activeTab}
          onSelect={setActiveTab}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.cardContainer}>
                {/* Shared By Info */}
                <View style={styles.sharedInfo}>
                  <Image source={{ uri: item.sharedBy.avatar }} style={styles.avatar} />
                  <Text style={[styles.sharedText, { color: colors.textSecondary }]}>
                    Shared by <Text style={[styles.sharedName, { color: colors.text }]}>{item.sharedBy.name}</Text>
                  </Text>
                </View>

                <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.9}>
                  {/* Card Header */}
                  <LinearGradient
                    colors={[isDark ? "rgba(212, 176, 235, 0.12)" : "rgba(212, 176, 235, 0.05)", "transparent"]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardHeader}
                  >
                    <View>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{item.eventTitle}</Text>
                      <Text style={[styles.hostText, { color: colors.textSecondary }]}>by {item.host}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? "rgba(22, 216, 105, 0.1)" : "rgba(22, 216, 105, 0.05)" }]}>
                      <Text style={[styles.statusText, { color: colors.success }]}>{item.status}</Text>
                    </View>
                  </LinearGradient>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <Image source={{ uri: item.image }} style={styles.ticketImage} />
                    <View style={styles.ticketInfo}>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.locationText, { color: colors.text }]}>{item.location}</Text>
                      </View>
                      <Text style={[styles.dateTimeText, { color: colors.text }]}>{item.dateTime}</Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.address}
                      </Text>
                      
                      <TouchableOpacity 
                        style={[styles.viewTicketBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => router.push("/event-screen/ticket-detail")}
                      >
                        <Text style={[styles.viewTicketText, { color: colors.textSecondary }]}>View Ticket</Text>
                        <Feather name="arrow-right" size={14} color={colors.textSecondary} />
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tabWrapper: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
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
  },
  sharedText: {
    fontSize: 12,
  },
  sharedName: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  hostText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
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
    fontSize: 14,
    fontWeight: "600",
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  viewTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  viewTicketText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
