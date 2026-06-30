import BackButton from '@/components/ui/BackButton';
import CinematicButton from '@/components/ui/CinematicButton';
import UserAvatar from '@/components/ui/UserAvatar';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { safeBack } from '@/lib/navigation';
import { buttonBackground, buttonForeground } from '@/lib/buttonTheme';
import { getLiveRoomMessages, joinLiveRoom, leaveLiveRoom, updateLiveRoomPermissions } from '@/lib/liveRooms';
import type { LiveRoom, LiveRoomMessage, LiveRoomParticipant, LiveRoomViewerPermissions } from '@/lib/liveRooms';
import { createRealtimeSocket } from '@/lib/realtime';
import type { LiveRealtimeMessage } from '@/lib/realtime';
import { getStorageFileUrl } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';
import { Feather } from '@expo/vector-icons';
import { Mic01Icon, MicOff01Icon, MoreHorizontalIcon, UnavailableIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Dimensions,
  Modal, Pressable, ScrollView, StatusBar,
  StyleSheet, Text,
  TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { width } = Dimensions.get('window');

/* ─── Types ─── */
type ChatMessage = { id: string; senderId?: string; avatar?: string | null; name: string; role: string | null; time: string; text: string };
type Participant = { id: string; userId: string; name: string; avatar?: string | null; micMuted: boolean; hidden: boolean; canSpeak: boolean };

/* ─── Initial Data ─── */
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', avatar: null, name: 'Dj Koko', role: 'Host', time: '9:02pm', text: 'Welcome everyone! Going lie in a few mins' },
  { id: '2', avatar: null, name: 'Tuval', role: null, time: '9:02pm', text: 'Cant wait, already at the venue' },
  { id: '3', avatar: null, name: 'Nosel', role: null, time: '9:02pm', text: 'What track are you opening with tonight?' },
];

const INITIAL_PARTICIPANTS: Participant[] = [
  { id: '1', userId: '1', name: 'Lister', avatar: null, micMuted: false, hidden: false, canSpeak: true },
  { id: '2', userId: '2', name: 'Kate', avatar: null, micMuted: true, hidden: true, canSpeak: false },
  { id: '3', userId: '3', name: 'Sona', avatar: null, micMuted: false, hidden: true, canSpeak: true },
];

const SIMULATED_MSGS = [
  { name: 'Alex', text: 'This is going to be fire 🔥' },
  { name: 'Maya', text: 'Can you play some house music?' },
  { name: 'Jordan', text: 'First time here, loving the vibes!' },
  { name: 'Priya', text: 'Let\'s gooo 🎶' },
  { name: 'Sam', text: 'Shoutout from London!' },
];

const DEFAULT_ROOM_PERMISSIONS: LiveRoomViewerPermissions = {
  isHost: true,
  canSpeak: true,
  canManagePermissions: true,
};

/* ─── Helpers ─── */
function getTimeNow() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h > 12 ? h - 12 : h || 12}:${m}${h >= 12 ? 'pm' : 'am'}`;
}

function formatMessageTime(value?: string) {
  if (!value) {
    return getTimeNow();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getTimeNow();
  }

  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h > 12 ? h - 12 : h || 12}:${m}${h >= 12 ? 'pm' : 'am'}`;
}

function toLiveChatMessage(message: LiveRealtimeMessage, hostUserId?: string): ChatMessage {
  return {
    avatar: message.senderAvatarUrl ?? null,
    id: message.id,
    senderId: message.senderId,
    name: message.senderName,
    role: message.senderId === hostUserId ? 'Host' : null,
    text: message.text,
    time: formatMessageTime(message.createdAt),
  };
}

function toApiChatMessage(message: LiveRoomMessage, hostUserId?: string): ChatMessage {
  return {
    avatar: message.senderAvatarUrl ?? null,
    id: message.id,
    senderId: message.senderId,
    name: message.senderName,
    role: message.senderId === hostUserId ? 'Host' : null,
    text: message.text,
    time: formatMessageTime(message.createdAt),
  };
}

