import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert, Dimensions, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.72;

export default function QRCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = params.type ?? 'event'; // 'product' | 'event'

  const handleCopy = () => {
    Alert.alert('Copied', 'Order number copied to clipboard');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {type === 'product' ? (
          /* ── Product QR ── */
          <>
            {/* Product card */}
            <View style={styles.productCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1631390164305-9c6a5e4c3f5f?q=80&w=120&auto=format&fit=crop' }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>Medusa Skin Whitening Cream</Text>
                <Text style={styles.productMeta}>@djLoko  •  QTY: 1</Text>
                <Text style={styles.productPrice}>£26</Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={15} color="#8E8E9B" style={{ marginRight: 8 }} />
                <Text style={styles.infoLabel}>New York City</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={styles.infoDetailLabel}>Venue:</Text>
                <Text style={styles.infoDetailValue}>The Rooftop Lounge</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={styles.infoDetailLabel}>Address:</Text>
                <Text style={styles.infoDetailValue}>123 Main Street, New York, NY 1001</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={styles.infoDetailLabel}>Time:</Text>
                <Text style={styles.infoDetailValue}>Tonight • 9pm</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Order number */}
            <View style={styles.orderRow}>
              <Text style={styles.orderLabel}>Order No:</Text>
              <Text style={styles.orderNumber}>MOM-2026-8741</Text>
              <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ marginLeft: 8 }}>
                <Feather name="copy" size={15} color="#8E8E9B" />
              </TouchableOpacity>
            </View>

            {/* QR Code */}
            <View style={styles.qrWrapper}>
              <View style={styles.qrContainer}>
                <QRCode
                  value="MOM-2026-8741"
                  size={QR_SIZE}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>

            {/* Success message */}
            <View style={styles.successBanner}>
              <Feather name="check-circle" size={15} color="#16D869" style={{ marginRight: 8 }} />
              <Text style={styles.successText}>
                Your Product has been handover to you in the venue. Thank you for buying from us.
              </Text>
            </View>
          </>
        ) : (
          /* ── Event Ticket QR ── */
          <>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketForLabel}>Your ticket for</Text>
              <Text style={styles.ticketEventName}>Rooftop Sessions Vol. 4</Text>
              <Text style={styles.ticketMeta}>Tonight • 9pm</Text>
            </View>

            {/* Payment & Status Info */}
            <View style={styles.paymentStatusRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.payLabel}>Pay <Text style={styles.payAmount}>$45</Text> at Door</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            </View>

            {/* Ticket ID */}
            <View style={styles.ticketIdRow}>
              <Text style={styles.ticketIdText}>MOM-2026-8741</Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrWrapper}>
              <View style={styles.qrContainer}>
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
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, color: '#FFFFFF',
    fontWeight: '700', fontSize: 17, textAlign: 'center',
  },

  /* Product card */
  productCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 6, marginBottom: 16,
    backgroundColor: '#13131A',
    borderRadius: 14, padding: 12, gap: 12,
  },
  productImage: { width: 56, height: 56, borderRadius: 10 },
  productInfo: { flex: 1 },
  productName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  productMeta: { color: '#8E8E9B', fontSize: 12, marginBottom: 6 },
  productPrice: { color: '#D4B0EB', fontWeight: 'bold', fontSize: 16 },

  /* Info section */
  infoSection: { paddingHorizontal: 16, gap: 6, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoLabel: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  infoDetail: { flexDirection: 'row', gap: 6 },
  infoDetailLabel: { color: '#8E8E9B', fontSize: 13, width: 64 },
  infoDetailValue: { color: '#CCCCCC', fontSize: 13, flex: 1 },

  divider: { height: 1, backgroundColor: '#1A1A2E', marginHorizontal: 16, marginBottom: 14 },

  /* Order */
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 20,
    justifyContent: 'center',
  },
  orderLabel: { color: '#8E8E9B', fontSize: 13, marginRight: 8 },
  orderNumber: { color: '#8E8E9B', fontSize: 13 },

  /* QR */
  qrWrapper: {
    alignItems: 'center', marginBottom: 20,
    paddingHorizontal: 24,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(22,216,105,0.1)',
    borderRadius: 12, marginHorizontal: 16,
    padding: 14,
  },
  successText: { color: '#16D869', fontSize: 13, flex: 1, lineHeight: 19 },

  /* Event ticket */
  ticketHeader: { alignItems: 'center', paddingTop: 20, paddingBottom: 30, paddingHorizontal: 24 },
  ticketForLabel: { color: '#8E8E9B', fontSize: 14, marginBottom: 10 },
  ticketEventName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  ticketMeta: { color: '#8E8E9B', fontSize: 14 },

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
    color: '#FFFFFF',
    fontSize: 15,
  },
  payAmount: {
    color: '#16D869',
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: 'rgba(120, 53, 15, 0.4)', // Darker orange
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.8)',
  },
  pendingText: {
    color: '#F97316', // Orange
    fontSize: 13,
    fontWeight: 'bold',
  },
  ticketIdRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ticketIdText: {
    color: '#8E8E9B',
    fontSize: 14,
  },
});
