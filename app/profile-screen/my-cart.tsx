import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import {
  getCart,
  removeCartItem,
  updateCartItemQuantity,
  type Cart,
  type CartItem,
} from "@/lib/cart";
import { getStorageFileUrl } from "@/lib/storage";

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentRed: "#FF4D4D",
  border: "rgba(255, 255, 255, 0.1)",
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=300&auto=format&fit=crop";

const PLATFORM_FEE_RATE = 0.10;

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const EMPTY_CART: Cart = {
  items: [],
  totalQuantity: 0,
  subtotalUsd: 0,
};

const formatMoney = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const getProductImageUrl = (item: CartItem) => {
  const imageKey = item.product.imageKeys[0];

  if (!imageKey) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  try {
    return getStorageFileUrl(imageKey);
  } catch {
    return FALLBACK_PRODUCT_IMAGE;
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Please try again.";
};

export default function MyCartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setIsLoading(true);

    try {
      setCart(await getCart());
    } catch (error) {
      Alert.alert("Unable to load cart", getErrorMessage(error));
      setCart(EMPTY_CART);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCart();
    }, [loadCart]),
  );

  const handleQuantityChange = async (item: CartItem, nextQuantity: number) => {
    if (nextQuantity < 1 || nextQuantity > item.stockQuantity || updatingProductId) {
      return;
    }

    setUpdatingProductId(item.productId);

    try {
      setCart(await updateCartItemQuantity(item.productId, nextQuantity));
    } catch (error) {
      Alert.alert("Unable to update cart", getErrorMessage(error));
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleRemove = async (item: CartItem) => {
    if (updatingProductId) {
      return;
    }

    setUpdatingProductId(item.productId);

    try {
      setCart(await removeCartItem(item.productId));
    } catch (error) {
      Alert.alert("Unable to remove item", getErrorMessage(error));
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      return;
    }

    router.push("/event-screen/product/checkout");
  };

  const subtotalUsd = cart.subtotalUsd;
  const platformFeeUsd = roundCurrency(subtotalUsd * PLATFORM_FEE_RATE);
  const totalUsd = roundCurrency(subtotalUsd + platformFeeUsd);

  const renderCartItem = (item: CartItem) => {
    const isUpdating = updatingProductId === item.productId;
    const canDecrease = item.quantity > 1 && !isUpdating;
    const canIncrease = item.quantity < item.stockQuantity && !isUpdating;

    return (
      <View key={item.id} style={styles.cartItem}>
        <Image
          source={{ uri: getProductImageUrl(item) }}
          style={styles.itemImage}
          contentFit="cover"
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.product.name}</Text>
          <Text style={styles.itemSeller}>Event product seller</Text>
          <Text style={styles.itemPrice}>{formatMoney(item.unitPriceUsd)}</Text>
          <Text style={styles.stockText}>{item.stockQuantity} in stock</Text>
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            disabled={isUpdating}
            activeOpacity={0.7}
          >
            <Text style={[styles.removeText, isUpdating && styles.disabledText]}>
              {isUpdating ? "Updating..." : "Remove"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.counter}>
          <TouchableOpacity
            style={[styles.counterBtn, !canDecrease && styles.counterBtnDisabled]}
            disabled={!canDecrease}
            onPress={() => handleQuantityChange(item, item.quantity - 1)}
          >
            <Feather name="minus" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.counterBtnActive, !canIncrease && styles.counterBtnDisabled]}
            disabled={!canIncrease}
            onPress={() => handleQuantityChange(item, item.quantity + 1)}
          >
            <Feather name="plus" size={14} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton color={COLORS.text} />
        <Text style={styles.headerTitle}>My Cart ({cart.totalQuantity})</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : cart.items.length === 0 ? (
        <View style={styles.stateContainer}>
          <Feather name="shopping-cart" size={36} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Products added from event pages will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {cart.items.map(renderCartItem)}
        </ScrollView>
      )}

      {/* Price summary — sits above the checkout button */}
      <View style={[styles.summaryContainer, { marginBottom: insets.bottom + 80 }]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatMoney(subtotalUsd)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reward (-)</Text>
            <Text style={styles.summaryValue}>$0</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee</Text>
            <Text style={styles.summaryValue}>{formatMoney(platformFeeUsd)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>$0</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(totalUsd)}</Text>
          </View>
        </View>
      </View>

      {/* Checkout button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.checkoutBtn, cart.items.length === 0 && styles.checkoutBtnDisabled]}
          disabled={cart.items.length === 0 || isLoading}
          onPress={handleCheckout}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  stateContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 280,
  },
  cartItem: {
    alignItems: "center",
    backgroundColor: "rgba(142, 84, 233, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16,
    padding: 12,
  },
  itemImage: {
    borderRadius: 12,
    height: 70,
    marginRight: 12,
    width: 70,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
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
    marginBottom: 6,
  },
  itemPrice: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 3,
  },
  stockText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  removeText: {
    color: COLORS.accentRed,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  disabledText: {
    opacity: 0.55,
  },
  counter: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 12,
    padding: 4,
  },
  counterBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 6,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  counterBtnActive: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 6,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  counterBtnDisabled: {
    opacity: 0.4,
  },
  counterValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 18,
    textAlign: "center",
  },
  summaryContainer: {
    bottom: 0,
    left: 16,
    position: "absolute",
    right: 16,
  },
  summaryCard: {
    backgroundColor: "rgba(19, 19, 26, 0.96)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    height: 1,
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
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
  },
  checkoutBtn: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
  },
  checkoutBtnDisabled: {
    opacity: 0.45,
  },
  checkoutText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
});
