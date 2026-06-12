import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import {
  CheckoutHeader,
  EventCard,
  OrderSummary,
  AnonymousBuy,
  PaymentTypeSelector,
  PaymentMethods,
  SecurityBanner,
  TermsAgreement,
  CheckoutFooter,
} from "@/components/event/checkout";
import { useTheme } from "@/hooks/useTheme";

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

const formatCurrency = (value: number) => {
  if (value <= 0) {
    return "£0";
  }

  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })}`;
};

const EventCheckoutScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventName?: string;
    eventDateTime?: string;
    ticketName?: string;
    ticketPrice?: string;
    ticketType?: string;
    quantity?: string;
  }>();
  const { colors, isDark } = useTheme();
  const [paymentType, setPaymentType] = useState("Online");
  const [payWith, setPayWith] = useState("Credits");
  const [agreed, setAgreed] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const eventName = getParam(params.eventName, "Event");
  const eventDateTime = getParam(params.eventDateTime, "Date TBA");
  const ticketName = getParam(params.ticketName, "Ticket");
  const quantity = parsePositiveInteger(params.quantity);
  const ticketPrice = parsePrice(params.ticketPrice);
  const isFreeTicket = params.ticketType === "free" || ticketPrice <= 0;
  const subtotalValue = isFreeTicket ? 0 : ticketPrice * quantity;
  const subtotal = isFreeTicket ? "Free" : formatCurrency(subtotalValue);

  const orderItems = [
    { name: `${ticketName} x ${quantity}`, price: subtotal },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <CheckoutHeader title="Checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EventCard 
          title={eventName}
          dateTime={eventDateTime}
        />

        <OrderSummary 
          items={orderItems}
          subtotal={subtotal}
          reward="£0"
          fee="£0"
          tax="£0"
          total={subtotal}
        />

        <AnonymousBuy 
          active={anonymous}
          onToggle={() => setAnonymous(!anonymous)}
        />

        <PaymentTypeSelector 
          paymentType={paymentType} 
          onTypeChange={setPaymentType} 
        />
        
        <PaymentMethods 
          payWith={payWith} 
          onMethodChange={setPayWith} 
        />

        <SecurityBanner />

        <TermsAgreement 
          agreed={agreed} 
          onToggle={() => setAgreed(!agreed)} 
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footerWrapper}>
        <CheckoutFooter 
          buttonText="Continue to payment"
          onPress={() => router.push("/event-screen/payment-success")} 
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
    padding: 16,
  },
  footerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  }
});
