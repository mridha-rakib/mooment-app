import { Feather, Ionicons } from '@expo/vector-icons';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList, Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

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
  {
    id: 'c9', name: 'Adam Smith', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150',
    lastMessage: 'Hello there, are you alive?!?', time: '1m ago', unread: 1, isOnline: false, isGroup: true, isMuted: true,
  },
  {
    id: 'c10', name: 'Music Party', avatar: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150',
    lastMessage: 'Nice to meet you too!', time: '1m ago', unread: 0, isOnline: false, isGroup: true,
  },
  {
    id: 'c11', name: 'Music Party', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150',
    lastMessage: 'Looking forward to our collaboration!', time: '20 min ago', unread: 0, isOnline: false, isGroup: true,
  },
  {
    id: 'c12', name: 'Music Party', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150',
    lastMessage: 'Thanks for the update!', time: '15 min ago', unread: 0, isOnline: false, isGroup: true,
  },
];

const MOCK_ROOMS = Array(4).fill(0).map((_, i) => ({
  id: `r${i}`,
  title: 'Pre-show chat with DJ Nova',
  hostName: 'DJ Nova',
  isHost: i === 0 || i === 2, // first item in each row has Host badge
  hostAvatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
  listeners: 412,
  listenerAvatars: [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
  ]
}));

