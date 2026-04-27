import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, commonStyles } from "./constants";

interface PaymentMethodsProps {
  payWith: string;
  onMethodChange: (method: string) => void;
}

const PaymentMethods = ({ payWith, onMethodChange }: PaymentMethodsProps) => {
  return (
    <View style={styles.container}>
      <Text style={commonStyles.sectionTitle}>Pay with</Text>
      <View style={styles.list}>
        <TouchableOpacity 
          style={[styles.card, payWith === "Credits" && styles.cardActive]}
          onPress={() => onMethodChange("Credits")}
          activeOpacity={0.8}
        >
          <View style={[commonStyles.radio, payWith === "Credits" && commonStyles.radioActive]}>
            {payWith === "Credits" && <View style={commonStyles.radioInner} />}
          </View>
          <View style={styles.iconBg}>
            <Ionicons name="wallet-outline" size={20} color={COLORS.text} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>Mooment Credits</Text>
            <Text style={styles.sub}>Balance: $120.00</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, payWith === "Card" && styles.cardActive]}
          onPress={() => onMethodChange("Card")}
          activeOpacity={0.8}
        >
          <View style={[commonStyles.radio, payWith === "Card" && commonStyles.radioActive]}>
            {payWith === "Card" && <View style={commonStyles.radioInner} />}
          </View>
          <View style={styles.iconBg}>
            <Ionicons name="card-outline" size={20} color={COLORS.text} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>Credit Card</Text>
            <Text style={styles.sub}>Stripe Secure payment</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, payWith === "Apple" && styles.cardActive]}
          onPress={() => onMethodChange("Apple")}
          activeOpacity={0.8}
        >
          <View style={[commonStyles.radio, payWith === "Apple" && commonStyles.radioActive]}>
            {payWith === "Apple" && <View style={commonStyles.radioInner} />}
          </View>
          <View style={styles.iconBg}>
            <Ionicons name="logo-apple" size={20} color={COLORS.text} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>Apple Pay</Text>
            <Text style={styles.sub}>Touch ID or Face ID</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentMethods;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardActive: {
    borderColor: "rgba(142, 84, 233, 0.2)",
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  sub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
