import { Feather, Ionicons } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentGreen: "#16D869",
  gold: "#EAB308",
  danger: "#FF3B30",
  dangerBg: "rgba(255, 59, 48, 0.1)",
  border: "rgba(255, 255, 255, 0.05)",
};

const TicketDetailScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const details = [
    { label: "Ticket No", value: "MOM-2024-8575" },
    { label: "Host", value: "DJ Koko" },
    { label: "Venue", value: "Rooftop Sessions Vol. 4" },
    { label: "Address", value: "Sky Terace, NY" },
    { label: "Ticket", value: "Ticket x 1" },
    { label: "Date and time", value: "Sat, Sep 9 • 9pm" },
    { label: "Amount Pending", value: "£45", isPending: true },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        {/* Header Image Background */}
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1514525253361-bee8a187499b?q=80&w=800&auto=format&fit=crop" }}
          style={styles.heroImage}
        >
          <LinearGradient
            colors={["transparent", "rgba(14, 13, 18, 0.8)", "#0e0d12"]}
            style={styles.heroOverlay}
          />
          
          {/* Header Controls */}
          <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
            <BackButton color={COLORS.text} />
            <Text style={styles.headerTitle}>Ticket Detail</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>Music Party</Text>
            </View>
            
            <View style={styles.hostRow}>
              <Image 
                source={{ uri: "https://i.pravatar.cc/150?u=djkoko" }} 
                style={styles.hostAvatar} 
              />
              <View>
                <Text style={styles.hostName}>Dj Koko</Text>
                <Text style={styles.hostHandle}>@sdfd_d</Text>
              </View>
            </View>

            <View style={styles.sharedByRow}>
              <Image 
                source={{ uri: "https://i.pravatar.cc/150?u=talha" }} 
                style={styles.sharedAvatar} 
              />
              <Text style={styles.sharedText}>
                Shared by <Text style={styles.sharedName}>Talha Rahman</Text>
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Info Card */}
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.eventTitle}>Rooftop Session Vol.4</Text>
                <Text style={styles.eventLocation}>New York</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              {details.map((item, index) => (
                <View key={index}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text 
                      style={[
                        styles.detailValue,
                        item.isPending && { color: COLORS.gold }
                      ]}
                    >
                      {item.value}
                    </Text>
                  </View>
                  {index < details.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => router.push({ pathname: '/event-screen/qr-code', params: { type: "event" } })}
        >
          <Text style={styles.primaryBtnText}>Show QR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryBtn}
          onPress={() => {}}
        >
          <Text style={styles.secondaryBtnText}>Cancel ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TicketDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroImage: {
    width: "100%",
    height: 340,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  heroContent: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  categoryText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "500",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  hostName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  hostHandle: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  sharedByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sharedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sharedText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  sharedName: {
    color: COLORS.text,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -20,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  eventLocation: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.accentGreen,
    fontSize: 12,
    fontWeight: "bold",
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(14, 13, 18, 0.95)",
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.1)",
  },
  secondaryBtnText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "bold",
  },
});
