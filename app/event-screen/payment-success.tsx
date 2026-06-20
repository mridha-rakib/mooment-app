import ConfettiOverlay from "@/components/ui/ConfettiOverlay";
import { useTheme } from "@/hooks/useTheme";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const getParam = (value: string | string[] | undefined, fallback: string) => {
  const source = Array.isArray(value) ? value[0] : value;
  return source?.trim() || fallback;
};

const computeTicketNo = (orderId?: string, createdAt?: string): string | null => {
  if (!orderId || !createdAt) return null;
  try {
    const year = new Date(createdAt).getFullYear();
    if (Number.isNaN(year)) return null;
    return `MOM-${year}-${orderId.slice(-4).toUpperCase()}`;
  } catch {
    return null;
  }
};

const formatAmount = (amount?: string, currency?: string, isFree?: string): string => {
  if (isFree === "true") return "Free";
  const parsed = Number.parseFloat(amount ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency?.trim().toUpperCase()) || "USD",
      minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
    }).format(parsed);
  } catch {
    return `$${parsed.toFixed(2)}`;
  }
};

const PaymentSuccessScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    orderId?: string;
    eventId?: string;
    ticketId?: string;
    ticketName?: string;
    eventName?: string;
    eventDateDisplay?: string;
    hostName?: string;
    venue?: string;
    address?: string;
    quantity?: string;
    amount?: string;
    currency?: string;
    createdAt?: string;
    isFree?: string;
  }>();

  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const orderId = getParam(params.orderId, "");
  const eventId = getParam(params.eventId, "");
  const ticketName = getParam(params.ticketName, "Ticket");
  const eventName = getParam(params.eventName, "Event");
  const eventDateDisplay = getParam(params.eventDateDisplay, "");
  const hostName = getParam(params.hostName, "");
  const venue = getParam(params.venue, "");
  const address = getParam(params.address, "");
  const quantity = getParam(params.quantity, "1");
  const isFree = getParam(params.isFree, "");
  const ticketNo = useMemo(
    () => computeTicketNo(orderId, params.createdAt ? getParam(params.createdAt, "") : undefined),
    [orderId, params.createdAt],
  );
  const formattedAmount = useMemo(
    () => formatAmount(params.amount, params.currency, isFree),
    [params.amount, params.currency, isFree],
  );
  const isAmountPaid = isFree !== "true" && Number.parseFloat(getParam(params.amount, "0")) > 0;

  const details = useMemo(() => {
    const rows: { label: string; value: string; isPrice?: boolean }[] = [];
    if (ticketNo) rows.push({ label: "Ticket No", value: ticketNo });
    if (hostName) rows.push({ label: "Host", value: hostName });
    if (venue) rows.push({ label: "Venue", value: venue });
    if (address) rows.push({ label: "Address", value: address });
    rows.push({ label: "Ticket", value: `${ticketName} x ${quantity}` });
    if (eventDateDisplay) rows.push({ label: "Date/Time", value: eventDateDisplay });
    rows.push({ label: isAmountPaid ? "Amount Paid" : "Total", value: formattedAmount, isPrice: isAmountPaid });
    return rows;
  }, [ticketNo, hostName, venue, address, ticketName, quantity, eventDateDisplay, formattedAmount, isAmountPaid]);

  const handleViewTicket = () => {
    router.push({
      pathname: "/event-screen/qr-code",
      params: {
        type: "event",
        ticketNo: ticketNo ?? "",
        eventName,
        hostName,
        venue,
        address,
        dateTime: eventDateDisplay,
        ticketName,
        quantity,
        amount: getParam(params.amount, "0"),
        currency: getParam(params.currency, "usd"),
      },
    });
  };

  const handleBackToEvent = () => {
    if (eventId) {
      router.replace({
        pathname: "/event-screen/event",
        params: { eventId },
      });
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ConfettiOverlay
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: colors.card }]}
          onPress={handleBackToEvent}
        >
          <Feather name="x" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
              <Ionicons name="checkmark-sharp" size={40} color={colors.success} />
            </View>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {isFree === "true" ? "Ticket confirmed!" : "Payment successful"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {eventName
            ? `You're going to ${eventName}.`
            : "Your ticket is confirmed."}
          {"\n"}Have a great time at the event.
        </Text>

        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {details.map((item, index) => (
            <View key={item.label}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: colors.text },
                    item.isPrice && { color: colors.success },
                  ]}
                  numberOfLines={2}
                >
                  {item.value}
                </Text>
              </View>
              {index < details.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleViewTicket}
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
          onPress={handleBackToEvent}
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
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 16,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
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
