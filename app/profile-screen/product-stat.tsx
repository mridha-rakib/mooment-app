import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import BackButton from "@/components/ui/BackButton";

type ProductStatItem = {
  id: string;
  productName: string;
  productImage: string;
  status: 'success' | 'failed' | 'pending';
  userName: string;
  userHandle: string;
  userAvatar: string;
  amount: string;
};

const STAT_DATA: ProductStatItem[] = [
  {
    id: '1',
    productName: 'Medusa Skin Whitening Cream',
    productImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=150',
    status: 'success',
    userName: 'Tuval Mor',
    userHandle: '@sfdf',
    userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    amount: '$45.00',
  },
  {
    id: '2',
    productName: 'Medusa Skin Whitening Cream',
    productImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=150',
    status: 'failed',
    userName: 'Dianne Russell',
    userHandle: '@sfdf',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    amount: '$405.00',
  },
  {
    id: '3',
    productName: 'Medusa Skin Whitening Cream',
    productImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=150',
    status: 'pending',
    userName: 'Esther Howard',
    userHandle: '@sfdf',
    userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    amount: '$4500.00',
  },
  {
    id: '4',
    productName: 'Medusa Skin Whitening Cream',
    productImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=150',
    status: 'success',
    userName: 'Cody Fisher',
    userHandle: '@sfdf',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    amount: '$450.00',
  },
];

export default function ProductStatScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const getStatusIcon = (status: ProductStatItem['status']) => {
    switch (status) {
      case 'success':
        return (
          <View style={[styles.statusCircle, { backgroundColor: '#2DB46D' }]}>
            <Feather name="check" size={14} color="#FFFFFF" />
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusCircle, { backgroundColor: '#D64646' }]}>
            <Feather name="x" size={14} color="#FFFFFF" />
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusCircle, { backgroundColor: colors.textSecondary }]}>
            <Feather name="minus" size={14} color={colors.background} />
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: ProductStatItem }) => (
    <View style={styles.statCard}>
      {/* Top Row: Product Info & Status */}
      <View style={styles.topRow}>
        <View style={styles.productInfo}>
          <Image source={{ uri: item.productImage }} style={[styles.productAvatar, { backgroundColor: colors.card }]} />
          <Text style={[styles.productName, { color: colors.text }]}>{item.productName}</Text>
        </View>
        {getStatusIcon(item.status)}
      </View>

      {/* Bottom Row: User Info & Amount */}
      <View style={styles.bottomRow}>
        <View style={styles.userInfo}>
          <View style={[styles.userAvatarContainer, { borderColor: colors.primary }]}>
            <Image source={{ uri: item.userAvatar }} style={styles.userAvatar} />
          </View>
          <View>
            <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
            <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{item.userHandle}</Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: colors.text }]}>{item.amount}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Product Stat</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={STAT_DATA}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statCard: {
    paddingVertical: 18,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '500',
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
    marginRight: 12,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 12,
  },
  amount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
  },
});
