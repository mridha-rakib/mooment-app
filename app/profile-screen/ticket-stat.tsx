import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BackButton from "@/components/ui/BackButton";

type TicketStatItem = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  status: 'success' | 'failed' | 'pending';
  ticketType: string;
  amount: string;
};

const STAT_DATA: TicketStatItem[] = [
  {
    id: '1',
    name: 'Tuval Mor',
    handle: '@sfdf',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    status: 'success',
    ticketType: 'General Ticket',
    amount: '$45.00',
  },
  {
    id: '2',
    name: 'Tuval Mor',
    handle: '@sfdf',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    status: 'failed',
    ticketType: 'Early Bird',
    amount: '$45.00',
  },
  {
    id: '3',
    name: 'Tuval Mor',
    handle: '@sfdf',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    status: 'success',
    ticketType: 'VIP',
    amount: '$45.00',
  },
  {
    id: '4',
    name: 'Tuval Mor',
    handle: '@sfdf',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
    status: 'pending',
    ticketType: 'VIP',
    amount: '$45.00',
  },
];

export default function TicketStatScreen() {
  const router = useRouter();

  const getStatusIcon = (status: TicketStatItem['status']) => {
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
          <View style={[styles.statusCircle, { backgroundColor: '#8E8E9B' }]}>
            <Feather name="minus" size={14} color="#0e0d12" />
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: TicketStatItem }) => (
    <View style={styles.statRow}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        </View>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userHandle}>{item.handle}</Text>
        </View>
      </View>
      
      <View style={styles.ticketInfo}>
        {getStatusIcon(item.status)}
        <Text style={styles.ticketType}>{item.ticketType}</Text>
      </View>

      <Text style={styles.amount}>{item.amount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Ticket Stat</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={STAT_DATA}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    marginBottom: 10,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%', // Adjust width allocation
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D84B79', // Pinkish border as per design
    padding: 2,
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userHandle: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  ticketType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A22',
  },
});
