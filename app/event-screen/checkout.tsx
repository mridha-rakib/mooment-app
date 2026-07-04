import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CheckoutHeader,
  EventCard,
  OrderSummary,
  PaymentMethods,
  SecurityBanner,
  TermsAgreement,
  CheckoutFooter,
} from "@/components/event/checkout";
import { useTheme } from "@/hooks/useTheme";
import { createCheckoutIntent, type CheckoutOrder } from "@/lib/payments";
import { claimEventReward } from "@/lib/events";
import { startStripeCheckout } from "@/lib/stripeCheckout";

const parsePositiveInteger = (value: string | string[] | undefined, fallback = 1) => {
  const source = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(source ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePrice = (value: string | string[] | undefined) => {
  const source = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseFloat(source ?? "");

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getParam = (value: string | string[] | undefined, fallback: string) => {
  const source = Array.isArray(value) ? value[0] : value;

  return source?.trim() || fallback;
};

const BUYER_FEE_STRIPE = 0.10;

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const formatCurrency = (value: number) => {
  if (value <= 0) {
    return "$0";
  }

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })}`;
};

const EventCheckoutScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventName?: string;
    eventDateTime?: string;
    eventDateDisplay?: string;
    ticketName?: string;
    ticketPrice?: string;
    ticketType?: string;
    quantity?: string;
    eventId?: string;
    ticketId?: string;
    hostName?: string;
    venue?: string;
    address?: string;
    rewardId?: string;
    rewardBuyQuantity?: string;
    rewardFreeQuantity?: string;
  }>();
  const { colors, isDark } = useTheme();
  const [payWith, setPayWith] = useState("Card");
  const [agreed, setAgreed] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : "";
  const rewardId = typeof params.rewardId === "string" ? params.rewardId : "";
  const eventName = getParam(params.eventName, "Event");
  const eventDateTime = getParam(params.eventDateTime, "Date TBA");
  const eventDateDisplay = getParam(params.eventDateDisplay, eventDateTime);
  const ticketName = getParam(params.ticketName, "Ticket");
  const hostName = getParam(params.hostName, "");
  const venue = getParam(params.venue, "");
  const address = getParam(params.address, "");
  const quantity = parsePositiveInteger(params.quantity);
  const rewardBuyQuantity = parsePositiveInteger(params.rewardBuyQuantity, 0);
  const rewardFreeQuantity = parsePositiveInteger(params.rewardFreeQuantity, 0);
  const previewFreeQuantity =
    rewardBuyQuantity > 0 && rewardFreeQuantity > 0
      ? Math.floor(quantity / rewardBuyQuantity) * rewardFreeQuantity
      : 0;
  const ticketPrice = parsePrice(params.ticketPrice);
  const isFreeTicket = params.ticketType === "free" || ticketPrice <= 0;
  const subtotalValue = isFreeTicket ? 0 : roundCurrency(ticketPrice * quantity);
  const feeValue = isFreeTicket ? 0 : roundCurrency(subtotalValue * BUYER_FEE_STRIPE);
  const totalValue = isFreeTicket ? 0 : roundCurrency(subtotalValue + feeValue);
  const subtotal = isFreeTicket ? "Free" : formatCurrency(subtotalValue);
  const fee = isFreeTicket ? "$0" : formatCurrency(feeValue);
  const total = isFreeTicket ? "Free" : formatCurrency(totalValue);

  const orderItems = [
    { name: `${ticketName} paid x ${quantity}`, price: subtotal },
    ...(previewFreeQuantity > 0
      ? [{ name: `${ticketName} rewarded x ${previewFreeQuantity}`, price: "Free" }]
      : []),
  ];

  const handleContinue = async () => {
    if (!agreed) {
      Alert.alert("Terms required", "Please accept the refund policy and terms before payment.");
      return;
    }

    if (!eventId || !ticketId) {
      Alert.alert("Payment unavailable", "This ticket checkout is missing event details.");
      return;
    }

    setIsPaying(true);

    try {
      let order: CheckoutOrder;

      if (isFreeTicket) {
        const checkout = await createCheckoutIntent({
          kind: "ticket",
          paymentMethod: "card",
          eventId,
          ticketId,
          quantity,
          anonymous: false,
          acceptedTerms: agreed,
        });
        order = checkout.order;
      } else {
        const stripeResult = await startStripeCheckout(
          {
            kind: "ticket",
            paymentMethod: payWith === "Apple" ? "apple_pay" : "card",
            eventId,
            ticketId,
            quantity,
            anonymous: false,
            acceptedTerms: agreed,
          },
          { isDark },
        );

        if (stripeResult === null) {
          // User dismissed the PaymentSheet — stay on checkout screen, no error shown
          return;
        }

        order = stripeResult;
      }

      if (rewardId) {
        await claimEventReward(eventId, rewardId).catch(() => {});
      }

      const ticketLineItem = order.lineItems.find(
        (item) => item.itemType === "ticket" && item.itemId === ticketId,
      );
      const paidQuantity = ticketLineItem?.paidQuantity ?? ticketLineItem?.quantity ?? quantity;
      const freeQuantity = Math.max(ticketLineItem?.freeQuantity ?? 0, previewFreeQuantity);
      const totalQuantity = Math.max(ticketLineItem?.totalQuantity ?? 0, paidQuantity + freeQuantity);

      router.replace({
        pathname: "/event-screen/payment-success",
        params: {
          orderId: order.id,
          eventId,
          ticketId,
          ticketName,
          eventName,
          eventDateDisplay,
          hostName,
          venue,
          address,
          quantity: String(totalQuantity),
          paidQuantity: String(paidQuantity),
          freeQuantity: String(freeQuantity),
          totalQuantity: String(totalQuantity),
          amount: isFreeTicket ? "0" : String(order.totalAmount),
          currency: order.currency,
          createdAt: order.createdAt,
          ...(isFreeTicket ? { isFree: "true" } : {}),
        },
      });
    } catch (error) {
      Alert.alert(
        isFreeTicket ? "Unable to claim ticket" : "Payment failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <CheckoutHeader title="Checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <PaymentMethods
          payWith={payWith}
          onMethodChange={setPayWith}
        />

        <SecurityBanner />

        <EventCard 
          title={eventName}
          dateTime={eventDateTime}
        />

        <OrderSummary
          items={orderItems}
          subtotal={subtotal}
          reward={previewFreeQuantity > 0 ? `${previewFreeQuantity} free` : "$0"}
          fee={fee}
          tax="$0"
          total={total}
        />

        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color="#E75737" />
          <Text style={styles.noticeText}>
            Products are collected in person at the event. A QR code will be generated after payment. Present it to the host to receive your items
          </Text>
        </View>

        <TermsAgreement 
          agreed={agreed} 
          onToggle={() => setAgreed(!agreed)} 
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footerWrapper}>
        <CheckoutFooter 
          buttonText="Continue to payment"
          onPress={handleContinue}
          disabled={!agreed || isPaying}
          loading={isPaying}
        />
      </View>
    </View>
  );
};

export default EventCheckoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 132,
  },
  footerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  noticeCard: {
    alignItems: "center",
    backgroundColor: "#1C1718",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    minHeight: 74,
    padding: 12,
  },
  noticeText: {
    color: "#B3B3B3",
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
  },
});
