import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

const SecurityBanner = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.success + '0D' }]}>
      <Ionicons name="shield-checkmark" size={20} color={colors.success} />
      <Text style={[styles.text, { color: colors.success }]}>
        Payment held securely until event completes. Released 48hrs after event.
      </Text>
    </View>
  );
};

export default SecurityBanner;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  text: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
