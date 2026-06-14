import ConfettiOverlay from "@/components/ui/ConfettiOverlay";
import { useTheme } from "@/hooks/useTheme";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PaymentSuccessScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const details = [
    { label: "Ticket No", value: "MOM-2024-8575" },
    { label: "Host", value: "DJ Koko" },
    { label: "Venue", value: "Rooftop Sessions Vol. 4" },
    { label: "Address", value: "Sky Terrace, NY" },
    { label: "Ticket", value: "Ticket x 1" },
    { label: "Date/Time", value: "Sat, Sep 9 • 9pm" },
    { label: "Amount Paid", value: "$45", isPrice: true },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Confetti Animation */}
      <ConfettiOverlay
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success Animation Placeholder */}
        <View style={styles.successIconWrapper}>
          <View
            style={[
              styles.pulseOuter,
              {
                backgroundColor: isDark
                  ? "rgba(22, 216, 105, 0.1)"
                  : "rgba(22, 216, 105, 0.05)",
              },
            ]}
          >
            <View
              style={[
                styles.pulseInner,
                {
                  backgroundColor: isDark
                    ? "rgba(22, 216, 105, 0.15)"
                    : "rgba(22, 216, 105, 0.1)",
                  borderColor: "rgba(22, 216, 105, 0.3)",
                },
              ]}
            >
              <Ionicons
                name="checkmark-sharp"
                size={40}
                color={colors.success}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          Payment successful
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your ticket is confirmed.{"\n"}Have a great time at the event.
        </Text>

        {/* Details Card */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {details.map((item, index) => (
            <View key={index}>
              <View style={styles.detailRow}>
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: colors.text },
                    item.isPrice && { color: colors.success },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
              {index < details.length - 1 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() =>
            router.push({
              pathname: "/event-screen/qr-code",
              params: { type: "event" },
            })
          }
        >
          <Text style={[styles.primaryBtnText, { color: colors.background }]}>
            View my ticket
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.replace("/event-screen/event")}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
            Back to event
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentSuccessScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    justifyContent: "center",
    alignItems: "center",
  },
  pulseInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  detailsCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
