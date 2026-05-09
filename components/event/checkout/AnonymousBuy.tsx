import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface AnonymousBuyProps {
  active: boolean;
  onToggle: () => void;
}

const AnonymousBuy = ({ active, onToggle }: AnonymousBuyProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, { backgroundColor: colors.background }, active && { backgroundColor: colors.primary }]}>
        {active && <Feather name="check" size={14} color={colors.background} />}
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>Anonymous Buy</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Keep my identity hidden from public view.</Text>
      </View>
    </TouchableOpacity>
  );
};

export default AnonymousBuy;

const styles = StyleSheet.create({
  container: {
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
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  sub: {
    fontSize: 12,
  },
});
