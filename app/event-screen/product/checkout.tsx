import { useRouter } from "expo-router";
import { safeBack } from "@/lib/navigation";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { clearCart, getCart, type Cart } from "@/lib/cart";
import { startStripeCheckout } from "@/lib/stripeCheckout";

const BUYER_FEE_STRIPE = 0.10;

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const ProductCheckoutScreen = () => {
  const router = useRouter();
  const [paymentType, setPaymentType] = useState("Online");
  const [payWith, setPayWith] = useState("Card");
  const [agreed, setAgreed] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadCart = async () => {
      try {
        const loadedCart = await getCart();

        if (!isActive) {
          return;
        }

        if (loadedCart.items.length === 0) {
          Alert.alert("Cart is empty", "Add products to your cart before checking out.");
          safeBack(router, '/(tabs)/home');
          return;
        }

        setCart(loadedCart);
      } catch {
        if (!isActive) {
          return;
        }

        Alert.alert("Unable to load cart", "Please try again.");
        safeBack(router, '/(tabs)/home');
      } finally {
        if (isActive) {
          setIsLoadingCart(false);
        }
      }
    };

    void loadCart();

    return () => {
      isActive = false;
    };
  }, [router]);

  const subtotalValue = cart?.subtotalUsd ?? 0;
  const feeValue = roundCurrency(subtotalValue * BUYER_FEE_STRIPE);
  const totalValue = roundCurrency(subtotalValue + feeValue);

  const orderItems = (cart?.items ?? []).map((item) => ({
    name: `${item.product.name} x ${item.quantity}`,
    price: formatCurrency(item.lineTotalUsd),
  }));

  const handleContinue = async () => {
    if (!agreed) {
      Alert.alert("Terms required", "Please accept the refund policy and terms before payment.");
      return;
    }

    if (paymentType !== "Online") {
      Alert.alert("Pay at Door", "Pay at Door checkout is not connected yet.");
      return;
    }

    if (!cart || cart.items.length === 0) {
      Alert.alert("Cart is empty", "Add products to your cart before checking out.");
      return;
    }

    const items = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    setIsPaying(true);

    try {
      await startStripeCheckout({
        kind: "product",
        paymentMethod: payWith === "Apple" ? "apple_pay" : "card",
        items,
        acceptedTerms: agreed,
      });

      await clearCart().catch(() => {});
      router.replace({ pathname: "/event-screen/qr-code", params: { type: "product" } });
    } catch (error) {
      Alert.alert("Payment failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoadingCart) {
    return (
      <View style={[styles.container, styles.centered]}>
        <CheckoutHeader title="Checkout" />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CheckoutHeader title="Checkout" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <PaymentTypeSelector paymentType={paymentType} onTypeChange={setPaymentType} />

        <PaymentMethods payWith={payWith} onMethodChange={setPayWith} />

        <SecurityBanner />

        <OrderSummary
          items={orderItems}
          subtotal={formatCurrency(subtotalValue)}
          reward="$0"
          fee={formatCurrency(feeValue)}
          tax="$0"
          total={formatCurrency(totalValue)}
        />

        <View style={styles.collectionBanner}>
          <Ionicons name="information-circle" size={22} color={COLORS.accentOrange} />
          <Text style={styles.collectionText}>
            Products are collected in person at the event. A QR code will be generated after payment. Present it to the host to receive your items.
          </Text>
        </View>

        <TermsAgreement agreed={agreed} onToggle={() => setAgreed(!agreed)} />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footerWrapper}>
        <CheckoutFooter
          onPress={handleContinue}
          disabled={!agreed || isPaying || !cart}
          loading={isPaying}
        />
      </View>
    </View>
  );
};

export default ProductCheckoutScreen;

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  collectionBanner: {
    backgroundColor: "rgba(255, 107, 61, 0.05)",
    borderColor: "rgba(255, 107, 61, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    padding: 16,
  },
  collectionText: {
    color: COLORS.textMuted,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  footerWrapper: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  scrollContent: {
    padding: 16,
  },
});
