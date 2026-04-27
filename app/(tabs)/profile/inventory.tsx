import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type InventoryItem = {
  id: string;
  name: string;
  image: string;
  stockCount: number;
  price: string;
  isOutOfStock?: boolean;
};

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: '1',
    name: 'Medusa Skin Whitening Cream',
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=300',
    stockCount: 45,
    price: '$45.00',
  },
  {
    id: '2',
    name: 'Medusa Skin Whitening Cream',
    image: 'https://images.unsplash.com/photo-1512446816042-444d641267d4?q=80&w=300',
    stockCount: 0,
    price: '$45.00',
    isOutOfStock: true,
  }
];

export default function InventoryScreen() {
  const router = useRouter();

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
          <TouchableOpacity style={styles.viewBtn} activeOpacity={0.8}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BlurView intensity={20} tint="dark" style={styles.backCircle}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Inventory</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={MOCK_INVENTORY}
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
    paddingVertical: 15,
  },
  backBtn: {},
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
    backgroundColor: '#B2ABBA',
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
