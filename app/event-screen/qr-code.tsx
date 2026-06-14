import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width - 40, 401);
const QR_SIZE = CONTENT_WIDTH - 32;

export default function QRCodeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type ?? 'event'; // 'product' | 'event'

  const handleCopy = () => {
    Alert.alert('Copied', 'Order number copied to clipboard');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>QR Code</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {type === 'product' ? (
          /* ── Product QR ── */
          <>
            {/* Product card */}
            <View style={[styles.productCard, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1631390164305-9c6a5e4c3f5f?q=80&w=120&auto=format&fit=crop' }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>Medusa Skin Whitening Cream</Text>
                <Text style={[styles.productMeta, { color: colors.textSecondary }]}>@djLoko  •  QTY: 1</Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>$26</Text>
              </View>
            </View>

            {/* Location */}
            <View style={[styles.infoSection, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoLabel, { color: colors.text }]}>New York City</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={[styles.infoDetailLabel, { color: colors.textSecondary }]}>Venue:</Text>
                <Text style={[styles.infoDetailValue, { color: colors.text }]}>The Rooftop Lounge</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={[styles.infoDetailLabel, { color: colors.textSecondary }]}>Address:</Text>
                <Text style={[styles.infoDetailValue, { color: colors.text }]}>123 Main Street, New York, NY 1001</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={[styles.infoDetailLabel, { color: colors.textSecondary }]}>Time:</Text>
                <Text style={[styles.infoDetailValue, { color: colors.text }]}>Tonight • 9pm</Text>
              </View>
            </View>

            {/* Order number */}
            <View style={styles.orderRow}>
              <Text style={[styles.orderLabel, { color: colors.textSecondary }]}>Order No:</Text>
              <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>MOM-2026-8741</Text>
              <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ marginLeft: 8 }}>
                <Feather name="copy" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            <View style={styles.qrWrapper}>
              <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value="MOM-2026-8741"
                  size={QR_SIZE}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>

            {/* Success message */}
            <View style={styles.instructionBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#E75737" />
              <Text style={styles.instructionText}>
                Show this QR code to the host at the event to collect your item. Keep screen brightness high.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.walletButton}
              activeOpacity={0.85}
              onPress={() => router.push("/event-screen/wallet")}
            >
              <Ionicons name="ticket-outline" size={16} color="#111111" />
              <Text style={styles.walletButtonText}>Ticket Wallet</Text>
              <Feather name="arrow-right" size={15} color="#111111" />
            </TouchableOpacity>
          </>
        ) : (
          /* ── Event Ticket QR ── */
          <>
            <View style={[styles.ticketSummaryCard, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <View style={[styles.ticketIconBox, { backgroundColor: colors.primary + "1A" }]}>
                <Ionicons name="ticket-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.ticketSummaryInfo}>
                <Text style={[styles.ticketSummaryTitle, { color: colors.text }]} numberOfLines={1}>
                  Rooftop Sessions Vol. 4
                </Text>
                <Text style={[styles.ticketSummaryMeta, { color: colors.textSecondary }]}>
                  @dj_koko  •  QTY: 1
                </Text>
                <Text style={[styles.ticketSummaryPrice, { color: colors.primary }]}>Paid $45</Text>
              </View>
              <View style={styles.confirmedBadge}>
                <Text style={styles.confirmedText}>Confirmed</Text>
              </View>
            </View>

            <View style={[styles.eventInfoCard, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <View style={styles.eventInfoTitleRow}>
                <Feather name="map-pin" size={18} color={colors.textSecondary} />
                <Text style={[styles.eventInfoTitle, { color: colors.text }]}>New York City</Text>
              </View>
              <View style={styles.eventInfoDetails}>
                <View style={styles.infoDetail}>
                  <Text style={[styles.infoDetailLabel, { color: colors.text }]}>Venue:</Text>
                  <Text style={[styles.infoDetailValue, { color: colors.textSecondary }]} numberOfLines={1}>
                    The Rooftop Lounge
                  </Text>
                </View>
                <View style={styles.infoDetail}>
                  <Text style={[styles.infoDetailLabel, { color: colors.text }]}>Address:</Text>
                  <Text style={[styles.infoDetailValue, { color: colors.textSecondary }]} numberOfLines={1}>
                    123 Main Street, New York, NY 1001
                  </Text>
                </View>
                <View style={styles.infoDetail}>
                  <Text style={[styles.infoDetailLabel, { color: colors.text }]}>Time:</Text>
                  <Text style={[styles.infoDetailValue, { color: colors.textSecondary }]}>Tonight • 9pm</Text>
                </View>
              </View>
            </View>

            {/* Ticket ID */}
            <View style={styles.ticketIdRow}>
              <Text style={[styles.ticketIdLabel, { color: colors.textSecondary }]}>Order No:</Text>
              <Text style={[styles.ticketIdText, { color: colors.textSecondary }]}>MOM-2026-8741</Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrWrapper}>
              <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value="MOM-2026-8741"
                  size={QR_SIZE}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>

            <View style={styles.instructionBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#E75737" />
              <Text style={styles.instructionText}>
                Show this QR code to the host at the event to verify your ticket. Keep screen brightness high.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.walletButton}
              activeOpacity={0.85}
              onPress={() => router.push("/event-screen/wallet")}
            >
              <Ionicons name="ticket-outline" size={16} color="#111111" />
              <Text style={styles.walletButtonText}>Ticket Wallet</Text>
              <Feather name="arrow-right" size={15} color="#111111" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(104, 104, 104, 0.16)',
  },
  headerTitle: {
    fontWeight: '600', fontSize: 16, textAlign: 'center',
    letterSpacing: -0.08,
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  /* Product card */
  productCard: {
    flexDirection: 'row', alignItems: 'center',
    width: CONTENT_WIDTH,
    minHeight: 86,
    borderRadius: 12, padding: 12, gap: 12,
  },
  productImage: { width: 64, height: 64, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  productMeta: { fontSize: 12, marginBottom: 6 },
  productPrice: { fontWeight: '700', fontSize: 18 },

  /* Info section */
  infoSection: { width: CONTENT_WIDTH, borderRadius: 12, padding: 12, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoLabel: { fontWeight: '700', fontSize: 16 },
  infoDetail: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  infoDetailLabel: { fontSize: 13, fontWeight: '600' },
  infoDetailValue: { fontSize: 13, flex: 1, fontWeight: '600' },

  /* Order */
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  orderLabel: { fontSize: 14 },
  orderNumber: { fontSize: 14, fontWeight: '600' },

  /* QR */
  qrWrapper: {
    alignItems: 'center',
  },
  qrContainer: {
    borderRadius: 24,
    padding: 16,
    width: QR_SIZE + 32,
    height: QR_SIZE + 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImage: {
    width: QR_SIZE, height: QR_SIZE,
  },

  instructionBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#1C1718',
    borderRadius: 12,
    gap: 8,
    minHeight: 68,
    padding: 12,
    width: CONTENT_WIDTH,
  },
  instructionText: {
    color: '#B3B3B3',
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  walletButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#B2ABBA',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 16,
    shadowColor: '#B2ABBA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  walletButtonText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  /* Event ticket */
  ticketSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 86,
    padding: 12,
    borderRadius: 12,
    width: CONTENT_WIDTH,
  },
  ticketIconBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketSummaryInfo: {
    flex: 1,
  },
  ticketSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  ticketSummaryMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  ticketSummaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 8,
  },
  confirmedBadge: {
    backgroundColor: 'rgba(29, 158, 117, 0.1)',
    borderColor: 'rgba(29, 158, 117, 0.35)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmedText: {
    color: '#1D9E75',
    fontSize: 12,
    fontWeight: '700',
  },
  eventInfoCard: {
    borderRadius: 12,
    gap: 16,
    padding: 12,
    width: CONTENT_WIDTH,
  },
  eventInfoTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  eventInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
  },
  eventInfoDetails: {
    gap: 8,
  },
  ticketIdRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  ticketIdLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  ticketIdText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
