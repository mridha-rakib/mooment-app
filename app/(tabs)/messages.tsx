import CinematicButton from '@/components/ui/CinematicButton';
import SegmentedControl from '@/components/ui/SegmentedControl';
import UserAvatar from '@/components/ui/UserAvatar';
import {
    useTheme
} from '@/hooks/useTheme';
import type { DirectMessageConversationResponse, GroupConversationResponse, MessageBlockedUserResponse } from '@/lib/chat';
import { getDirectMessageConversations, getGroupConversations, getMessageBlockedUsers, unblockMessages } from '@/lib/chat';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { subscribe as subscribeRealtime } from '@/lib/socketClient';
import { useAuthStore } from '@/stores/authStore';
import { useChatUnreadStore } from '@/stores/chatUnreadStore';
import {
    Feather,
    Ionicons
} from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const formatConversationTime = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return `${Math.floor(diffHours / 24)}d`;
};

const STORY_LINK_REGEX = /https:\/\/mooment\.app\/stories\/([a-f\d]{24})/i;

const formatLastMessage = (text: string | null | undefined): string => {
  if (!text) return '';
  if (STORY_LINK_REGEX.test(text)) {
    return '🎬 Shared a story';
  }
  return text;
};

const toConversationData = (dm: DirectMessageConversationResponse): ConversationData => ({
  id: dm.friendId || dm.id,
  name: dm.name,
  avatar: dm.avatarUrl ?? null,
  lastMessage: formatLastMessage(dm.lastMessage) || 'Start a conversation',
  time: formatConversationTime(dm.lastMessageAt),
  unread: dm.unreadCount ?? 0,
  isOnline: dm.isOnline ?? false,
  isGroup: false,
  isBlocked: dm.isBlocked ?? false,
});

const toGroupConversationData = (group: GroupConversationResponse): ConversationData => ({
  id: group.id,
  name: group.name,
  avatar: group.avatarUrl ?? '',
  lastMessage: formatLastMessage(group.lastMessage) || 'No messages yet',
  time: formatConversationTime(group.lastMessageAt),
  unread: group.unreadCount ?? 0,
  isOnline: false,
  isGroup: true,
  isBlocked: false,
});

