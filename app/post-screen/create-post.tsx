import AudiencePickerModal from '@/components/post/AudiencePickerModal';
import EventPickerModal from '@/components/post/EventPickerModal';
import PeopleTagModal from '@/components/post/PeopleTagModal';
import { Feather } from '@expo/vector-icons';
import { AddTeamIcon, Image01Icon, MusicNote04Icon, Video02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert, Dimensions, Image, Modal, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import BackButton from '@/components/ui/BackButton';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors, isDark } = useTheme();
  const ITEM = (width - 6) / 3;
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={gStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[gStyles.sheet, { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: isDark ? 0 : 1 }]}>
          <View style={[gStyles.handle, { backgroundColor: colors.border }]} />
          <View style={gStyles.sheetHeader}>
            <Text style={[gStyles.sheetTitle, { color: colors.text }]}>Choose from Gallery</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={20} color={colors.textSecondary} />
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
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  sheetTitle: { fontWeight: 'bold', fontSize: 16 },
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
  const { colors, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[camStyles.root, { backgroundColor: '#000' }]}>
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
          <View style={[camStyles.permissionView, { backgroundColor: colors.background }]}>
            <Feather name="camera-off" size={48} color={colors.textSecondary} />
            <Text style={[camStyles.permissionText, { color: colors.textSecondary }]}>Camera access needed</Text>
            <TouchableOpacity style={[camStyles.permissionBtn, { backgroundColor: colors.primary }]} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={[camStyles.permissionBtnText, { color: colors.background }]}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Room Setup Modal ──────────────────────────────────────────────────────