export default function MessagesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [topTab, setTopTab] = useState<'All' | 'Unread' | 'Blocked'>('All');
  const [subTab, setSubTab] = useState<'DMs' | 'Groups' | 'Rooms'>('DMs');
  const [roomTab, setRoomTab] = useState<'Event Rooms' | 'General Rooms'>('Event Rooms');

  const filtered = CONVERSATIONS.filter(c => {
    let match = true;
    if (topTab === 'Unread') match = c.unread > 0;
    if (topTab === 'Blocked') match = c.isGroup;

    if (match) {
      if (subTab === 'DMs') return !c.isGroup;
      if (subTab === 'Groups') return c.isGroup;
      return false;
    }
    return false;
  });

  const renderAvatar = (item: ConversationData) => {
    if (item.isGroup && item.groupAvatars) {
      return (
        <View style={styles.groupAvatarWrap}>
          <Image source={{ uri: item.groupAvatars[0] }} style={[styles.groupAv1, { borderColor: colors.background }]} />
          <Image source={{ uri: item.groupAvatars[1] }} style={[styles.groupAv2, { borderColor: colors.background }]} />
        </View>
      );
    }
    return (
      <View style={styles.avatarWrap}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.isOnline && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
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

  const renderConvoItem = ({ item }: { item: ConversationData }) => (
    <TouchableOpacity
      style={styles.convoRow}
      onPress={() => router.push({ pathname: '/chat-screen/chat-detail', params: { id: item.id, name: item.name, avatar: item.avatar } })}
      activeOpacity={0.85}
    >
      {renderAvatar(item)}
      <View style={styles.convoMeta}>
        <View style={styles.convoTopRow}>
          <Text style={[styles.convoName, { color: colors.textSecondary }, item.unread > 0 && { color: colors.text, fontWeight: 'bold' }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.convoTimeRow}>
            {item.isMuted && <Feather name="bell-off" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />}
            <Text style={[styles.convoTime, { color: colors.textSecondary }, item.unread > 0 && { color: colors.primary, fontWeight: '600' }]}>{item.time}</Text>
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
  );

  const renderGroupItem = ({ item }: { item: ConversationData }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.card }]}
      onPress={() => router.push({ pathname: '/chat-screen/chat-detail', params: { id: item.id, name: item.name, avatar: item.avatar } })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.avatar }} style={styles.groupCardAvatar} />
      <View style={styles.groupCardMeta}>
        <View style={styles.groupCardTopRow}>
          <Text style={[styles.groupCardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isMuted && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.groupCardDot, { color: colors.textSecondary }]}> • </Text>
              <Feather name="bell-off" size={14} color={colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={[styles.groupCardTime, { color: colors.textSecondary }]}>{item.time}</Text>
        </View>
        <View style={styles.groupCardBottomRow}>
          <Text style={[styles.groupCardMsg, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && <View style={styles.groupCardUnreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRoomItem = ({ item }: { item: typeof MOCK_ROOMS[0] }) => (
    <TouchableOpacity 
      style={styles.roomCard} 
      activeOpacity={0.85}
      onPress={() => router.push('/live-screen/live-room-screen')}
    >
      <View style={[styles.roomCapsule, { backgroundColor: isDark ? '#130B24' : colors.card, borderColor: isDark ? '#2D1B4E' : colors.border }]}>
        <TouchableOpacity 
          style={styles.roomAvatarWrap}
          onPress={() => router.push('/profile-screen/user-profile')}
        >
          <Image source={{ uri: item.hostAvatar }} style={styles.roomAvatar} />
          <View style={styles.roomOnlineDot} />
        </TouchableOpacity>
        {item.isHost && (
          <View style={[styles.roomHostBadge, { borderColor: colors.primary }]}>
            <Text style={[styles.roomHostText, { color: colors.primary }]}>Host</Text>
          </View>
        )}
        <TouchableOpacity 
          style={[styles.roomJoinBtn, { backgroundColor: colors.background }]} 
          activeOpacity={0.8}
          onPress={() => router.push('/live-screen/live-room-screen')}
        >
          <Text style={[styles.roomJoinText, { color: colors.text }]}>Join</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.roomTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>

      <Text style={[styles.roomSpeakerText, { color: colors.textSecondary }]}>
        <TouchableOpacity onPress={() => router.push('/profile-screen/user-profile')}>
          <Text style={[styles.roomSpeakerName, { color: colors.text }]}>{item.hostName}</Text>
        </TouchableOpacity> is speaking
      </Text>

      <View style={styles.roomListenersRow}>
        <View style={styles.roomListenerAvatars}>
          {item.listenerAvatars.map((av, idx) => (
            <TouchableOpacity 
              key={idx} 
              onPress={() => router.push('/profile-screen/user-profile')}
            >
              <Image source={{ uri: av }} style={[styles.roomListenerAvatar, { marginLeft: idx > 0 ? -8 : 0, borderColor: colors.background }]} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.roomListenersText, { color: colors.textSecondary }]}>{item.listeners} listening</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card }]}
            activeOpacity={0.8}
            onPress={() => router.push('/chat-screen/create-group')}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>



      {/* Segmented Control */}
      <View style={[styles.segmentedControl, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {(['DMs', 'Groups', 'Rooms'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentTab, subTab === tab && [styles.segmentTabActive, { backgroundColor: colors.card }]]}
            onPress={() => setSubTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentTabText, { color: colors.textSecondary }, subTab === tab && { color: colors.text }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Tabs (Only for DMs and Groups) */}
      {subTab !== 'Rooms' && (
        <View style={styles.tabRow}>
          {(['All', 'Unread', 'Blocked'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, { backgroundColor: colors.card }, topTab === tab && { borderColor: colors.text }]}
              onPress={() => setTopTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, topTab === tab && { color: colors.text }]}>{tab}</Text>
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
      )}

      {/* Room Tabs */}
      {subTab === 'Rooms' && (
        <View style={styles.roomTabsRow}>
          {(['Event Rooms', 'General Rooms'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.roomTab}
              onPress={() => setRoomTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roomTabText, roomTab === tab && styles.roomTabTextActive]}>{tab}</Text>
              {roomTab === tab && <View style={styles.roomTabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      )}




      {/* Lists */}
      {subTab === 'Rooms' ? (
        <FlatList
          key="rooms-grid"
          data={MOCK_ROOMS}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          renderItem={renderRoomItem}
        />
      ) : (
        <FlatList
          key="conversations-list"
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => subTab === 'Groups' ? null : <View style={[styles.separator, { backgroundColor: colors.border }]} />}
          contentContainerStyle={subTab === 'Groups' ? { paddingBottom: 100, paddingTop: 12 } : { paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No conversations found</Text>
            </View>
          }
          renderItem={(props) => subTab === 'Groups' ? renderGroupItem(props) : renderConvoItem(props)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: 60 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 14 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#333333' },
  tabActive: { borderColor: '#FFFFFF' },
  tabText: { color: '#8E8E9B', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F2245C', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  segmentedControl: { flexDirection: 'row', backgroundColor: '#0e0d12', borderRadius: 24, borderWidth: 1, borderColor: '#2A2A3A', marginHorizontal: 16, marginBottom: 14, padding: 4 },
  segmentTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  segmentTabActive: { backgroundColor: '#333333' },
  segmentTabText: { color: '#8E8E9B', fontSize: 14, fontWeight: '600' },
  segmentTabTextActive: { color: '#FFFFFF' },

  roomTabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2A2A3A', marginHorizontal: 16, marginBottom: 8 },
  roomTab: { flex: 1, paddingVertical: 12, alignItems: 'center', position: 'relative' },
  roomTabText: { color: '#8E8E9B', fontSize: 13, fontWeight: '600' },
  roomTabTextActive: { color: '#FFFFFF' },
  roomTabIndicator: { position: 'absolute', bottom: -1, width: '100%', height: 2, backgroundColor: '#D4B0EB' },



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
  lastMsgUnread: { color: '#FFFFFF', fontWeight: '500' },
  typingText: { color: '#D4B0EB', fontStyle: 'italic' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#F2245C', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#454555', fontSize: 14 },

  /* Rooms Grid */
  roomCard: { width: (width - 48) / 2, marginBottom: 24, alignItems: 'center' },
  roomCapsule: { width: 94, height: 146, borderRadius: 47, backgroundColor: '#130B24', borderWidth: 1, borderColor: '#2D1B4E', alignItems: 'center', paddingTop: 16, paddingBottom: 16, marginBottom: 12 },
  roomAvatarWrap: { position: 'relative', marginBottom: 8 },
  roomAvatar: { width: 44, height: 44, borderRadius: 22 },
  roomOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#16D869', borderWidth: 2, borderColor: '#130B24' },
  roomHostBadge: { borderColor: '#D4B0EB', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  roomHostText: { color: '#D4B0EB', fontSize: 10, fontWeight: '600' },
  roomJoinBtn: { backgroundColor: '#1A1A2E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 6, marginTop: 'auto' },
  roomJoinText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },

  roomTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  roomSpeakerText: { color: '#8E8E9B', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  roomSpeakerName: { color: '#FFFFFF', fontWeight: 'bold' },

  roomListenersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  roomListenerAvatars: { flexDirection: 'row', marginRight: 6 },
  roomListenerAvatar: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#0e0d12' },
  roomListenersText: { color: '#8E8E9B', fontSize: 10 },

  /* Group Card */
  groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: 20, marginHorizontal: 16, marginBottom: 12, padding: 16 },
  groupCardAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 16, backgroundColor: '#1A1A2E' },
  groupCardMeta: { flex: 1 },
  groupCardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  groupCardName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  groupCardDot: { color: '#454555', fontSize: 14, marginHorizontal: 2 },
  groupCardTime: { color: '#8E8E9B', fontSize: 12 },
  groupCardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupCardMsg: { color: '#8E8E9B', fontSize: 13, flex: 1, marginRight: 8 },
  groupCardUnreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F2245C' },
});
