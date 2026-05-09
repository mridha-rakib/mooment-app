import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// Background story/feed mock items
const BG_STORIES = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=150&auto=format&fit=crop',
];

export default function LiveRoomSetupScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [allowAll, setAllowAll] = useState(true);

  const handleContinue = () => {
    if (roomName.trim()) {
      router.push('/event-screen/event-details');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* ── Dimmed Feed Background ── */}
      <View style={styles.bgLayer} pointerEvents="none">
        <SafeAreaView style={styles.bgSafe}>
          {/* Mock Header */}
          <View style={styles.bgHeader}>
            <Text style={[styles.bgFeedLabel, { color: colors.textSecondary + '33' }]}>← Feed</Text>
            <Text style={[styles.bgTitle, { color: colors.textSecondary + '40' }]}>Mooment</Text>
            <View style={styles.bgHeaderIcons}>
              <Feather name="search" size={20} color={colors.textSecondary + '40'} style={{ marginRight: 14 }} />
              <Feather name="settings" size={20} color={colors.textSecondary + '40'} />
            </View>
          </View>

          {/* Story row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgStoryRow} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            <View style={[styles.bgAddCircle, { backgroundColor: colors.card + '1A', borderColor: colors.border + '1A' }]}>
              <Feather name="plus" size={18} color={colors.textSecondary + '4D'} />
            </View>
            {BG_STORIES.map((uri, i) => (
              <View key={i} style={[styles.bgStoryCircle, { borderColor: colors.primary + '40' }, i === 0 && [styles.bgStoryLive, { borderColor: '#F2245C80' }]]}>
                <Image source={{ uri }} style={styles.bgStoryImg} />
                {i === 0 && (
                  <View style={styles.bgLiveBadge}>
                    <Text style={styles.bgLiveText}>Live</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Fake post */}
          <View style={styles.bgPost}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=80&auto=format&fit=crop' }}
              style={styles.bgAvatar}
            />
            <View style={styles.bgPostLines}>
              <View style={[styles.bgLine1, { backgroundColor: colors.text }]} />
              <View style={[styles.bgLine2, { backgroundColor: colors.textSecondary }]} />
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Dark overlay */}
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(14,13,18,0.7)' : 'rgba(255,255,255,0.4)' }]} pointerEvents="none" />

      {/* ── Bottom Sheet ── */}
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: isDark ? 0 : 1 }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Title */}
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Name your Room</Text>

          {/* Room name input */}
          <View style={[styles.inputWrap, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Room name"
              placeholderTextColor={colors.textSecondary}
              value={roomName}
              onChangeText={setRoomName}
              returnKeyType="done"
            />
          </View>

          {/* Allow participants toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.card }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Allow all participants to speak</Text>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                You can always change this in the Live Room
              </Text>
            </View>
            <Switch
              value={allowAll}
              onValueChange={setAllowAll}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={allowAll ? '#FFFFFF' : colors.textSecondary}
              ios_backgroundColor={colors.border}
            />
          </View>

          {/* Cancel / Continue buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: colors.primary }, !roomName.trim() && [styles.continueBtnDisabled, { backgroundColor: colors.border }]]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={[styles.continueText, { color: colors.background }, !roomName.trim() && [styles.continueTextDisabled, { color: colors.textSecondary }]]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  bgLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  bgSafe: { flex: 1, paddingTop: Platform.OS === 'android' ? 32 : 0 },
  bgHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  bgFeedLabel: { fontSize: 13, flex: 1 },
  bgTitle: { fontSize: 20, fontWeight: 'bold', position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  bgHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
  bgStoryRow: { flexGrow: 0, marginBottom: 12 },
  bgAddCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  bgStoryCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, overflow: 'hidden' },
  bgStoryLive: {},
  bgStoryImg: { width: '100%', height: '100%' },
  bgLiveBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(242,36,92,0.7)', alignItems: 'center', paddingVertical: 2 },
  bgLiveText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },
  bgPost: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, opacity: 0.2 },
  bgAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  bgPostLines: { flex: 1, gap: 6 },
  bgLine1: { height: 9, borderRadius: 5, width: '60%' },
  bgLine2: { height: 7, borderRadius: 4, width: '40%' },

  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },

  sheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontWeight: 'bold', fontSize: 18, textAlign: 'center', marginBottom: 20 },

  inputWrap: { borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 14 },
  input: { fontSize: 15 },

  /* Toggle row */
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 20, gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontWeight: '600', fontSize: 14, marginBottom: 3 },
  toggleDesc: { fontSize: 12, lineHeight: 17 },

  /* Buttons */
  actionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600', fontSize: 15 },
  continueBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  continueBtnDisabled: {},
  continueText: { fontWeight: 'bold', fontSize: 15 },
  continueTextDisabled: {},
});
