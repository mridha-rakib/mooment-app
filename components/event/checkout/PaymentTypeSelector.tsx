import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, commonStyles } from "./constants";

interface PaymentTypeSelectorProps {
  paymentType: string;
  onTypeChange: (type: string) => void;
}

const PaymentTypeSelector = ({ paymentType, onTypeChange }: PaymentTypeSelectorProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.item}
        onPress={() => onTypeChange("Online")}
        activeOpacity={0.8}
      >
        <View style={[commonStyles.radio, paymentType === "Online" && commonStyles.radioActive]}>
          {paymentType === "Online" && <View style={commonStyles.radioInner} />}
        </View>
        <Text style={styles.text}>Online Pay</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.item}
        onPress={() => onTypeChange("Door")}
        activeOpacity={0.8}
      >
        <View style={[commonStyles.radio, paymentType === "Door" && commonStyles.radioActive]}>
          {paymentType === "Door" && <View style={commonStyles.radioInner} />}
        </View>
        <Text style={styles.text}>Pay at Door</Text>
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
  text: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
});
