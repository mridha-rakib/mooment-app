import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

// ── Mock feed data shown dimmed in background ────────────────────────────
const BG_STORIES = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=150&auto=format&fit=crop',
];

type RoomMode = 'feed' | 'event';

export default function LiveRoomSetupScreen() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [mode, setMode] = useState<RoomMode>('event');

  const handleCreate = () => {
    if (roomName.trim()) {
      router.replace('/live-video');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Dimmed Feed Background ── */}
      <View style={styles.bgLayer} pointerEvents="none">
        <SafeAreaView style={styles.bgSafe}>
          {/* Mock Header */}
          <View style={styles.bgHeader}>
            <Text style={styles.bgFeedLabel}>← Feed</Text>
            <Text style={styles.bgTitle}>Mooment</Text>
            <View style={styles.bgHeaderIcons}>
              <Feather name="search" size={20} color="rgba(255,255,255,0.35)" style={{ marginRight: 14 }} />
              <Feather name="settings" size={20} color="rgba(255,255,255,0.35)" />
            </View>
          </View>

          {/* Mock Story Row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgStoryRow} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {/* Add button */}
            <View style={styles.bgStoryAddCircle}>
              <Feather name="plus" size={20} color="rgba(255,255,255,0.4)" />
            </View>
            {BG_STORIES.map((uri, i) => (
              <View key={i} style={[styles.bgStoryCircle, i === 0 && styles.bgStoryCircleLive]}>
                <Image source={{ uri }} style={styles.bgStoryImg} />
                {i === 0 && (
                  <View style={styles.bgLiveBadge}>
                    <Text style={styles.bgLiveText}>Live</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Mock Post */}
          <View style={styles.bgPost}>
            <View style={styles.bgPostHeader}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=80&auto=format&fit=crop' }}
                style={styles.bgPostAvatar}
              />
              <Text style={styles.bgPostName}>DJ Koko</Text>
              <View style={styles.bgFollowBtn}>
                <Text style={styles.bgFollowText}>Follow</Text>
              </View>
            </View>
            <Text style={styles.bgPostCaption}>
              Setting up for tonight. The view from up here is unreal
            </Text>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop' }}
              style={styles.bgPostImage}
            />
          </View>
        </SafeAreaView>
      </View>

      {/* ── Dark Overlay ── */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* ── Bottom Sheet ── */}
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.sheetTitle}>Name your Live Room</Text>

          {/* Feed / Event checkboxes */}
          <View style={styles.checkboxRow}>
            {/* Feed */}
            <TouchableOpacity style={styles.checkboxItem} onPress={() => setMode('feed')} activeOpacity={0.8}>
              <View style={[styles.checkbox, mode === 'feed' && styles.checkboxActive]}>
                {mode === 'feed' && <Feather name="check" size={11} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, mode === 'feed' && styles.checkboxLabelActive]}>Feed</Text>
            </TouchableOpacity>

            {/* Event */}
            <TouchableOpacity style={[styles.checkboxItem, { marginLeft: 20 }]} onPress={() => setMode('event')} activeOpacity={0.8}>
              <View style={[styles.checkbox, mode === 'event' && styles.checkboxActive]}>
                {mode === 'event' && <Feather name="check" size={11} color="#FFF" />}
              </View>
              <Text style={[styles.checkboxLabel, mode === 'event' && styles.checkboxLabelActive]}>Event</Text>
            </TouchableOpacity>

            {/* Spacer + Event pill */}
            <View style={{ flex: 1 }} />
            {mode === 'event' && (
              <View style={styles.eventPill}>
                <View style={styles.eventPillDot} />
                <Text style={styles.eventPillText}>Event</Text>
                <Feather name="chevron-down" size={12} color="#16D869" />
              </View>
            )}
          </View>

          {/* Room name input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Room name"
              placeholderTextColor="#454555"
              value={roomName}
              onChangeText={setRoomName}
              autoFocus={false}
              returnKeyType="done"
            />
          </View>

          {/* Cancel / Create buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createBtn, !roomName.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              activeOpacity={0.8}
              disabled={!roomName.trim()}
            >
              <Text style={[styles.createText, !roomName.trim() && styles.createTextDisabled]}>Create</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e0d12' },

  /* Background feed layer */
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  bgSafe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  bgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bgFeedLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 13, flex: 1 },
  bgTitle: { color: 'rgba(255,255,255,0.35)', fontSize: 20, fontWeight: 'bold', position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  bgHeaderIcons: { flexDirection: 'row', alignItems: 'center' },

  bgStoryRow: { flexGrow: 0, marginBottom: 12 },
  bgStoryAddCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  bgStoryCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: 'rgba(212,176,235,0.35)',
    overflow: 'hidden', position: 'relative',
  },
  bgStoryCircleLive: { borderColor: 'rgba(242,36,92,0.6)' },
  bgStoryImg: { width: '100%', height: '100%' },
  bgLiveBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(242,36,92,0.75)',
    alignItems: 'center', paddingVertical: 2,
  },
  bgLiveText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

  bgPost: { paddingHorizontal: 16 },
  bgPostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bgPostAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  bgPostName: { color: 'rgba(255,255,255,0.35)', fontWeight: 'bold', fontSize: 13, flex: 1 },
  bgFollowBtn: {
    borderWidth: 1, borderColor: 'rgba(212,176,235,0.3)',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  bgFollowText: { color: 'rgba(212,176,235,0.5)', fontSize: 11 },
  bgPostCaption: { color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 10, lineHeight: 19 },
  bgPostImage: { width: '100%', height: 180, borderRadius: 12, opacity: 0.4 },

  /* Dark overlay */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,13,18,0.68)',
    zIndex: 1,
  },

  /* Sheet */
  sheetWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 10,
  },
  sheet: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A3A',
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: {
    color: '#FFFFFF', fontWeight: 'bold',
    fontSize: 18, textAlign: 'center', marginBottom: 20,
  },

  /* Checkboxes */
  checkboxRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 20,
  },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 2, borderColor: '#454555',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: '#8E8E9B', borderColor: '#8E8E9B' },
  checkboxLabel: { color: '#8E8E9B', fontSize: 14 },
  checkboxLabelActive: { color: '#FFFFFF', fontWeight: '600' },
  eventPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22,216,105,0.12)',
    borderWidth: 1, borderColor: 'rgba(22,216,105,0.35)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, gap: 5,
  },
  eventPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16D869' },
  eventPillText: { color: '#16D869', fontSize: 12, fontWeight: '700' },

  /* Input */
  inputWrap: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12, marginBottom: 24,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { color: '#FFFFFF', fontSize: 15 },

  /* Buttons */
  actionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
    backgroundColor: '#1A1A2E',
  },
  cancelText: { color: '#8E8E9B', fontWeight: '600', fontSize: 15 },
  createBtn: {
    flex: 1, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
    backgroundColor: '#D4B0EB',
  },
  createBtnDisabled: { backgroundColor: '#2A2A3A' },
  createText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 15 },
  createTextDisabled: { color: '#454555' },
});
