import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import { getMyProducts } from "@/lib/products";
import { getStorageFileUrl } from "@/lib/storage";

type InventoryItem = {
  id: string;
  name: string;
  image: string;
  stockCount: number;
  price: string;
  isOutOfStock?: boolean;
};

const FALLBACK_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=300';

const formatProductPrice = (priceUsd: number) => `$${priceUsd.toFixed(2)}`;

const getProductImageUrl = (imageKey: string) => {
  try {
    return getStorageFileUrl(imageKey);
  } catch {
    return FALLBACK_PRODUCT_IMAGE;
  }
};

export default function InventoryScreen() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
    let isMounted = true;

    getMyProducts()
      .then(async (products) => {
        const items = await Promise.all(
          products.map(async (product) => {
            const image = product.imageKeys[0] ? getProductImageUrl(product.imageKeys[0]) : FALLBACK_PRODUCT_IMAGE;

            return {
              id: product.id,
              name: product.name,
              image,
              stockCount: product.totalProduct,
              price: formatProductPrice(product.priceUsd),
              isOutOfStock: product.totalProduct === 0,
            };
          }),
        );

        if (isMounted) {
          setInventoryItems(items);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
    }, []),
  );

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.cardContent}>
        <View>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: item.isOutOfStock ? '#FF4B4B' : '#2DB46D' }]} />
            <Text style={[styles.stockText, { color: item.isOutOfStock ? '#FF4B4B' : '#2DB46D' }]}>
              {item.isOutOfStock ? 'Out of Stock' : `${item.stockCount} in Stock`}
            </Text>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.priceText}>{item.price}</Text>
          <TouchableOpacity 
            style={styles.viewBtn} 
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/profile-screen/product-details',
              params: { productId: item.id }
            })}
          >
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>My Inventory</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={inventoryItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 10,
    gap: 15,
    borderWidth: 1,
    borderColor: '#1A1A22',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: {
    color: '#0e0d12',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
