import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import MoreMenuModal from "../post/MoreMenuModal";

const { width } = Dimensions.get("window");

// Removed hardcoded COLORS to use useTheme hook

const PRODUCTS_DATA = [
  {
    id: "1",
    user: "Dj Koko",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    title: "Medusa Skin Whitening Cream",
    price: "£28",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600&auto=format&fit=crop",
    indicator: "1/3",
    isFollowing: false,
  },
  {
    id: "2",
    user: "Dj Koko",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    title: "Medusa Skin Whitening Cream",
    price: "£28",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600&auto=format&fit=crop",
    indicator: "1/3",
    isFollowing: false,
  },
];

const ProductCard = ({ product }: { product: any }) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = React.useState(product.isFollowing);
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  const moreBtnRef = React.useRef<View>(null);
  const [menuTop, setMenuTop] = React.useState(0);

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleMorePress = () => {
    moreBtnRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setMenuTop(pageY + height);
      setShowMoreMenu(true);
    });
  };

  return (
    <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* User Header */}
      <View style={styles.header}>
        <Image source={{ uri: product.avatar }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{product.user}</Text>
          <Text style={[styles.time, { color: colors.textSecondary }]}>{product.time}</Text>
        </View>
        
        <View style={styles.postHeaderActions}>
          {isFollowing ? (
            <TouchableOpacity
              style={[styles.followingBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
              activeOpacity={0.8}
              onPress={toggleFollow}
            >
              <Text style={[styles.followingBtnText, { color: colors.textSecondary }]}>Following</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.followBtn, { borderColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={toggleFollow}
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

      {/* Product Image Section */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: product.image }} style={styles.productImage} />
        <View style={styles.indicatorBadge}>
          <Text style={styles.indicatorText}>{product.indicator}</Text>
        </View>
      </View>

      {/* Product Info Row */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Text style={[styles.productTitle, { color: colors.textSecondary }]}>{product.title}</Text>
          <Text style={[styles.productPrice, { color: colors.text }]}>{product.price}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.viewBtn, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" }]}
          onPress={() => router.push("/event-screen/product/details")}
        >
          <Text style={[styles.viewBtnText, { color: colors.text }]}>View</Text>
        </TouchableOpacity>
      </View>

      <MoreMenuModal
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        top={menuTop}
        onReport={() => console.log('Report product')}
        onSave={() => console.log('Save product')}
      />
    </View>
  );
};

const ProductTab = () => {
  return (
    <View style={{ marginTop: 20 }}>
      {PRODUCTS_DATA.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </View>
  );
};

export default ProductTab;

const styles = StyleSheet.create({
  productCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  time: {
    fontSize: 12,
  },
  postHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
    gap: 4,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  followingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  followingBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  moreBtn: {
    padding: 4,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  indicatorBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  indicatorText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  infoLeft: {
    flex: 1,
  },
  productTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
  },
  viewBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
