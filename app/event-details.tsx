import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  Dimensions, Image, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function EventDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string, title?: string }>();

  // Mock data for the event matching the "detailed" screenshot style
  const event = {
    title: params.title || 'Rooftop Session Vol 4',
    organizer: '@dj_koko',
    price: '£28',
    city: 'New York City',
    venue: 'The Rooftop Lounge',
    address: '123 Main Street, New York, NY 1001',
    time: 'Tonight • 9pm',
    ticketId: 'MOM-2026-8741',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
    qrCode: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/480px-QR_code_for_mobile_English_Wikipedia.svg.png',
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Event Card ── */}
        <View style={styles.eventCard}>
          <Image source={{ uri: event.image }} style={styles.eventImage} />
          <View style={styles.eventInfo}>
            <Text style={styles.eventName}>{event.title}</Text>
            <Text style={styles.eventOrganizer}>{event.organizer}  •  QTY: 1</Text>
            <Text style={styles.eventPrice}>{event.price}</Text>
          </View>
        </View>

        {/* ── Location Section ── */}
        <View style={styles.section}>
          <View style={styles.cityRow}>
            <View style={styles.iconCircle}>
              <Feather name="map-pin" size={14} color="#8E8E9B" />
            </View>
            <Text style={styles.cityText}>{event.city}</Text>
          </View>

          <View style={styles.detailGrid}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Venue:</Text>
              <Text style={styles.detailValue}>{event.venue}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{event.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{event.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Ticket Info ── */}
        <View style={styles.ticketHeader}>
          <Text style={styles.ticketLabel}>Order No:</Text>
          <Text style={styles.ticketId}>{event.ticketId}</Text>
          <TouchableOpacity activeOpacity={0.7} style={styles.copyBtn}>
            <Feather name="copy" size={14} color="#8E8E9B" />
          </TouchableOpacity>
        </View>

        {/* ── QR Code ── */}
        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            <Image source={{ uri: event.qrCode }} style={styles.qrImage} resizeMode="contain" />
          </View>
        </View>

        {/* ── Bottom Banner ── */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Feather name="check" size={14} color="#16D869" />
          </View>
          <Text style={styles.bannerText}>
            Your Ticket has been confirmed for the venue. Thank you for booking with us.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '700', fontSize: 17, textAlign: 'center' },

  scrollContent: { paddingBottom: 40 },

  /* Event Card */
  eventCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#13131A', borderRadius: 16,
    marginHorizontal: 16, marginTop: 8, marginBottom: 20,
    padding: 12, gap: 12,
  },
  eventImage: { width: 64, height: 64, borderRadius: 12 },
  eventInfo: { flex: 1 },
  eventName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  eventOrganizer: { color: '#8E8E9B', fontSize: 12, marginBottom: 6 },
  eventPrice: { color: '#D4B0EB', fontWeight: 'bold', fontSize: 18 },

  /* Details Section */
  section: { paddingHorizontal: 16, marginBottom: 12 },
  cityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  cityText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  detailGrid: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailLabel: { color: '#8E8E9B', fontSize: 13, width: 70 },
  detailValue: { color: '#CCCCCC', fontSize: 13, flex: 1, lineHeight: 18 },

  divider: { height: 1, backgroundColor: '#1A1A2E', marginHorizontal: 16, marginVertical: 20 },

  /* Ticket Header */
  ticketHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20 },
  ticketLabel: { color: '#8E8E9B', fontSize: 13, marginRight: 8 },
  ticketId: { color: '#8E8E9B', fontSize: 13, fontWeight: '500' },
  copyBtn: { marginLeft: 8 },

  /* QR Code */
  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrWrapper: {
    width: width * 0.75, height: width * 0.75,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 16, justifyContent: 'center', alignItems: 'center',
  },
  qrImage: { width: '100%', height: '100%' },

  /* Banner */
  banner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(22,216,105,0.08)', borderRadius: 12,
    marginHorizontal: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(22,216,105,0.15)',
  },
  bannerIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(22,216,105,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerText: { color: '#16D869', fontSize: 13, flex: 1, lineHeight: 19 },
});
