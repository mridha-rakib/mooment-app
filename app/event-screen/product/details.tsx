import { Feather, Ionicons } from "@expo/vector-icons";
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
  accentPurple: "#8E54E9",
  accentOrange: "#FF6B3D",
  accentGreen: "#16D869",
  accentRed: "#FF4D4D",
  border: "rgba(255, 255, 255, 0.1)",
};

const ProductDetailsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderHeader = () => (
    <View style={[styles.headerActions, { top: insets.top + 10 }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.headerBtn}
        activeOpacity={0.8}
      >
        <Feather name="chevron-left" size={24} color={COLORS.text} />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>Product Details</Text>

      <View style={styles.headerRight}>
        <TouchableOpacity 
          style={styles.headerBtn}
          onPress={() => router.push("/event-screen/product/cart")}
        >
          <Feather name="shopping-cart" size={20} color={COLORS.text} />
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>2</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8}>
          <Feather name="more-horizontal" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000&auto=format&fit=crop",
            }}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.indicatorBadge}>
            <Text style={styles.indicatorText}>1/3</Text>
          </View>
        </View>

        <View style={styles.contentPadding}>
          {/* Tags Row */}
          <View style={styles.tagsRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>Skin Care</Text>
            </View>
            <View style={styles.availableTag}>
              <View style={styles.greenDot} />
              <Text style={styles.availableTagText}>Available</Text>
            </View>
          </View>

          {/* Title & Short Description */}
          <Text style={styles.productTitle}>Medusa Skin Whitening Cream</Text>
          <Text style={styles.shortDescription}>
            Premium skin brightening cream with Arbutin, Niacinamide & Hyaluronic
            Acid. For all skin types. Present QR code at event to collect.
          </Text>

          {/* Seller Section */}
          <TouchableOpacity style={styles.sellerCard}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
              }}
              style={styles.sellerAvatar}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>Dj Koko</Text>
              <Text style={styles.sellerStats}>
                @dj_koko <Text style={styles.dot}>•</Text> 12K followers{" "}
                <Text style={styles.dot}>•</Text> 48 events
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterBtn}>
                <Feather name="minus" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>1</Text>
              <TouchableOpacity style={styles.counterBtnActive}>
                <Feather name="plus" size={14} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer / Add to Cart */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.footerPriceRow}>
          <Text style={styles.currentPrice}>£28</Text>
          <Text style={styles.oldPrice}>£32</Text>
        </View>
        <TouchableOpacity 
          style={styles.addToCartBtn}
          onPress={() => router.push("/event-screen/product/cart")}
        >
          <Feather name="plus" size={18} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProductDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerActions: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.accentRed,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  imageContainer: {
    width: width,
    height: width * 1.2,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  indicatorBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indicatorText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "bold",
  },
  contentPadding: {
    padding: 20,
  },
  tagsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryTag: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryTagText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  availableTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentGreen,
  },
  availableTagText: {
    color: COLORS.accentGreen,
    fontSize: 12,
    fontWeight: "bold",
  },
  productTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  shortDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 24,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
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
  dot: {
    fontSize: 14,
  },
  quantitySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 4,
    gap: 16,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnActive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  footerPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  currentPrice: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "bold",
  },
  oldPrice: {
    color: COLORS.textMuted,
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  addToCartBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addToCartText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "bold",
  },
});
