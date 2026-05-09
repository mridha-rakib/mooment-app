import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';


const { width } = Dimensions.get('window');

/* ─── Types ─── */
type ChatMessage = { id: string; avatar: string; name: string; role: string | null; time: string; text: string };
type Participant = { id: string; name: string; avatar: string; micMuted: boolean; hidden: boolean };

/* ─── Initial Data ─── */
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: '1', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop', name: 'Dj Koko', role: 'Host', time: '9:02pm', text: 'Welcome everyone! Going lie in a few mins' },
  { id: '2', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop', name: 'Tuval', role: null, time: '9:02pm', text: 'Cant wait, already at the venue' },
  { id: '3', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop', name: 'Nosel', role: null, time: '9:02pm', text: 'What track are you opening with tonight?' },
];

const INITIAL_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Lister', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop', micMuted: false, hidden: false },
  { id: '2', name: 'Kate', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop', micMuted: true, hidden: true },
  { id: '3', name: 'Sona', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop', micMuted: false, hidden: true },
];

const SIMULATED_MSGS = [
  { name: 'Alex', text: 'This is going to be fire 🔥' },
  { name: 'Maya', text: 'Can you play some house music?' },
  { name: 'Jordan', text: 'First time here, loving the vibes!' },
  { name: 'Priya', text: 'Let\'s gooo 🎶' },
  { name: 'Sam', text: 'Shoutout from London!' },
];

const USER_AVATAR = 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?q=80&w=100&auto=format&fit=crop';

/* ─── Helpers ─── */
function getTimeNow() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h > 12 ? h - 12 : h || 12}:${m}${h >= 12 ? 'pm' : 'am'}`;
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
  const params = useLocalSearchParams<{ id?: string; title?: string }>();

  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'permission'>('chat');
  const [allowAll, setAllowAll] = useState(true);
  const [comment, setComment] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [listenerCount, setListenerCount] = useState(412);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const nextId = useRef(10);
  const simIdx = useRef(0);

  const hostName = params.title || 'DJ Nova';

  // Simulate incoming messages every 8s
  useEffect(() => {
    const iv = setInterval(() => {
      const msg = SIMULATED_MSGS[simIdx.current % SIMULATED_MSGS.length];
      simIdx.current++;
      setMessages((prev) => [...prev, {
        id: String(nextId.current++),
        avatar: `https://i.pravatar.cc/100?u=${msg.name}`,
        name: msg.name, role: null, time: getTimeNow(), text: msg.text,
      }]);
      setListenerCount((c) => c + Math.floor(Math.random() * 5) - 1);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

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
    setMessages((prev) => [...prev, {
      id: String(nextId.current++),
      avatar: USER_AVATAR, name: 'You', role: null, time: getTimeNow(), text: trimmed,
    }]);
    setComment('');
  }, [comment]);

  const toggleMic = useCallback((id: string) => {
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, micMuted: !p.micMuted } : p));
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, hidden: !p.hidden } : p));
  }, []);

  const handleLeave = useCallback(() => {
    Alert.alert('Leave Room', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [router]);

  const handleAllowAll = useCallback(() => {
    const next = !allowAll;
    setAllowAll(next);
    if (next) setParticipants((prev) => prev.map((p) => ({ ...p, micMuted: false })));
    else setParticipants((prev) => prev.map((p) => ({ ...p, micMuted: true })));
  }, [allowAll]);

  const deleteMessage = useCallback((id: string) => {
    Alert.alert('Delete Message', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setMessages((prev) => prev.filter((m) => m.id !== id)) },
    ]);
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton size={22} color={colors.text} />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Pre-show with {hostName}</Text>
        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
          <Feather name="more-horizontal" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>


      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Status Row ── */}
        <View style={styles.statusRow}>
          <View style={styles.liveBadge}>
            <PulsingDot />
            <Text style={styles.liveText}>Live</Text>
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
              <View style={[styles.avatarRingInner, isSpeaking && styles.avatarRingSpeaking, { borderColor: colors.border }]}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=200&auto=format&fit=crop' }} style={styles.speakerAvatar} />
              </View>
            </View>
            {isSpeaking && (
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
          {isSpeaking && <AudioBars />}
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
            {messages.map((msg) => (
              <View key={msg.id} style={styles.chatRow}>
                <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
                <View style={styles.chatContent}>
                  <View style={styles.chatMeta}>
                    <Text style={[styles.chatName, { color: colors.text }]}>{msg.name}</Text>
                    {msg.role && (<><Text style={[styles.chatDot, { color: colors.textSecondary }]}> • </Text><Text style={[styles.chatRole, { color: colors.textSecondary }]}>{msg.role}</Text></>)}
                    <Text style={[styles.chatDot, { color: colors.textSecondary }]}> • </Text>
                    <Text style={[styles.chatTime, { color: colors.textSecondary }]}>{msg.time}</Text>
                  </View>
                  <Text style={[styles.chatText, { color: colors.text }]}>{msg.text}</Text>
                </View>
                <TouchableOpacity style={styles.chatMore} activeOpacity={0.6} onPress={() => deleteMessage(msg.id)}>
                  <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}

          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <TouchableOpacity style={styles.allowAllRow} activeOpacity={0.7} onPress={handleAllowAll}>
              <View style={styles.allowAllTextCol}>
                <Text style={[styles.allowAllTitle, { color: colors.text }]}>Allow all participants to speak</Text>
                <Text style={[styles.allowAllSub, { color: colors.textSecondary }]}>You can manually mute individual person as you want</Text>
              </View>
              <View style={[styles.checkbox, { borderColor: colors.border }, allowAll && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {allowAll && <Feather name="check" size={14} color={colors.background} />}
              </View>
            </TouchableOpacity>


            {participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <Image source={{ uri: p.avatar }} style={styles.participantAvatar} />
                <Text style={[styles.participantName, { color: colors.text }]}>{p.name}</Text>
                <View style={styles.participantActions}>
                  <TouchableOpacity style={[styles.pActionBtn, { backgroundColor: colors.card }, p.micMuted && { backgroundColor: colors.danger }]} activeOpacity={0.7} onPress={() => toggleMic(p.id)}>
                    <Feather name={p.micMuted ? 'mic-off' : 'mic'} size={16} color={p.micMuted ? colors.background : colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pActionBtn, { backgroundColor: colors.card }, p.hidden && { backgroundColor: colors.danger }]} activeOpacity={0.7} onPress={() => toggleHidden(p.id)}>
                    <Feather name={p.hidden ? 'eye-off' : 'eye'} size={16} color={p.hidden ? colors.background : colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

          </View>
        )}
      </ScrollView>

      {/* ── Bottom Bar ── */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={[styles.bellBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
          <Feather name="bell" size={20} color={colors.text} />
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
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} activeOpacity={0.7} onPress={handleSend}>
          <Feather name="send" size={18} color={colors.background} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { flex: 1, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  menuBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
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
  permissionContainer: { paddingHorizontal: 16, paddingTop: 12 },
  allowAllRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  allowAllTextCol: { flex: 1 },
  allowAllTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  allowAllSub: { fontSize: 12, lineHeight: 17 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  participantName: { fontSize: 14, fontWeight: '600', flex: 1 },
  participantActions: { flexDirection: 'row', gap: 10 },
  pActionBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },

  /* Bottom Bar */
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  commentInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 14, height: 42 },
  emojiBtn: { marginRight: 8 },
  commentInput: { flex: 1, fontSize: 14, padding: 0 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});

