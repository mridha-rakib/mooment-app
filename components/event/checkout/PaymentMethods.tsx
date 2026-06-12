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
  const { colors } = useTheme();
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
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: payWith === "Credits" ? colors.primary + '33' : 'transparent' },
            isDisabled("Credits") && styles.disabledCard,
          ]}
          onPress={() => handlePress("Credits")}
          disabled={isDisabled("Credits")}
          activeOpacity={0.8}
        >
          <View style={[styles.radio, { borderColor: colors.textSecondary }, payWith === "Credits" && { borderColor: colors.primary }]}>
            {payWith === "Credits" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
          </View>
          <View style={[styles.iconBg, { backgroundColor: colors.background }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>Mooment Credits</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>Coming soon</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.card, borderColor: payWith === "Card" ? colors.primary + '33' : 'transparent' }]}
          onPress={() => handlePress("Card")}
          activeOpacity={0.8}
        >
          <View style={[styles.radio, { borderColor: colors.textSecondary }, payWith === "Card" && { borderColor: colors.primary }]}>
            {payWith === "Card" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
          </View>
          <View style={[styles.iconBg, { backgroundColor: colors.background }]}>
            <Ionicons name="card-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]}>Credit Card</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>Stripe Secure payment</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.card, borderColor: payWith === "Apple" ? colors.primary + '33' : 'transparent' }]}
          onPress={() => handlePress("Apple")}
          activeOpacity={0.8}
        >
          <View style={[styles.radio, { borderColor: colors.textSecondary }, payWith === "Apple" && { borderColor: colors.primary }]}>
            {payWith === "Apple" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
          </View>
          <View style={[styles.iconBg, { backgroundColor: colors.background }]}>
            <Ionicons name="logo-apple" size={20} color={colors.text} />
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 16,
    borderWidth: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
  },
  disabledCard: {
    opacity: 0.45,
  },
});
