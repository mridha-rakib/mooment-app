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
    gap: 32,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});
