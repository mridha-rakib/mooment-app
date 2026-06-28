import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface PaymentMethodsProps {
  payWith: string;
  onMethodChange: (method: string) => void;
  disabledMethods?: string[];
}

const PaymentMethods = ({ payWith, onMethodChange, disabledMethods = [] }: PaymentMethodsProps) => {
  const { colors, isDark } = useTheme();
  const isDisabled = (method: string) => disabledMethods.includes(method);
  const handlePress = (method: string) => {
    if (!isDisabled(method)) {
      onMethodChange(method);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay with</Text>
      <View style={styles.list}>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card, borderColor: payWith === "Card" ? colors.primary + '33' : 'transparent' }]}
          onPress={() => handlePress("Card")}
          activeOpacity={0.8}
        >
          <View style={[styles.radio, { borderColor: colors.textSecondary }, payWith === "Card" && { borderColor: colors.primary }]}>
            {payWith === "Card" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
          </View>
          <View style={[styles.iconBg, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.background }]}>
            <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>Credit Card</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>Stripe Secure payment</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card, borderColor: payWith === "Apple" ? colors.primary + '33' : 'transparent' }]}
          onPress={() => handlePress("Apple")}
          activeOpacity={0.8}
        >
          <View style={[styles.radio, { borderColor: colors.textSecondary }, payWith === "Apple" && { borderColor: colors.primary }]}>
            {payWith === "Apple" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
          </View>
          <View style={[styles.iconBg, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.background }]}>
            <Ionicons name="logo-apple" size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>Apple Pay</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>Touch ID or Face ID</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentMethods;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  sub: {
    fontSize: 11,
    lineHeight: 16,
  },
});
