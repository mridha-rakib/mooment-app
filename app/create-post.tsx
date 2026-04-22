import AudiencePickerModal from '@/components/AudiencePickerModal';
import EventPickerModal from '@/components/EventPickerModal';
import PeopleTagModal from '@/components/PeopleTagModal';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

const { width } = Dimensions.get('window');

// ── Gallery images ────────────────────────────────────────────────────────
const GALLERY_IMAGES = [
  { uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop', isVideo: false },
  { uri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop', isVideo: false },
  { uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop', isVideo: true },
  { uri: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=400&auto=format&fit=crop', isVideo: false },
  { uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop', isVideo: false },
  { uri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop', isVideo: false },
  { uri: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=400&auto=format&fit=crop', isVideo: true },
  { uri: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop', isVideo: false },
  { uri: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=400&auto=format&fit=crop', isVideo: false },
];

const ITEM_SIZE = (width - 32 - 6) / 3;

export default function CreateMomentScreen() {
  const router = useRouter();

  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([GALLERY_IMAGES[0].uri]);
  const [featuredUri, setFeaturedUri] = useState(GALLERY_IMAGES[0].uri);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);
  const [audience, setAudience] = useState('Public');
  const [location, setLocation] = useState<string | null>('Rooftop Bar, London');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);

  const canPublish = caption.trim().length > 0 || selectedMedia.length > 0;

  const tapGalleryItem = (uri: string) => {
    setFeaturedUri(uri);
    setSelectedMedia(prev =>
      prev.includes(uri) ? prev : [uri, ...prev.filter(u => u !== uri)]
    );
  };

  const removeFeatured = () => {
    const next = selectedMedia.filter(u => u !== featuredUri);
    setSelectedMedia(next);
    setFeaturedUri(next[0] ?? '');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.8}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Create moment</Text>

        <TouchableOpacity
          style={[styles.postBtn, !canPublish && styles.postBtnDisabled]}
          onPress={() => router.back()}
          disabled={!canPublish}
          activeOpacity={0.8}
        >
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 50 }}
      >

        {/* ── Featured Image ── */}
        <View style={styles.featuredContainer}>
          {featuredUri ? (
            <>
              <Image source={{ uri: featuredUri }} style={styles.featuredImage} />
              {/* Dim overlay */}
              <View style={styles.featuredOverlay} />
              {/* Remove button */}
              <TouchableOpacity style={styles.removeBtn} onPress={removeFeatured} activeOpacity={0.8}>
                <Feather name="x" size={15} color="#FFF" />
              </TouchableOpacity>
              {/* Expand button */}
              <TouchableOpacity style={styles.expandBtn} activeOpacity={0.8}>
                <Feather name="maximize-2" size={14} color="#FFF" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.featuredEmpty} activeOpacity={0.8}>
              <Feather name="image" size={36} color="#2A2A3A" />
              <Text style={styles.featuredEmptyText}>Tap gallery below to add media</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Author Row ── */}
        <View style={styles.authorRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>Alex Johnson</Text>
            <TouchableOpacity
              style={styles.audiencePill}
              onPress={() => setShowAudienceModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="globe" size={10} color="#D4B0EB" />
              <Text style={styles.audiencePillText}>{audience}</Text>
              <Feather name="chevron-down" size={10} color="#D4B0EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Caption Input ── */}
        <TextInput
          style={styles.captionInput}
          placeholder="Share what's happening in this moment..."
          placeholderTextColor="#454555"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
        />
        {caption.length > 0 && (
          <Text style={styles.charCount}>{500 - caption.length} remaining</Text>
        )}

        {/* ── Metadata Card ── */}
        <View style={styles.metaCard}>
          {/* Event */}
          <TouchableOpacity style={styles.metaRow} onPress={() => setShowEventModal(true)} activeOpacity={0.8}>
            <View style={[styles.metaIcon, { backgroundColor: 'rgba(212,176,235,0.15)' }]}>
              <Ionicons name="calendar-outline" size={18} color="#D4B0EB" />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Event</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {selectedEvent ?? 'Link to an event'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#2A2A3A" />
          </TouchableOpacity>

          <View style={styles.metaDivider} />

          {/* Tag people */}
          <TouchableOpacity style={styles.metaRow} onPress={() => setShowPeopleModal(true)} activeOpacity={0.8}>
            <View style={[styles.metaIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Feather name="users" size={18} color="#3B82F6" />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Tag People</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {taggedPeople.length > 0 ? taggedPeople.join(', ') : 'Who are you with?'}
              </Text>
            </View>
            {taggedPeople.length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{taggedPeople.length}</Text>
              </View>
            ) : (
              <Feather name="chevron-right" size={16} color="#2A2A3A" />
            )}
          </TouchableOpacity>

          <View style={styles.metaDivider} />

          {/* Location */}
          <TouchableOpacity style={styles.metaRow} activeOpacity={0.8}>
            <View style={[styles.metaIcon, { backgroundColor: 'rgba(22,216,105,0.15)' }]}>
              <Feather name="map-pin" size={18} color="#16D869" />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {location ?? 'Add a location'}
              </Text>
            </View>
            {location ? (
              <TouchableOpacity onPress={() => setLocation(null)} activeOpacity={0.8}>
                <Feather name="x-circle" size={16} color="#2A2A3A" />
              </TouchableOpacity>
            ) : (
              <Feather name="chevron-right" size={16} color="#2A2A3A" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Gallery Section ── */}
        <View style={styles.gallerySection}>
          <View style={styles.gallerySectionHeader}>
            <Text style={styles.gallerySectionTitle}>Gallery</Text>
            <TouchableOpacity activeOpacity={0.8}>
              <Text style={styles.gallerySeeAll}>Browse all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.galleryGrid}>
            {GALLERY_IMAGES.map((item, i) => {
              const isSelected = selectedMedia.includes(item.uri);
              const isFeatured = featuredUri === item.uri;
              const selIdx = selectedMedia.indexOf(item.uri);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.galleryItem,
                    isFeatured && styles.galleryItemFeatured,
                  ]}
                  onPress={() => tapGalleryItem(item.uri)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.uri }} style={styles.galleryImg} />

                  {/* Video badge */}
                  {item.isVideo && (
                    <View style={styles.videoBadge}>
                      <Feather name="play" size={10} color="#FFF" />
                    </View>
                  )}

                  {/* Selection overlay */}
                  {isSelected && (
                    <View style={styles.galleryOverlay}>
                      <View style={[styles.gallerySelBadge, isFeatured && styles.gallerySelBadgeFeatured]}>
                        <Text style={styles.gallerySelNum}>{selIdx + 1}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Bottom Toolbar ── */}
        <View style={styles.toolbar}>
          {[
            { icon: 'camera', label: 'Camera' },
            { icon: 'music', label: 'Music' },
            { icon: 'type', label: 'Text' },
            { icon: 'tag', label: 'Tag' },
            { icon: 'smile', label: 'Feeling' },
            { icon: 'more-horizontal', label: 'More' },
          ].map(t => (
            <TouchableOpacity key={t.label} style={styles.toolbarItem} activeOpacity={0.8}>
              <Feather name={t.icon as any} size={20} color="#8E8E9B" />
              <Text style={styles.toolbarLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <EventPickerModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSelect={ev => { setSelectedEvent(ev); setShowEventModal(false); }}
      />
      <PeopleTagModal
        visible={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onSelect={people => { setTaggedPeople(people); setShowPeopleModal(false); }}
        selected={taggedPeople}
      />
      <AudiencePickerModal
        visible={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        onSelect={aud => { setAudience(aud); setShowAudienceModal(false); }}
        current={audience}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#13131A',
  },
  headerBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, color: '#FFFFFF', fontWeight: 'bold', fontSize: 17,
    textAlign: 'center',
  },
  postBtn: {
    backgroundColor: '#16D869',
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 14 },

  /* Featured image */
  featuredContainer: {
    marginHorizontal: 16, marginTop: 14,
    height: 220, borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#13131A',
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14,13,18,0.25)',
  },
  removeBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  expandBtn: {
    position: 'absolute', top: 10, right: 46,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  featuredEmpty: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  featuredEmptyText: { color: '#2A2A3A', fontSize: 13 },

  /* Author */
  authorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, marginBottom: 6,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  authorInfo: { flex: 1 },
  authorName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginBottom: 5 },
  audiencePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(212,176,235,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,176,235,0.25)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    alignSelf: 'flex-start', gap: 4,
  },
  audiencePillText: { color: '#D4B0EB', fontSize: 11, fontWeight: '600' },

  /* Caption */
  captionInput: {
    color: '#FFFFFF', fontSize: 15, lineHeight: 22,
    paddingHorizontal: 16, minHeight: 72,
  },
  charCount: {
    color: '#454555', fontSize: 11,
    textAlign: 'right', paddingRight: 16, marginBottom: 8,
  },

  /* Meta card */
  metaCard: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 20,
    backgroundColor: '#13131A', borderRadius: 14, overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  metaIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  metaText: { flex: 1 },
  metaLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  metaValue: { color: '#454555', fontSize: 12, marginTop: 2 },
  metaDivider: { height: 1, backgroundColor: '#1A1A2E', marginLeft: 62 },
  countBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: '#D4B0EB',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  countBadgeText: { color: '#0e0d12', fontSize: 11, fontWeight: 'bold' },

  /* Gallery */
  gallerySection: { marginHorizontal: 16, marginBottom: 20 },
  gallerySectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  gallerySectionTitle: {
    color: '#8E8E9B', fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  gallerySeeAll: { color: '#D4B0EB', fontSize: 13, fontWeight: '600' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  galleryItem: {
    width: ITEM_SIZE, height: ITEM_SIZE,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  galleryItemFeatured: { borderColor: '#16D869' },
  galleryImg: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute', bottom: 5, left: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, padding: 3,
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22,216,105,0.15)',
    justifyContent: 'flex-end', alignItems: 'flex-end', padding: 5,
  },
  gallerySelBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#8E54E9',
    justifyContent: 'center', alignItems: 'center',
  },
  gallerySelBadgeFeatured: { backgroundColor: '#16D869' },
  gallerySelNum: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 8, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#13131A',
  },
  toolbarItem: { flex: 1, alignItems: 'center', gap: 5 },
  toolbarLabel: { color: '#454555', fontSize: 10 },
});
