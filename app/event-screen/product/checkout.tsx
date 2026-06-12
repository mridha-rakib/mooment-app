import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
import { startStripeCheckout } from "@/lib/stripeCheckout";

const parsePositiveInteger = (value: string | string[] | undefined, fallback = 1) => {
  const source = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(source ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parsePrice = (value: string | string[] | undefined, fallback = 45) => {
  const source = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseFloat(source ?? "");

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getParam = (value: string | string[] | undefined, fallback: string) => {
  const source = Array.isArray(value) ? value[0] : value;

  return source?.trim() || fallback;
};

const formatCurrency = (value: number) =>
  `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const ProductCheckoutScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    productPrice?: string;
    quantity?: string;
  }>();
  const [paymentType, setPaymentType] = useState("Online");
  const [payWith, setPayWith] = useState("Card");
  const [agreed, setAgreed] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const productId = typeof params.productId === "string" ? params.productId : "";
  const productName = getParam(params.productName, "Medusa Skin Care");
  const quantity = parsePositiveInteger(params.quantity);
  const productPrice = parsePrice(params.productPrice);
  const total = productPrice * quantity;
  const orderItems = [
    { name: `${productName} x ${quantity}`, price: formatCurrency(total) },
  ];

  const handleContinue = async () => {
    if (!agreed) {
      Alert.alert("Terms required", "Please accept the refund policy and terms before payment.");
      return;
    }

    if (paymentType !== "Online") {
      Alert.alert("Pay at Door", "Pay at Door checkout is not connected yet.");
      return;
    }

    if (payWith !== "Card" && payWith !== "Apple") {
      Alert.alert("Coming soon", "Mooment Credits will be available later. Please use card or Apple Pay.");
      return;
    }

    setIsPaying(true);

    try {
      await startStripeCheckout(
        productId
          ? {
              kind: "product",
              paymentMethod: payWith === "Apple" ? "apple_pay" : "card",
              items: [{ productId, quantity }],
              acceptedTerms: agreed,
            }
          : {
              kind: "custom",
              paymentMethod: payWith === "Apple" ? "apple_pay" : "card",
              items: [{ name: productName, amount: productPrice, quantity }],
              acceptedTerms: agreed,
            },
      );

      router.replace({ pathname: "/event-screen/qr-code", params: { type: "product" } });
    } catch (error) {
      Alert.alert("Payment failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

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
          disabledMethods={["Credits"]}
        />

        <SecurityBanner />

        <OrderSummary 
          items={orderItems}
          subtotal={formatCurrency(total)}
          reward="£0"
          fee="£0"
          tax="£0"
          total={formatCurrency(total)}
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
          onPress={handleContinue}
          disabled={!agreed || isPaying}
          loading={isPaying}
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
