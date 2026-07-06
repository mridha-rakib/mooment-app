import {
  Feather } from '@expo/vector-icons';
import { CameraView,
  useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React,
  { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import CinematicButton from '@/components/ui/CinematicButton';
import { ArrowLeft01Icon, FlashIcon, FlashOffIcon } from "@hugeicons/core-free-icons";
import { getAuthErrorMessage } from '@/lib/authErrors';
import { scanTicketQrCode } from '@/lib/payments';
import { getMyProfileEvents, type EventResponse } from '@/lib/events';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const { width, height } = Dimensions.get('window');
const FRAME = width * 0.65;

export default function ScanQRScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualTicketNo, setManualTicketNo] = useState('');
  const [hostEvents, setHostEvents] = useState<EventResponse[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    void getMyProfileEvents()
      .then(({ active }) => {
        if (!mounted) return;
        setHostEvents(active);
        setSelectedEventId((current) => current || active[0]?.id || '');
      })
      .catch(() => {
        if (mounted) setHostEvents([]);
      })
      .finally(() => {
        if (mounted) setIsLoadingEvents(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const checkInTicket = async (checkInCode: string, eventId?: string, manual = false) => {
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    manual ? setIsManualSubmitting(true) : setIsScanning(true);

    try {
      const scannedTicket = await scanTicketQrCode(checkInCode, eventId);

      if (manual) setManualTicketNo('');
      Alert.alert(
        'Check-in successful',
        `${scannedTicket.ticketName}\n${scannedTicket.ticketNo}\nHolder: ${scannedTicket.holderName}`,
        [{
          text: manual ? 'Done' : 'Scan next',
          onPress: () => {
            submitLockRef.current = false;
            manual ? setIsManualSubmitting(false) : setIsScanning(false);
          },
        }],
        { cancelable: false },
      );
    } catch (error) {
      Alert.alert(
        'Check-in failed',
        getAuthErrorMessage(error, 'This ticket could not be accepted.'),
        [{
          text: 'Try again',
          onPress: () => {
            submitLockRef.current = false;
            manual ? setIsManualSubmitting(false) : setIsScanning(false);
          },
        }],
        { cancelable: false },
      );
    }
  };

  const handleManualCheckIn = () => {
    const checkInCode = manualTicketNo.trim().toUpperCase();

    if (!checkInCode || !selectedEventId || isManualSubmitting) return;
    void checkInTicket(checkInCode, selectedEventId, true);
  };

  const manualPanel = (
    <View style={[styles.manualPanel, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text style={styles.manualTitle}>Manual Ticket No</Text>
      {isLoadingEvents ? (
        <ActivityIndicator size="small" color="#FFFFFF" style={styles.eventLoader} />
      ) : hostEvents.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventList}>
          {hostEvents.map((event) => {
            const selected = event.id === selectedEventId;
            return (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventChip, selected && styles.eventChipSelected]}
                onPress={() => setSelectedEventId(event.id)}
                disabled={isManualSubmitting}
                activeOpacity={0.8}
              >
                <Text style={[styles.eventChipText, selected && styles.eventChipTextSelected]} numberOfLines={1}>
                  {event.name || 'Event'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noEventsText}>No active hosted event is available.</Text>
      )}
      <View style={styles.manualInputRow}>
        <TextInput
          value={manualTicketNo}
          onChangeText={setManualTicketNo}
          placeholder="MOM-26-X7K9-P4M2"
          placeholderTextColor="rgba(255,255,255,0.4)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
          editable={!isManualSubmitting}
          returnKeyType="done"
          onSubmitEditing={handleManualCheckIn}
          style={styles.manualInput}
        />
        <TouchableOpacity
          style={[
            styles.manualSubmit,
            { backgroundColor: buttonBackground(colors) },
            (!manualTicketNo.trim() || !selectedEventId || isManualSubmitting) && styles.manualSubmitDisabled,
          ]}
          disabled={!manualTicketNo.trim() || !selectedEventId || isManualSubmitting}
          onPress={handleManualCheckIn}
          activeOpacity={0.85}
        >
          {isManualSubmitting ? (
            <ActivityIndicator size="small" color={buttonForeground(colors)} />
          ) : (
            <Text style={[styles.manualSubmitText, { color: buttonForeground(colors) }]}>Check In</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!permission) return <View style={[styles.safe, { backgroundColor: colors.background }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <SafeAreaView style={styles.center}>
          <Feather name="camera-off" size={48} color={colors.textSecondary} />
          <Text style={[styles.permText, { color: colors.textSecondary }]}>Camera access needed to scan QR</Text>
          <TouchableOpacity style={[styles.permBtn, { backgroundColor: buttonBackground(colors) }]} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={[styles.permBtnText, { color: buttonForeground(colors) }]}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }} activeOpacity={0.8}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsManualOpen((open) => !open)}
            disabled={isManualSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.manualToggleText}>Enter Ticket No manually</Text>
          </TouchableOpacity>
        </SafeAreaView>
        {isManualOpen && (
          <KeyboardAvoidingView
            style={styles.manualKeyboardLayer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            pointerEvents="box-none"
          >
            {manualPanel}
          </KeyboardAvoidingView>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flash}
        onBarcodeScanned={isScanning || isManualOpen ? undefined : ({ data }) => {
          void checkInTicket(data);
        }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Dark overlay with cutout */}
      <View style={styles.overlay}>
        {/* Top dark area */}
        <View style={styles.darkArea} />

        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={styles.darkSide} />

          {/* Viewfinder frame */}
          <View style={styles.frame}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: colors.text }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: colors.text }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: colors.text }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: colors.text }]} />
          </View>

          <View style={styles.darkSide} />
        </View>

        {/* Bottom dark area */}
        <View style={styles.darkArea} />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <CinematicButton
          onPress={() => router.back()}
          icon={ArrowLeft01Icon}
          size={22}
          color="#FFFFFF"
        />
        <CinematicButton
          onPress={() => setFlash(f => !f)}
          icon={flash ? FlashIcon : FlashOffIcon}
          size={20}
          color={flash ? '#F59E0B' : '#FFFFFF'}
        />
      </SafeAreaView>

      {/* Hint text */}
      <View style={styles.hintRow}>
        <Text style={styles.hintText}>{isScanning ? 'Validating ticket...' : 'Align QR code within the frame'}</Text>
      </View>

      <TouchableOpacity
        style={[styles.manualToggle, isManualOpen && styles.manualToggleOpen]}
        onPress={() => setIsManualOpen((open) => !open)}
        disabled={isManualSubmitting}
        activeOpacity={0.8}
      >
        <Text style={styles.manualToggleText}>
          {isManualOpen ? 'Use QR scanner' : 'Enter Ticket No manually'}
        </Text>
      </TouchableOpacity>

      {/* Capture / torch circle at bottom */}
      {!isManualOpen && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.captureCircle, { backgroundColor: buttonBackground(colors) }]}
            onPress={() => setIsScanning(false)}
            activeOpacity={0.9}
          />
        </View>
      )}
      {isManualOpen && (
        <KeyboardAvoidingView
          style={styles.manualKeyboardLayer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents="box-none"
        >
          {manualPanel}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingTop: Platform.OS === 'android' ? 32 : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  permText: { fontSize: 15, textAlign: 'center' },
  permBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  permBtnText: { fontWeight: 'bold', fontSize: 14 },

  /* Camera overlay */
  overlay: { ...StyleSheet.absoluteFillObject },
  darkArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', width: '100%' },
  middleRow: { flexDirection: 'row', height: FRAME },
  darkSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },

  /* Viewfinder */
  frame: {
    width: FRAME,
    height: FRAME,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderBottomRightRadius: 4 },

  /* Header */
  header: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 32 : 0,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  flashBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },

  /* Hint */
  hintRow: { position: 'absolute', top: height / 2 + FRAME / 2 + 20, left: 0, right: 0, alignItems: 'center' },
  hintText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },

  manualToggle: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  manualToggleOpen: { bottom: 210 },
  manualToggleText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  manualKeyboardLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  manualPanel: {
    backgroundColor: 'rgba(12,12,14,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 14,
    paddingHorizontal: 16,
  },
  manualTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  eventLoader: { alignSelf: 'flex-start', marginBottom: 10 },
  eventList: { gap: 8, paddingBottom: 10 },
  eventChip: {
    maxWidth: 180,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eventChipSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  eventChipText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '600' },
  eventChipTextSelected: { color: '#111111' },
  noEventsText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 },
  manualInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  manualInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    paddingHorizontal: 12,
  },
  manualSubmit: {
    minWidth: 92,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  manualSubmitDisabled: { opacity: 0.5 },
  manualSubmitText: { fontSize: 13, fontWeight: '700' },

  /* Bottom bar */
  bottomBar: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  captureCircle: { width: 72, height: 72, borderRadius: 36 },
});
