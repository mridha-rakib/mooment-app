import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, commonStyles } from "./constants";

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
  return (
    <View style={styles.container}>
      <Text style={commonStyles.sectionTitle}>Order</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.itemLabel}>{item.name}</Text>
            <Text style={styles.itemValue}>{item.price}</Text>
          </View>
        ))}
        
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>{subtotal}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reward (-)</Text>
          <Text style={styles.value}>{reward}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Platform fee</Text>
          <Text style={styles.value}>{fee}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tax 5%</Text>
          <Text style={styles.value}>{tax}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total}</Text>
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
  card: {
    backgroundColor: COLORS.card,
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
    color: COLORS.text,
    fontSize: 14,
  },
  itemValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginVertical: 4,
    marginBottom: 16,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  value: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
});
