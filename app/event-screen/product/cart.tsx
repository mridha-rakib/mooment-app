import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentRed: "#FF4D4D",
  border: "rgba(255, 255, 255, 0.1)",
};

const CART_ITEMS = [
  {
    id: "1",
    title: "Medusa Skin Whitening Cream",
    seller: "@df_koko",
    price: "£28",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=200&auto=format&fit=crop",
    quantity: 1,
  },
  {
    id: "2",
    title: "Medusa Skin Whitening Cream",
    seller: "@df_koko",
    price: "£28",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=200&auto=format&fit=crop",
    quantity: 1,
  },
];

const CartScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton color={COLORS.text} />
        <Text style={styles.headerTitle}>My Cart</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cart Items */}
        {CART_ITEMS.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <Image source={{ uri: item.image }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSeller}>{item.seller}</Text>
              <Text style={styles.itemPrice}>{item.price}</Text>
              <TouchableOpacity>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn}>
                <Feather name="minus" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{item.quantity}</Text>
              <TouchableOpacity style={styles.counterBtnActive}>
                <Feather name="plus" size={14} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Summary Section */}
      <View style={[styles.summaryContainer, { marginBottom: insets.bottom + 80 }]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reward (-)</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax 5%</Text>
            <Text style={styles.summaryValue}>$45</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>$45</Text>
          </View>
        </View>
      </View>

      {/* Checkout Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity 
          style={styles.checkoutBtn}
          onPress={() => router.push("/event-screen/product/checkout")}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CartScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 250,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "rgba(142, 84, 233, 0.05)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  itemSeller: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  itemPrice: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  removeText: {
    color: COLORS.accentRed,
    fontSize: 12,
    fontWeight: "600",
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 4,
    gap: 12,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnActive: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  summaryContainer: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
  },
  summaryCard: {
    backgroundColor: "rgba(19, 19, 26, 0.8)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 12,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  checkoutText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
});
