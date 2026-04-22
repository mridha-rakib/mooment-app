import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Platform, StatusBar, Image, ScrollView,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Mock story/highlight data shown in background
const STORY_AVATARS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=150&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=150&auto=format&fit=crop',
];

const OPTIONS = [
  {
    id: 'moment',
    label: 'Mooment',
    description: 'Share one to your followers in just about on event you\'re attending',
    icon: 'zap',
    iconLib: 'feather',
    color: '#8E54E9',
    bg: '#8E54E920',
    route: '/create-post',
  },
  {
    id: 'story',
    label: 'Create Story',
    description: 'Show your upcoming activity',
    icon: 'book-open',
    iconLib: 'feather',
    color: '#16D869',
    bg: '#16D86920',
    route: '/add-story',
  },
  {
    id: 'event',
    label: 'Create Event',
    description: 'Post a real-world experience',
    icon: 'calendar',
    iconLib: 'feather',
    color: '#E06B3B',
    bg: '#E06B3B20',
    route: '/create-post',
  },
  {
    id: 'live',
    label: 'Live Room',
    description: 'Go live audio live room',
    icon: 'radio',
    iconLib: 'feather',
    color: '#3B82F6',
    bg: '#3B82F620',
    route: '/live-video',
  },
  {
    id: 'scan',
    label: 'Scan QR',
    description: 'Scan to open on product links',
    icon: 'maximize',
    iconLib: 'feather',
    color: '#16D869',
    bg: '#16D86920',
    route: null,
  },
];

export default function AddScreen() {
  const router = useRouter();

  const handleOption = (route: string | null) => {
    if (route) router.push(route as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Dimmed background (simulates home feed behind) ── */}
      <View style={styles.bgOverlay} />

      {/* ── Background peek: story avatars ── */}
      <SafeAreaView style={styles.bgContent}>
        {/* Mock "Moment" header */}
        <View style={styles.bgHeader}>
          <Text style={styles.bgHeaderText}>Moment</Text>
        </View>

        {/* Story circles peek */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storyRow} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {STORY_AVATARS.map((uri, i) => (
            <View key={i} style={styles.storyCircleWrap}>
              <Image source={{ uri }} style={styles.storyCircle} />
            </View>
          ))}
        </ScrollView>

        {/* Fake feed post preview */}
        <View style={styles.fakePost}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80&auto=format&fit=crop' }}
            style={styles.fakePostAvatar}
          />
          <View style={styles.fakePostLines}>
            <View style={styles.fakePostLine1} />
            <View style={styles.fakePostLine2} />
          </View>
        </View>
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={styles.sheetTitle}>Select to proceed</Text>

        {/* Options */}
        <View style={styles.optionsList}>
          {OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionRow, i < OPTIONS.length - 1 && styles.optionBorder]}
              onPress={() => handleOption(opt.route)}
              activeOpacity={0.75}
            >
              {/* Icon */}
              <View style={[styles.optionIcon, { backgroundColor: opt.bg }]}>
                <Feather name={opt.icon as any} size={20} color={opt.color} />
              </View>

              {/* Text */}
              <View style={styles.optionText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionDesc} numberOfLines={2}>{opt.description}</Text>
              </View>

              {/* Arrow */}
              <Feather name="chevron-right" size={18} color="#2A2A3A" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom safe padding */}
        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },

  /* Dimmed overlay */
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,13,18,0.72)',
    zIndex: 1,
  },

  /* Background content (visible through overlay) */
  bgContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  bgHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bgHeaderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 22,
    fontWeight: 'bold',
  },
  storyRow: {
    flexGrow: 0,
    marginBottom: 16,
  },
  storyCircleWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(212,176,235,0.5)',
    overflow: 'hidden',
  },
  storyCircle: {
    width: '100%',
    height: '100%',
  },
  fakePost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    opacity: 0.25,
  },
  fakePostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  fakePostLines: { flex: 1, gap: 6 },
  fakePostLine1: { height: 10, backgroundColor: '#FFFFFF', borderRadius: 5, width: '70%' },
  fakePostLine2: { height: 8, backgroundColor: '#8E8E9B', borderRadius: 4, width: '45%' },

  /* Sheet */
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A3A',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#8E8E9B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },

  /* Options */
  optionsList: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#13131A',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionText: {
    flex: 1,
    paddingRight: 8,
  },
  optionLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 3,
  },
  optionDesc: {
    color: '#8E8E9B',
    fontSize: 12,
    lineHeight: 17,
  },
});
