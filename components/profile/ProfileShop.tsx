import React from "react";
import { StyleSheet, View } from "react-native";
import FeedPost, { PostData } from "../FeedPost";

const MOCK_PRODUCTS: PostData[] = [
  {
    id: 'pr1',
    postType: 'product',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
    timeAgo: '2 min ago',
    mediaUris: ['https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=800'],
    productDetails: {
      title: 'Medusa Skin Whitening Cream',
      price: '£28',
      buttonText: 'View'
    }
  }
];

type ProfileShopProps = {
  onCommentPress: () => void;
  onSharePress: () => void;
};

export default function ProfileShop({ onCommentPress, onSharePress }: ProfileShopProps) {
  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {MOCK_PRODUCTS.map((product) => (
          <FeedPost 
            key={product.id} 
            post={product} 
            onCommentPress={onCommentPress} 
            onSharePress={onSharePress} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  list: {
    marginTop: 5,
  },
});
