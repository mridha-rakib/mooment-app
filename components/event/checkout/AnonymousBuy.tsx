import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface AnonymousBuyProps {
  active: boolean;
  onToggle: () => void;
}

const AnonymousBuy = ({ active, onToggle }: AnonymousBuyProps) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}
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
    borderRadius: 12,
    minHeight: 58,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  sub: {
    fontSize: 11,
    lineHeight: 16,
  },
});
