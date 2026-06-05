import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const MOCK_PRODUCTS = [
  {
    id: '1',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    title: 'Medusa Skin Whitening Cream',
    price: '£28',
    imageUri: 'https://images.unsplash.com/photo-1629198688000-71f23e7456cc?q=80&w=1000&auto=format&fit=crop',
    mediaCount: 3,
  },
  {
    id: '2',
    authorName: 'Brooklyn Simmons',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    timeAgo: '15 min ago',
    title: 'Brighten Facial Serum',
    price: '£45',
    imageUri: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?q=80&w=1000&auto=format&fit=crop',
    mediaCount: 2,
  },
  {
    id: '3',
    authorName: 'Tuval Mor',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    timeAgo: '1h ago',
    title: 'Glow Moisturizer',
    price: '£32',
    imageUri: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000&auto=format&fit=crop',
    mediaCount: 4,
  },
];

export default function AllProducts() {
  const router = useRouter();

  const renderItem = ({ item }: { item: typeof MOCK_PRODUCTS[0] }) => (
    <View style={styles.productCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.authorInfo}>
          <Image source={{ uri: item.authorAvatar }} style={styles.avatar} />
          <View>
            <Text style={styles.authorName}>{item.authorName}</Text>
            <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Feather name="more-horizontal" size={20} color="#8E8E9B" />
        </TouchableOpacity>
      </View>

      {/* Product Image */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.imageContainer}
        onPress={() => router.push('/product-screen/product-details')}
      >
        <Image source={{ uri: item.imageUri }} style={styles.productImage} />
        <View style={styles.imageCounter}>
          <Text style={styles.counterText}>1/{item.mediaCount}</Text>
        </View>
      </TouchableOpacity>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerTextCol}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <Text style={styles.productPrice}>{item.price}</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewBtn} 
          activeOpacity={0.8}
          onPress={() => router.push('/product-screen/product-details')}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Featured Products</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={MOCK_PRODUCTS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d12',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  timeAgo: {
    color: '#8E8E9B',
    fontSize: 11,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  footerTextCol: {
    flex: 1,
  },
  productTitle: {
    color: '#D0D0D8',
    fontSize: 12,
    marginBottom: 4,
  },
  productPrice: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewBtn: {
    backgroundColor: '#D0D0D8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewBtnText: {
    color: '#13131A',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
