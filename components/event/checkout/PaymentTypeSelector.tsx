import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface PaymentTypeSelectorProps {
  paymentType: string;
  onTypeChange: (type: string) => void;
}

const PaymentTypeSelector = ({ paymentType, onTypeChange }: PaymentTypeSelectorProps) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.item}
        onPress={() => onTypeChange("Online")}
        activeOpacity={0.8}
      >
        <View style={[styles.radio, { borderColor: colors.textSecondary }, paymentType === "Online" && { borderColor: colors.primary }]}>
          {paymentType === "Online" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[styles.text, { color: colors.text }]}>Online Pay</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.item}
        onPress={() => onTypeChange("Door")}
        activeOpacity={0.8}
      >
        <View style={[styles.radio, { borderColor: colors.textSecondary }, paymentType === "Door" && { borderColor: colors.primary }]}>
          {paymentType === "Door" && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
        </View>
        <Text style={[styles.text, { color: colors.text }]}>Pay at Door</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PaymentTypeSelector;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 18,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
