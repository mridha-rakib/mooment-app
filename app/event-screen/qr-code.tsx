import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert, Dimensions, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/hooks/useTheme';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.72;

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
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>QR Code</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {type === 'product' ? (
          /* ── Product QR ── */
          <>
            {/* Product card */}
            <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1631390164305-9c6a5e4c3f5f?q=80&w=120&auto=format&fit=crop' }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>Medusa Skin Whitening Cream</Text>
                <Text style={[styles.productMeta, { color: colors.textSecondary }]}>@djLoko  •  QTY: 1</Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>£26</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.infoSection}>
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

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
            <View style={[styles.successBanner, { backgroundColor: colors.success + '1A' }]}>
              <Feather name="check-circle" size={15} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Your Product has been handover to you in the venue. Thank you for buying from us.
              </Text>
            </View>
          </>
        ) : (
          /* ── Event Ticket QR ── */
          <>
            <View style={styles.ticketHeader}>
              <Text style={[styles.ticketForLabel, { color: colors.textSecondary }]}>Your ticket for</Text>
              <Text style={[styles.ticketEventName, { color: colors.text }]}>Rooftop Sessions Vol. 4</Text>
              <Text style={[styles.ticketMeta, { color: colors.textSecondary }]}>Tonight • 9pm</Text>
            </View>

            {/* Payment & Status Info */}
            <View style={styles.paymentStatusRow}>
              <View style={styles.paymentInfo}>
                <Text style={[styles.payLabel, { color: colors.text }]}>Pay <Text style={[styles.payAmount, { color: colors.success }]}>$45</Text> at Door</Text>
              </View>
              <View style={[styles.pendingBadge, { backgroundColor: colors.warning + '1A', borderColor: colors.warning + '33' }]}>
                <Text style={[styles.pendingText, { color: colors.warning }]}>Pending</Text>
              </View>

            </View>

            {/* Ticket ID */}
            <View style={styles.ticketIdRow}>
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
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700', fontSize: 17, textAlign: 'center',
  },

  /* Product card */
  productCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 6, marginBottom: 16,
    borderRadius: 14, padding: 12, gap: 12,
    borderWidth: 1,
  },
  productImage: { width: 56, height: 56, borderRadius: 10 },
  productInfo: { flex: 1 },
  productName: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  productMeta: { fontSize: 12, marginBottom: 6 },
  productPrice: { fontWeight: 'bold', fontSize: 16 },

  /* Info section */
  infoSection: { paddingHorizontal: 16, gap: 6, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoLabel: { fontWeight: '600', fontSize: 14 },
  infoDetail: { flexDirection: 'row', gap: 6 },
  infoDetailLabel: { fontSize: 13, width: 64 },
  infoDetailValue: { fontSize: 13, flex: 1 },

  divider: { height: 1, marginHorizontal: 16, marginBottom: 14 },

  /* Order */
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 20,
    justifyContent: 'center',
  },
  orderLabel: { fontSize: 13, marginRight: 8 },
  orderNumber: { fontSize: 13 },

  /* QR */
  qrWrapper: {
    alignItems: 'center', marginBottom: 20,
    paddingHorizontal: 24,
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

  /* Success banner */
  successBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 12, marginHorizontal: 16,
    padding: 14,
  },
  successText: { fontSize: 13, flex: 1, lineHeight: 19 },

  /* Event ticket */
  ticketHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 30, paddingHorizontal: 24 },
  ticketForLabel: { fontSize: 14, marginBottom: 10 },
  ticketEventName: { fontWeight: 'bold', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  ticketMeta: { fontSize: 14 },

  /* New styles for Ticket Detail match */
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payLabel: {
    fontSize: 15,
  },
  payAmount: {
    fontWeight: 'bold',
  },
  pendingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  ticketIdRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ticketIdText: {
    fontSize: 14,
  },
});
