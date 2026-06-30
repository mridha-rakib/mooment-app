import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addCartItem, getCart } from "@/lib/cart";
import { getPublishedProduct, type Product } from "@/lib/products";
import { getStorageFileUrl } from "@/lib/storage";
import UserAvatar from "@/components/ui/UserAvatar";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentGreen: "#16D869",
  accentRed: "#FF4D4D",
  border: "rgba(255, 255, 255, 0.1)",
};

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=900&auto=format&fit=crop";

const formatMoney = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const getProductImageUrl = (imageKey?: string | null) => {
  if (!imageKey) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  try {
    return getStorageFileUrl(imageKey);
  } catch {
    return FALLBACK_PRODUCT_IMAGE;
  }
};

const getDiscountedPrice = (product: Product) =>
  product.discountPercent > 0 ? product.priceUsd * (1 - product.discountPercent / 100) : product.priceUsd;

const EventProductDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string; hostName?: string; hostAvatar?: string }>();
  const insets = useSafeAreaInsets();
  const productId = typeof params.productId === "string" ? params.productId : null;
  const hostName = typeof params.hostName === "string" && params.hostName.trim() ? params.hostName : "Event creator";
  const hostAvatar = typeof params.hostAvatar === "string" && params.hostAvatar.trim() ? params.hostAvatar : null;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [cartProductQuantity, setCartProductQuantity] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isOpeningCart, setIsOpeningCart] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadProduct = async () => {
      if (!productId) {
        setErrorMessage("Product not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProduct = await getPublishedProduct(productId);

        if (isActive) {
          setProduct(nextProduct);
          setActiveImageIndex(0);
          setQuantity(1);
        }
      } catch {
        if (isActive) {
          setErrorMessage("Unable to load this product.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isActive = false;
    };
  }, [productId]);

  const imageUris = useMemo(() => {
    if (!product?.imageKeys.length) {
      return [FALLBACK_PRODUCT_IMAGE];
    }

    return product.imageKeys.map(getProductImageUrl);
  }, [product?.imageKeys]);

  const currentPrice = product ? getDiscountedPrice(product) : 0;
  const hasDiscount = Boolean(product && product.discountPercent > 0);
  const isAvailable = Boolean(product && product.totalProduct > 0);
  const maxQuantity = Math.max(product?.totalProduct ?? 1, 1);
  const remainingStock = Math.max(maxQuantity - cartProductQuantity, 0);
  const maxSelectableQuantity = Math.max(remainingStock, 1);
  const canAddToCart = isAvailable && remainingStock > 0;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getCart()
        .then((cart) => {
          if (isActive) {
            setCartCount(cart.totalQuantity);
            setCartProductQuantity(
              cart.items.find((item) => item.productId === productId)?.quantity ?? 0,
            );
          }
        })
        .catch(() => {
          if (isActive) {
            setCartCount(0);
            setCartProductQuantity(0);
          }
        });

      return () => {
        isActive = false;
      };
    }, [productId]),
  );

  useEffect(() => {
    setQuantity((value) => Math.min(value, maxSelectableQuantity));
  }, [maxSelectableQuantity]);

  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(Math.min(Math.max(nextIndex, 0), imageUris.length - 1));
  };

  const handleAddToCart = async () => {
    if (!product || !canAddToCart || isAddingToCart) {
      return;
    }

    setIsAddingToCart(true);

    try {
      const cart = await addCartItem(product.id, quantity);
      setCartCount(cart.totalQuantity);
      setCartProductQuantity(cart.items.find((item) => item.productId === product.id)?.quantity ?? 0);
      router.push("/event-screen/product/cart");
    } catch (error) {
      Alert.alert("Unable to add item", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleOpenCart = async () => {
    if (isOpeningCart) {
      return;
    }

    setIsOpeningCart(true);

    try {
      const cart = await getCart();
      setCartCount(cart.totalQuantity);
      setCartProductQuantity(
        product ? cart.items.find((item) => item.productId === product.id)?.quantity ?? 0 : 0,
      );
      router.push("/event-screen/product/cart");
    } catch (error) {
      Alert.alert("Unable to open cart", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsOpeningCart(false);
    }
  };

  const renderHeader = () => (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0, 0, 0, 0.52)", "rgba(0, 0, 0, 0.22)", "rgba(0, 0, 0, 0)"]}
        locations={[0, 0.55, 1]}
        style={[styles.headerScrim, { height: insets.top + 92 }]}
      />
      <View pointerEvents="box-none" style={[styles.headerActions, { top: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.8}
          hitSlop={10}
        >
          <Feather name="chevron-left" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <Text pointerEvents="none" style={styles.headerTitle}>Product Details</Text>

        <View pointerEvents="box-none" style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleOpenCart}
            activeOpacity={0.8}
            hitSlop={10}
            disabled={isOpeningCart}
          >
            {isOpeningCart ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <Feather name="shopping-cart" size={20} color={COLORS.text} />
            )}
            {cartCount > 0 && (
              <View pointerEvents="none" style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} hitSlop={10}>
            <Feather name="more-horizontal" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : errorMessage || !product ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{errorMessage ?? "Product not found."}</Text>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.imageContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleImageScroll}
              >
                {imageUris.map((uri, index) => (
                  <Image key={`${uri}-${index}`} source={{ uri }} style={styles.heroImage} contentFit="cover" />
                ))}
              </ScrollView>
              <View style={styles.indicatorBadge}>
                <Text style={styles.indicatorText}>{activeImageIndex + 1}/{imageUris.length}</Text>
              </View>
            </View>

            <View style={styles.contentPadding}>
              <View style={styles.availabilityRow}>
                <View style={[styles.availableTag, !isAvailable && styles.unavailableTag]}>
                  <View style={[styles.greenDot, !isAvailable && styles.redDot]} />
                  <Text style={[styles.availableTagText, !isAvailable && styles.unavailableTagText]}>
                    {isAvailable ? "Available" : "Out of Stock"}
                  </Text>
                </View>
              </View>

              <Text style={styles.productTitle}>{product.name}</Text>
              <Text style={styles.shortDescription}>
                {product.description || "Product details provided by the event creator. Present QR code at event to collect."}
              </Text>

              <TouchableOpacity style={styles.sellerCard} activeOpacity={0.85}>
                <UserAvatar uri={hostAvatar} name={hostName} size={46} style={styles.sellerAvatar} />
                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerName}>{hostName}</Text>
                  <Text style={styles.sellerStats}>Event product seller</Text>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>

              <View style={styles.quantitySection}>
                <Text style={styles.quantityLabel}>Quantity</Text>
                <View style={styles.counter}>
                  <TouchableOpacity
                    style={[styles.counterBtn, quantity <= 1 && styles.counterBtnDisabled]}
                    disabled={quantity <= 1}
                    onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                  >
                    <Feather name="minus" size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={[styles.counterBtnActive, quantity >= maxSelectableQuantity && styles.counterBtnDisabled]}
                    disabled={quantity >= maxSelectableQuantity}
                    onPress={() => setQuantity((value) => Math.min(maxSelectableQuantity, value + 1))}
                  >
                    <Feather name="plus" size={14} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.footerPriceRow}>
              <Text style={styles.currentPrice}>{formatMoney(currentPrice)}</Text>
              {hasDiscount && <Text style={styles.oldPrice}>{formatMoney(product.priceUsd)}</Text>}
            </View>
            <TouchableOpacity
              style={[styles.addToCartBtn, !canAddToCart && styles.disabledButton]}
              disabled={!canAddToCart || isAddingToCart}
              onPress={handleAddToCart}
            >
              {isAddingToCart ? (
                <ActivityIndicator color="#000000" size="small" style={{ marginRight: 8 }} />
              ) : (
                <Feather name="plus" size={18} color="#000000" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.addToCartText}>
                {isAddingToCart ? "Adding..." : canAddToCart ? "Add to Cart" : "Max in Cart"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default EventProductDetailsScreen;

const styles = StyleSheet.create({
  addToCartBtn: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addToCartText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "bold",
  },
  availabilityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  availableTag: {
    alignItems: "center",
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  availableTagText: {
    color: COLORS.accentGreen,
    fontSize: 12,
    fontWeight: "bold",
  },
  cartBadge: {
    alignItems: "center",
    backgroundColor: COLORS.accentRed,
    borderColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    paddingHorizontal: 4,
    position: "absolute",
    right: -3,
    top: -3,
  },
  cartBadgeText: {
    color: COLORS.text,
    fontSize: 8,
    fontWeight: "bold",
  },
  container: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  contentPadding: {
    padding: 20,
  },
  counter: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 16,
    padding: 4,
  },
  counterBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  counterBtnActive: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  counterBtnDisabled: {
    opacity: 0.45,
  },
  counterValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  currentPrice: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.45,
  },
  errorText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    position: "absolute",
    right: 0,
  },
  footerPriceRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 8,
  },
  greenDot: {
    backgroundColor: COLORS.accentGreen,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  headerActions: {
    alignItems: "center",
    elevation: 20,
    flexDirection: "row",
    height: 40,
    justifyContent: "space-between",
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
  headerBtn: {
    alignItems: "center",
    backgroundColor: "rgba(14, 13, 18, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    width: 40,
    elevation: 6,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerScrim: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 9,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
    left: 56,
    position: "absolute",
    right: 56,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  heroImage: {
    height: "100%",
    width,
  },
  imageContainer: {
    height: width * 1.2,
    position: "relative",
    width,
  },
  indicatorBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
    right: 20,
    top: 20,
  },
  indicatorText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "bold",
  },
  oldPrice: {
    color: COLORS.textMuted,
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  productTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  quantityLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  quantitySection: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  redDot: {
    backgroundColor: COLORS.accentRed,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sellerAvatar: {
    borderRadius: 24,
    height: 48,
    marginRight: 12,
    width: 48,
  },
  sellerCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 24,
    padding: 14,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  sellerStats: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  shortDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  stateContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  unavailableTag: {
    backgroundColor: "rgba(255, 77, 77, 0.1)",
  },
  unavailableTagText: {
    color: COLORS.accentRed,
  },
});
