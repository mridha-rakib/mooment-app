import BackButton from '@/components/ui/BackButton';
import {
  Feather,
  Ionicons } from '@expo/vector-icons';
import { AttachmentIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useLocalSearchParams,
  useRouter } from 'expo-router';
import React,
  { useEffect,
  useRef,
  useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDirectMessageHistory } from '@/lib/chat';
import type { DirectChatMessageResponse } from '@/lib/chat';
import { createRealtimeSocket } from '@/lib/realtime';
import type { DirectRealtimeMessage } from '@/lib/realtime';
import { useAuthStore } from '@/stores/authStore';

const { width } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────────
type Reaction = { emoji: string; count: number };
type MessageType = 'text' | 'image' | 'audio' | 'event';

type Message = {
  id: string;
  clientMessageId?: string | null;
  fromMe: boolean;
  type: MessageType;
  text?: string;
  imageUri?: string;
  audioDuration?: string;
  eventTitle?: string;
  eventDate?: string;
  eventImage?: string;
  locationTitle?: string;
  locationDesc?: string;
  reactions?: Reaction[];
  time: string;
  delivered?: boolean;
  read?: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  isHost?: boolean;
};

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1', fromMe: false, type: 'text',
    senderName: 'DJ Koko', isHost: true, senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    text: "Doors open at 9 pm sharp. Rooftop level 7. Can't waint to see you all there tonight",
    locationTitle: 'Sky Terrace, Floor 7',
    locationDesc: 'Tap to open in maps',
    time: '8:30pm',
  },
  {
    id: 'm2', fromMe: false, type: 'text',
    senderName: 'Jane Cooper', isHost: false, senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
    text: "Doors open at 9 pm sharp. Rooftop level 7. Can't waint to see you all there tonight",
    time: '8:30pm',
  },
  {
    id: 'm3', fromMe: true, type: 'text',
    text: 'See you all up there!',
    time: '8:30pm', delivered: true,
  },
];

const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 28, 16, 24, 10, 18, 22, 14, 26, 8, 20, 16, 12, 24, 18, 10, 14];

const formatRealtimeTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const isObjectId = (value?: string) => /^[a-f\d]{24}$/i.test(value ?? '');

const toRealtimeTextMessage = (message: DirectRealtimeMessage, currentUserId?: string): Message => ({
  clientMessageId: message.clientMessageId ?? null,
  delivered: message.senderId === currentUserId,
  fromMe: message.senderId === currentUserId,
  id: message.id,
  senderId: message.senderId,
  senderName: message.senderName,
  text: message.text,
  time: formatRealtimeTime(message.createdAt),
  type: 'text',
});

const toApiTextMessage = (message: DirectChatMessageResponse, currentUserId?: string): Message => ({
  delivered: message.senderId === currentUserId,
  fromMe: message.senderId === currentUserId,
  id: message.id,
  senderId: message.senderId,
  text: message.text,
  time: formatRealtimeTime(message.createdAt),
  type: 'text',
});

// ── Bubble Components ──────────────────────────────────────────────────────
function TextBubble({ msg }: { msg: Message }) {
  const isHostMsg = !msg.fromMe && msg.isHost;

  return (
    <View style={[styles.bubble, msg.fromMe ? styles.bubbleMe : (isHostMsg ? styles.bubbleHost : styles.bubbleThem)]}>
      <Text style={[styles.bubbleText, msg.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
        {msg.text}
      </Text>

      {/* Location Attachment */}
      {msg.locationTitle && (
        <TouchableOpacity style={styles.locationBox} activeOpacity={0.8}>
          <View style={styles.locationIconWrap}>
            <Feather name="map-pin" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.locationTitle}>{msg.locationTitle}</Text>
            <Text style={styles.locationDesc}>{msg.locationDesc}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.bubbleMeta, !msg.fromMe && { justifyContent: 'flex-start' }]}>
        <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe]}>
          {msg.time}
          {msg.fromMe && msg.delivered ? ' • Delivered' : ''}
        </Text>
      </View>
    </View>
  );
}

