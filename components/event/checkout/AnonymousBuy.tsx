import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "./constants";

interface AnonymousBuyProps {
  active: boolean;
  onToggle: () => void;
}

const AnonymousBuy = ({ active, onToggle }: AnonymousBuyProps) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, active && styles.checkboxActive]}>
        {active && <Feather name="check" size={14} color="#FFF" />}
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>Anonymous Buy</Text>
        <Text style={styles.sub}>Keep my identity hidden from public view.</Text>
      </View>
    </TouchableOpacity>
  );
};

export default AnonymousBuy;

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.accentPurple,
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  sub: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
