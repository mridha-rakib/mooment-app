import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentPurple: "#8E54E9",
  accentOrange: "#FF6B3D",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.1)",
};

const CheckoutScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [paymentType, setPaymentType] = useState("Online");
  const [payWith, setPayWith] = useState("Credits");
  const [agreed, setAgreed] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Payment Type Selector */}
        <View style={styles.paymentTypeRow}>
          <TouchableOpacity 
            style={styles.typeItem}
            onPress={() => setPaymentType("Online")}
          >
            <View style={[styles.radio, paymentType === "Online" && styles.radioActive]}>
              {paymentType === "Online" && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.typeText}>Online Pay</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.typeItem}
            onPress={() => setPaymentType("Door")}
          >
            <View style={[styles.radio, paymentType === "Door" && styles.radioActive]}>
              {paymentType === "Door" && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.typeText}>Pay at Door</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Pay with</Text>
        
        {/* Payment Methods */}
        <View style={styles.methodsContainer}>
          <TouchableOpacity 
            style={[styles.methodCard, payWith === "Credits" && styles.methodCardActive]}
            onPress={() => setPayWith("Credits")}
          >
            <View style={[styles.radio, payWith === "Credits" && styles.radioActive]}>
              {payWith === "Credits" && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodIconBg}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.text} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>Mooment Credits</Text>
              <Text style={styles.methodSub}>Balance: $120.00</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodCard, payWith === "Card" && styles.methodCardActive]}
            onPress={() => setPayWith("Card")}
          >
            <View style={[styles.radio, payWith === "Card" && styles.radioActive]}>
              {payWith === "Card" && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodIconBg}>
              <Ionicons name="card-outline" size={20} color={COLORS.text} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>Credit Card</Text>
              <Text style={styles.methodSub}>Stripe Secure payment</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodCard, payWith === "Apple" && styles.methodCardActive]}
            onPress={() => setPayWith("Apple")}
          >
            <View style={[styles.radio, payWith === "Apple" && styles.radioActive]}>
              {payWith === "Apple" && <View style={styles.radioInner} />}
            </View>
            <View style={styles.methodIconBg}>
              <Ionicons name="logo-apple" size={20} color={COLORS.text} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodName}>Apple Pay</Text>
              <Text style={styles.methodSub}>Touch ID or Face ID</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security Banner */}
        <View style={styles.securityBanner}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.accentGreen} />
          <Text style={styles.securityText}>
            Payment held securely until event completes. Released 48hrs after event.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Order</Text>
        
        {/* Order Summary Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderItem}>
            <Text style={styles.orderItemName}>Medusa Skin Care</Text>
            <Text style={styles.orderItemPrice}>$45</Text>
          </View>
          <View style={styles.orderItem}>
            <Text style={styles.orderItemName}>Medusa Skin Care</Text>
            <Text style={styles.orderItemPrice}>$45</Text>
          </View>
          
          <View style={styles.orderDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reward (-)</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax 5%</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>

          <View style={styles.orderDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>$45</Text>
          </View>
        </View>

        {/* Collection Info */}
        <View style={styles.collectionBanner}>
          <Ionicons name="information-circle" size={22} color={COLORS.accentOrange} />
          <Text style={styles.collectionText}>
            Products are collected in person at the event. A QR code will be generated after payment. Present it to the host to receive your items
          </Text>
        </View>

        {/* Terms Agreement */}
        <TouchableOpacity 
          style={styles.termsRow}
          onPress={() => setAgreed(!agreed)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Feather name="check" size={12} color="#000" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.link}>Refund & Escrow Policy</Text> and <Text style={styles.link}>Terms & Conditions</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.paymentBtn}>
          <Text style={styles.paymentBtnText}>Continue to payment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CheckoutScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
  },
  paymentTypeRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 24,
  },
  typeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: COLORS.accentPurple,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentPurple,
  },
  typeText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
  },
  methodsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  methodCardActive: {
    borderColor: "rgba(142, 84, 233, 0.3)",
  },
  methodIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  methodSub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  securityBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
    alignItems: "center",
  },
  securityText: {
    flex: 1,
    color: COLORS.accentGreen,
    fontSize: 12,
    lineHeight: 18,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderItemName: {
    color: COLORS.text,
    fontSize: 14,
  },
  orderItemPrice: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  orderDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
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
  termsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    paddingRight: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: COLORS.text,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  paymentBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  paymentBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
});
