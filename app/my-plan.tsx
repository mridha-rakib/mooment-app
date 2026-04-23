import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

/* ─── Month names ─── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MyPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planName?: string; planDate?: string; planTime?: string; planEvent?: string; planFriends?: string }>();

  const hasPlan = !!(params.planName && params.planName.trim());
  const [currentMonth] = useState(new Date().getMonth());

  const handleEdit = () => {
    router.push({
      pathname: '/create-plan' as any,
      params: { mode: 'edit', planName: params.planName, planDate: params.planDate, planTime: params.planTime, planEvent: params.planEvent, planFriends: params.planFriends },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="chevron-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Plan</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Month Selector ── */}
      <TouchableOpacity style={styles.monthRow} activeOpacity={0.7}>
        <Text style={styles.monthText}>{MONTHS[currentMonth]}</Text>
        <Feather name="chevron-down" size={16} color="#8E8E9B" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {hasPlan ? (
          /* ── Plan Card ── */
          <View style={styles.planCard}>
            <View style={styles.planCardHeader}>
              <View style={styles.planCardIconWrap}>
                <Feather name="calendar" size={18} color="#16D869" />
              </View>
              <View style={styles.planCardInfo}>
                <Text style={styles.planCardName}>{params.planName}</Text>
                <Text style={styles.planCardSub}>{params.planDate} • {params.planTime}</Text>
              </View>
              <TouchableOpacity onPress={handleEdit} activeOpacity={0.7} style={styles.editBtn}>
                <Feather name="edit-2" size={16} color="#8E8E9B" />
              </TouchableOpacity>
            </View>

            {params.planEvent ? (
              <View style={styles.planDetailRow}>
                <Feather name="map-pin" size={13} color="#8E8E9B" />
                <Text style={styles.planDetailText}>{params.planEvent}</Text>
              </View>
            ) : null}

            {params.planFriends ? (
              <View style={styles.planDetailRow}>
                <Feather name="users" size={13} color="#8E8E9B" />
                <Text style={styles.planDetailText}>{params.planFriends}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          /* ── Empty State ── */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Feather name="star" size={28} color="#8E8E9B" />
            </View>
            <Text style={styles.emptyTitle}>No Activity yet</Text>
            <Text style={styles.emptyDesc}>
              Make plan with your friends, and family. Search events that are currently going on map
            </Text>
            <TouchableOpacity
              style={styles.discoverBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/search' as any)}
            >
              <Text style={styles.discoverText}>Go discover something</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── FAB: Add New Plan ── */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/create-plan' as any)}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '700', fontSize: 17, textAlign: 'center' },

  /* Month */
  monthRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  monthText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 100 },

  /* Empty State */
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: -40 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  emptyDesc: { color: '#8E8E9B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  discoverBtn: { borderWidth: 1, borderColor: '#2A2A3A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  discoverText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  /* Plan Card */
  planCard: { backgroundColor: '#13131A', borderRadius: 16, padding: 16, marginTop: 8 },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  planCardIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(22,216,105,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  planCardInfo: { flex: 1 },
  planCardName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  planCardSub: { color: '#8E8E9B', fontSize: 12 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  planDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  planDetailText: { color: '#CCCCCC', fontSize: 13, flex: 1 },

  /* FAB */
  fab: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 36 : 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#8E54E9', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#8E54E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
