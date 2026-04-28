import { Feather, Ionicons } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AttachmentIcon } from '@hugeicons/core-free-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions, FlatList, Image, KeyboardAvoidingView,
  Platform, SafeAreaView,
  StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Modal
} from 'react-native';

const { width } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────────
type Reaction = { emoji: string; count: number };
type MessageType = 'text' | 'image' | 'audio' | 'event';

type Message = {
  id: string;
  fromMe: boolean;
  type: MessageType;
  text?: string;
  imageUri?: string;
  audioDuration?: string;
  eventTitle?: string;
  eventDate?: string;
  eventImage?: string;
  reactions?: Reaction[];
  time: string;
  delivered?: boolean;
  read?: boolean;
};

// ── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1', fromMe: false, type: 'text',
    text: "Doors open at 9 pm sharp. Rooftop level 7. Can't waint to see you all there tonight",
    time: '8:30pm',
  },
  {
    id: 'm2', fromMe: true, type: 'text',
    text: 'See you all up there!',
    time: '8:30pm', delivered: true,
  },
];

const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 28, 16, 24, 10, 18, 22, 14, 26, 8, 20, 16, 12, 24, 18, 10, 14];

// ── Bubble Components ──────────────────────────────────────────────────────
function TextBubble({ msg }: { msg: Message }) {
  return (
    <View style={[styles.bubble, msg.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
      <Text style={[styles.bubbleText, msg.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
        {msg.text}
      </Text>
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
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [showAttach, setShowAttach] = useState(false);
  const [isTyping] = useState(true);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  const name = params.name || 'Eleanor Pena';
  const avatar = params.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop';

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: `m${Date.now()}`,
      fromMe: true,
      type: 'text',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: true,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.8}>
          <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={styles.headerStatus}>{isTyping ? 'Typing...' : 'Online'}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(true)}>
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
                  {/* Avatar for them */}
                  {!item.fromMe ? (
                    showAvatar
                      ? <Image source={{ uri: avatar }} style={styles.msgAvatar} />
                      : <View style={{ width: 30, marginRight: 8 }} />
                  ) : null}

                  <View style={{ maxWidth: width * 0.72 }}>
                    {renderBubble(item)}

                    {/* Reactions */}
                    {item.reactions && item.reactions.length > 0 && (
                      <View style={[styles.reactionsRow, item.fromMe ? styles.reactionsRowMe : styles.reactionsRowThem]}>
                        {item.reactions.map((r:any, i:any) => (
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
            isTyping ? (
              <View style={styles.typingRow}>
                <Image source={{ uri: avatar }} style={styles.msgAvatar} />
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
              onChangeText={setInputText}
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
            <TouchableOpacity style={styles.moreMenuItem} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(false)}>
              <Ionicons name="ban-outline" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
              <Text style={styles.moreMenuText}>Block</Text>
            </TouchableOpacity>
            
            <View style={styles.moreMenuSeparator} />
            
            <TouchableOpacity style={styles.moreMenuItem} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(false)}>
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
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 8 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 18, marginRight: 12 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  headerName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  headerStatus: { color: '#8E8E9B', fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },

  /* Messages */
  messagesContainer: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: '#1A1A2E' },
  dateSepText: { color: '#454555', fontSize: 12, marginHorizontal: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 3 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },

  /* Text Bubble */
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, maxWidth: '85%' },
  bubbleMe: { backgroundColor: '#C2B5CD', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1A1A2E', borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#0e0d12' },
  bubbleTextThem: { color: '#FFFFFF' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 },
  bubbleTime: { color: '#8E8E9B', fontSize: 10 },
  bubbleTimeMe: { color: 'rgba(14, 13, 18, 0.6)' },

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
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0e0d12', gap: 12 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, minHeight: 48, borderWidth: 1, borderColor: '#2A2A3A' },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14, maxHeight: 100, marginLeft: 12, marginRight: 12 },
  emojiBtn: { justifyContent: 'center', alignItems: 'center', width: 28 },
  fileBtn: { justifyContent: 'center', alignItems: 'center', width: 28 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#C2B5CD', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  moreMenuContainer: { width: 180, backgroundColor: '#45454A', borderRadius: 8, marginTop: 75, marginRight: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#55555A' },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  moreMenuIcon: { marginRight: 12 },
  moreMenuText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  moreMenuSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
});
