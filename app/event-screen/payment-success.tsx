import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
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
  primary: "#B3A7C2",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.05)",
};

const PaymentSuccessScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const details = [
    { label: "Ticket No", value: "MOM-2024-8575" },
    { label: "Host", value: "DJ Koko" },
    { label: "Venue", value: "Rooftop Sessions Vol. 4" },
    { label: "Address", value: "Sky Terrace, NY" },
    { label: "Ticket", value: "Ticket x 1" },
    { label: "Date/Time", value: "Sat, Sep 9 • 9pm" },
    { label: "Amount Paid", value: "£45", isPrice: true },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeBtn} 
          onPress={() => router.push("/event-screen/event")}
        >
          <Feather name="x" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Animation Placeholder */}
        <View style={styles.successIconWrapper}>
          <View style={styles.pulseOuter}>
            <View style={styles.pulseInner}>
              <Ionicons name="checkmark-sharp" size={40} color={COLORS.accentGreen} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Payment successful</Text>
        <Text style={styles.subtitle}>
          Your ticket is confirmed.{"\n"}Have a great time at the event.
        </Text>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {details.map((item, index) => (
            <View key={index}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={[
                  styles.detailValue,
                  item.isPrice && { color: COLORS.accentGreen }
                ]}>
                  {item.value}
                </Text>
              </View>
              {index < details.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => router.push({ pathname: "/qr-code", params: { type: "event" } })}
        >
          <Text style={styles.primaryBtnText}>View my ticket</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryBtn}
          onPress={() => router.push("/event-screen/event")}
        >
          <Text style={styles.secondaryBtnText}>Back to event</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  successIconWrapper: {
    marginBottom: 30,
  },
  pulseOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  pulseInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(22, 216, 105, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(22, 216, 105, 0.3)",
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  detailsCard: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});
