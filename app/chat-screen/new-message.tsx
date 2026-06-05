import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CONTACTS = [
  { id: '1', name: 'Brooklyn Simmons', handle: '@brooklyn_s', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop', isOnline: true },
  { id: '2', name: 'Ketty Perera', handle: '@kettyp', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop', isOnline: true },
  { id: '3', name: 'Tuval Mor', handle: '@tuvalm', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop', isOnline: false },
  { id: '4', name: 'Dj Koko', handle: '@djkoko', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop', isOnline: true },
  { id: '5', name: 'Mavrick Rick', handle: '@mavrick_r', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop', isOnline: false },
  { id: '6', name: 'Giden Xenog', handle: '@gidenx', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop', isOnline: true },
  { id: '7', name: 'Luna Park', handle: '@lunapark', avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=150&auto=format&fit=crop', isOnline: false },
  { id: '8', name: 'Marcus Webb', handle: '@marcwebb', avatar: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=150&auto=format&fit=crop', isOnline: false },
];

export default function NewMessageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof CONTACTS>([]);

  const filtered = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.handle.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (contact: typeof CONTACTS[0]) => {
    setSelected(prev =>
      prev.find(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const isSelected = (id: string) => selected.some(c => c.id === id);

  const handleNext = () => {
    if (selected.length === 0) return;
    const first = selected[0];
    router.push({ pathname: '/chat-screen/chat-detail', params: { id: first.id, name: first.name, avatar: first.avatar } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <TouchableOpacity
          style={[styles.nextBtn, selected.length === 0 && styles.nextBtnDisabled]}
          onPress={handleNext}
          activeOpacity={0.8}
          disabled={selected.length === 0}
        >
          <Text style={styles.nextBtnText}>
            {selected.length > 1 ? 'Group Chat' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected Pills */}
      {selected.length > 0 && (
        <View style={styles.pillsWrap}>
          {selected.map(c => (
            <TouchableOpacity key={c.id} style={styles.pill} onPress={() => toggle(c)} activeOpacity={0.8}>
              <Image source={{ uri: c.avatar }} style={styles.pillAvatar} />
              <Text style={styles.pillName}>{c.name.split(' ')[0]}</Text>
              <Feather name="x" size={11} color="#D4B0EB" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color="#454555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor="#454555"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
      </View>

      {/* Suggested header */}
      <Text style={styles.sectionTitle}>Suggested</Text>

      {/* Contact list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const sel = isSelected(item.id);
          return (
            <TouchableOpacity style={styles.contactRow} onPress={() => toggle(item)} activeOpacity={0.85}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                {item.isOnline && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.contactInfo}>
                <Text style={[styles.contactName, sel && { color: '#D4B0EB' }]}>{item.name}</Text>
                <Text style={styles.contactHandle}>{item.handle}</Text>
              </View>
              <View style={[styles.checkbox, sel && styles.checkboxActive]}>
                {sel && <Feather name="check" size={13} color="#0e0d12" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, marginLeft: 12 },
  nextBtn: { backgroundColor: '#D4B0EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 13 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,176,235,0.12)', borderWidth: 1, borderColor: 'rgba(212,176,235,0.3)', paddingRight: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  pillAvatar: { width: 24, height: 24, borderRadius: 12 },
  pillName: { color: '#D4B0EB', fontSize: 12, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: 14, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  sectionTitle: { color: '#454555', fontSize: 12, fontWeight: '600', paddingHorizontal: 20, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  separator: { height: 1, backgroundColor: '#13131A', marginLeft: 82 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#16D869', borderWidth: 2.5, borderColor: '#0e0d12' },
  contactInfo: { flex: 1 },
  contactName: { color: '#FFFFFF', fontWeight: '600', fontSize: 15, marginBottom: 2 },
  contactHandle: { color: '#8E8E9B', fontSize: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#2A2A3A', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#D4B0EB', borderColor: '#D4B0EB' },
});
