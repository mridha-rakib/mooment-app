import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
interface CheckoutFooterProps {
  onPress: () => void;
  buttonText?: string;
  disabled?: boolean;
  loading?: boolean;
}

const CheckoutFooter = ({
  onPress,
  buttonText = "Continue to payment",
  disabled = false,
  loading = false,
}: CheckoutFooterProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: buttonBackground(colors) }, (disabled || loading) && styles.disabledButton]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={buttonForeground(colors)} />
        ) : (
          <Text style={[styles.text, { color: buttonForeground(colors) }]}>{buttonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default CheckoutFooter;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.55,
  },
});
