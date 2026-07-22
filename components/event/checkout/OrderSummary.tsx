import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface OrderItem {
  name: string;
  price: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: string;
  reward: string;
  fee: string;
  tax: string;
  total: string;
}

const OrderSummary = ({ items, subtotal, reward, fee, tax, total }: OrderSummaryProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Order</Text>
      <View style={[styles.card, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
        {items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.itemLabel, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.itemValue, { color: colors.text }]}>{item.price}</Text>
          </View>
        ))}
        
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Subtotal</Text>
          <Text style={[styles.value, { color: colors.text }]}>{subtotal}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Reward (-)</Text>
          <Text style={[styles.value, { color: colors.text }]}>{reward}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Platform fee</Text>
          <Text style={[styles.value, { color: colors.text }]}>{fee}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Tax</Text>
          <Text style={[styles.value, { color: colors.text }]}>{tax}</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{total}</Text>
        </View>
      </View>
    </View>
  );
};

export default OrderSummary;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 22,
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  itemValue: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginTop: 2,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 24,
  },
});