export type ConversationData = {
  id: string;
  name: string;
  avatar?: string | null;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
  isGroup: boolean;
  groupAvatars?: string[];
  isTyping?: boolean;
  messageType?: 'text' | 'image' | 'audio' | 'event';
  isBlocked?: boolean;
  isMuted?: boolean;
};



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
  const { accessToken, user: currentUser } = useAuthStore();
  const [topTab, setTopTab] = useState<'All' | 'Unread' | 'Blocked'>('All');
  const [subTab, setSubTab] = useState<'DMs' | 'Groups'>('DMs');
  const [roomTab, setRoomTab] = useState<'Event Rooms' | 'General Rooms'>('Event Rooms');
  const [dmConversations, setDmConversations] = useState<ConversationData[]>([]);
  const [isDmsLoading, setIsDmsLoading] = useState(false);
  const [dmsError, setDmsError] = useState<string | null>(null);
  const [groupConversations, setGroupConversations] = useState<ConversationData[]>([]);
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentUserIdRef = useRef<string | undefined>(currentUser?.id);
  const activeDirectConversationIdRef = useRef<string | null>(null);
  const activeDirectConversationId = useChatUnreadStore((state) => state.activeDirectConversationId);
  const clearDirectUnread = useChatUnreadStore((state) => state.clearDirectUnread);
  const setDirectUnreadCountsFromConversations = useChatUnreadStore((state) => state.setDirectUnreadCountsFromConversations);
  const isDmsMountedRef = useRef(true);
  const dmRealtimeRevisionRef = useRef(0);
  const dmLoadPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    isDmsMountedRef.current = true;
    return () => {
      isDmsMountedRef.current = false;
    };
  }, []);

  const loadDirectMessages = useCallback((options: { showLoading?: boolean } = {}): Promise<void> => {
    if (dmLoadPromiseRef.current) {
      return dmLoadPromiseRef.current;
    }

    const showLoading = options.showLoading ?? true;
    if (showLoading) {
      setIsDmsLoading(true);
    }
    setDmsError(null);

    const loadPromise = (async () => {
      try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const realtimeRevisionAtStart = dmRealtimeRevisionRef.current;
          const dms = await getDirectMessageConversations();

          if (realtimeRevisionAtStart !== dmRealtimeRevisionRef.current) {
            continue;
          }

          if (isDmsMountedRef.current) {
            setDirectUnreadCountsFromConversations(dms);
            setDmConversations(dms.map(toConversationData));
          }
          return;
        }
      } catch {
        if (isDmsMountedRef.current) {
          setDmsError('Unable to load DMs.');
        }
      } finally {
        if (showLoading && isDmsMountedRef.current) {
          setIsDmsLoading(false);
        }
      }
    })();

    dmLoadPromiseRef.current = loadPromise;
    void loadPromise.finally(() => {
      if (dmLoadPromiseRef.current === loadPromise) {
        dmLoadPromiseRef.current = null;
      }
    });
    return loadPromise;
  }, [setDirectUnreadCountsFromConversations]);

  useFocusEffect(
    useCallback(() => {
      void loadDirectMessages();
    }, [loadDirectMessages]),
  );

  const isGroupsMountedRef = useRef(true);

  useEffect(() => {
    isGroupsMountedRef.current = true;
    return () => {
      isGroupsMountedRef.current = false;
    };
  }, []);

  const loadGroups = useCallback(async () => {
    setIsGroupsLoading(true);
    setGroupsError(null);

    try {
      const groups = await getGroupConversations();
      if (isGroupsMountedRef.current) {
        setGroupConversations(groups.map(toGroupConversationData));
      }
    } catch {
      if (isGroupsMountedRef.current) {
        setGroupsError('Unable to load groups.');
      }
    } finally {
      if (isGroupsMountedRef.current) {
        setIsGroupsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
    }, [loadGroups]),
  );

  // Chat -> DMs -> Blocked now means MESSAGE-blocked users (users I've
  // message-blocked from this Chat menu) — a completely separate dataset
  // from dmConversations, which only ever contains current mutual friends
  // (message-blocking never touches the follow relationship, so a
  // message-blocked user stays out of that friend-conversation list
  // regardless). Full/Profile-blocked users belong to Profile's own
  // "Blocked Accounts" screen (GET /users/me/blocked-users), not here.
  const [messageBlockedUsers, setMessageBlockedUsers] = useState<MessageBlockedUserResponse[]>([]);
  const [isMessageBlockedLoading, setIsMessageBlockedLoading] = useState(false);
  const [messageBlockedError, setMessageBlockedError] = useState<string | null>(null);
  const [pendingMessageUnblockIds, setPendingMessageUnblockIds] = useState<string[]>([]);
  const pendingMessageUnblockIdSet = useMemo(() => new Set(pendingMessageUnblockIds), [pendingMessageUnblockIds]);
  const isBlockedDmView = subTab === 'DMs' && topTab === 'Blocked';

  const loadMessageBlockedUsers = useCallback(async () => {
    setIsMessageBlockedLoading(true);
    setMessageBlockedError(null);
    try {
      const result = await getMessageBlockedUsers();
      setMessageBlockedUsers(result.users);
    } catch (error) {
      setMessageBlockedUsers([]);
      setMessageBlockedError(getAuthErrorMessage(error, 'Unable to load blocked users.'));
    } finally {
      setIsMessageBlockedLoading(false);
    }
  }, []);

  // Refetch whenever the user switches onto the Blocked/DMs combination
  // (topTab/subTab change while already focused)...
  useEffect(() => {
    if (isBlockedDmView) {
      void loadMessageBlockedUsers();
    }
  }, [isBlockedDmView, loadMessageBlockedUsers]);

  // ...and whenever the screen regains focus while already on that
  // combination (e.g. returning from Unblock Messages in an open
  // conversation) — Expo Router doesn't remount on focus, so the effect
  // above alone wouldn't re-run without a topTab/subTab change.
  useFocusEffect(
    useCallback(() => {
      if (isBlockedDmView) {
        void loadMessageBlockedUsers();
      }
    }, [isBlockedDmView, loadMessageBlockedUsers]),
  );

  const handleUnblockMessages = async (user: MessageBlockedUserResponse) => {
    if (pendingMessageUnblockIdSet.has(user.id)) return;

    setPendingMessageUnblockIds((current) => [...current, user.id]);

    try {
      await unblockMessages(user.id);
      setMessageBlockedUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      Alert.alert('Unable to unblock', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setPendingMessageUnblockIds((current) => current.filter((id) => id !== user.id));
    }
  };

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

  useEffect(() => {
    activeDirectConversationIdRef.current = activeDirectConversationId;
  }, [activeDirectConversationId]);

  useEffect(() => {
    if (!accessToken) return;

    const unsubscribe = subscribeRealtime({
      onUserOnline: (userId) => {
        setDmConversations((prev) =>
          prev.map((c) => (c.id === userId ? { ...c, isOnline: true } : c)),
        );
      },
      onUserOffline: (userId) => {
        setDmConversations((prev) =>
          prev.map((c) => (c.id === userId ? { ...c, isOnline: false } : c)),
        );
      },
      onDirectMessage: (message) => {
        dmRealtimeRevisionRef.current += 1;
        const currentUserId = currentUserIdRef.current;
        const partnerId =
          message.senderId === currentUserId ? message.recipientId : message.senderId;

        setDmConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === partnerId);
          if (idx === -1) return prev;

          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.lastMessage = formatLastMessage(message.text);
          conv.time = formatConversationTime(message.createdAt);
          if (message.senderId !== currentUserId && activeDirectConversationIdRef.current !== partnerId) {
            conv.unread = (conv.unread ?? 0) + 1;
          } else if (activeDirectConversationIdRef.current === partnerId) {
            conv.unread = 0;
          }
          updated.splice(idx, 1);
          return [conv, ...updated];
        });
      },
      onGroupMessage: (message) => {
        setGroupConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === message.groupId);
          if (idx === -1) return prev;

          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.lastMessage = formatLastMessage(message.text);
          conv.time = formatConversationTime(message.createdAt);
          updated.splice(idx, 1);
          return [conv, ...updated];
        });
      },
      onReconnected: () => {
        void loadDirectMessages({ showLoading: false });
        void loadGroups();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [accessToken, loadDirectMessages, loadGroups]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setDmsError(null);
    setGroupsError(null);
    try {
      const [dms, groups] = await Promise.all([
        getDirectMessageConversations(),
        getGroupConversations(),
      ]);
      setDirectUnreadCountsFromConversations(dms);
      setDmConversations(dms.map(toConversationData));
      setGroupConversations(groups.map(toGroupConversationData));
    } catch {
      setDmsError('Unable to load conversations.');
    } finally {
      setIsRefreshing(false);
    }
  }, [setDirectUnreadCountsFromConversations]);

  const sourceConversations = subTab === 'DMs' ? dmConversations : groupConversations;

  const filtered = sourceConversations.filter(c => {
    if (topTab === 'Unread') return c.unread > 0;
    if (topTab === 'Blocked') return Boolean(c.isBlocked);
    return true;
  });

  const renderAvatar = (item: ConversationData) => {
    if (item.isGroup && item.groupAvatars) {
      return (
        <View style={styles.groupAvatarWrap}>
          <UserAvatar uri={item.groupAvatars[0]} size={34} style={[styles.groupAv1, { borderColor: colors.background }]} />
          <UserAvatar uri={item.groupAvatars[1]} size={28} style={[styles.groupAv2, { borderColor: colors.background }]} />
        </View>
      );
    }
    return (
      <View style={styles.avatarWrap}>
        <UserAvatar uri={item.avatar} name={item.name} size={40} style={styles.avatar} />
        {item.isOnline && <View style={[styles.onlineDot, { borderColor: colors.background }]} />}
      </View>
    );
  };

  const renderMessage = (item: ConversationData) => {
    if (item.isTyping) {
      return (
        <Text style={[styles.lastMsg, styles.typingText, !isDark && { color: colors.primary }]}>
          Typing...
        </Text>
      );
    }
    return (
      <Text
        style={[
          styles.lastMsg,
          !isDark && { color: colors.textSecondary },
          item.unread > 0 && (isDark ? styles.lastMsgUnread : { color: colors.text, fontWeight: '500' }),
        ]}
        numberOfLines={1}
      >
        {item.lastMessage}
      </Text>
    );
  };

  const handleOpenConversation = (item: ConversationData) => {
    if (!item.isGroup) {
      clearDirectUnread(item.id);
      setDmConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === item.id ? { ...conversation, unread: 0 } : conversation,
        ),
      );
    }

    router.push({
      pathname: '/chat-screen/chat-detail',
      params: {
        id: item.id,
        name: item.name,
        ...(item.avatar ? { avatar: item.avatar } : {}),
        ...(item.isGroup ? { isGroup: 'true' } : {}),
        ...(!item.isGroup ? { isOnline: item.isOnline ? 'true' : 'false', isBlocked: item.isBlocked ? 'true' : 'false' } : {}),
      },
    });
  };

  const renderConvoItem = ({ item }: { item: ConversationData }) => (
    <TouchableOpacity
      style={[
        styles.convoCard,
        // Unlike the Group row below, this card had no theme branch at all
        // — a translucent near-black surface applied unconditionally, so it
        // stayed dark-styled regardless of the theme setting.
        !isDark && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}
      onPress={() => handleOpenConversation(item)}
      activeOpacity={0.85}
    >
      {renderAvatar(item)}
      <View style={styles.convoMeta}>
        <View style={styles.convoTopRow}>
          <Text style={[styles.convoName, !isDark && { color: colors.text }]} numberOfLines={1}>
            {item.name}
            {item.isMuted && (
              <Feather
                name="bell-off"
                size={12}
                color={isDark ? "#B3B3B3" : colors.textSecondary}
                style={{ marginLeft: 6 }}
              />
            )}
          </Text>
          {item.time ? <Text style={[styles.convoTime, !isDark && { color: colors.textSecondary }]}>{item.time}</Text> : null}
        </View>
        <View style={styles.convoBottomRow}>
          <View style={styles.msgContent}>
            {item.messageType === 'text' && !item.unread && !item.isTyping && (
              <Ionicons
                name={item.id === 'c4' ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.id === 'c4' ? colors.primary : colors.textSecondary}
                style={{ marginRight: 4 }}
              />
            )}
            {renderMessage(item)}
          </View>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item }: { item: ConversationData }) => (
    <TouchableOpacity
      style={[styles.groupCard, { backgroundColor: colors.card }]}
      onPress={() => handleOpenConversation(item)}
      activeOpacity={0.85}
    >
      <UserAvatar uri={item.avatar} name={item.name} size={44} style={styles.groupCardAvatar} />
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
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unread > 99 ? '99+' : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderBlockedItem = ({ item }: { item: MessageBlockedUserResponse }) => {
    const isPending = pendingMessageUnblockIdSet.has(item.id);

    return (
      <View style={[styles.blockedRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.blockedRowClickable}
          activeOpacity={0.7}
          onPress={() => handleOpenConversation({
            id: item.id,
            name: item.name,
            avatar: item.avatarUrl ?? null,
            lastMessage: '',
            time: '',
            unread: 0,
            isOnline: false,
            isGroup: false,
          })}
        >
          <UserAvatar uri={item.avatarUrl} name={item.name} size={40} style={styles.avatar} />
          <View style={styles.blockedRowInfo}>
            <Text style={[styles.convoName, !isDark && { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unblockMessagesBtn,
            { borderColor: isDark ? '#AC86D4' : colors.primary },
            isPending && styles.disabledBtn,
          ]}
          activeOpacity={0.8}
          disabled={isPending}
          onPress={() => handleUnblockMessages(item)}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={isDark ? '#AC86D4' : colors.primary} />
          ) : (
            <Text style={[styles.unblockMessagesBtnText, { color: isDark ? '#AC86D4' : colors.primary }]}>
              Unblock
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderRoomItem = ({ item }: { item: typeof MOCK_ROOMS[0] }) => (
    <TouchableOpacity
      style={styles.roomCard}
      activeOpacity={0.85}
      onPress={() => router.push('/live-screen/live-room-screen')}
    >
      <View style={[styles.roomOvalCard, { backgroundColor: '#0D0D25', borderColor: '#AC86D4' }]}>
        <TouchableOpacity
          style={styles.roomAvatarWrap}
          onPress={() => router.push('/profile-screen/user-profile')}
        >
          <UserAvatar uri={item.hostAvatar} name={item.hostName} size={54} style={[styles.roomAvatar, { borderColor: colors.primary }]} />
          <View style={[styles.roomOnlineDot, { borderColor: '#0D0D25' }]} />
        </TouchableOpacity>
        
        {item.isHost && (
          <View style={styles.roomHostBadge}>
            <Text style={styles.roomHostText}>Host</Text>
          </View>
        )}
        
        <CinematicButton
          text="Join"
          height={32}
          width={50}
          borderRadius={12}
          onPress={() => router.push('/live-screen/live-room-screen')}
          style={{ marginTop: 10 }}
        />
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
              <UserAvatar uri={av} size={16} style={[styles.roomListenerAvatar, { marginLeft: idx > 0 ? -8 : 0, borderColor: colors.background }]} />
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card }]}
            activeOpacity={0.8}
            onPress={() => router.push('/chat-screen/create-group')}
            accessibilityRole="button"
            accessibilityLabel="Create group"
          >
            <Feather name="user-plus" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>



      {/* Segmented Control */}
      <View style={{ marginBottom: 16 }}>
        <SegmentedControl
          flat
          options={['DMs', 'Groups']}
          selectedOption={subTab}
          onSelect={(opt) => setSubTab(opt as any)}
          renderOption={(option, isSelected) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather
                name={option === 'DMs' ? 'mail' : 'users'}
                size={14}
                color={isSelected ? colors.text : colors.textSecondary}
              />
              <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? colors.text : colors.textSecondary }}>
                {option}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Top Tabs */}
      <View style={styles.tabRow}>
        {(['All', 'Unread', 'Blocked'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              !isDark && { borderColor: colors.border },
              topTab === tab && (isDark ? styles.tabActive : { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }),
            ]}
            onPress={() => setTopTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, topTab === tab && (isDark ? { color: '#FFFFFF' } : { color: colors.text })]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Room Tabs hidden — preserved for future restoration
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
      */}




      {/* Lists */}
      {isBlockedDmView ? (
        <FlatList
          key="message-blocked-list"
          data={messageBlockedUsers}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={isMessageBlockedLoading}
              onRefresh={() => void loadMessageBlockedUsers()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {isMessageBlockedLoading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {messageBlockedError ?? 'No blocked users'}
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={renderBlockedItem}
        />
      ) : (
      <FlatList
        key="conversations-list"
        data={filtered}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {(subTab === 'DMs' && isDmsLoading) || (subTab === 'Groups' && isGroupsLoading) ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {subTab === 'DMs'
                    ? dmsError ?? (topTab === 'Unread' ? 'No unread DMs' : 'No friends found')
                    : groupsError ?? (topTab === 'Unread' ? 'No unread groups' : 'No groups yet')}
                </Text>
              </>
            )}
          </View>
        }
        renderItem={(props) => subTab === 'Groups' ? renderGroupItem(props) : renderConvoItem(props)}
      />
      )}
      {/* Rooms grid hidden — preserved for future restoration
      {subTab === 'Rooms' && (
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
      )}
      */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },



  segmentedControl: { flexDirection: 'row', backgroundColor: '#161616', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, padding: 4 },
  segmentTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
  segmentTabActive: { backgroundColor: '#2C2C2E' },
  segmentTabText: { color: '#8E8E9B', fontSize: 13, fontWeight: '600' },

  roomTabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2A2A3A', marginHorizontal: 16, marginBottom: 8 },
  roomTab: { flex: 1, paddingVertical: 12, alignItems: 'center', position: 'relative' },
  roomTabText: { color: '#8E8E9B', fontSize: 13, fontWeight: '600' },
  roomTabTextActive: { color: '#FFFFFF' },
  roomTabIndicator: { position: 'absolute', bottom: -1, width: '100%', height: 2, backgroundColor: '#D4B0EB' },

  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 18 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#2A2A3A',
    backgroundColor: 'transparent'
  },
  tabActive: { backgroundColor: '#2C2C2E', borderColor: '#2C2C2E' },
  tabText: { color: '#8E8E9B', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  convoCard: {
    backgroundColor: 'rgba(17, 17, 17, 0.8)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    minHeight: 68,
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  groupAvatarWrap: { width: 48, height: 48, marginRight: 12, position: 'relative' },
  groupAv1: { width: 34, height: 34, borderRadius: 17, position: 'absolute', top: 0, left: 0, borderWidth: 2, borderColor: '#0e0d12' },
  groupAv2: { width: 28, height: 28, borderRadius: 14, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#0e0d12' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#16D869', borderWidth: 2, borderColor: '#111111' },

  // Chat -> DMs -> Blocked (message-blocked users) row — a dedicated,
  // management-oriented row (no last-message/unread/online, per product
  // requirement), mirroring app/profile-screen/blocked-accounts.tsx's row
  // pattern for the analogous Full Block list.
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  blockedRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  blockedRowInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  unblockMessagesBtn: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    minWidth: 84,
    paddingHorizontal: 10,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  unblockMessagesBtnText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  convoMeta: { flex: 1, gap: 4 },
  convoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convoName: { color: '#FFFFFF', fontWeight: '600', fontSize: 16, flex: 1, lineHeight: 20 },
  convoTime: { color: '#B3B3B3', fontSize: 10, lineHeight: 16, marginLeft: 8 },
  convoBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  msgContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  lastMsg: { color: '#B3B3B3', fontSize: 14, flex: 1, lineHeight: 16 },
  lastMsgUnread: { color: '#FFFFFF', fontWeight: '500' },
  typingText: { color: '#D4B0EB', fontStyle: 'italic' },
  unreadBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F2245C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: '#454555', fontSize: 14 },

  /* Rooms Grid */
  roomCard: { width: (width - 48) / 2, marginBottom: 24, alignItems: 'center' },
  roomOvalCard: { 
    width: "65%",
    height: "auto",
    borderRadius: 55,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  roomAvatarWrap: { position: 'relative' },
  roomAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2 },
  roomOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#16D869', borderWidth: 2 },
  roomHostBadge: { 
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#AC86D4",
    marginTop: 10,
    alignSelf: "center",
  },
  roomHostText: { 
    fontSize: 15,
    fontWeight: "700",
    color: "#AC86D4",
  },

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
  groupCardAvatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A1A3E' },
  groupCardAvatarLetter: { color: '#D4B0EB', fontSize: 18, fontWeight: 'bold' },
  groupCardMeta: { flex: 1 },
  groupCardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  groupCardName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  groupCardDot: { color: '#454555', fontSize: 14, marginHorizontal: 2 },
  groupCardTime: { color: '#8E8E9B', fontSize: 12 },
  groupCardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  groupCardMsg: { color: '#8E8E9B', fontSize: 13, flex: 1, marginRight: 8 },
  groupCardUnreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F2245C' },
});
