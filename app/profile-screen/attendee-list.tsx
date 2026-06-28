import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";

type AttendeeItem = {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  status: 'success' | 'failed' | 'pending';
  isFollowing: boolean;
};

const ATTENDEE_DATA: AttendeeItem[] = [
  {
    id: '1',
    name: 'Dj Koko',
    handle: '@sdfd_d',
    avatar: null,
    status: 'success',
    isFollowing: false,
  },
  {
    id: '2',
    name: 'Dj Koko',
    handle: '@sdfd_d',
    avatar: null,
    status: 'success',
    isFollowing: false,
  },
  {
    id: '3',
    name: 'Dj Koko',
    handle: '@sdfd_d',
    avatar: null,
    status: 'pending',
    isFollowing: false,
  },
  {
    id: '4',
    name: 'Dj Koko',
    handle: '@sdfd_d',
    avatar: null,
    status: 'failed',
    isFollowing: true,
  },
];

export default function AttendeeListScreen() {
  const router = useRouter();

  const getStatusIcon = (status: AttendeeItem['status']) => {
    switch (status) {
      case 'success':
        return (
          <View style={[styles.statusCircle, { backgroundColor: 'rgba(45, 180, 109, 0.15)' }]}>
            <Feather name="check" size={14} color="#2DB46D" />
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusCircle, { backgroundColor: 'rgba(214, 70, 70, 0.15)' }]}>
            <Feather name="x" size={14} color="#D64646" />
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusCircle, { backgroundColor: 'rgba(142, 142, 155, 0.15)' }]}>
            <Feather name="minus" size={14} color="#8E8E9B" />
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: AttendeeItem }) => (
    <View style={styles.statRow}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <UserAvatar uri={item.avatar} name={item.name} size={48} style={styles.avatar} />
        </View>
        <View>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userHandle}>{item.handle}</Text>
        </View>
      </View>
      
      <View style={styles.statusContainer}>
        {getStatusIcon(item.status)}
      </View>

      <View style={styles.actionContainer}>
        {item.isFollowing ? (
          <TouchableOpacity style={styles.followingBtn}>
            <Feather name="check" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.followingText}>Following</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.followBtn}>
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Attendee List</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={ATTENDEE_DATA}
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
    width: '45%',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D84B79',
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
  statusContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3B3B45',
    backgroundColor: 'transparent',
  },
  followText: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '600',
  },
  followingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A22',
  },
  followingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A22',
  },
});