function ImageBubble({ msg }: { msg: Message }) {
  return (
    <View style={[styles.imageBubble, msg.fromMe ? styles.imageBubbleMe : styles.imageBubbleThem]}>
      <Image source={{ uri: msg.imageUri }} style={styles.bubbleImage} />
      <View style={styles.imageTimeBadge}>
        <Text style={styles.imageTimeText}>{msg.time}</Text>
        {msg.fromMe && (
          <Ionicons name={msg.read ? 'checkmark-done' : 'checkmark'} size={11} color="#fff" style={{ marginLeft: 3 }} />
        )}
      </View>
    </View>
  );
}

function AudioBubble({ msg }: { msg: Message }) {
  const [playing, setPlaying] = useState(false);
  return (
    <View style={[styles.bubble, msg.fromMe ? styles.bubbleMe : styles.bubbleThem, styles.audioBubble]}>
      <TouchableOpacity
        style={[styles.audioPlayBtn, msg.fromMe && styles.audioPlayBtnMe]}
        onPress={() => setPlaying(p => !p)}
        activeOpacity={0.8}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={16} color={msg.fromMe ? '#D4B0EB' : '#FFFFFF'} style={{ marginLeft: playing ? 0 : 2 }} />
      </TouchableOpacity>
      <View style={styles.waveformRow}>
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[
              styles.waveBar,
              { height: h },
              i < (playing ? 10 : 0)
                ? (msg.fromMe ? { backgroundColor: '#D4B0EB' } : { backgroundColor: '#FFFFFF' })
                : { backgroundColor: msg.fromMe ? 'rgba(212,176,235,0.35)' : 'rgba(255,255,255,0.3)' },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioDuration, msg.fromMe && styles.audioDurationMe]}>{msg.audioDuration}</Text>
    </View>
  );
}

