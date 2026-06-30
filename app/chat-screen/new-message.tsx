import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import UserAvatar from '@/components/ui/UserAvatar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { safeBack } from '@/lib/navigation';
import { checkDirectMessageAccess } from '@/lib/chat';
import { getFriendUsers } from '@/lib/users';
import { getStorageFileUrl } from '@/lib/storage';

type Contact = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  isOnline: boolean;
};

const resolveAvatar = (avatarKey?: string | null, avatarUrl?: string | null) => {
  if (avatarUrl) return avatarUrl;
  if (!avatarKey) return null;
  try {
    return getStorageFileUrl(avatarKey);
  } catch {
    return null;
  }
};

export default function NewMessageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isChatLoadingRef = useRef(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFriends = async () => {
      setIsLoading(true);
      try {
        const friends = await getFriendUsers(undefined, 200);
        if (!isMounted) return;
        setContacts(friends.map((friend) => ({
          id: friend.id,
          name: friend.name,
          handle: friend.username ? `@${friend.username}` : '@xenog',
          avatar: resolveAvatar(friend.avatarKey, friend.avatarUrl),
          isOnline: false,
        })));
      } catch {
        if (isMounted) {
          setContacts([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFriends();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.handle.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (contact: Contact) => {
    setSelected(prev =>
      prev.find(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const isSelected = (id: string) => selected.some(c => c.id === id);

  const handleNext = async () => {
    if (selected.length === 0 || isChatLoadingRef.current) return;
    const first = selected[0]!;
    isChatLoadingRef.current = true;
    setIsChatLoading(true);

    try {
      await checkDirectMessageAccess(first.id);
      router.push({
        pathname: '/chat-screen/chat-detail',
        params: {
          id: first.id,
          name: first.name,
          ...(first.avatar ? { avatar: first.avatar } : {}),
        },
      });
    } catch (error) {
      Alert.alert(
        'Cannot send message',
        getAuthErrorMessage(error, 'Unable to start chat right now. Please try again later.'),
      );
    } finally {
      isChatLoadingRef.current = false;
      setIsChatLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack(router, '/(tabs)/messages')} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <TouchableOpacity
          style={[styles.nextBtn, (selected.length === 0 || isChatLoading) && styles.nextBtnDisabled]}
          onPress={() => void handleNext()}
          activeOpacity={0.8}
          disabled={selected.length === 0 || isChatLoading}
        >
          {isChatLoading ? (
            <ActivityIndicator size="small" color="#0e0d12" />
          ) : (
            <Text style={styles.nextBtnText}>
              {selected.length > 1 ? 'Group Chat' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Selected Pills */}
      {selected.length > 0 && (
        <View style={styles.pillsWrap}>
          {selected.map(c => (
            <TouchableOpacity key={c.id} style={styles.pill} onPress={() => toggle(c)} activeOpacity={0.8}>
              <UserAvatar uri={c.avatar} name={c.name} size={24} style={styles.pillAvatar} />
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
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#8E8E9B" />
        </View>
      ) : (
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
                  <UserAvatar uri={item.avatar} name={item.name} size={50} style={styles.avatar} />
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, marginLeft: 12 },
  nextBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
