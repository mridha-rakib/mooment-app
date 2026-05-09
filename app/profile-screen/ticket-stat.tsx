import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";

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
  const { colors, isDark } = useTheme();
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
          <View style={[styles.statusCircle, { backgroundColor: colors.textSecondary }]}>
            <Feather name="minus" size={14} color={colors.background} />
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: TicketStatItem }) => (
    <View style={styles.statRow}>
      <View style={styles.userInfo}>
        <View style={[styles.avatarContainer, { borderColor: colors.primary }]}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        </View>
        <View>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{item.handle}</Text>
        </View>
      </View>
      
      <View style={styles.ticketInfo}>
        {getStatusIcon(item.status)}
        <Text style={[styles.ticketType, { color: colors.text }]}>{item.ticketType}</Text>
      </View>

      <Text style={[styles.amount, { color: colors.text }]}>{item.amount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ticket Stat</Text>
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
    padding: 2,
    marginRight: 12,
  },
  avatar: {
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
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
  },
  separator: {
    height: 1,
  },
});
