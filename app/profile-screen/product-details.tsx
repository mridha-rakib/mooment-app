import {
  Feather } from "@expo/vector-icons";
import { PencilEdit02Icon,
  Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import { useRouter,
  useLocalSearchParams } from "expo-router";
import React,
  { useState } from "react";
import { Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddProductModal from "@/components/profile/AddProductModal";

const { width } = Dimensions.get('window');

import BackButton from "@/components/ui/BackButton";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Mock data for display - in real app would come from params or API
  const productData = {
    name: (params.name as string) || "Medusa Skin Whitening Cream",
    description: "Premium skin brightening cream with Arbutin, Niacinamide & Hyaluronic Acid. For all skin types. Present QR code at event to collect.",
    price: "28",
    oldPrice: "32",
    stock: "45",
    tag: "Skin Care",
    images: [(params.image as string) || 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=600'],
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditModalVisible(true)}>
          <View style={styles.editCircle}>
            <HugeiconsIcon icon={PencilEdit02Icon} size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: productData.images[0] }} style={styles.mainImage} />
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>1/3</Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.tagBox}>
              <Text style={styles.tagText}>{productData.tag}</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Available</Text>
            </View>
          </View>

          <Text style={styles.productName}>{productData.name}</Text>
          <Text style={styles.description}>{productData.description}</Text>

          <View style={styles.stockBox}>
            <Text style={styles.stockText}>{productData.stock} Products left</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>£</Text>
              <Text style={styles.priceValue}>{productData.price}</Text>
              <Text style={styles.oldPrice}>£{productData.oldPrice}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn}>
              <HugeiconsIcon icon={Delete02Icon} size={20} color="#FFFFFF" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <AddProductModal 
        visible={editModalVisible} 
        onClose={() => setEditModalVisible(false)}
        initialData={{
          ...productData,
          discount: "10", // Example
        }}
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
  editBtn: {},
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
  editCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  imageContainer: {
    width: width,
    height: width * 1.1,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  indicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  indicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tagBox: {
    backgroundColor: '#1C1C24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    color: '#8E8E9B',
    fontSize: 12,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 180, 109, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2DB46D',
  },
  statusText: {
    color: '#2DB46D',
    fontSize: 12,
    fontWeight: '600',
  },
  productName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    color: '#8E8E9B',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 25,
  },
  stockBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  stockText: {
    color: '#0e0d12',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currency: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  priceValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  oldPrice: {
    color: '#555',
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D64646',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