function toParticipant(participant: LiveRoomParticipant): Participant | null {
  if (!participant.user) {
    return null;
  }

  return {
    id: participant.id,
    userId: participant.user.id,
    name: participant.user.name,
    avatar: participant.user.avatarUrl ?? null,
    micMuted: !participant.canSpeak,
    hidden: false,
    canSpeak: participant.canSpeak,
  };
}

function resolveStorageAvatar(key?: string | null) {
  if (!key) {
    return null;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return null;
  }
}

function parseBooleanParam(value?: string) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function isMongoObjectId(value?: string) {
  return Boolean(value && /^[a-f\d]{24}$/i.test(value));
}

/* ─── Animated Audio Bars ─── */
function AudioBars() {
  const BAR_COUNT = 15;
  const anims = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(Math.random() * 16 + 6))).current;

  useEffect(() => {
    const loops = anims.map((a) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(a, { toValue: Math.random() * 20 + 4, duration: 200 + Math.random() * 300, useNativeDriver: false }),
          Animated.timing(a, { toValue: Math.random() * 10 + 4, duration: 200 + Math.random() * 300, useNativeDriver: false }),
        ]).start(animate);
      };
      animate();
      return a;
    });
    return () => loops.forEach((a) => a.stopAnimation());
  }, []);

  return (
    <View style={styles.audioBarsRow}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[styles.audioBar, { height: a, backgroundColor: i % 3 === 0 ? '#FF4444' : i % 3 === 1 ? '#FF6B3D' : '#FFD93D' }]} />
      ))}
    </View>
  );
}

/* ─── Pulsing Live Dot ─── */
function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, []);

  return <Animated.View style={[styles.liveDot, { transform: [{ scale }], opacity }]} />;
}

