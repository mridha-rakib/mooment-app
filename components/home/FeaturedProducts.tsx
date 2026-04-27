import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type ProductData = {
  id: string;
  title: string;
  brand: string;
  price: string;
  imageUri: string;
};

type FeaturedProductsProps = {
  products: ProductData[];
  onSeeAll?: () => void;
};

export default function FeaturedProducts({ products, onSeeAll }: FeaturedProductsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Featured Products</Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true} // Switched to true to ensure visibility
        nestedScrollEnabled={true}            // Helps with Android nested gesture handling
        keyboardShouldPersistTaps="handled" 
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((product) => (
          <TouchableOpacity key={product.id} style={styles.productCard} activeOpacity={0.8}>
            <Image source={{ uri: product.imageUri }} style={styles.productImage} />
            <Text style={styles.productTitle} numberOfLines={1}>{product.title}</Text>
            <Text style={styles.productBrand} numberOfLines={1}>{product.brand}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>{product.price}</Text>
              <Feather name="chevron-right" size={14} color="#D0D0D8" style={styles.priceChevron} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#8E8E9B',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  productCard: {
    width: 110,
    marginRight: 16,
  },
  productImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#13131A', 
  },
  productTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  productBrand: {
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    color: '#D0D0D8',
    fontSize: 14,
    fontWeight: '500',
  },
  priceChevron: {
    marginLeft: 4,
    marginTop: 2,
  },
});
