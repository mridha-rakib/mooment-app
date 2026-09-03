import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CheckoutHeader,
  EventCard,
  AnonymousBuy,
  OrderSummary,
  PaymentMethods,
  SecurityBanner,
  TermsAgreement,
  CheckoutFooter,
} from "@/components/event/checkout";
import { useTheme } from "@/hooks/useTheme";
import { createCheckoutIntent, emitTicketWalletChanged, getCheckoutQuote, type CheckoutOrder, type CheckoutQuote } from "@/lib/payments";
import { startStripeCheckout } from "@/lib/stripeCheckout";
import { notifySuccess } from "@/lib/successFeedback";

const parsePositiveInteger = (value: string | string[] | undefined, fallback = 1) => {
  const source = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(source ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getParam = (value: string | string[] | undefined, fallback: string) => {
  const source = Array.isArray(value) ? value[0] : value;

  return source?.trim() || fallback;
};

const formatCurrency = (value: number, currency = "usd") => {
  if (value <= 0) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
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
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [applyOffer, setApplyOffer] = useState(false);
  const [anonymousBuy, setAnonymousBuy] = useState(false);

  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : "";
  const eventName = getParam(params.eventName, "Event");
  const eventDateTime = getParam(params.eventDateTime, "Date TBA");
  const quantity = parsePositiveInteger(params.quantity);
  const rewardId = typeof params.rewardId === "string" ? params.rewardId : null;
  const subtotal = quote ? (quote.subtotalAmount <= 0 ? "Free" : formatCurrency(quote.subtotalAmount, quote.currency)) : "";
  const fee = quote ? formatCurrency(quote.platformFeeAmount, quote.currency) : "";
  const tax = quote ? formatCurrency(quote.taxAmount, quote.currency) : "";
  const total = quote ? (quote.totalAmount <= 0 ? "Free" : formatCurrency(quote.totalAmount, quote.currency)) : "";
  const isFreeCheckout = quote !== null && quote.totalAmount <= 0;
  // Payment-specific UI must only appear once a loaded quote confirms a paid
  // total. While the quote is loading (quote === null) this stays false so the
  // Card / Apple Pay methods never flash before the free total resolves.
  const isPaidCheckout = quote !== null && quote.totalAmount > 0;
  const ticketLineItem = quote?.lineItems.find(
    (item) => item.itemType === "ticket" && item.itemId === ticketId,
  );
  const quoteFreeQuantity = ticketLineItem?.freeQuantity ?? 0;
  const rewardSnapshot = applyOffer ? ticketLineItem?.rewardSnapshot ?? null : null;
  const rewardSummary = rewardSnapshot
    ? [
        rewardSnapshot.discountEnabled && rewardSnapshot.discountPercent
          ? `${rewardSnapshot.discountPercent}% off`
          : null,
        rewardSnapshot.bogoEnabled && rewardSnapshot.buyQuantity && rewardSnapshot.freeQuantity
          ? `Buy ${rewardSnapshot.buyQuantity} Get ${rewardSnapshot.freeQuantity} Free`
          : null,
      ].filter(Boolean).join(" · ")
    : quoteFreeQuantity > 0
      ? `${quoteFreeQuantity} free`
      : "$0";

  const orderItems = useMemo(() => {
    if (isQuoteLoading) {
      return [{ name: "Loading order", price: "" }];
    }

    if (!quote) {
      return [{ name: "Quote unavailable", price: "" }];
    }

    return quote.lineItems.flatMap((item) => {
      const paidQuantity = item.paidQuantity ?? item.quantity;
      const freeQuantity = item.freeQuantity ?? 0;
      const rows = [{
        name: `${item.name} paid x ${paidQuantity}`,
        price: item.totalAmount <= 0 ? "Free" : formatCurrency(item.totalAmount, quote.currency),
      }];

      if (freeQuantity > 0) {
        rows.push({ name: `${item.name} rewarded x ${freeQuantity}`, price: "Free" });
      }

      return rows;
    });
  }, [isQuoteLoading, quote]);

  useEffect(() => {
    let cancelled = false;

    const loadQuote = async () => {
      if (!eventId || !ticketId) {
        setIsQuoteLoading(false);
        setQuoteError("This ticket checkout is missing event details.");
        return;
      }

      setIsQuoteLoading(true);
      setQuoteError(null);

      try {
        const nextQuote = await getCheckoutQuote({
          kind: "ticket",
          paymentMethod: "card",
          eventId,
          ticketId,
          quantity,
          applyReward: applyOffer,
          rewardId: applyOffer ? rewardId : null,
          anonymous: anonymousBuy,
        });

        if (!cancelled) {
          setQuote(nextQuote);
        }
      } catch (error) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(error instanceof Error ? error.message : "Unable to load checkout quote.");
        }
      } finally {
        if (!cancelled) {
          setIsQuoteLoading(false);
        }
      }
    };

    void loadQuote();

    return () => {
      cancelled = true;
    };
  }, [anonymousBuy, applyOffer, eventId, rewardId, ticketId, quantity]);

  const handleContinue = async () => {
    if (!agreed) {
      Alert.alert("Terms required", "Please accept the refund policy and terms before payment.");
      return;
    }

    if (!eventId || !ticketId) {
      Alert.alert("Payment unavailable", "This ticket checkout is missing event details.");
      return;
    }

    if (!quote) {
      Alert.alert("Quote unavailable", quoteError ?? "Please wait for the checkout quote to load.");
      return;
    }

    setIsPaying(true);

    try {
      let order: CheckoutOrder;

      if (quote.totalAmount <= 0) {
        const checkout = await createCheckoutIntent({
          kind: "ticket",
          paymentMethod: "card",
          eventId,
          ticketId,
          quantity,
          applyReward: applyOffer,
          rewardId: applyOffer ? rewardId : null,
          anonymous: anonymousBuy,
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
            applyReward: applyOffer,
            rewardId: applyOffer ? rewardId : null,
            anonymous: anonymousBuy,
            acceptedTerms: agreed,
          },
          {
            isDark,
            onCheckoutCreated: (checkout) => {
              setQuote({
                currency: checkout.order.currency,
                subtotalAmount: checkout.order.subtotalAmount,
                platformFeeAmount: checkout.order.platformFeeAmount,
                taxAmount: checkout.order.taxAmount,
                discountAmount: checkout.order.discountAmount ?? 0,
                totalAmount: checkout.order.totalAmount,
                taxSnapshot: checkout.order.taxSnapshot ?? quote.taxSnapshot,
                policySnapshot: checkout.order.policySnapshot ?? quote.policySnapshot,
                lineItems: checkout.order.lineItems,
              });
            },
          },
        );

        if (stripeResult === null) {
          // User dismissed the PaymentSheet - stay on checkout screen, no error shown
          return;
        }

        order = stripeResult;
      }

      if (order.totalAmount <= 0) {
        emitTicketWalletChanged();
      }

      notifySuccess(order.totalAmount <= 0 ? "Ticket confirmed" : "Payment complete");

      router.replace({
        pathname: "/event-screen/event",
        params: { eventId },
      });
    } catch (error) {
      Alert.alert(
        quote.totalAmount <= 0 ? "Unable to claim ticket" : "Payment failed",
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
        {isPaidCheckout ? (
          <>
            <PaymentMethods
              payWith={payWith}
              onMethodChange={setPayWith}
            />

            <SecurityBanner />
          </>
        ) : null}

        <EventCard 
          title={eventName}
          dateTime={eventDateTime}
        />

        <AnonymousBuy
          active={anonymousBuy}
          onToggle={() => setAnonymousBuy((value) => !value)}
        />

        <OrderSummary
          items={orderItems}
          subtotal={subtotal}
          reward={rewardSummary}
          fee={fee}
          tax={tax}
          total={total}
        />
        {rewardId ? (
          <TouchableOpacity
            style={[styles.offerToggle, { borderColor: applyOffer ? colors.primary : colors.border }]}
            activeOpacity={0.85}
            onPress={() => setApplyOffer((value) => !value)}
            disabled={isQuoteLoading || isPaying}
          >
            <View
              style={[
                styles.offerCheck,
                {
                  borderColor: applyOffer ? colors.primary : colors.textSecondary,
                  backgroundColor: applyOffer ? colors.primary : "transparent",
                },
              ]}
            >
              {applyOffer ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
            </View>
            <View style={styles.offerToggleText}>
              <Text style={[styles.offerTitle, { color: colors.text }]}>Apply Offer</Text>
              {rewardSnapshot ? (
                <Text style={[styles.offerSubtitle, { color: colors.textSecondary }]}>
                  {[
                    rewardSnapshot.discountEnabled && rewardSnapshot.discountPercent
                      ? `${rewardSnapshot.discountPercent}% off ${formatCurrency(rewardSnapshot.discountAmount, quote?.currency)}`
                      : null,
                    rewardSnapshot.bogoEnabled
                      ? `${rewardSnapshot.freeQuantityIssued} free · ${rewardSnapshot.totalQuantityIssued} total issued`
                      : null,
                  ].filter(Boolean).join(" · ")}
                </Text>
              ) : (
                <Text style={[styles.offerSubtitle, { color: colors.textSecondary }]}>
                  {applyOffer ? "Loading offer breakdown" : "Optional ticket offer"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ) : null}
        {isQuoteLoading ? (
          <View style={styles.quoteStatus}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : quoteError ? (
          <Text style={[styles.quoteError, { color: "#E75737" }]}>{quoteError}</Text>
        ) : null}

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
          buttonText={isFreeCheckout ? "Join Event" : "Continue to payment"}
          onPress={handleContinue}
          disabled={!agreed || isPaying || isQuoteLoading || !quote}
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
  offerCheck: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  offerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 2,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  offerToggle: {
    alignItems: "center",
    backgroundColor: "#151515",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  offerToggleText: {
    flex: 1,
  },
  quoteStatus: {
    alignItems: "center",
    marginBottom: 12,
    minHeight: 20,
  },
  quoteError: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 12,
  },
});
