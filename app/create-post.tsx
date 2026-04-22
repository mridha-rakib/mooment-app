import AudiencePickerModal from '@/components/AudiencePickerModal';
import EventPickerModal from '@/components/EventPickerModal';
import PeopleTagModal from '@/components/PeopleTagModal';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert, Dimensions, Image, Modal, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const MOCK_EVENT = 'Roofstope Series Vol1.';

// Gallery images for the picker sheet
const GALLERY_ITEMS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=400&auto=format&fit=crop',
];

type MomentMode = 'feed' | 'event';

// ── Gallery Picker Sheet ──────────────────────────────────────────────────
function GalleryPickerSheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (uri: string) => void;
}) {
  const ITEM = (width - 6) / 3;
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={gStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={gStyles.sheet}>
          <View style={gStyles.handle} />
          <View style={gStyles.sheetHeader}>
            <Text style={gStyles.sheetTitle}>Choose from Gallery</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={20} color="#8E8E9B" />
            </TouchableOpacity>
          </View>
          <View style={gStyles.grid}>
            {GALLERY_ITEMS.map((uri, i) => (
              <TouchableOpacity
                key={i}
                style={{ width: ITEM, height: ITEM }}
                onPress={() => { onSelect(uri); onClose(); }}
                activeOpacity={0.8}
              >
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const gStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A3A', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sheetTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 3 },
});

// ── Camera Sheet ──────────────────────────────────────────────────────────
function CameraSheet({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={camStyles.root}>
        <StatusBar barStyle="light-content" />
        {permission.granted ? (
          <CameraView ref={cameraRef} style={camStyles.camera} facing="back">
            {/* Header */}
            <SafeAreaView style={camStyles.header}>
              <TouchableOpacity onPress={onClose} style={camStyles.closeBtn} activeOpacity={0.8}>
                <Feather name="x" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </SafeAreaView>
            {/* Capture button */}
            <View style={camStyles.captureRow}>
              <TouchableOpacity
                style={camStyles.captureOuter}
                activeOpacity={0.9}
                onPress={() => {
                  // Simulate capture with a mock image since actual capture requires native build
                  const mockUri = GALLERY_ITEMS[Math.floor(Math.random() * GALLERY_ITEMS.length)];
                  onCapture(mockUri);
                  onClose();
                }}
              >
                <View style={camStyles.captureInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          <View style={camStyles.permissionView}>
            <Feather name="camera-off" size={48} color="#454555" />
            <Text style={camStyles.permissionText}>Camera access needed</Text>
            <TouchableOpacity style={camStyles.permissionBtn} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={camStyles.permissionBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: '#8E8E9B', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const camStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  captureRow: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  captureOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  permissionView: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  permissionText: { color: '#8E8E9B', fontSize: 16, textAlign: 'center' },
  permissionBtn: { backgroundColor: '#D4B0EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  permissionBtnText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 14 },
});

// ── Main Screen ───────────────────────────────────────────────────────────
export default function CreateMomentScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<MomentMode>('feed');
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>(MOCK_EVENT);
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);
  const [audience, setAudience] = useState('Public');

  // Modal states
  const [showGallery, setShowGallery] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);

  const handleImageSelect = (uri: string) => {
    setSelectedImage(uri);
    setMode('feed'); // switch to feed mode when image selected
  };

  const taggedLabel = taggedPeople.join(', ');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} activeOpacity={0.8}>
          <Feather name="x" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Mooment</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* ── Mode Checkboxes ── */}
      <View style={styles.checkboxRow}>
        <TouchableOpacity style={styles.checkboxItem} onPress={() => setMode('feed')} activeOpacity={0.8}>
          <View style={[styles.checkbox, mode === 'feed' && styles.checkboxActive]}>
            {mode === 'feed' && <Feather name="check" size={11} color="#FFFFFF" />}
          </View>
          <Text style={[styles.checkboxLabel, mode === 'feed' && styles.checkboxLabelActive]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkboxItem, { marginLeft: 20 }]}
          onPress={() => {
            setMode('event');
            setShowEventModal(true); // open event picker immediately
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, mode === 'event' && styles.checkboxActive]}>
            {mode === 'event' && <Feather name="check" size={11} color="#FFFFFF" />}
          </View>
          <Text style={[styles.checkboxLabel, mode === 'event' && styles.checkboxLabelActive]}>Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* ── Author Row ── */}
        <View style={styles.authorRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <View style={styles.authorInfo}>
            <Text style={styles.authorNameFull} numberOfLines={2}>
              <Text style={styles.authorBold}>Tuval Mor</Text>
              {/* Tagged people only in Feed mode */}
              {mode === 'feed' && taggedPeople.length > 0 && (
                <>
                  <Text style={styles.authorMuted}> with </Text>
                  <Text style={styles.authorBold}>{taggedLabel}</Text>
                </>
              )}
              {/* Event link only in Event mode */}
              {mode === 'event' && (
                <>
                  <Text style={styles.authorMuted}> at </Text>
                  <Text style={styles.authorBold}>{selectedEvent}</Text>
                </>
              )}
            </Text>
          </View>

          {mode === 'event' && (
            <TouchableOpacity style={styles.eventPill} onPress={() => setShowEventModal(true)} activeOpacity={0.8}>
              <View style={styles.eventPillDot} />
              <Text style={styles.eventPillText}>Event</Text>
              <Feather name="chevron-down" size={12} color="#16D869" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── FEED MODE: Image + stitch ── */}
        {mode === 'feed' && (
          <>
            {selectedImage ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: selectedImage }} style={styles.momentImage} resizeMode="cover" />
                <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setSelectedImage(null)} activeOpacity={0.8}>
                  <Feather name="x" size={13} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : null}

            <TextInput
              style={styles.stitchInput}
              placeholder="Write your stitch here. . ."
              placeholderTextColor="#454555"
              value={caption}
              onChangeText={setCaption}
              multiline
            />
          </>
        )}

        {/* ── EVENT MODE: Text caption ── */}
        {mode === 'event' && (
          <TextInput
            style={styles.eventCaptionInput}
            placeholder="Share what this moment means to you..."
            placeholderTextColor="#454555"
            value={caption}
            onChangeText={setCaption}
            multiline
          />
        )}

        <View style={{ minHeight: 120 }} />
      </ScrollView>

      {/* ── Bottom Toolbar ── */}
      <View style={styles.toolbar}>
        {/* People */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowPeopleModal(true)} activeOpacity={0.8}>
          <View style={styles.toolbarIconBox}>
            <Feather name="users" size={22} color={taggedPeople.length > 0 ? '#D4B0EB' : '#FFFFFF'} />
          </View>
          <Text style={[styles.toolbarLabel, taggedPeople.length > 0 && { color: '#D4B0EB' }]}>People</Text>
        </TouchableOpacity>

        {/* Image / Gallery */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowGallery(true)} activeOpacity={0.8}>
          <View style={styles.toolbarIconBox}>
            <Feather name="image" size={22} color={selectedImage && mode === 'feed' ? '#D4B0EB' : '#FFFFFF'} />
          </View>
          <Text style={[styles.toolbarLabel, selectedImage && mode === 'feed' && { color: '#D4B0EB' }]}>Image</Text>
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowCamera(true)} activeOpacity={0.8}>
          <View style={styles.toolbarIconBox}>
            <Feather name="camera" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.toolbarLabel}>Camera</Text>
        </TouchableOpacity>

        {/* Video */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowGallery(true)} activeOpacity={0.8}>
          <View style={styles.toolbarIconBox}>
            <Feather name="video" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.toolbarLabel}>Video</Text>
        </TouchableOpacity>

        {/* Audio */}
        <TouchableOpacity
          style={styles.toolbarItem}
          onPress={() => Alert.alert('Audio', 'Record or choose audio for your moment')}
          activeOpacity={0.8}
        >
          <View style={styles.toolbarIconBox}>
            <MaterialCommunityIcons name="music-note" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.toolbarLabel}>Audio</Text>
        </TouchableOpacity>
      </View>

      {/* ── Modals ── */}
      <GalleryPickerSheet
        visible={showGallery}
        onClose={() => setShowGallery(false)}
        onSelect={handleImageSelect}
      />
      <CameraSheet
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleImageSelect}
      />
      <EventPickerModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSelect={ev => { setSelectedEvent(ev); setShowEventModal(false); }}
      />
      <PeopleTagModal
        visible={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onSelect={people => setTaggedPeople(people)}
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
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '700', fontSize: 17, marginLeft: 12 },
  doneBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  doneBtnText: { color: '#0e0d12', fontWeight: '700', fontSize: 14 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#454555', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#8E8E9B', borderColor: '#8E8E9B' },
  checkboxLabel: { color: '#8E8E9B', fontSize: 14, fontWeight: '500' },
  checkboxLabelActive: { color: '#FFFFFF', fontWeight: '600' },

  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  authorInfo: { flex: 1 },
  authorName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  authorNameFull: { fontSize: 13, lineHeight: 19 },
  authorBold: { color: '#FFFFFF', fontWeight: '700' },
  authorMuted: { color: '#8E8E9B', fontWeight: '400' },

  eventPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,216,105,0.12)', borderWidth: 1, borderColor: 'rgba(22,216,105,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  eventPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16D869' },
  eventPillText: { color: '#16D869', fontSize: 12, fontWeight: '700' },

  imageWrapper: { marginHorizontal: 16, marginBottom: 14, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  momentImage: { width: '100%', height: 220, borderRadius: 12 },
  imageRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },



  stitchInput: { color: '#FFFFFF', fontSize: 15, paddingHorizontal: 16, lineHeight: 22, minHeight: 180 },
  eventCaptionInput: { color: '#FFFFFF', fontSize: 14, paddingHorizontal: 16, lineHeight: 22, minHeight: 220 },

  toolbar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#13131A', paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#0e0d12' },
  toolbarItem: { flex: 1, alignItems: 'center', gap: 5 },
  toolbarIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#13131A', justifyContent: 'center', alignItems: 'center' },
  toolbarLabel: { color: '#8E8E9B', fontSize: 11 },
});