function RoomSetupModal({
  visible,
  onClose,
  onContinue,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: (name: string, speakers: boolean) => void;
}) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [speakers, setSpeakers] = useState(true);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={rmStyles.overlay}>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={rmStyles.blur}>
          <View style={[rmStyles.container, { backgroundColor: colors.background }]}>
            <Text style={[rmStyles.title, { color: colors.text }]}>Name your Room</Text>

            <View style={[rmStyles.inputWrapper, { backgroundColor: colors.card }]}>
              <TextInput
                style={[rmStyles.input, { color: colors.text }]}
                placeholder="Room name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <TouchableOpacity
              style={[rmStyles.checkboxRow, { backgroundColor: colors.card }]}
              onPress={() => setSpeakers(!speakers)}
              activeOpacity={0.8}
            >
              <View style={rmStyles.checkboxInfo}>
                <Text style={[rmStyles.checkboxTitle, { color: colors.text }]}>Allow all participants to speak</Text>
                <Text style={[rmStyles.checkboxSub, { color: colors.textSecondary }]}>You can always change this in the Live Room</Text>
              </View>
              <View style={[rmStyles.checkbox, { borderColor: colors.border }, speakers && [rmStyles.checkboxActive, { backgroundColor: colors.text, borderColor: colors.text }]]}>
                {speakers && <Feather name="check" size={12} color={colors.background} />}
              </View>
            </TouchableOpacity>

            <View style={rmStyles.footer}>
              <TouchableOpacity style={rmStyles.cancelBtn} onPress={onClose}>
                <Text style={[rmStyles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[rmStyles.continueBtn, { backgroundColor: colors.primary }]} 
                onPress={() => onContinue(name, speakers)}
              >
                <Text style={[rmStyles.continueBtnText, { color: colors.background }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// ── QR Scanner Modal ─────────────────────────────────────────────────────
function QRScannerModal({
  visible,
  onClose,
  onScan,
}: {
  visible: boolean;
  onClose: () => void;
  onScan: (event: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState<'scan' | 'type'>('scan');
  const [qrCode, setQrCode] = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[qsStyles.root, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={qsStyles.header}>
          <TouchableOpacity onPress={onClose} style={[qsStyles.backBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={[qsStyles.tabRow, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[qsStyles.tab, tab === 'scan' && [qsStyles.tabActive, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]]}
              onPress={() => setTab('scan')}
            >
              <Text style={[qsStyles.tabText, { color: colors.textSecondary }, tab === 'scan' && [qsStyles.tabTextActive, { color: colors.text }]]}>Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[qsStyles.tab, tab === 'type' && [qsStyles.tabActive, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]]}
              onPress={() => setTab('type')}
            >
              <Text style={[qsStyles.tabText, { color: colors.textSecondary }, tab === 'type' && [qsStyles.tabTextActive, { color: colors.text }]]}>Type QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>

        {tab === 'scan' ? (
          <View style={qsStyles.scanBody}>
            {permission.granted ? (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={({ data }) => {
                  if (data) onScan(data);
                }}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
                <TouchableOpacity onPress={requestPermission} style={camStyles.permissionBtn}>
                  <Text style={camStyles.permissionBtnText}>Allow Camera Access</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scanner Overlay */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              {/* This creates a "hole" in the overlay */}
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                <View style={qsStyles.scannerBox}>
                  <View style={[qsStyles.corner, qsStyles.topLeft]} />
                  <View style={[qsStyles.corner, qsStyles.topRight]} />
                  <View style={[qsStyles.corner, qsStyles.bottomLeft]} />
                  <View style={[qsStyles.corner, qsStyles.bottomRight]} />
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
              </View>
              <View style={{ flex: 1.5, alignItems: 'center' }}>
                <TouchableOpacity
                  style={qsStyles.captureBtn}
                  onPress={() => onScan('Rooftop Session Vol. 4')}
                />
                <Text style={{ color: '#FFFFFF', marginTop: 20, fontSize: 14 }}>Align QR code within the frame</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={qsStyles.typeBody}>
            <Text style={[qsStyles.scanTitle, { color: colors.text }]}>Scan QR CODE</Text>
            <TextInput
              style={[qsStyles.typeInput, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Type QR Code"
              placeholderTextColor={colors.textSecondary}
              value={qrCode}
              onChangeText={setQrCode}
            />
            <View style={{ flex: 1 }} />
            <View style={qsStyles.typeFooter}>
              <TouchableOpacity style={[qsStyles.typeCancel, { backgroundColor: colors.card }]} onPress={onClose}>
                <Text style={[qsStyles.typeCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[qsStyles.typeContinue, { backgroundColor: colors.primary }]}
                onPress={() => onScan('Rooftop Session Vol. 4')}
              >
                <Text style={[qsStyles.typeContinueText, { color: colors.background }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── QR Details Modal ──────────────────────────────────────────────────────
function QRDetailsModal({
  visible,
  onClose,
  onContinue,
  eventTitle,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  eventTitle: string;
}) {
  const { colors, isDark } = useTheme();
  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onContinue();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={[qdStyles.overlay, { backgroundColor: colors.background }]}>
        <View style={qdStyles.container}>
          <View style={qdStyles.header}>
            <TouchableOpacity onPress={onClose} style={[qdStyles.backBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Feather name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[qdStyles.headerTitle, { color: colors.text }]}>QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[qdStyles.productCard, { backgroundColor: colors.card }]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=200' }}
              style={qdStyles.productImg}
            />
            <View style={{ flex: 1 }}>
              <Text style={[qdStyles.productTitle, { color: colors.text }]}>Medusa Skin Whitening Cream</Text>
              <Text style={[qdStyles.productMeta, { color: colors.textSecondary }]}>@df_koko • QTY: 1</Text>
              <Text style={[qdStyles.productPrice, { color: colors.primary }]}>£28</Text>
            </View>
          </View>

          <View style={[qdStyles.venueCard, { backgroundColor: colors.card }]}>
            <View style={qdStyles.venueHeader}>
              <Feather name="map-pin" size={18} color={colors.text} />
              <Text style={[qdStyles.venueTitle, { color: colors.text }]}>New York City</Text>
            </View>
            <View style={qdStyles.venueDetails}>
              <Text style={[qdStyles.venueLabel, { color: colors.textSecondary }]}>Venue: <Text style={[qdStyles.venueValue, { color: colors.text }]}>The Rooftop Lounge</Text></Text>
              <Text style={[qdStyles.venueLabel, { color: colors.textSecondary }]}>Address: <Text style={[qdStyles.venueValue, { color: colors.text }]}>123 Main Street, New York, NY 1001</Text></Text>
              <Text style={[qdStyles.venueLabel, { color: colors.textSecondary }]}>Time: <Text style={[qdStyles.venueValue, { color: colors.text }]}>Tonight • 9pm</Text></Text>
            </View>
          </View>

          <View style={qdStyles.orderRow}>
            <Text style={[qdStyles.orderText, { color: colors.textSecondary }]}>Order No: <Text style={[qdStyles.orderId, { color: colors.text }]}>MOM-2026-8741</Text></Text>
            <Feather name="check-circle" size={18} color={colors.primary} />
          </View>

          <View style={qdStyles.qrContainer}>
            <Image
              source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MOM-2026-8741' }}
              style={qdStyles.qrImage}
            />
          </View>

          <View style={[qdStyles.statusBanner, { backgroundColor: isDark ? 'rgba(22,216,105,0.06)' : 'rgba(22,216,105,0.1)' }]}>
            <Feather name="check" size={16} color="#16D869" />
            <Text style={[qdStyles.statusMsg, { color: colors.textSecondary }]}>Your Product has been handover to you in the venue. Thank you for buying from us.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const camStyles = StyleSheet.create({
  root: { flex: 1 },
  camera: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  captureRow: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  captureOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  permissionView: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  permissionText: { fontSize: 16, textAlign: 'center' },
  permissionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  permissionBtnText: { fontWeight: 'bold', fontSize: 14 },
});

// ── Main Screen ───────────────────────────────────────────────────────────
export default function CreateMomentScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<MomentMode>('feed');
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>(MOCK_EVENT);
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);
  const [audience, setAudience] = useState('Public');
  const [showConfetti, setShowConfetti] = useState(false);

  // Modal states
  const [showGallery, setShowGallery] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleImageSelect = (uri: string) => {
    setSelectedImage(uri);
  };

  const handleDone = () => {
    if (mode === 'event') {
      setShowQRScanner(true);
    } else {
      setShowConfetti(true);
      // Simulate post creation delay
      setTimeout(() => {
        router.back();
      }, 2500);
    }
  };

  const taggedLabel = taggedPeople.join(', ');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Confetti Animation */}
      <ConfettiOverlay
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Mooment</Text>
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={handleDone} activeOpacity={0.8}>
          <Text style={[styles.doneBtnText, { color: colors.background }]}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* ── Mode Checkboxes ── */}
      <View style={styles.checkboxRow}>
        <TouchableOpacity style={styles.checkboxItem} onPress={() => setMode('feed')} activeOpacity={0.8}>
          <View style={[styles.checkbox, { borderColor: colors.border }, mode === 'feed' && [styles.checkboxActive, { backgroundColor: colors.text, borderColor: colors.text }]]}>
            {mode === 'feed' && <Feather name="check" size={11} color={colors.background} />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.textSecondary }, mode === 'feed' && [styles.checkboxLabelActive, { color: colors.text }]]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.checkboxItem, { marginLeft: 20 }]}
          onPress={() => setMode('event')}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, { borderColor: colors.border }, mode === 'event' && [styles.checkboxActive, { backgroundColor: colors.text, borderColor: colors.text }]]}>
            {mode === 'event' && <Feather name="check" size={11} color={colors.background} />}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.textSecondary }, mode === 'event' && [styles.checkboxLabelActive, { color: colors.text }]]}>Event</Text>
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
              <Text style={[styles.authorBold, { color: colors.text }]}>Tuval Mor</Text>
              {/* Tagged people visible in both modes */}
              {taggedPeople.length > 0 && (
                <>
                  <Text style={[styles.authorMuted, { color: colors.textSecondary }]}> with </Text>
                  <Text style={[styles.authorBold, { color: colors.text }]}>{taggedLabel}</Text>
                </>
              )}
              {/* Event link only in Event mode */}
              {mode === 'event' && (
                <>
                  <Text style={[styles.authorMuted, { color: colors.textSecondary }]}> at </Text>
                  <Text style={[styles.authorBold, { color: colors.text }]}>{selectedEvent}</Text>
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

        {/* ── Content Section (Image + Caption) ── */}
        {selectedImage ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: selectedImage }} style={styles.momentImage} resizeMode="cover" />
            <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => setSelectedImage(null)} activeOpacity={0.8}>
              <Feather name="x" size={13} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          style={[styles.stitchInput, { color: colors.text }]}
          placeholder={mode === 'feed' ? "Write your stitch here. . ." : "Share what this moment means to you..."}
          placeholderTextColor={colors.textSecondary}
          value={caption}
          onChangeText={setCaption}
          multiline
        />

        <View style={{ minHeight: 120 }} />
      </ScrollView>

      {/* ── Bottom Toolbar ── */}
      <View style={[styles.toolbar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {/* People */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowPeopleModal(true)} activeOpacity={0.8}>
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.toolbarIconBox, { backgroundColor: isDark ? 'rgba(104, 104, 104, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <HugeiconsIcon icon={AddTeamIcon} size={22} color={taggedPeople.length > 0 ? colors.primary : colors.textSecondary} />
          </BlurView>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }, taggedPeople.length > 0 && { color: colors.primary }]}>People</Text>
        </TouchableOpacity>

        {/* Image / Gallery */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowGallery(true)} activeOpacity={0.8}>
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.toolbarIconBox, { backgroundColor: isDark ? 'rgba(104, 104, 104, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <HugeiconsIcon icon={Image01Icon} size={22} color={selectedImage ? colors.primary : colors.textSecondary} />
          </BlurView>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }, selectedImage && { color: colors.primary }]}>Image</Text>
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowCamera(true)} activeOpacity={0.8}>
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.toolbarIconBox, { backgroundColor: isDark ? 'rgba(104, 104, 104, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Feather name="camera" size={22} color={colors.textSecondary} />
          </BlurView>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>Camera</Text>
        </TouchableOpacity>

        {/* Video */}
        <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowGallery(true)} activeOpacity={0.8}>
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.toolbarIconBox, { backgroundColor: isDark ? 'rgba(104, 104, 104, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <HugeiconsIcon icon={Video02Icon} size={22} color={colors.textSecondary} />
          </BlurView>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>Video</Text>
        </TouchableOpacity>

        {/* Audio */}
        <TouchableOpacity
          style={styles.toolbarItem}
          onPress={() => Alert.alert('Audio', 'Record or choose audio for your moment')}
          activeOpacity={0.8}
        >
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={[styles.toolbarIconBox, { backgroundColor: isDark ? 'rgba(104, 104, 104, 0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <HugeiconsIcon icon={MusicNote04Icon} size={22} color={colors.textSecondary} />
          </BlurView>
          <Text style={[styles.toolbarLabel, { color: colors.textSecondary }]}>Audio</Text>
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
        onSelect={ev => {
          setSelectedEvent(ev);
          setShowEventModal(false);
        }}
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

      <QRScannerModal
        visible={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={ev => {
          setSelectedEvent(ev);
          setShowQRScanner(false);
          router.push({
            pathname: '/live-screen/live-room-screen',
            params: { title: ev || selectedEvent }
          });
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === 'android' ? 56 : 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18 },
  headerTitle: { flex: 1, fontWeight: '700', fontSize: 18, marginLeft: 20 },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 14 },
  doneBtnText: { fontWeight: '700', fontSize: 14 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: {},
  checkboxLabel: { fontSize: 14, fontWeight: '500' },
  checkboxLabelActive: { fontWeight: '600' },

  authorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  authorInfo: { flex: 1 },
  authorNameFull: { fontSize: 13, lineHeight: 19 },
  authorBold: { fontWeight: '700' },
  authorMuted: { fontWeight: '400' },

  eventPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,216,105,0.12)', borderWidth: 1, borderColor: 'rgba(22,216,105,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  eventPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16D869' },
  eventPillText: { color: '#16D869', fontSize: 12, fontWeight: '700' },

  imageWrapper: { marginHorizontal: 16, marginBottom: 14, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  momentImage: { width: '100%', height: 220, borderRadius: 12 },
  imageRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },

  stitchInput: { fontSize: 15, paddingHorizontal: 16, lineHeight: 22, minHeight: 180 },

  toolbar: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 18, paddingHorizontal: 24 },
  toolbarItem: { flex: 1, alignItems: 'center', gap: 6 },
  toolbarIconBox: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  toolbarLabel: { fontSize: 11 },
});

const rmStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  blur: { width: '85%', borderRadius: 28, overflow: 'hidden' },
  container: { padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  inputWrapper: { borderRadius: 14, paddingHorizontal: 16, height: 56, justifyContent: 'center', marginBottom: 20 },
  input: { fontSize: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, marginBottom: 30 },
  checkboxInfo: { flex: 1, marginRight: 10 },
  checkboxTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  checkboxSub: { fontSize: 11 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: {},
  footer: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 54, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold' },
  continueBtn: { flex: 1.5, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: 'bold' },
});

const qsStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  tabRow: { flexDirection: 'row', borderRadius: 25, padding: 5, marginHorizontal: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: {},
  scanBody: { flex: 1, position: 'relative' },
  scanTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  scannerBox: { width: width * 0.7, height: width * 0.7, position: 'relative', backgroundColor: 'transparent' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3090F1', borderWidth: 2 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFFFFF', marginTop: 80 },
  typeBody: { flex: 1, paddingHorizontal: 24, paddingTop: 30 },
  typeInput: { borderRadius: 16, paddingHorizontal: 20, height: 58, fontSize: 15, marginTop: 20 },
  typeFooter: { flexDirection: 'row', paddingBottom: 40, gap: 16, paddingHorizontal: 4 },
  typeCancel: { flex: 1, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  typeCancelText: { fontWeight: 'bold' },
  typeContinue: { flex: 1.5, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  typeContinueText: { fontWeight: 'bold' },
});

const qdStyles = StyleSheet.create({
  overlay: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  productCard: { borderRadius: 20, padding: 12, flexDirection: 'row', gap: 14, marginBottom: 16 },
  productImg: { width: 70, height: 70, borderRadius: 14 },
  productTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  productMeta: { fontSize: 12, marginBottom: 6 },
  productPrice: { fontSize: 18, fontWeight: 'bold' },

  venueCard: { borderRadius: 20, padding: 18, marginBottom: 24 },
  venueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  venueTitle: { fontSize: 16, fontWeight: 'bold' },
  venueDetails: { gap: 6 },
  venueLabel: { fontSize: 13 },
  venueValue: { },

  orderRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  orderText: { fontSize: 13 },
  orderId: { fontWeight: 'bold' },

  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrImage: { width: 260, height: 260, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 10 },

  statusBanner: { flexDirection: 'row', gap: 12, padding: 18, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  statusMsg: { flex: 1, fontSize: 12, lineHeight: 18 },
});
