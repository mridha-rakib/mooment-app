import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const USERS = [
  { id: '1', name: 'Alexia', handle: '@alexia_d', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150', status: 'Added' },
  { id: '2', name: 'KD Mark', handle: '@kd_mark', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', status: 'Add' },
  { id: '3', name: 'Jessica', handle: '@jessica', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150', status: 'Added' },
  { id: '4', name: 'Jacob', handle: '@jacob', image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=150', status: 'Add' },
];

export default function AddFriendScreen() {
  const router = useRouter();
  const [users, setUsers] = useState(USERS);

  const toggleStatus = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Add' ? 'Added' : 'Add' };
      }
      return u;
    }));
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Feather name="x" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Friend</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchContainer}>
          <Feather name="search" size={18} color="#8E8E9B" style={s.searchIcon} />
          <TextInput 
            style={s.searchInput}
            placeholder="Search"
            placeholderTextColor="#8E8E9B"
          />
        </View>
        <TouchableOpacity onPress={() => {}}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {users.map((user) => (
          <View key={user.id} style={s.userRow}>
            <Image source={{ uri: user.image }} style={s.avatar} />
            <View style={s.userInfo}>
              <Text style={s.userName}>Dj Koko</Text>
              <Text style={s.userHandle}>@adhd_d</Text>
            </View>
            <TouchableOpacity 
              style={[s.actionBtn, user.status === 'Added' ? s.actionBtnDark : s.actionBtnLight]}
              onPress={() => toggleStatus(user.id)}
            >
              <Text style={[s.actionBtnText, user.status === 'Added' ? s.actionBtnTextDark : s.actionBtnTextLight]}>
                {user.status}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60, marginTop: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131A',
    borderRadius: 12,
    marginRight: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },
  cancelText: { color: '#8E8E9B', fontSize: 14 },

  listContent: { paddingHorizontal: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  userHandle: { color: '#8E8E9B', fontSize: 12 },

  actionBtn: { width: 80, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionBtnLight: { backgroundColor: '#C2B5CD' },
  actionBtnDark: { backgroundColor: '#1A1A2E' },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
  actionBtnTextLight: { color: '#0e0d12' },
  actionBtnTextDark: { color: '#FFF' },
});
