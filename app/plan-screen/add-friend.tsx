import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { 
  Search01Icon, 
} from "@hugeicons/core-free-icons";
import { Feather } from "@expo/vector-icons";

const USERS = [
  { id: '1', name: 'Dj Koko', handle: '@selfd_d', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150', status: 'Add' },
  { id: '2', name: 'Dj Koko', handle: '@selfd_d', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150', status: 'Added' },
  { id: '3', name: 'Dj Koko', handle: '@selfd_d', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', status: 'Add' },
  { id: '4', name: 'Dj Koko', handle: '@selfd_d', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150', status: 'Add' },
];

export default function AddFriendScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState(USERS);
  const [search, setSearch] = useState('');

  const toggleStatus = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Add' ? 'Added' : 'Add' } : u));
  };

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn} activeOpacity={0.8}>
          <Feather name="x" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Friend</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar Row */}
      <View style={s.searchRow}>
        <View style={s.searchContainer}>
          <HugeiconsIcon icon={Search01Icon} size={18} color="#8E8E9B" style={s.searchIcon} />
          <TextInput 
            style={s.searchInput}
            placeholder="Search"
            placeholderTextColor="#8E8E9B"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity onPress={() => setSearch('')}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {users.map((user) => (
          <View key={user.id} style={s.userRow}>
            <Image source={{ uri: user.image }} style={s.avatar} />
            <View style={s.userInfo}>
              <Text style={s.userName}>{user.name}</Text>
              <Text style={s.userHandle}>{user.handle}</Text>
            </View>
            <TouchableOpacity 
              style={[s.actionBtn, user.status === 'Added' ? s.actionBtnDark : s.actionBtnLight]}
              onPress={() => toggleStatus(user.id)}
              activeOpacity={0.7}
            >
              <Text style={[s.actionBtnText, user.status === 'Added' ? s.actionBtnTextDark : s.actionBtnTextLight]}>
                {user.status}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  closeBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#111', 
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15 },
  cancelBtnText: { color: '#FFF', fontSize: 15 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 0, 
    paddingVertical: 18, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.08)' 
  },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  userHandle: { color: '#8E8E9B', fontSize: 13 },

  actionBtn: { width: 80, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionBtnLight: { backgroundColor: '#C2B5CD' },
  actionBtnDark: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  actionBtnTextLight: { color: '#0e0d12' },
  actionBtnTextDark: { color: '#8E8E9B' },
});
