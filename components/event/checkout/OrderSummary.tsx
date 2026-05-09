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
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Order</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
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
          <Text style={[styles.label, { color: colors.textSecondary }]}>Tax 5%</Text>
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 14,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    marginVertical: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: "bold",
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
