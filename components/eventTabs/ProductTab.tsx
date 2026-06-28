import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { getPublishedProductsByUser, type Product } from "@/lib/products";
import { getStorageFileUrl } from "@/lib/storage";
import type { EventHost } from "@/lib/events";
import MoreMenuModal from "../post/MoreMenuModal";
import UserAvatar from "../ui/UserAvatar";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=700&auto=format&fit=crop";

type ProductTabProps = {
  creatorId?: string | null;
  host?: EventHost | null;
  isHostMode?: boolean;
};

type ProductCardProps = {
  product: Product;
  host?: EventHost | null;
  isHostMode?: boolean;
};

function resolveStorageUrl(key?: string | null): string;
function resolveStorageUrl(key: string | null | undefined, fallback: string): string;
function resolveStorageUrl(key: string | null | undefined, fallback: null): string | null;
function resolveStorageUrl(key?: string | null, fallback: string | null = FALLBACK_PRODUCT_IMAGE) {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
}

const formatPrice = (product: Product) => {
  const price = product.discountPercent > 0
    ? product.priceUsd * (1 - product.discountPercent / 100)
    : product.priceUsd;

  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const getHostName = (host?: EventHost | null) => host?.name?.trim() || "Event creator";

const getHostAvatar = (host?: EventHost | null) => {
  if (host?.avatarUrl?.trim()) {
    return host.avatarUrl.trim();
  }

  return host?.avatarKey ? resolveStorageUrl(host.avatarKey, null) : null;
};

const ProductCard = ({ product, host, isHostMode = false }: ProductCardProps) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreBtnRef = useRef<View>(null);
  const [menuTop, setMenuTop] = useState(0);
  const imageUri = useMemo(
    () => resolveStorageUrl(product.imageKeys[0], FALLBACK_PRODUCT_IMAGE),
    [product.imageKeys],
  );
  const hostAvatarUri = getHostAvatar(host);
  const imageCount = Math.max(1, product.imageKeys.length);

  const handleMorePress = () => {
    moreBtnRef.current?.measure((x, y, measuredWidth, height, pageX, pageY) => {
      setMenuTop(pageY + height);
      setShowMoreMenu(true);
    });
  };

  return (
    <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <UserAvatar uri={hostAvatarUri} name={getHostName(host)} size={36} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{getHostName(host)}</Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>Published product</Text>
        </View>

        <View style={styles.postHeaderActions}>
          {!isHostMode && (
            <TouchableOpacity
              style={[styles.followBtn, { borderColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={12} color={colors.primary} />
              <Text style={[styles.followBtnText, { color: colors.primary }]}>Follow</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            ref={moreBtnRef}
            style={styles.moreBtn}
            onPress={handleMorePress}
          >
            <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUri }} style={styles.productImage} contentFit="cover" />
        <View style={styles.indicatorBadge}>
          <Text style={styles.indicatorText}>1/{imageCount}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Text style={[styles.productTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={[styles.productPrice, { color: colors.text }]}>{formatPrice(product)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }]}
          onPress={() =>
            router.push({
              pathname: "/event-screen/product/details",
              params: {
                productId: product.id,
                ...(hostAvatarUri ? { hostAvatar: hostAvatarUri } : {}),
                hostName: getHostName(host),
              },
            })
          }
        >
          <Text style={[styles.viewBtnText, { color: colors.text }]}>View</Text>
        </TouchableOpacity>
      </View>

      <MoreMenuModal
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        top={menuTop}
        onReport={() => console.log("Report product")}
        onSave={() => console.log("Save product")}
      />
    </View>
  );
};

const ProductTab = ({ creatorId, host, isHostMode = false }: ProductTabProps) => {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadProducts = async () => {
      if (!creatorId) {
        setProducts([]);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextProducts = await getPublishedProductsByUser(creatorId);

        if (isActive) {
          setProducts(nextProducts);
        }
      } catch {
        if (isActive) {
          setProducts([]);
          setErrorMessage("Unable to load products.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      isActive = false;
    };
  }, [creatorId]);

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.stateTitle, { color: colors.text }]}>Products unavailable</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>{errorMessage}</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={[styles.stateTitle, { color: colors.text }]}>No products yet</Text>
        <Text style={[styles.stateText, { color: colors.textSecondary }]}>
          Published products from this event creator will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 20 }}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} host={host} isHostMode={isHostMode} />
      ))}
    </View>
  );
};

export default ProductTab;

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 20,
    height: 40,
    marginRight: 12,
    width: 40,
  },
  followBtn: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  imageWrapper: {
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  indicatorBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
    right: 10,
    top: 10,
  },
  indicatorText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  infoLeft: {
    flex: 1,
  },
  infoRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moreBtn: {
    padding: 4,
  },
  postHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
  },
  productCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  productImage: {
    height: "100%",
    width: "100%",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  productTitle: {
    fontSize: 13,
    marginBottom: 4,
    paddingRight: 12,
  },
  stateContainer: {
    alignItems: "center",
    borderRadius: 12,
    minHeight: 140,
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  viewBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
