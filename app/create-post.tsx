import AudiencePickerModal from '@/components/AudiencePickerModal';
import EventPickerModal from '@/components/EventPickerModal';
import PeopleTagModal from '@/components/PeopleTagModal';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


const { width } = Dimensions.get('window');

const MOCK_MEDIA = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop',
];

const GALLERY_IMAGES = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=300&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=300&auto=format&fit=crop',
];

type PostMode = 'Post' | 'Moment';
type PostStep = 'compose' | 'preview';

export default function CreatePostScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<PostMode>('Post');
  const [step, setStep] = useState<PostStep>('compose');
  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([MOCK_MEDIA[0], MOCK_MEDIA[1]]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);
  const [audience, setAudience] = useState<string>('Public');
  const [location, setLocation] = useState<string | null>('Rooftop Bar, London');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  const handlePublish = () => {
    router.back();
  };

  const toggleMediaSelect = (uri: string) => {
    setSelectedMedia(prev =>
      prev.includes(uri) ? prev.filter(u => u !== uri) : [...prev, uri]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="x" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          {(['Post', 'Moment'] as PostMode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.publishBtn, (!caption && selectedMedia.length === 0) && styles.publishBtnDisabled]}
          onPress={handlePublish}
          activeOpacity={0.8}
        >
          <Text style={styles.publishBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── Author Row ── */}
        <View style={styles.authorRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>Alex Johnson</Text>
            {/* Audience Pill */}
            <TouchableOpacity style={styles.audiencePill} onPress={() => setShowAudienceModal(true)} activeOpacity={0.8}>
              <Feather name="globe" size={10} color="#D4B0EB" />
              <Text style={styles.audiencePillText}>{audience}</Text>
              <Feather name="chevron-down" size={10} color="#D4B0EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Caption Input ── */}
        <TextInput
          style={styles.captionInput}
          placeholder={mode === 'Post' ? "What's on your mind?" : "Share your moment..."}
          placeholderTextColor="#454555"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={500}
        />

        {/* ── Selected Media Preview ── */}
        {selectedMedia.length > 0 && (
          <View style={styles.mediaPreviewContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                setActiveMediaIdx(idx);
              }}
            >
              {selectedMedia.map((uri, i) => (
                <View key={i} style={styles.mediaSlide}>
                  <Image source={{ uri }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={() => toggleMediaSelect(uri)}
                    activeOpacity={0.8}
                  >
                    <Feather name="x" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            {selectedMedia.length > 1 && (
              <View style={styles.dotRow}>
                {selectedMedia.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeMediaIdx && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Metadata Pills ── */}
        <View style={styles.metaSection}>
          {/* Event */}
          <TouchableOpacity style={styles.metaRow} onPress={() => setShowEventModal(true)} activeOpacity={0.8}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="calendar-outline" size={18} color="#D4B0EB" />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Event</Text>
              <Text style={styles.metaValue}>{selectedEvent || 'Link to an event'}</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#454555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Tag People */}
          <TouchableOpacity style={styles.metaRow} onPress={() => setShowPeopleModal(true)} activeOpacity={0.8}>
            <View style={styles.metaIconWrap}>
              <Feather name="users" size={18} color="#D4B0EB" />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Tag People</Text>
              <Text style={styles.metaValue}>
                {taggedPeople.length > 0 ? taggedPeople.join(', ') : 'Who are you with?'}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#454555" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Location */}
          <TouchableOpacity style={styles.metaRow} activeOpacity={0.8}>
            <View style={styles.metaIconWrap}>
              <Feather name="map-pin" size={18} color="#D4B0EB" />
            </View>
            <View style={styles.metaTextCol}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{location || 'Add location'}</Text>
            </View>
            {location && (
              <TouchableOpacity onPress={() => setLocation(null)} activeOpacity={0.8}>
                <Feather name="x-circle" size={16} color="#454555" />
              </TouchableOpacity>
            )}
            {!location && <Feather name="chevron-right" size={16} color="#454555" />}
          </TouchableOpacity>
        </View>

        {/* ── Gallery Picker ── */}
        <View style={styles.gallerySection}>
          <Text style={styles.gallerySectionTitle}>Gallery</Text>
          <View style={styles.galleryGrid}>
            {GALLERY_IMAGES.map((uri, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.galleryItem, selectedMedia.includes(uri) && styles.galleryItemSelected]}
                onPress={() => toggleMediaSelect(uri)}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={styles.galleryImage} />
                {selectedMedia.includes(uri) && (
                  <View style={styles.galleryCheckOverlay}>
                    <View style={styles.galleryCheckBadge}>
                      <Feather name="check" size={12} color="#FFF" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Bottom Actions Bar ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bottomAction} activeOpacity={0.8}>
            <Feather name="image" size={22} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} activeOpacity={0.8}>
            <Feather name="camera" size={22} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} activeOpacity={0.8}>
            <Feather name="music" size={22} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} activeOpacity={0.8}>
            <Feather name="map-pin" size={22} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} activeOpacity={0.8}>
            <Feather name="tag" size={22} color="#8E8E9B" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomAction} activeOpacity={0.8}>
            <MaterialCommunityIcons name="sticker-emoji" size={22} color="#8E8E9B" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <EventPickerModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSelect={(event) => { setSelectedEvent(event); setShowEventModal(false); }}
      />
      <PeopleTagModal
        visible={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onSelect={(people) => { setTaggedPeople(people); setShowPeopleModal(false); }}
        selected={taggedPeople}
      />
      <AudiencePickerModal
        visible={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        onSelect={(aud) => { setAudience(aud); setShowAudienceModal(false); }}
        current={audience}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A2E' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  modeToggle: { flex: 1, flexDirection: 'row', justifyContent: 'center', marginHorizontal: 12, backgroundColor: '#1A1A2E', borderRadius: 20, padding: 3 },
  modeBtn: { flex: 1, paddingVertical: 7, borderRadius: 18, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#D4B0EB' },
  modeBtnText: { color: '#8E8E9B', fontSize: 13, fontWeight: '600' },
  modeBtnTextActive: { color: '#0e0d12' },
  publishBtn: { backgroundColor: '#D4B0EB', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 18 },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 14 },

  /* Body */
  body: { flex: 1 },

  /* Author */
  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  authorMeta: { flex: 1 },
  authorName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginBottom: 5 },
  audiencePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,176,235,0.12)', borderWidth: 1, borderColor: 'rgba(212,176,235,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', gap: 4 },
  audiencePillText: { color: '#D4B0EB', fontSize: 11, fontWeight: '600', marginHorizontal: 2 },

  /* Caption */
  captionInput: { color: '#FFFFFF', fontSize: 16, paddingHorizontal: 16, lineHeight: 24, minHeight: 80 },

  /* Media Preview */
  mediaPreviewContainer: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, overflow: 'hidden' },
  mediaSlide: { width: width - 32, height: 220, position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  removeMediaBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  dotRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#454555' },
  dotActive: { backgroundColor: '#D4B0EB', width: 18 },

  /* Meta Section */
  metaSection: { marginHorizontal: 16, backgroundColor: '#13131A', borderRadius: 14, marginBottom: 20, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  metaIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(212,176,235,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  metaTextCol: { flex: 1 },
  metaLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  metaValue: { color: '#454555', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#1A1A2E', marginLeft: 60 },

  /* Gallery */
  gallerySection: { marginHorizontal: 16, marginBottom: 16 },
  gallerySectionTitle: { color: '#8E8E9B', fontWeight: '600', fontSize: 13, marginBottom: 10 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  galleryItem: { width: (width - 32 - 8) / 3, height: (width - 32 - 8) / 3, borderRadius: 8, overflow: 'hidden' },
  galleryItemSelected: { borderWidth: 2, borderColor: '#D4B0EB' },
  galleryImage: { width: '100%', height: '100%' },
  galleryCheckOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(212,176,235,0.25)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 6 },
  galleryCheckBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#D4B0EB', justifyContent: 'center', alignItems: 'center' },

  /* Bottom Bar */
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1A1A2E', paddingVertical: 12, paddingHorizontal: 8 },
  bottomAction: { flex: 1, alignItems: 'center', paddingVertical: 4 },
});