/* ═══════════════════ MAIN ═══════════════════ */
export default function EventDetailsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; title?: string; allowAllParticipantsToSpeak?: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const initialAllowAll = parseBooleanParam(params.allowAllParticipantsToSpeak) ?? true;
  const liveRoomId = params.id || params.title || 'general-live-room';
  const hasPersistedLiveRoom = isMongoObjectId(params.id);

  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'permission'>('chat');
  const [roomTitle, setRoomTitle] = useState(params.title?.trim() || 'DJ Nova');
  const [hostUserId, setHostUserId] = useState<string | undefined>(undefined);
  const [hostName, setHostName] = useState(params.title?.trim() || 'DJ Nova');
  const [hostAvatar, setHostAvatar] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<'live' | 'ended'>('live');
  const [allowAll, setAllowAll] = useState(initialAllowAll);
  const [roomPermissions, setRoomPermissions] = useState<LiveRoomViewerPermissions>(DEFAULT_ROOM_PERMISSIONS);
  const [speakerIds, setSpeakerIds] = useState<string[]>([]);
  const [isLoadingRoom, setIsLoadingRoom] = useState(hasPersistedLiveRoom);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [comment, setComment] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(hasPersistedLiveRoom ? [] : INITIAL_MESSAGES);
  const [participants, setParticipants] = useState<Participant[]>(() =>
    hasPersistedLiveRoom
      ? []
      : initialAllowAll ? INITIAL_PARTICIPANTS : INITIAL_PARTICIPANTS.map((participant) => ({ ...participant, micMuted: true, canSpeak: false })),
  );
  const [listenerCount, setListenerCount] = useState(hasPersistedLiveRoom ? 0 : 412);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const nextId = useRef(10);
  const simIdx = useRef(0);
  const realtimeRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);

  const applyLiveRoom = useCallback((liveRoom: LiveRoom) => {
    setRoomTitle(liveRoom.title);
    setHostUserId(liveRoom.hostUserId);
    setHostName(liveRoom.host?.name ?? liveRoom.title);
    setHostAvatar(liveRoom.host?.avatarUrl ?? null);
    setRoomStatus(liveRoom.status);
    setAllowAll(liveRoom.allowAllParticipantsToSpeak);
    setRoomPermissions(liveRoom.viewerPermissions);
    setSpeakerIds(liveRoom.speakerIds);
    setListenerCount(liveRoom.listenerCount);
    setParticipants(liveRoom.participants.map(toParticipant).filter((participant): participant is Participant => Boolean(participant)));
  }, []);

  const applyParticipantSpeakMode = useCallback((nextAllowAll: boolean) => {
    setParticipants((prev) => prev.map((participant) => ({
      ...participant,
      canSpeak: nextAllowAll,
      micMuted: !nextAllowAll,
    })));
  }, []);

  useEffect(() => {
    if (params.title?.trim()) {
      setRoomTitle(params.title.trim());
    }
  }, [params.title]);

  useEffect(() => {
    const persistedLiveRoomId = params.id;

    if (!hasPersistedLiveRoom || !persistedLiveRoomId) {
      return;
    }

    let isMounted = true;

    const loadLiveRoom = async () => {
      try {
        const [liveRoom, history] = await Promise.all([
          joinLiveRoom(persistedLiveRoomId),
          getLiveRoomMessages(persistedLiveRoomId, { limit: 50 }),
        ]);

        if (!isMounted) {
          return;
        }

        applyLiveRoom(liveRoom);
        setMessages(history.map((message) => toApiChatMessage(message, liveRoom.hostUserId)));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        Alert.alert(
          'Unable to load room',
          getAuthErrorMessage(error, 'The room details could not be loaded.'),
        );
      } finally {
        if (isMounted) {
          setIsLoadingRoom(false);
        }
      }
    };

    void loadLiveRoom();

    return () => {
      isMounted = false;
      void leaveLiveRoom(persistedLiveRoomId).catch(() => undefined);
    };
  }, [applyLiveRoom, hasPersistedLiveRoom, params.id]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const realtime = createRealtimeSocket({
      accessToken,
      onLiveMessage: (roomId, realtimeMessage) => {
        if (roomId !== liveRoomId || realtimeMessage.senderId === currentUser?.id) {
          return;
        }

        setMessages((prev) => {
          const alreadyExists = prev.some(
            (message) =>
              message.id === realtimeMessage.id ||
              (Boolean(realtimeMessage.clientMessageId) &&
                message.id === realtimeMessage.clientMessageId),
          );

          if (alreadyExists) {
            return prev;
          }

          return [...prev, toLiveChatMessage(realtimeMessage, hostUserId)];
        });
      },
      onReady: () => {
        realtime.joinLiveRoom(liveRoomId);
      },
    });

    realtimeRef.current = realtime;
    realtime.joinLiveRoom(liveRoomId);

    return () => {
      realtime.leaveLiveRoom(liveRoomId);
      realtime.close();
      if (realtimeRef.current === realtime) {
        realtimeRef.current = null;
      }
    };
  }, [accessToken, currentUser?.id, hostUserId, liveRoomId]);

  // Keep the legacy static room lively when opened without a persisted room id.
  useEffect(() => {
    if (hasPersistedLiveRoom) {
      return;
    }

    const iv = setInterval(() => {
      const msg = SIMULATED_MSGS[simIdx.current % SIMULATED_MSGS.length];
      simIdx.current++;
      setMessages((prev) => [...prev, {
        id: String(nextId.current++),
        avatar: null,
        name: msg.name, role: null, time: getTimeNow(), text: msg.text,
      }]);
      setListenerCount((c) => c + Math.floor(Math.random() * 5) - 1);
    }, 8000);
    return () => clearInterval(iv);
  }, [hasPersistedLiveRoom]);

  // Toggle speaking indicator
  useEffect(() => {
    const iv = setInterval(() => setIsSpeaking((s) => !s), 4000);
    return () => clearInterval(iv);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages, activeTab]);

  const handleSend = useCallback(() => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    const clientMessageId = `live-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: clientMessageId,
      senderId: currentUser?.id,
      avatar: resolveStorageAvatar(currentUser?.avatarKey),
      name: 'You',
      role: currentUser?.id === hostUserId ? 'Host' : null,
      time: getTimeNow(),
      text: trimmed,
    }]);
    setComment('');
    realtimeRef.current?.sendLiveMessage(liveRoomId, trimmed, clientMessageId);
  }, [comment, currentUser?.avatarKey, currentUser?.id, hostUserId, liveRoomId]);

  const toggleMic = useCallback(async (id: string) => {
    const participant = participants.find((p) => p.id === id);

    if (!participant) {
      return;
    }

    if (!hasPersistedLiveRoom || allowAll) {
      setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, micMuted: !p.micMuted, canSpeak: p.micMuted } : p));
      return;
    }

    if (!roomPermissions.canManagePermissions || !params.id) {
      Alert.alert('Permission unavailable', 'Only the room host can update speakers.');
      return;
    }

    const nextSpeakerIds = participant.canSpeak
      ? speakerIds.filter((speakerId) => speakerId !== participant.userId)
      : [...new Set([...speakerIds, participant.userId])];

    try {
      const liveRoom = await updateLiveRoomPermissions(params.id, {
        speakerIds: nextSpeakerIds,
      });

      applyLiveRoom(liveRoom);
    } catch (error) {
      Alert.alert(
        'Unable to update speaker',
        getAuthErrorMessage(error, 'Please try changing this participant permission again.'),
      );
    }
  }, [
    allowAll,
    applyLiveRoom,
    hasPersistedLiveRoom,
    params.id,
    participants,
    roomPermissions.canManagePermissions,
    speakerIds,
  ]);

  const toggleHidden = useCallback((id: string) => {
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, hidden: !p.hidden } : p));
  }, []);

  const handleLeave = useCallback(() => {
    Alert.alert('Leave Room', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          if (hasPersistedLiveRoom && params.id) {
            void leaveLiveRoom(params.id).finally(() => safeBack(router, '/(tabs)/home'));
            return;
          }

          safeBack(router, '/(tabs)/home');
        },
      },
    ]);
  }, [hasPersistedLiveRoom, params.id, router]);

  const handleAllowAll = useCallback(async () => {
    if (isUpdatingPermissions) {
      return;
    }

    if (hasPersistedLiveRoom && !roomPermissions.canManagePermissions) {
      Alert.alert('Permission unavailable', 'Only the room host can change speaking permissions.');
      return;
    }

    const next = !allowAll;
    const previous = allowAll;

    setAllowAll(next);
    applyParticipantSpeakMode(next);

    if (!hasPersistedLiveRoom || !params.id) {
      return;
    }

    setIsUpdatingPermissions(true);

    try {
      const liveRoom = await updateLiveRoomPermissions(params.id, {
        allowAllParticipantsToSpeak: next,
      });

      applyLiveRoom(liveRoom);
    } catch (error) {
      setAllowAll(previous);
      applyParticipantSpeakMode(previous);
      Alert.alert(
        'Unable to update permission',
        getAuthErrorMessage(error, 'Please try changing the room permission again.'),
      );
    } finally {
      setIsUpdatingPermissions(false);
    }
  }, [
    allowAll,
    applyLiveRoom,
    applyParticipantSpeakMode,
    hasPersistedLiveRoom,
    isUpdatingPermissions,
    params.id,
    roomPermissions.canManagePermissions,
  ]);

  const handleMicPress = useCallback(() => {
    if (!roomPermissions.canSpeak) {
      Alert.alert('Microphone unavailable', 'The host has not allowed participants to speak in this room.');
      return;
    }

    setIsSpeaking((current) => !current);
  }, [roomPermissions.canSpeak]);

  const toggleBlock = (name: string) => {
    setBlockedUsers(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    setSelectedMessage(null);
  };

  const toggleMute = (name: string) => {
    setMutedUsers(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
    setSelectedMessage(null);
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton size={22} color={colors.text} />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Pre-show with {roomTitle}</Text>
        <CinematicButton
          icon={MoreHorizontalIcon}
          onPress={() => setShowMore(true)}
        />
      </View>

      {/* ── More Menu Modal ── */}
      <Modal
        visible={showMore}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMore(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMore(false)}>
          <View style={[
            styles.moreMenu,
            {
              top: insets.top + 55,
              right: 20,
              backgroundColor: isDark ? '#2D2D3D' : '#F2F2F2',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 5
            }
          ]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMore(false); Alert.alert('Reported'); }}>
              <Feather name="flag" size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Report</Text>
            </TouchableOpacity>
            <View style={[styles.menuSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMore(false)}>
              <Feather name="share-2" size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Share to</Text>
            </TouchableOpacity>
            <View style={[styles.menuSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowMore(false)}>
              <Feather name="slash" size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Block</Text>
            </TouchableOpacity>
            <View style={[styles.menuSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMore(false); handleLeave(); }}>
              <Feather name="trash-2" size={18} color="#FF4D4D" />
              <Text style={[styles.menuText, { color: "#FF4D4D" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ── Message Menu Modal ── */}
      <Modal
        visible={!!selectedMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedMessage(null)}>
          <View style={[
            styles.moreMenu,
            {
              top: '40%',
              right: 40,
              backgroundColor: isDark ? '#2D2D3D' : '#F2F2F2',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 5
            }
          ]}>
            <TouchableOpacity style={styles.menuItem} onPress={() => toggleBlock(selectedMessage?.name || '')}>
              <Feather name="slash" size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {blockedUsers.includes(selectedMessage?.name || '') ? 'Unblock' : 'Block'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.menuSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => toggleMute(selectedMessage?.name || '')}>
              <Feather name={mutedUsers.includes(selectedMessage?.name || '') ? 'mic' : 'mic-off'} size={18} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {mutedUsers.includes(selectedMessage?.name || '') ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>


      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Status Row ── */}
        <View style={styles.statusRow}>
          <View style={styles.liveBadge}>
            <PulsingDot />
            <Text style={styles.liveText}>{roomStatus === 'live' ? 'Live' : 'Ended'}</Text>
          </View>
          <View style={styles.listenersRow}>
            <Feather name="headphones" size={13} color={colors.textSecondary} />
            <Text style={[styles.listenersText, { color: colors.textSecondary }]}>{listenerCount} listening</Text>
          </View>
          <TouchableOpacity style={[styles.leaveBtn, { borderColor: colors.danger }]} activeOpacity={0.8} onPress={handleLeave}>
            <Text style={[styles.leaveText, { color: colors.danger }]}>Leave</Text>
          </TouchableOpacity>
        </View>


        {/* ── Speaker Avatar ── */}
        <View style={styles.speakerSection}>
          <View style={styles.avatarGlow}>
            <View style={[styles.avatarRingOuter, { backgroundColor: isDark ? 'rgba(155,89,182,0.15)' : 'rgba(155,89,182,0.05)' }]}>
              <TouchableOpacity
                style={[styles.avatarRingInner, isSpeaking && styles.avatarRingSpeaking, { borderColor: colors.border }]}
                onPress={() => router.push('/profile-screen/user-profile')}
              >
                <UserAvatar uri={hostAvatar} name={hostName} size={132} style={styles.speakerAvatar} />
              </TouchableOpacity>
            </View>
            {roomStatus === 'live' && isSpeaking && (
              <View style={[styles.speakingBadge, { backgroundColor: colors.success }]}>
                <View style={[styles.speakingDot, { backgroundColor: colors.background }]} />
                <Text style={[styles.speakingText, { color: colors.background }]}>Speaking</Text>
              </View>
            )}
          </View>
          <View style={styles.hostNameRow}>
            <Text style={[styles.hostName, { color: colors.text }]}>{hostName}</Text>
            <View style={[styles.hostBadge, { backgroundColor: colors.card }]}><Text style={[styles.hostBadgeText, { color: colors.textSecondary }]}>Host</Text></View>
          </View>
          {roomStatus === 'live' && isSpeaking && <AudioBars />}
        </View>


        {/* ── Tabs ── */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'chat' && { borderBottomColor: colors.text }]} onPress={() => setActiveTab('chat')} activeOpacity={0.8}>
            <Text style={[styles.tabLabel, { color: activeTab === 'chat' ? colors.text : colors.textSecondary }]}>Live Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabItem, activeTab === 'permission' && { borderBottomColor: colors.text }]} onPress={() => setActiveTab('permission')} activeOpacity={0.8}>
            <Text style={[styles.tabLabel, { color: activeTab === 'permission' ? colors.text : colors.textSecondary }]}>Permission</Text>
          </TouchableOpacity>
        </View>


        {/* ── Tab Content ── */}
        {activeTab === 'chat' ? (
          <View style={styles.chatContainer}>
            {isLoadingRoom ? (
              <ActivityIndicator size="small" color={colors.textSecondary} style={styles.loadingIndicator} />
            ) : messages.map((msg) => (
              <View key={msg.id} style={styles.chatRow}>
                <TouchableOpacity onPress={() => router.push('/profile-screen/user-profile')}>
                  <UserAvatar uri={msg.avatar} name={msg.name} size={38} style={styles.chatAvatar} />
                </TouchableOpacity>
                <View style={styles.chatContent}>
                  <View style={styles.chatMeta}>
                    <TouchableOpacity onPress={() => router.push('/profile-screen/user-profile')}>
                      <Text style={[styles.chatName, { color: colors.text }]}>{msg.name}</Text>
                    </TouchableOpacity>
                    {msg.role && (<><Text style={[styles.chatDot, { color: colors.textSecondary }]}> • </Text><Text style={[styles.chatRole, { color: colors.textSecondary }]}>{msg.role}</Text></>)}
                    <Text style={[styles.chatDot, { color: colors.textSecondary }]}> • </Text>
                    <Text style={[styles.chatTime, { color: colors.textSecondary }]}>{msg.time}</Text>
                  </View>
                  <Text style={[styles.chatText, { color: colors.text }]}>{msg.text}</Text>
                </View>
                <TouchableOpacity style={styles.chatMore} activeOpacity={0.6} onPress={() => setSelectedMessage(msg)}>
                  <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}

          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <TouchableOpacity
              style={[styles.allowAllRow, isUpdatingPermissions && styles.permissionUpdating]}
              activeOpacity={0.7}
              onPress={handleAllowAll}
            >
              <View style={styles.allowAllTextCol}>
                <Text style={[styles.allowAllTitle, { color: colors.text }]}>Allow all participants to speak</Text>
                <Text style={[styles.allowAllSub, { color: colors.textSecondary }]}>You can manually mute individual person as you want</Text>
              </View>
              <View style={[styles.checkbox, allowAll && styles.checkboxActive]}>
                {allowAll && <Feather name="check" size={16} color="#000000" />}
              </View>
            </TouchableOpacity>


            {participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <TouchableOpacity onPress={() => router.push('/profile-screen/user-profile')}>
                  <UserAvatar uri={p.avatar} name={p.name} size={42} style={styles.participantAvatar} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push('/profile-screen/user-profile')}>
                  <Text style={[styles.participantName, { color: colors.text }]}>{p.name}</Text>
                </TouchableOpacity>
                <View style={styles.participantActions}>
                  <TouchableOpacity 
                    style={[styles.pActionBtn, p.micMuted ? { backgroundColor: '#E14F4F' } : { backgroundColor: '#222222' }]} 
                    activeOpacity={0.7} 
                    onPress={() => toggleMic(p.id)}
                  >
                    <HugeiconsIcon 
                      icon={p.micMuted ? MicOff01Icon : Mic01Icon} 
                      size={18} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.pActionBtn, p.hidden ? { backgroundColor: '#E14F4F' } : { backgroundColor: '#222222' }]} 
                    activeOpacity={0.7} 
                    onPress={() => toggleHidden(p.id)}
                  >
                    <HugeiconsIcon 
                      icon={UnavailableIcon} 
                      size={18} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

          </View>
        )}
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, {
        borderTopColor: colors.border,
        backgroundColor: colors.background,
        paddingBottom: Math.max(insets.bottom, 16)
      }]}>
        <TouchableOpacity
          style={[styles.bellBtn, { backgroundColor: colors.card }, !roomPermissions.canSpeak && styles.micBtnDisabled]}
          activeOpacity={0.7}
          onPress={handleMicPress}
        >
          <Feather name={roomPermissions.canSpeak ? "mic" : "mic-off"} size={20} color={roomPermissions.canSpeak ? colors.text : colors.textSecondary} />
        </TouchableOpacity>
        <View style={[styles.commentInputWrap, { backgroundColor: colors.card }]}>
          <TouchableOpacity activeOpacity={0.7} style={styles.emojiBtn}>
            <Feather name="smile" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.commentInput, { color: colors.text }]}
            placeholder="Add Comment"
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
        </View>
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: buttonBackground(colors) }]} activeOpacity={0.7} onPress={handleSend}>
          <Feather name="send" size={18} color={buttonForeground(colors)} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { flex: 1, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  menuBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  /* Modal & More Menu */
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  moreMenu: {
    position: 'absolute',
    width: 150,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuSeparator: {
    height: 1,
    marginHorizontal: 8,
  },

  scrollContent: { paddingBottom: 20 },

  /* Status */
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 16 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16D869' },
  liveText: { color: '#16D869', fontSize: 13, fontWeight: '700' },
  listenersRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  listenersText: { fontSize: 13 },
  leaveBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  leaveText: { fontSize: 13, fontWeight: '600' },

  /* Speaker */
  speakerSection: { alignItems: 'center', marginBottom: 24 },
  avatarGlow: { alignItems: 'center', marginBottom: 12 },
  avatarRingOuter: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  avatarRingInner: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarRingSpeaking: { borderColor: '#9B59B6' },
  speakerAvatar: { width: 96, height: 96, borderRadius: 48 },
  speakingBadge: { position: 'absolute', bottom: -4, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  speakingDot: { width: 6, height: 6, borderRadius: 3 },
  speakingText: { fontSize: 11, fontWeight: '700' },
  hostNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hostName: { fontSize: 17, fontWeight: '700' },
  hostBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  hostBadgeText: { fontSize: 11, fontWeight: '600' },
  audioBarsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 24 },
  audioBar: { width: 3, borderRadius: 1.5 },

  /* Tabs */
  tabRow: { flexDirection: 'row', marginHorizontal: 16, borderBottomWidth: 1, marginBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2 },
  tabLabel: { fontSize: 14, fontWeight: '600' },

  /* Chat */
  chatContainer: { paddingHorizontal: 16, paddingTop: 8 },
  loadingIndicator: { marginTop: 24 },
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  chatContent: { flex: 1 },
  chatMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  chatName: { fontSize: 13, fontWeight: '700' },
  chatDot: { fontSize: 12 },
  chatRole: { fontSize: 12 },
  chatTime: { fontSize: 12 },
  chatText: { fontSize: 13, lineHeight: 19 },
  chatMore: { paddingLeft: 8, paddingTop: 4 },

  /* Permission */
  permissionContainer: { paddingHorizontal: 16, paddingTop: 16 },
  allowAllRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    borderRadius: 20, 
    padding: 22, 
    marginBottom: 32 
  },
  permissionUpdating: { opacity: 0.65 },
  allowAllTextCol: { flex: 1 },
  allowAllTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  allowAllSub: { fontSize: 13, color: '#8E8E9B', lineHeight: 18 },
  checkbox: { 
    width: 26, 
    height: 26, 
    borderRadius: 6, 
    backgroundColor: '#333333', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 12 
  },
  checkboxActive: { backgroundColor: '#B2ABBA' },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  participantName: { fontSize: 14, fontWeight: '600', flex: 1 },
  participantActions: { flexDirection: 'row', gap: 10 },
  pActionBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  },

  /* Bottom Bar */
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  bellBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  micBtnDisabled: { opacity: 0.55 },
  commentInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 14, height: 46 },
  emojiBtn: { marginRight: 8 },
  commentInput: { flex: 1, fontSize: 14, padding: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});

