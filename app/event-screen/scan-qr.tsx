import {
  Feather } from '@expo/vector-icons';
import { CameraView,
  useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React,
  { useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import CinematicButton from '@/components/ui/CinematicButton';
import { ArrowLeft01Icon, FlashIcon, FlashOffIcon } from "@hugeicons/core-free-icons";
import { getAuthErrorMessage } from '@/lib/authErrors';
import { scanTicketQrCode } from '@/lib/payments';

const { width, height } = Dimensions.get('window');
const FRAME = width * 0.65;

export default function ScanQRScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  if (!permission) return <View style={[styles.safe, { backgroundColor: colors.background }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <SafeAreaView style={styles.center}>
          <Feather name="camera-off" size={48} color={colors.textSecondary} />
          <Text style={[styles.permText, { color: colors.textSecondary }]}>Camera access needed to scan QR</Text>
          <TouchableOpacity style={[styles.permBtn, { backgroundColor: colors.primary }]} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={[styles.permBtnText, { color: colors.background }]}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }} activeOpacity={0.8}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
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
        onBarcodeScanned={isScanning ? undefined : async ({ data }) => {
          setIsScanning(true);

          try {
            const scannedTicket = await scanTicketQrCode(data);

            Alert.alert(
              'Ticket used',
              `${scannedTicket.ticketName}\n${scannedTicket.ticketNo}\nHolder: ${scannedTicket.holderName}`,
              [{ text: 'Scan next', onPress: () => setIsScanning(false) }],
            );
          } catch (error) {
            Alert.alert(
              'Scan failed',
              getAuthErrorMessage(error, 'This QR code could not be accepted.'),
              [{ text: 'Try again', onPress: () => setIsScanning(false) }],
            );
          }
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

      {/* Capture / torch circle at bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.captureCircle, { backgroundColor: colors.primary }]}
          onPress={() => setIsScanning(false)}
          activeOpacity={0.9}
        />
      </View>
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

  /* Bottom bar */
  bottomBar: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  captureCircle: { width: 72, height: 72, borderRadius: 36 },
});
