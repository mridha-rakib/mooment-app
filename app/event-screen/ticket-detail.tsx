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
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const TicketDetailScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
            colors={["transparent", isDark ? "rgba(14, 13, 18, 0.8)" : "rgba(255, 255, 255, 0.8)", colors.background]}
            style={styles.heroOverlay}
          />
          
          {/* Header Controls */}
          <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
            <BackButton color={colors.text} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Ticket Detail</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={[styles.categoryTag, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)", borderColor: colors.border }]}>
              <Text style={[styles.categoryText, { color: colors.text }]}>Music Party</Text>
            </View>
            
            <View style={styles.hostRow}>
              <Image 
                source={{ uri: "https://i.pravatar.cc/150?u=djkoko" }} 
                style={[styles.hostAvatar, { borderColor: colors.border }]} 
              />
              <View>
                <Text style={[styles.hostName, { color: colors.text }]}>Dj Koko</Text>
                <Text style={[styles.hostHandle, { color: colors.textSecondary }]}>@sdfd_d</Text>
              </View>
            </View>

            <View style={styles.sharedByRow}>
              <Image 
                source={{ uri: "https://i.pravatar.cc/150?u=talha" }} 
                style={styles.sharedAvatar} 
              />
              <Text style={[styles.sharedText, { color: colors.textSecondary }]}>
                Shared by <Text style={[styles.sharedName, { color: colors.text }]}>Talha Rahman</Text>
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* Info Card */}
        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.eventTitle, { color: colors.text }]}>Rooftop Session Vol.4</Text>
                <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>New York</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + '1A' }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              {details.map((item, index) => (
                <View key={index}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    <Text 
                      style={[
                        styles.detailValue,
                        { color: colors.text },
                        item.isPending && { color: colors.warning }

                      ]}
                    >
                      {item.value}
                    </Text>
                  </View>
                  {index < details.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background + 'F2' }]}>
        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/event-screen/qr-code', params: { type: "event" } })}
        >
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>Show QR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryBtn, { backgroundColor: colors.danger + '1A', borderColor: colors.danger + '1A' }]}
          onPress={() => {}}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Cancel ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TicketDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  categoryText: {
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
  },
  hostName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  hostHandle: {
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
    fontSize: 12,
  },
  sharedName: {
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    marginTop: -20,
  },
  infoCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  eventLocation: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
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
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 12,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
