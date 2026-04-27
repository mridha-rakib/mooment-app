import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "./constants";

const SecurityBanner = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="shield-checkmark" size={20} color={COLORS.accentGreen} />
      <Text style={styles.text}>
        Payment held securely until event completes. Released 48hrs after event.
      </Text>
    </View>
  );
};

export default SecurityBanner;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(22, 216, 105, 0.05)",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  text: {
    flex: 1,
    color: COLORS.accentGreen,
    fontSize: 12,
    lineHeight: 18,
  },
});
