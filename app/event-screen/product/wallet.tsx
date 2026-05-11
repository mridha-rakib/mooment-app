import { Feather, Ionicons } from "@expo/vector-icons";
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
import SegmentedControl from "@/components/ui/SegmentedControl";
import CinematicButton from "@/components/ui/CinematicButton";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

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

const ProductWalletScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Active");

  const sections = [
    {
      title: "Tonight",
      items: [
        {
          id: "1",
          eventTitle: "Rooftop Session Vol.4",
          host: "DJ Koko",
          productName: "Medusa Skin Whitening Cream",
          location: "New York City",
          dateTime: "Sat, Sep 9 • 9:00",
          price: "$45.00",
          image: "https://images.unsplash.com/photo-1631390164305-9c6a5e4c3f5f?q=80&w=120&auto=format&fit=crop",
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
          productName: "Medusa Skin Whitening Cream",
          location: "New York City",
          dateTime: "Sat, Sep 9 • 9:00",
          price: "$45.00",
          image: "https://images.unsplash.com/photo-1631390164305-9c6a5e4c3f5f?q=80&w=120&auto=format&fit=crop",
          status: "Active",
        },
      ],
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <CinematicButton
          onPress={() => router.back()}
          icon={ArrowLeft01Icon}
          size={24}
        />
        <Text style={styles.headerTitle}>Product Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          options={["Active", "Canceled"]}
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
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.9}>
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

                {/* Card Content */}
                <View style={styles.cardBody}>
                  <Image source={{ uri: item.image }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.locationText}>{item.location}</Text>
                    </View>
                    <Text style={styles.productName}>{item.productName}</Text>
                    <Text style={styles.dateTimeText}>{item.dateTime}</Text>
                    
                    <View style={styles.footerRow}>
                      <Text style={styles.priceText}>{item.price}</Text>
                      <TouchableOpacity 
                        style={styles.viewQrBtn}
                        onPress={() => router.push({ pathname: '/event-screen/qr-code', params: { type: "product" } })}
                      >
                        <Text style={styles.viewQrText}>View QR</Text>
                        <Feather name="arrow-right" size={14} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default ProductWalletScreen;

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
    fontSize: 14,
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
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
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
  productImage: {
    width: 100,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#222",
  },
  productInfo: {
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
    fontSize: 13,
    fontWeight: "500",
  },
  productName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  dateTimeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  priceText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  viewQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  viewQrText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
