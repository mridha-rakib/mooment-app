import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CheckoutHeader,
  PaymentTypeSelector,
  PaymentMethods,
  SecurityBanner,
  OrderSummary,
  TermsAgreement,
  CheckoutFooter,
  COLORS,
} from "@/components/event/checkout";

const ProductCheckoutScreen = () => {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState("Online");
  const [payWith, setPayWith] = useState("Credits");
  const [agreed, setAgreed] = useState(false);

  const orderItems = [
    { name: "Medusa Skin Care", price: "$45" },
    { name: "Medusa Skin Care", price: "$45" },
  ];

  return (
    <View style={styles.container}>
      <CheckoutHeader title="Checkout" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <PaymentTypeSelector 
          paymentType={paymentType} 
          onTypeChange={setPaymentType} 
        />
        
        <PaymentMethods 
          payWith={payWith} 
          onMethodChange={setPayWith} 
        />

        <SecurityBanner />

        <OrderSummary 
          items={orderItems}
          subtotal="$45"
          reward="$45"
          fee="$45"
          tax="$45"
          total="$45"
        />

        {/* Collection Info - Specific to Product */}
        <View style={styles.collectionBanner}>
          <Ionicons name="information-circle" size={22} color={COLORS.accentOrange} />
          <Text style={styles.collectionText}>
            Products are collected in person at the event. A QR code will be generated after payment. Present it to the host to receive your items
          </Text>
        </View>

        <TermsAgreement 
          agreed={agreed} 
          onToggle={() => setAgreed(!agreed)} 
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footerWrapper}>
        <CheckoutFooter 
          onPress={() => router.push({ pathname: '/event-screen/qr-code', params: { type: "product" } })} 
        />
      </View>
    </View>
  );
};

export default ProductCheckoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
  },
  collectionBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 107, 61, 0.05)",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 61, 0.1)",
  },
  collectionText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  footerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
