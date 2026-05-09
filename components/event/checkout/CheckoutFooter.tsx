import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

interface CheckoutFooterProps {
  onPress: () => void;
  buttonText?: string;
}

const CheckoutFooter = ({ onPress, buttonText = "Continue to payment" }: CheckoutFooterProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <Text style={[styles.text, { color: colors.background }]}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CheckoutFooter;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
