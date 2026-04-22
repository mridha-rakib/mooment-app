import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Image, TextInput, Platform, StatusBar, Dimensions
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export type ConversationData = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
  isGroup: boolean;
  groupAvatars?: string[];
  isTyping?: boolean;
  messageType?: 'text' | 'image' | 'audio' | 'event';
  isMuted?: boolean;
};

const ACTIVE_USERS = [
  { id: 'a1', name: 'Brooklyn', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
  { id: 'a2', name: 'Ketty', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
  { id: 'a3', name: 'Dj Koko', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop' },
  { id: 'a4', name: 'Tuval', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop' },
  { id: 'a5', name: 'Mavrick', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
];

const CONVERSATIONS: ConversationData[] = [
  {
    id: 'c1', name: 'Brooklyn Simmons', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    lastMessage: 'Hey! Are you coming tonight? 🎉', time: '2m', unread: 3, isOnline: true, isGroup: false, messageType: 'text',
  },
  {
    id: 'c2', name: 'Rooftop Crew 🎧', avatar: '', groupAvatars: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    ],
    lastMessage: 'Dj Koko: Saved me a spot?', time: '10m', unread: 7, isOnline: false, isGroup: true, messageType: 'text',
  },
  {
    id: 'c3', name: 'Ketty Perera', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
    lastMessage: '🎵 Voice message', time: '1h', unread: 0, isOnline: true, isGroup: false, messageType: 'audio', isTyping: true,
  },
  {
    id: 'c4', name: 'Tuval Mor', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    lastMessage: '📷 Photo', time: '2h', unread: 0, isOnline: false, isGroup: false, messageType: 'image',
  },
  {
    id: 'c5', name: 'Dj Koko', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    lastMessage: 'Rooftop Session Vol.4 — you going?', time: '3h', unread: 1, isOnline: true, isGroup: false, messageType: 'event',
  },
  {
    id: 'c6', name: 'Mavrick Rick', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop',
    lastMessage: 'Sounds good bro 🤙', time: '5h', unread: 0, isOnline: false, isGroup: false, isMuted: true,
  },
  {
    id: 'c7', name: 'Night Owls 🦉', avatar: '', groupAvatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
    ],
    lastMessage: 'Mavrick: I\'ll meet you there', time: '1d', unread: 0, isOnline: false, isGroup: true,
  },
  {
    id: 'c8', name: 'Giden Xenog', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
    lastMessage: 'Check out this event!', time: '1d', unread: 0, isOnline: false, isGroup: false,
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Groups'>('All');

  const filtered = CONVERSATIONS.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'Unread') return matchSearch && c.unread > 0;
    if (activeTab === 'Groups') return matchSearch && c.isGroup;
    return matchSearch;
  });

  const renderAvatar = (item: ConversationData) => {
    if (item.isGroup && item.groupAvatars) {
      return (
        <View style={styles.groupAvatarWrap}>
          <Image source={{ uri: item.groupAvatars[0] }} style={styles.groupAv1} />
          <Image source={{ uri: item.groupAvatars[1] }} style={styles.groupAv2} />
        </View>
      );
    }
    return (
      <View style={styles.avatarWrap}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
    );
  };

  const renderMessage = (item: ConversationData) => {
    if (item.isTyping) return <Text style={[styles.lastMsg, styles.typingText]}>Typing...</Text>;
    return (
      <Text style={[styles.lastMsg, item.unread > 0 && styles.lastMsgUnread]} numberOfLines={1}>
        {item.lastMessage}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <Feather name="edit" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { marginLeft: 8 }]}
            onPress={() => router.push('/new-message')}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="#454555" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search messages..."
          placeholderTextColor="#454555"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.8}>
            <Feather name="x" size={16} color="#454555" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['All', 'Unread', 'Groups'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {tab === 'Unread' && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {CONVERSATIONS.filter(c => c.unread > 0).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Now Strip */}
      {activeTab === 'All' && (
        <View style={styles.activeSection}>
          <Text style={styles.activeSectionTitle}>Active Now</Text>
          <FlatList
            data={ACTIVE_USERS}
            horizontal
            keyExtractor={i => i.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.activeUser} activeOpacity={0.8}>
                <View style={styles.activeAvatarWrap}>
                  <Image source={{ uri: item.avatar }} style={styles.activeAvatar} />
                  <View style={styles.activeOnlineDot} />
                </View>
                <Text style={styles.activeUserName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Conversation List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#2A2A3A" />
            <Text style={styles.emptyText}>No conversations found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convoRow}
            onPress={() => router.push({ pathname: '/chat-detail', params: { id: item.id, name: item.name, avatar: item.avatar } })}
            activeOpacity={0.85}
          >
            {renderAvatar(item)}
            <View style={styles.convoMeta}>
              <View style={styles.convoTopRow}>
                <Text style={[styles.convoName, item.unread > 0 && styles.convoNameUnread]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.convoTimeRow}>
                  {item.isMuted && <Feather name="bell-off" size={12} color="#454555" style={{ marginRight: 4 }} />}
                  <Text style={[styles.convoTime, item.unread > 0 && styles.convoTimeUnread]}>{item.time}</Text>
                </View>
              </View>
              <View style={styles.convoBottomRow}>
                {renderMessage(item)}
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unread > 9 ? '9+' : item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: 14, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: '#13131A' },
  tabActive: { backgroundColor: '#D4B0EB' },
  tabText: { color: '#8E8E9B', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#0e0d12' },
  tabBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F2245C', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  activeSection: { paddingTop: 8, paddingBottom: 12 },
  activeSectionTitle: { color: '#8E8E9B', fontSize: 12, fontWeight: '600', paddingHorizontal: 20, marginBottom: 2 },
  activeUser: { alignItems: 'center', width: 60 },
  activeAvatarWrap: { position: 'relative', marginBottom: 5 },
  activeAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#D4B0EB' },
  activeOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#16D869', borderWidth: 2, borderColor: '#0e0d12' },
  activeUserName: { color: '#8E8E9B', fontSize: 11, textAlign: 'center' },

  separator: { height: 1, backgroundColor: '#13131A', marginLeft: 84 },

  convoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: '#16D869', borderWidth: 2.5, borderColor: '#0e0d12' },
  groupAvatarWrap: { width: 52, height: 52, marginRight: 14, position: 'relative' },
  groupAv1: { width: 38, height: 38, borderRadius: 19, position: 'absolute', top: 0, left: 0, borderWidth: 2, borderColor: '#0e0d12' },
  groupAv2: { width: 32, height: 32, borderRadius: 16, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#0e0d12' },

  convoMeta: { flex: 1 },
  convoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convoName: { color: '#8E8E9B', fontWeight: '500', fontSize: 15, flex: 1, marginRight: 8 },
  convoNameUnread: { color: '#FFFFFF', fontWeight: 'bold' },
  convoTimeRow: { flexDirection: 'row', alignItems: 'center' },
  convoTime: { color: '#454555', fontSize: 12 },
  convoTimeUnread: { color: '#D4B0EB', fontWeight: '600' },
  convoBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { color: '#454555', fontSize: 13, flex: 1, marginRight: 8 },
  lastMsgUnread: { color: '#8E8E9B', fontWeight: '500' },
  typingText: { color: '#D4B0EB', fontStyle: 'italic' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#D4B0EB', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadBadgeText: { color: '#0e0d12', fontSize: 11, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#454555', fontSize: 14 },
});
