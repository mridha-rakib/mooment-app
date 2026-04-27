import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
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
  COLORS,
} from "@/components/event/checkout";

const EventCheckoutScreen = () => {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState("Online");
  const [payWith, setPayWith] = useState("Credits");
  const [agreed, setAgreed] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const orderItems = [
    { name: "Ticket x 1", price: "£45" },
  ];

  return (
    <View style={styles.container}>
      <CheckoutHeader title="Checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <EventCard 
          title="Sky Terrace, Floor 7"
          dateTime="Sat, Sep 9 • 9PM • DJ Nova"
        />

        <OrderSummary 
          items={orderItems}
          subtotal="£45"
          reward="£0"
          fee="£0"
          tax="£0"
          total="£45"
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
    backgroundColor: COLORS.background,
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
