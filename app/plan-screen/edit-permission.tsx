import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { 
  ArrowLeft01Icon, 
  Search01Icon, 
  ArrowDown01Icon 
} from "@hugeicons/core-free-icons";
import { useTheme } from "@/hooks/useTheme";

const USERS = [
  { id: '1', name: 'Alexia', handle: '@alexia_d', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150', role: 'Viewer' },
  { id: '2', name: 'KD Mark', handle: '@kd_mark', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150', role: 'Viewer' },
  { id: '3', name: 'Jessica', handle: '@jessica', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150', role: 'Editor' },
  { id: '4', name: 'Jacob', handle: '@jacob', image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=150', role: 'Viewer' },
];

export default function EditPermissionScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState(USERS);

  const toggleRole = (id: string) => {
    setUsers(users.map(u => {
      if (u.id === id) {
        return { ...u, role: u.role === 'Viewer' ? 'Editor' : 'Viewer' };
      }
      return u;
    }));
  };

  return (
    <View style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Edit Permission</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={[s.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <HugeiconsIcon icon={Search01Icon} size={18} color={colors.textSecondary} style={s.searchIcon} />
        <TextInput 
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
        {users.map((user) => (
          <View key={user.id} style={[s.userRow, { borderBottomColor: colors.border }]}>
            <Image source={{ uri: user.image }} style={s.avatar} />
            <View style={s.userInfo}>
              <Text style={[s.userName, { color: colors.text }]}>{user.name}</Text>
              <Text style={[s.userHandle, { color: colors.textSecondary }]}>{user.handle}</Text>
            </View>
            <TouchableOpacity 
              style={[s.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => toggleRole(user.id)}
              activeOpacity={0.7}
            >
              <Text style={[s.actionBtnText, { color: colors.text }]}>{user.role}</Text>
              <HugeiconsIcon icon={ArrowDown01Icon} size={14} color={colors.text} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
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
    borderWidth: 1,
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  userRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  userHandle: { fontSize: 12 },

  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});
