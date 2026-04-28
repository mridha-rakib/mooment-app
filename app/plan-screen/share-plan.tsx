import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const USERS = [
  { id: '1', name: 'Alexia', handle: '@alexia_d', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150', status: 'Send' },
  { id: '2', name: 'KD Mark', handle: '@kd_mark', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', status: 'Send' },
  { id: '3', name: 'Jessica', handle: '@jessica', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150', status: 'Send' },
  { id: '4', name: 'Jacob', handle: '@jacob', image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=150', status: 'Sent' },
];

export default function SharePlanScreen() {
  const router = useRouter();
  const [users, setUsers] = useState(USERS);

  const toggleStatus = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'Send' ? 'Sent' : 'Send' };
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
          <Feather name="chevron-left" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Share Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={s.searchContainer}>
        <Feather name="search" size={18} color="#8E8E9B" style={s.searchIcon} />
        <TextInput 
          style={s.searchInput}
          placeholder="Search"
          placeholderTextColor="#8E8E9B"
        />
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
              style={[s.actionBtn, user.status === 'Sent' ? s.actionBtnDark : s.actionBtnLight]}
              onPress={() => toggleStatus(user.id)}
            >
              <Text style={[s.actionBtnText, user.status === 'Sent' ? s.actionBtnTextDark : s.actionBtnTextLight]}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131A',
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

  listContent: { paddingHorizontal: 20 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  userHandle: { color: '#8E8E9B', fontSize: 12 },

  actionBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
  actionBtnLight: { backgroundColor: '#C2B5CD' },
  actionBtnDark: { backgroundColor: '#1A1A2E' },
  actionBtnText: { fontSize: 13, fontWeight: 'bold' },
  actionBtnTextLight: { color: '#0e0d12' },
  actionBtnTextDark: { color: '#FFF' },
});
