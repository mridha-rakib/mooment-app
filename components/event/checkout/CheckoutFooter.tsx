import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "./constants";

interface CheckoutFooterProps {
  onPress: () => void;
  buttonText?: string;
}

const CheckoutFooter = ({ onPress, buttonText = "Continue to payment" }: CheckoutFooterProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity 
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Text style={styles.text}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckoutFooter;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: COLORS.background,
  },
  button: {
    backgroundColor: "#B3A7C2", // Light grayish purple as seen in image
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  text: {
    color: "#1c1b20",
    fontSize: 16,
    fontWeight: "bold",
  },
});
