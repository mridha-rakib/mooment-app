import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { 
  ArrowLeft01Icon, 
  Search01Icon, 
  Delete02Icon 
} from "@hugeicons/core-free-icons";

const USERS = [
  { id: '1', name: 'Alexia', handle: '@alexia_d', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150' },
  { id: '2', name: 'KD Mark', handle: '@kd_mark', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150' },
  { id: '3', name: 'Jessica', handle: '@jessica', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150' },
  { id: '4', name: 'Jacob', handle: '@jacob', image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=150' },
];

export default function TaggedFriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState(USERS);

  const handleRemove = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tagged Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={s.searchContainer}>
        <HugeiconsIcon icon={Search01Icon} size={18} color="#8E8E9B" style={s.searchIcon} />
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
              style={s.actionBtn}
              onPress={() => handleRemove(user.id)}
              activeOpacity={0.7}
            >
              <Text style={s.actionBtnText}>Remove</Text>
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
    paddingBottom: 15 
  },
  backBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#111', 
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 14 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)' 
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  userHandle: { color: '#8E8E9B', fontSize: 12 },

  actionBtn: { 
    backgroundColor: '#111', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  actionBtnText: { color: '#8E8E9B', fontSize: 13, fontWeight: '700' },
});