function EventBubble({ msg }: { msg: Message }) {
  return (
    <View style={[styles.eventBubble, msg.fromMe ? styles.eventBubbleMe : styles.eventBubbleThem]}>
      {msg.eventImage && (
        <Image source={{ uri: msg.eventImage }} style={styles.eventBubbleImage} />
      )}
      <View style={styles.eventBubbleInfo}>
        <View style={styles.eventBubbleTag}>
          <Ionicons name="calendar-outline" size={11} color="#D4B0EB" />
          <Text style={styles.eventBubbleTagText}>Event</Text>
        </View>
        <Text style={styles.eventBubbleTitle} numberOfLines={2}>{msg.eventTitle}</Text>
        <Text style={styles.eventBubbleDate}>{msg.eventDate}</Text>
        <TouchableOpacity style={styles.eventBubbleBtn} activeOpacity={0.8}>
          <Text style={styles.eventBubbleBtnText}>View Event</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bubbleMeta}>
        <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe]}>{msg.time}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string; avatar: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [showAttach, setShowAttach] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const listRef = useRef<FlatList>(null);
  const realtimeRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const ownTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingTypingRef = useRef(false);

  const name = params.name || 'Eleanor Pena';
  const avatar = params.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop';
  const friendId = params.id;

  const clearOwnTypingStopTimer = () => {
    if (ownTypingStopTimerRef.current) {
      clearTimeout(ownTypingStopTimerRef.current);
      ownTypingStopTimerRef.current = null;
    }
  };

  const sendOwnTypingState = (nextIsTyping: boolean) => {
    if (!isObjectId(friendId) || isSendingTypingRef.current === nextIsTyping) {
      return;
    }

    const realtime = realtimeRef.current;

    if (!realtime) {
      if (!nextIsTyping) {
        isSendingTypingRef.current = false;
      }

      return;
    }

    isSendingTypingRef.current = nextIsTyping;
    realtime.sendDirectTyping(friendId, nextIsTyping);
  };

  const stopOwnTyping = () => {
    clearOwnTypingStopTimer();
    sendOwnTypingState(false);
  };

  const handleInputTextChange = (value: string) => {
    setInputText(value);

    if (!isObjectId(friendId)) {
      return;
    }

    if (!value.trim()) {
      stopOwnTyping();
      return;
    }

    sendOwnTypingState(true);
    clearOwnTypingStopTimer();
    ownTypingStopTimerRef.current = setTimeout(() => {
      sendOwnTypingState(false);
      ownTypingStopTimerRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    setIsFriendTyping(false);
    isSendingTypingRef.current = false;

    if (ownTypingStopTimerRef.current) {
      clearTimeout(ownTypingStopTimerRef.current);
      ownTypingStopTimerRef.current = null;
    }

    if (friendTypingTimeoutRef.current) {
      clearTimeout(friendTypingTimeoutRef.current);
      friendTypingTimeoutRef.current = null;
    }
  }, [friendId]);

  useEffect(() => {
    if (!isObjectId(friendId)) {
      setMessages(MOCK_MESSAGES);
      return;
    }

    let isMounted = true;

    const loadMessageHistory = async () => {
      try {
        const history = await getDirectMessageHistory(friendId);

        if (!isMounted) {
          return;
        }

        setMessages(history.map((message) => toApiTextMessage(message, currentUser?.id)));
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
      } catch {
        if (isMounted) {
          setMessages(MOCK_MESSAGES);
        }
      }
    };

    void loadMessageHistory();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, friendId]);

  useEffect(() => {
    if (!accessToken || !isObjectId(friendId)) {
      return;
    }

    const realtime = createRealtimeSocket({
      accessToken,
      onDirectMessage: (realtimeMessage) => {
        const isCurrentConversation =
          realtimeMessage.senderId === friendId || realtimeMessage.recipientId === friendId;

        if (!isCurrentConversation) {
          return;
        }

        setMessages((prev) => {
          const alreadyExists = prev.some(
            (message) =>
              message.id === realtimeMessage.id ||
              (Boolean(realtimeMessage.clientMessageId) &&
                message.clientMessageId === realtimeMessage.clientMessageId),
          );

          if (alreadyExists) {
            return prev;
          }

          return [...prev, toRealtimeTextMessage(realtimeMessage, currentUser?.id)];
        });
        if (realtimeMessage.senderId === friendId) {
          if (friendTypingTimeoutRef.current) {
            clearTimeout(friendTypingTimeoutRef.current);
            friendTypingTimeoutRef.current = null;
          }

          setIsFriendTyping(false);
        }
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      onDirectTyping: (typing) => {
        const isCurrentConversation =
          typing.senderId === friendId && (!currentUser?.id || typing.recipientId === currentUser.id);

        if (!isCurrentConversation) {
          return;
        }

        if (friendTypingTimeoutRef.current) {
          clearTimeout(friendTypingTimeoutRef.current);
          friendTypingTimeoutRef.current = null;
        }

        setIsFriendTyping(typing.isTyping);

        if (typing.isTyping) {
          friendTypingTimeoutRef.current = setTimeout(() => {
            setIsFriendTyping(false);
            friendTypingTimeoutRef.current = null;
          }, 3500);
        }
      },
    });

    realtimeRef.current = realtime;

    return () => {
      clearOwnTypingStopTimer();
      if (isObjectId(friendId) && isSendingTypingRef.current) {
        realtime.sendDirectTyping(friendId, false);
        isSendingTypingRef.current = false;
      }
      realtime.close();
      if (realtimeRef.current === realtime) {
        realtimeRef.current = null;
      }
    };
  }, [accessToken, currentUser?.id, friendId]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    const clientMessageId = `dm-${Date.now()}`;
    const newMsg: Message = {
      clientMessageId,
      id: clientMessageId,
      fromMe: true,
      type: 'text',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: true,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    stopOwnTyping();
    if (isObjectId(friendId)) {
      realtimeRef.current?.sendDirectMessage(friendId, text, clientMessageId);
    }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderBubble = (item: Message) => {
    switch (item.type) {
      case 'image': return <ImageBubble msg={item} />;
      case 'audio': return <AudioBubble msg={item} />;
      case 'event': return <EventBubble msg={item} />;
      default: return <TextBubble msg={item} />;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton size={20} />

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.8}
          onPress={() => {
            router.push({
              pathname: '/profile-screen/user-profile',
              params: {
                userId: params.id,
                name: name,
                avatar: avatar
              }
            } as any);
          }}
        >
          <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={styles.headerStatus}>{isFriendTyping ? 'Typing...' : 'Online'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(true)}>
            <Feather name="more-vertical" size={20} color="#8E8E9B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContainer}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const prevMsg = messages[index - 1];
            const showAvatar = !item.fromMe && (index === 0 || messages[index - 1]?.fromMe);
            const isSameGroup = prevMsg && prevMsg.fromMe === item.fromMe;
            return (
              <View>
                {/* Date separator (mock) */}
                {index === 0 && (
                  <View style={styles.dateSep}>
                    <View style={styles.dateSepLine} />
                    <Text style={styles.dateSepText}>Today</Text>
                    <View style={styles.dateSepLine} />
                  </View>
                )}

                <View style={[styles.msgRow, item.fromMe ? styles.msgRowMe : styles.msgRowThem, !isSameGroup && { marginTop: 12 }]}>
                  <View style={{ maxWidth: width * 0.72 }}>
                    {renderBubble(item)}

                    {/* Reactions */}
                    {item.reactions && item.reactions.length > 0 && (
                      <View style={[styles.reactionsRow, item.fromMe ? styles.reactionsRowMe : styles.reactionsRowThem]}>
                        {item.reactions.map((r: any, i: any) => (
                          <View key={i} style={styles.reactionPill}>
                            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                            {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isFriendTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, { opacity: 0.6 }]} />
                  <View style={[styles.typingDot, { opacity: 0.3 }]} />
                </View>
              </View>
            ) : null
          }
        />

        {/* ── Attachment Options ── */}
        {showAttach && (
          <View style={styles.attachPanel}>
            {[
              { icon: 'image', label: 'Gallery', color: '#8E54E9' },
              { icon: 'camera', label: 'Camera', color: '#3B82F6' },
              { icon: 'music', label: 'Audio', color: '#F2245C' },
              { icon: 'map-pin', label: 'Location', color: '#16D869' },
              { icon: 'calendar', label: 'Event', color: '#D4B0EB' },
              { icon: 'gift', label: 'Gift', color: '#F59E0B' },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.attachItem} activeOpacity={0.8}>
                <View style={[styles.attachIconWrap, { backgroundColor: a.color + '22' }]}>
                  <Feather name={a.icon as any} size={22} color={a.color} />
                </View>
                <Text style={styles.attachLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TouchableOpacity style={styles.emojiBtn} activeOpacity={0.8}>
              <Feather name="smile" size={20} color="#8E8E9B" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Add Comment"
              placeholderTextColor="#8E8E9B"
              value={inputText}
              onChangeText={handleInputTextChange}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.fileBtn} activeOpacity={0.8}>
              <HugeiconsIcon icon={AttachmentIcon} size={20} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
            <Feather name="send" size={18} color="#0e0d12" style={{ marginLeft: -2, marginTop: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── More Options Modal ── */}
      <Modal visible={isMoreMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMoreMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMoreMenuVisible(false)}>
          <View style={styles.moreMenuContainer}>
            <View style={styles.moreMenuBox}>
              <TouchableOpacity
                style={styles.moreMenuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setIsBlocked(!isBlocked);
                  setIsMoreMenuVisible(false);
                }}
              >
                <Ionicons name="ban-outline" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                <Text style={styles.moreMenuText}>{isBlocked ? 'Unblock' : 'Block'}</Text>
              </TouchableOpacity>

              <View style={styles.moreMenuSeparator} />

              <TouchableOpacity
                style={styles.moreMenuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setIsMoreMenuVisible(false);
                  router.push('/plan-screen/my-plan' as any);
                }}
              >
                <Feather name="plus" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                <Text style={styles.moreMenuText}>Create Plan</Text>
              </TouchableOpacity>

              <View style={styles.moreMenuSeparator} />

              <TouchableOpacity style={styles.moreMenuItem} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(false)}>
                <Feather name="calendar" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                <Text style={styles.moreMenuText}>Share Calendar</Text>
              </TouchableOpacity>

              <View style={styles.moreMenuSeparator} />

              <TouchableOpacity style={styles.moreMenuItem} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(false)}>
                <Feather name="trash-2" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                <Text style={styles.moreMenuText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: 60 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12
  },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  headerName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  headerStatus: { color: '#8E8E9B', fontSize: 11, marginTop: 1 },
  headerRight: { paddingRight: 4 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  /* Messages */
  messagesContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  dateSepText: { color: '#8E8E9B', fontSize: 11, marginHorizontal: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },

  /* Text Bubble */
  bubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, maxWidth: '90%' },
  bubbleMe: { backgroundColor: '#B2ABBA', borderBottomRightRadius: 2 },
  bubbleThem: { backgroundColor: '#111111', borderTopLeftRadius: 2, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  bubbleHost: { backgroundColor: '#191136', borderTopLeftRadius: 2 },
  bubbleSenderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bubbleSenderName: { color: '#8E8E9B', fontSize: 12, fontWeight: '600' },
  bubbleHostTag: { color: '#D4B0EB', fontSize: 10, fontWeight: '400' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#0e0d12' },
  bubbleTextThem: { color: '#FFFFFF' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 8 },
  bubbleTime: { color: '#8E8E9B', fontSize: 11 },
  bubbleTimeMe: { color: 'rgba(14, 13, 18, 0.5)' },

  /* Location Box */
  locationBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, marginTop: 12, marginBottom: 4, minWidth: 200 },
  locationIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#5D35B0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  locationTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  locationDesc: { color: '#8E8E9B', fontSize: 11 },

  /* Image Bubble */
  imageBubble: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  imageBubbleMe: { alignSelf: 'flex-end' },
  imageBubbleThem: { alignSelf: 'flex-start' },
  bubbleImage: { width: width * 0.6, height: width * 0.6, borderRadius: 16 },
  imageTimeBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  imageTimeText: { color: '#FFF', fontSize: 10 },

  /* Audio Bubble */
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  audioPlayBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  audioPlayBtnMe: { backgroundColor: 'rgba(212,176,235,0.2)' },
  waveformRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  audioDuration: { color: '#8E8E9B', fontSize: 11 },
  audioDurationMe: { color: 'rgba(212,176,235,0.7)' },

  /* Event Bubble */
  eventBubble: { borderRadius: 16, overflow: 'hidden', maxWidth: width * 0.72 },
  eventBubbleMe: { backgroundColor: '#3B1F5E', alignSelf: 'flex-end' },
  eventBubbleThem: { backgroundColor: '#1A1A2E', alignSelf: 'flex-start' },
  eventBubbleImage: { width: '100%', height: 120 },
  eventBubbleInfo: { padding: 12 },
  eventBubbleTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  eventBubbleTagText: { color: '#D4B0EB', fontSize: 11, fontWeight: '600' },
  eventBubbleTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  eventBubbleDate: { color: '#8E8E9B', fontSize: 12, marginBottom: 10 },
  eventBubbleBtn: { backgroundColor: '#D4B0EB', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  eventBubbleBtnText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 13 },

  /* Reactions */
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsRowMe: { justifyContent: 'flex-end' },
  reactionsRowThem: { justifyContent: 'flex-start' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, gap: 3, borderWidth: 1, borderColor: '#2A2A3A' },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: '#8E8E9B', fontSize: 11, fontWeight: '600' },

  /* Typing */
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, marginTop: 8, marginBottom: 4 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8E8E9B' },

  /* Attachment Panel */
  attachPanel: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#13131A', paddingHorizontal: 16, paddingVertical: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#1A1A2E' },
  attachItem: { width: (width - 80) / 3, alignItems: 'center', gap: 6 },
  attachIconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  attachLabel: { color: '#8E8E9B', fontSize: 12 },

  /* Input Bar */
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, backgroundColor: '#0e0d12', gap: 10 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, minHeight: 48 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14, maxHeight: 100, marginLeft: 10, marginRight: 10 },
  emojiBtn: { justifyContent: 'center', alignItems: 'center', width: 24 },
  fileBtn: { justifyContent: 'center', alignItems: 'center', width: 24 },
  sendBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#B2ABBA', justifyContent: 'center', alignItems: 'center' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  moreMenuContainer: { position: 'absolute', top: 155, right: 16 },
  moreMenuBox: { width: 160, backgroundColor: 'rgba(30, 29, 33, 0.95)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  moreMenuIcon: { marginRight: 12 },
  moreMenuText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  moreMenuSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
});
