import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

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
    <View style={[styles.container, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }, (disabled || loading) && styles.disabledButton]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={[styles.text, { color: colors.background }]}>{buttonText}</Text>
        )}
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
  disabledButton: {
    opacity: 0.55,
  },
});
