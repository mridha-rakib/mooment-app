import { PencilEdit02Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddProductModal from "@/components/profile/AddProductModal";
import BackButton from "@/components/ui/BackButton";
import { deleteProduct, getMyProduct, type Product } from "@/lib/products";
import { safeBack } from "@/lib/navigation";
import { getStorageFileUrl } from "@/lib/storage";

const { width } = Dimensions.get("window");
const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=600";

const formatMoney = (value: number) =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const getProductImageUrl = (imageKey: string) => {
  try {
    return getStorageFileUrl(imageKey);
  } catch {
    return FALLBACK_PRODUCT_IMAGE;
  }
};

const getDiscountedPrice = (product: Product) =>
  product.discountPercent > 0 ? product.priceUsd * (1 - product.discountPercent / 100) : product.priceUsd;

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      if (!productId) {
        setErrorMessage("Product not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProduct = await getMyProduct(productId);

        if (isMounted) {
          setProduct(nextProduct);
          setActiveImageIndex(0);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Unable to load this product.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
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
  const stockLabel = product
    ? product.totalProduct === 1
      ? "1 Product left"
      : `${product.totalProduct} Products left`
    : "";
  const isAvailable = Boolean(product && product.totalProduct > 0);

  const handleImageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveImageIndex(Math.min(Math.max(nextIndex, 0), imageUris.length - 1));
  };

  const handleDelete = () => {
    if (!product) {
      return;
    }

    Alert.alert("Delete product", "This product will be removed from your inventory.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProduct(product.id);
            safeBack(router, '/(tabs)/profile');
          } catch {
            Alert.alert("Unable to delete product", "Please try deleting the product again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity
          style={styles.editBtn}
          disabled={!product}
          onPress={() => setEditModalVisible(true)}
        >
          <View style={[styles.editCircle, !product && styles.disabledAction]}>
            <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#B2ABBA" />
        </View>
      ) : errorMessage || !product ? (
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{errorMessage ?? "Product not found."}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.imageContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleImageScroll}
            >
              {imageUris.map((uri, index) => (
                <Image key={`${uri}-${index}`} source={{ uri }} style={styles.mainImage} resizeMode="cover" />
              ))}
            </ScrollView>
            <View style={styles.indicator}>
              <Text style={styles.indicatorText}>
                {activeImageIndex + 1}/{imageUris.length}
              </Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.topRow}>
              {product.tag ? (
                <View style={styles.tagBox}>
                  <Text style={styles.tagText}>{product.tag}</Text>
                </View>
              ) : (
                <View />
              )}
              <View style={[styles.statusPill, !isAvailable && styles.outOfStockPill]}>
                <View style={[styles.statusDot, !isAvailable && styles.outOfStockDot]} />
                <Text style={[styles.statusText, !isAvailable && styles.outOfStockText]}>
                  {isAvailable ? "Available" : "Out of Stock"}
                </Text>
              </View>
            </View>

            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.description}>{product.description || "No description added."}</Text>

            <View style={styles.stockBox}>
              <Text style={styles.stockText}>{stockLabel}</Text>
            </View>

            <View style={styles.priceRow}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceValue}>{formatMoney(currentPrice)}</Text>
                {hasDiscount ? <Text style={styles.oldPrice}>{formatMoney(product.priceUsd)}</Text> : null}
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <HugeiconsIcon icon={Delete02Icon} size={20} color="#FFFFFF" />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {product ? (
        <AddProductModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSaved={(updatedProduct) => {
            setProduct(updatedProduct);
            setActiveImageIndex(0);
          }}
          initialData={{
            id: product.id,
            name: product.name,
            description: product.description ?? "",
            price: String(product.priceUsd),
            discount: String(product.discountPercent),
            stock: String(product.totalProduct),
            tag: product.tag ?? "",
            images: imageUris,
            imageKeys: product.imageKeys,
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  editBtn: {},
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  editCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  disabledAction: {
    opacity: 0.4,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: "#8E8E9B",
    fontSize: 14,
    textAlign: "center",
  },
  imageContainer: {
    width,
    height: width * 1.1,
    position: "relative",
  },
  mainImage: {
    width,
    height: "100%",
  },
  indicator: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  tagBox: {
    backgroundColor: "#1C1C24",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    color: "#8E8E9B",
    fontSize: 12,
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(45, 180, 109, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  outOfStockPill: {
    backgroundColor: "rgba(255, 75, 75, 0.1)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DB46D",
  },
  outOfStockDot: {
    backgroundColor: "#FF4B4B",
  },
  statusText: {
    color: "#2DB46D",
    fontSize: 12,
    fontWeight: "600",
  },
  outOfStockText: {
    color: "#FF4B4B",
  },
  productName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    color: "#8E8E9B",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
  },
  stockBox: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 30,
  },
  stockText: {
    color: "#0e0d12",
    fontSize: 12,
    fontWeight: "bold",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  priceValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "bold",
  },
  oldPrice: {
    color: "#555",
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D64646",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
