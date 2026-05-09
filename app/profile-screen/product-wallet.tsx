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
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const { width } = Dimensions.get("window");

const ProductWalletScreen = () => {
  const { colors, isDark } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Product Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={[styles.tabWrapper, { backgroundColor: colors.card }]}>
          {["Active", "Canceled"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.text : colors.textSecondary },
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
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.9}>
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
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(22, 216, 105, 0.1)' }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </LinearGradient>

                {/* Card Content */}
                <View style={styles.cardBody}>
                  <Image source={{ uri: item.image }} style={[styles.productImage, { backgroundColor: colors.border }]} />
                  <View style={styles.productInfo}>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                      <Text style={[styles.locationText, { color: colors.text }]}>{item.location}</Text>
                    </View>
                    <Text style={[styles.productName, { color: colors.text }]}>{item.productName}</Text>
                    <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{item.dateTime}</Text>
                    
                    <View style={styles.footerRow}>
                      <Text style={[styles.priceText, { color: colors.text }]}>{item.price}</Text>
                      <TouchableOpacity 
                        style={[styles.viewQrBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() => router.push({ pathname: '/event-screen/qr-code', params: { type: "product" } })}
                      >
                        <Text style={[styles.viewQrText, { color: colors.textSecondary }]}>View QR</Text>
                        <Feather name="arrow-right" size={14} color={colors.textSecondary} />
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
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
    fontSize: 14,
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
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
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
    color: "#16D869",
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
    fontSize: 13,
    fontWeight: "500",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  dateTimeText: {
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
    fontSize: 18,
    fontWeight: "bold",
  },
  viewQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  viewQrText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
