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
  border: "rgba(255, 255, 255, 0.1)",
};

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

const ProductTab = () => {
  const router = useRouter();
  
  return (
    <View style={{ marginTop: 20 }}>
      {PRODUCTS_DATA.map((product) => (
        <View key={product.id} style={styles.productCard}>
          {/* User Header */}
          <View style={styles.header}>
            <Image source={{ uri: product.avatar }} style={styles.avatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{product.user}</Text>
              <Text style={styles.time}>{product.time}</Text>
            </View>
            <TouchableOpacity style={styles.followBtn}>
              <Text style={styles.followBtnText}>+ Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather name="more-horizontal" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
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
              <Text style={styles.productTitle}>{product.title}</Text>
              <Text style={styles.productPrice}>{product.price}</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewBtn}
              onPress={() => router.push("/event-screen/product/details")}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
};

export default ProductTab;

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  followBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 12,
  },
  followBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
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
    color: COLORS.text,
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
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  productPrice: {
    color: COLORS.text,
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
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "bold",
  },
});
