import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

// ── Mock Data ─────────────────────────────────────────────────────────────
const CHAT_MESSAGES = [
  { id: '1', user: 'Dj Koko', role: 'Host', time: '9:02pm', text: 'Welcome everyone! Goint lie in a few mins', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=80&auto=format&fit=crop' },
  { id: '2', user: 'Tuval', role: null, time: '9:02pm', text: 'Cant wait, already at the venue', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80&auto=format&fit=crop' },
  { id: '3', user: 'Nosal', role: null, time: '9:02pm', text: 'What track are you opening wiwth tonight?', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=80&auto=format&fit=crop' },
];

const PARTICIPANTS = [
  { id: '1', name: 'Lister', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=80&auto=format&fit=crop', micOn: true,  videoOff: true },
  { id: '2', name: 'Kate',   avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=80&auto=format&fit=crop', micOn: false, videoOff: true },
  { id: '3', name: 'Sona',   avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=80&auto=format&fit=crop', micOn: true,  videoOff: true },
];

// Waveform bar heights (mock)
const WAVE_BARS = [6, 14, 22, 30, 22, 14, 6, 14, 28, 16, 8, 20, 32, 20, 10];

type Tab = 'chat' | 'permission';

export default function EventDetailsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [comment, setComment] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [allowAll, setAllowAll] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre-show with DJ Nova</Text>
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
          <Feather name="more-horizontal" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Status bar ── */}
      <View style={styles.statusBar}>
        {/* Live badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>

        {/* Listening count */}
        <View style={styles.listeningRow}>
          <Feather name="users" size={13} color="#8E8E9B" style={{ marginRight: 4 }} />
          <Text style={styles.listeningText}>412 listening</Text>
        </View>

        {/* Leave button */}
        <TouchableOpacity style={styles.leaveBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>

      {/* ── Host Section ── */}
      <View style={styles.hostSection}>
        {/* Purple glow + avatar */}
        <View style={styles.avatarGlowOuter}>
          <View style={styles.avatarGlowInner}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=200&auto=format&fit=crop' }}
              style={styles.hostAvatar}
            />
          </View>
          {/* Speaking badge */}
          <View style={styles.speakingBadge}>
            <MaterialCommunityIcons name="microphone" size={11} color="#FFFFFF" />
            <Text style={styles.speakingText}>Speaking</Text>
          </View>
        </View>

        {/* Name + Host badge */}
        <View style={styles.hostNameRow}>
          <Text style={styles.hostName}>DJ Nova</Text>
          <View style={styles.hostBadge}>
            <Text style={styles.hostBadgeText}>Host</Text>
          </View>
        </View>

        {/* Waveform */}
        <View style={styles.waveform}>
          {WAVE_BARS.map((h, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                { height: h, backgroundColor: i % 3 === 0 ? '#D4B0EB' : '#FFFFFF', opacity: 0.6 + (h / 80) },
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Live Chat</Text>
          {activeTab === 'chat' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'permission' && styles.tabActive]}
          onPress={() => setActiveTab('permission')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'permission' && styles.tabTextActive]}>Permission</Text>
          {activeTab === 'permission' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* ── Tab Content ── */}
      {activeTab === 'chat' ? (
        /* Live Chat */
        <FlatList
          data={CHAT_MESSAGES}
          keyExtractor={item => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.chatRow}>
              <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
              <View style={styles.chatContent}>
                <View style={styles.chatMeta}>
                  <Text style={styles.chatUser}>{item.user}</Text>
                  {item.role && (
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{item.role}</Text>
                    </View>
                  )}
                  <Text style={styles.chatTime}> • {item.time}</Text>
                </View>
                <Text style={styles.chatText}>{item.text}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.8} style={{ paddingLeft: 8 }}>
                <Feather name="more-horizontal" size={16} color="#454555" />
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        /* Permission tab */
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Allow all toggle */}
          <View style={styles.permToggleCard}>
            <View style={styles.permToggleInfo}>
              <Text style={styles.permToggleLabel}>Allow all participants to speak</Text>
              <Text style={styles.permToggleDesc}>You can manually mute individual person as you want</Text>
            </View>
            <TouchableOpacity
              style={[styles.permCheckbox, allowAll && styles.permCheckboxActive]}
              onPress={() => setAllowAll(v => !v)}
              activeOpacity={0.8}
            >
              {allowAll && <Feather name="check" size={13} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          {/* Participants */}
          {PARTICIPANTS.map(p => (
            <View key={p.id} style={styles.participantRow}>
              <Image source={{ uri: p.avatar }} style={styles.participantAvatar} />
              <Text style={styles.participantName}>{p.name}</Text>
              <View style={styles.participantControls}>
                {/* Mic icon */}
                <View style={[styles.controlBtn, !p.micOn && styles.controlBtnRed]}>
                  <MaterialCommunityIcons
                    name={p.micOn ? 'microphone' : 'microphone-off'}
                    size={18}
                    color={p.micOn ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
                {/* Video-off icon */}
                <View style={styles.controlBtn}>
                  <Feather name="video-off" size={16} color="#FFFFFF" />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Bottom Input Bar ── */}
      <View style={styles.bottomBar}>
        {/* Mic toggle */}
        <TouchableOpacity
          style={[styles.micBtn, micOn && styles.micBtnActive]}
          onPress={() => setMicOn(v => !v)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={micOn ? 'microphone' : 'microphone-off'}
            size={20}
            color={micOn ? '#0e0d12' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Comment input */}
        <View style={styles.commentInput}>
          <Ionicons name="happy-outline" size={18} color="#454555" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.commentText}
            placeholder="Add Comment"
            placeholderTextColor="#454555"
            value={comment}
            onChangeText={setComment}
          />
        </View>

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, comment.trim() && styles.sendBtnActive]}
          onPress={() => setComment('')}
          activeOpacity={0.8}
        >
          <Feather name="send" size={18} color={comment.trim() ? '#D4B0EB' : '#454555'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  moreBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },

  /* Status */
  statusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,216,105,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16D869' },
  liveText: { color: '#16D869', fontWeight: '700', fontSize: 12 },
  listeningRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  listeningText: { color: '#8E8E9B', fontSize: 12 },
  leaveBtn: { borderWidth: 1, borderColor: '#E53E3E', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10 },
  leaveText: { color: '#E53E3E', fontWeight: '600', fontSize: 12 },

  /* Host section */
  hostSection: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  avatarGlowOuter: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(142,84,233,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative' },
  avatarGlowInner: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(142,84,233,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(212,176,235,0.6)' },
  hostAvatar: { width: 80, height: 80, borderRadius: 40 },
  speakingBadge: { position: 'absolute', bottom: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#16D869', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  speakingText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  hostNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  hostName: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  hostBadge: { backgroundColor: '#1A1A2E', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  hostBadgeText: { color: '#8E8E9B', fontSize: 11, fontWeight: '600' },

  /* Waveform */
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 36 },
  waveBar: { width: 3, borderRadius: 2 },

  /* Tabs */
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1A1A2E', marginBottom: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabActive: {},
  tabText: { color: '#8E8E9B', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  tabUnderline: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: '#FFFFFF', borderRadius: 1 },

  /* Chat */
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 10 },
  chatAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  chatContent: { flex: 1 },
  chatMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  chatUser: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  roleTag: { backgroundColor: '#1A1A2E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6 },
  roleTagText: { color: '#8E8E9B', fontSize: 10 },
  chatTime: { color: '#454555', fontSize: 12 },
  chatText: { color: '#CCCCCC', fontSize: 14, lineHeight: 20 },

  /* Permission tab */
  permToggleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', marginHorizontal: 16, marginTop: 12, marginBottom: 8, borderRadius: 14, padding: 14, gap: 12 },
  permToggleInfo: { flex: 1 },
  permToggleLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginBottom: 4 },
  permToggleDesc: { color: '#8E8E9B', fontSize: 11, lineHeight: 16 },
  permCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#454555', justifyContent: 'center', alignItems: 'center' },
  permCheckboxActive: { backgroundColor: '#D4B0EB', borderColor: '#D4B0EB' },
  participantRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  participantAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  participantName: { flex: 1, color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  participantControls: { flexDirection: 'row', gap: 8 },
  controlBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  controlBtnRed: { backgroundColor: 'rgba(229,62,62,0.25)' },

  /* Bottom bar */
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#13131A', gap: 10 },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: '#D4B0EB' },
  commentInput: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  commentText: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  sendBtnActive: { backgroundColor: 'rgba(212,176,235,0.15)' },
});
