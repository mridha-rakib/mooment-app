import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

const { width } = Dimensions.get('window');

/* ─── Mock Data ─── */
const CHAT_MESSAGES = [
  {
    id: '1',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop',
    name: 'Dj Koko',
    role: 'Host',
    time: '9:02pm',
    text: 'Welcome everyone! Goint lie in a few mins',
  },
  {
    id: '2',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
    name: 'Tuval',
    role: null,
    time: '9:02pm',
    text: 'Cant wait, already at the venue',
  },
  {
    id: '3',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop',
    name: 'Nosel',
    role: null,
    time: '9:02pm',
    text: 'What track are you opening wiwth tonigt?',
  },
];

const PARTICIPANTS = [
  { id: '1', name: 'Lister', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop', micMuted: false, hidden: false },
  { id: '2', name: 'Kate', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop', micMuted: true, hidden: true },
  { id: '3', name: 'Sona', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop', micMuted: false, hidden: true },
];

/* ─── Audio Bars Component ─── */
function AudioBars() {
  const barHeights = [8, 14, 20, 12, 18, 10, 16, 22, 14, 8, 18, 12, 20, 10, 16];
  return (
    <View style={styles.audioBarsRow}>
      {barHeights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.audioBar,
            { height: h, backgroundColor: i % 3 === 0 ? '#FF4444' : i % 3 === 1 ? '#FF6B3D' : '#FFD93D' },
          ]}
        />
      ))}
    </View>
  );
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; title?: string }>();
  const [activeTab, setActiveTab] = useState<'chat' | 'permission'>('chat');
  const [allowAll, setAllowAll] = useState(true);
  const [comment, setComment] = useState('');

  const hostName = params.title || 'DJ Nova';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Pre-show with {hostName}</Text>
        <TouchableOpacity style={styles.menuBtn} activeOpacity={0.8}>
          <Feather name="more-horizontal" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Status Bar ── */}
        <View style={styles.statusRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <View style={styles.listenersRow}>
            <Feather name="headphones" size={13} color="#8E8E9B" />
            <Text style={styles.listenersText}>412 listening</Text>
          </View>
          <TouchableOpacity style={styles.leaveBtn} activeOpacity={0.8}>
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
        </View>

        {/* ── Speaker Avatar ── */}
        <View style={styles.speakerSection}>
          {/* Purple glow ring */}
          <View style={styles.avatarGlow}>
            <View style={styles.avatarRingOuter}>
              <View style={styles.avatarRingInner}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=200&auto=format&fit=crop' }}
                  style={styles.speakerAvatar}
                />
              </View>
            </View>
            {/* Speaking badge */}
            <View style={styles.speakingBadge}>
              <View style={styles.speakingDot} />
              <Text style={styles.speakingText}>Speaking</Text>
            </View>
          </View>

          {/* Host name & badge */}
          <View style={styles.hostNameRow}>
            <Text style={styles.hostName}>{hostName}</Text>
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>Host</Text>
            </View>
          </View>

          {/* Audio bars / equalizer */}
          <AudioBars />
        </View>

        {/* ── Tab Switcher ── */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'chat' && styles.tabItemActive]}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === 'chat' && styles.tabLabelActive]}>Live Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'permission' && styles.tabItemActive]}
            onPress={() => setActiveTab('permission')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabLabel, activeTab === 'permission' && styles.tabLabelActive]}>Permission</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab Content ── */}
        {activeTab === 'chat' ? (
          /* ─ Live Chat ─ */
          <View style={styles.chatContainer}>
            {CHAT_MESSAGES.map((msg) => (
              <View key={msg.id} style={styles.chatRow}>
                <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
                <View style={styles.chatContent}>
                  <View style={styles.chatMeta}>
                    <Text style={styles.chatName}>{msg.name}</Text>
                    {msg.role && (
                      <>
                        <Text style={styles.chatDot}> • </Text>
                        <Text style={styles.chatRole}>{msg.role}</Text>
                      </>
                    )}
                    <Text style={styles.chatDot}> • </Text>
                    <Text style={styles.chatTime}>{msg.time}</Text>
                  </View>
                  <Text style={styles.chatText}>{msg.text}</Text>
                </View>
                <TouchableOpacity style={styles.chatMore} activeOpacity={0.6}>
                  <Feather name="more-horizontal" size={16} color="#555" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          /* ─ Permission Tab ─ */
          <View style={styles.permissionContainer}>
            {/* Allow all toggle */}
            <TouchableOpacity
              style={styles.allowAllRow}
              activeOpacity={0.7}
              onPress={() => setAllowAll(!allowAll)}
            >
              <View style={styles.allowAllTextCol}>
                <Text style={styles.allowAllTitle}>Allow all participants to speak</Text>
                <Text style={styles.allowAllSub}>You can manually mute individual person as you want</Text>
              </View>
              <View style={[styles.checkbox, allowAll && styles.checkboxActive]}>
                {allowAll && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>

            {/* Participants list */}
            {PARTICIPANTS.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <Image source={{ uri: p.avatar }} style={styles.participantAvatar} />
                <Text style={styles.participantName}>{p.name}</Text>
                <View style={styles.participantActions}>
                  <TouchableOpacity
                    style={[styles.pActionBtn, p.micMuted && styles.pActionBtnRed]}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={p.micMuted ? 'mic-off' : 'mic'}
                      size={16}
                      color={p.micMuted ? '#FFFFFF' : '#AAAAAA'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pActionBtn, p.hidden && styles.pActionBtnRed]}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={p.hidden ? 'eye-off' : 'eye'}
                      size={16}
                      color={p.hidden ? '#FFFFFF' : '#AAAAAA'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Comment Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bellBtn} activeOpacity={0.7}>
          <Feather name="bell" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.commentInputWrap}>
          <TouchableOpacity activeOpacity={0.7} style={styles.emojiBtn}>
            <Feather name="smile" size={18} color="#8E8E9B" />
          </TouchableOpacity>
          <TextInput
            style={styles.commentInput}
            placeholder="Add Comment"
            placeholderTextColor="#555"
            value={comment}
            onChangeText={setComment}
          />
        </View>
        <TouchableOpacity style={styles.sendBtn} activeOpacity={0.7}>
          <Feather name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: { paddingBottom: 20 },

  /* Status Row */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginRight: 16,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16D869',
  },
  liveText: {
    color: '#16D869',
    fontSize: 13,
    fontWeight: '700',
  },
  listenersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  listenersText: {
    color: '#8E8E9B',
    fontSize: 13,
  },
  leaveBtn: {
    borderWidth: 1,
    borderColor: '#FF3B3B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  leaveText: {
    color: '#FF3B3B',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Speaker Section */
  speakerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarGlow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRingInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#9B59B6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  speakerAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  speakingBadge: {
    position: 'absolute',
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16D869',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  speakingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  speakingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  hostBadge: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hostBadgeText: {
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
  },
  audioBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 24,
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
  },

  /* Tab Switcher */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#FFFFFF',
  },
  tabLabel: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },

  /* Live Chat */
  chatContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  chatContent: {
    flex: 1,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  chatName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chatDot: {
    color: '#555',
    fontSize: 12,
  },
  chatRole: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  chatTime: {
    color: '#555',
    fontSize: 12,
  },
  chatText: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 19,
  },
  chatMore: {
    paddingLeft: 8,
    paddingTop: 4,
  },

  /* Permission Tab */
  permissionContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  allowAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  allowAllTextCol: {
    flex: 1,
  },
  allowAllTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  allowAllSub: {
    color: '#555',
    fontSize: 12,
    lineHeight: 17,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxActive: {
    backgroundColor: '#4A90D9',
    borderColor: '#4A90D9',
  },

  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  participantActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pActionBtnRed: {
    backgroundColor: '#E53935',
  },

  /* Bottom Comment Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A2E',
    gap: 10,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 42,
  },
  emojiBtn: {
    marginRight: 8,
  },
  commentInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
