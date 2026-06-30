import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { usePlanStore } from '@/stores/planStore';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const firstParam = (value: unknown): string | undefined => {
  const param = Array.isArray(value) ? value[0] : value;
  return typeof param === 'string' ? param : undefined;
};

const optionalNumberParam = (value: unknown) => {
  const parsedNumber = Number(firstParam(value));
  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
};

export default function MapSelectionScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const addPlan = usePlanStore((state) => state.addPlan);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const planFriendIds = firstParam(params.planFriendIds)
    ? String(firstParam(params.planFriendIds)).split(',').filter(Boolean)
    : [];

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const createdPlan = await addPlan({
        date: String(firstParam(params.planDate) ?? ''),
        dateIso: params.planDateIso ? String(firstParam(params.planDateIso)) : undefined,
        event: params.planEvent ? String(firstParam(params.planEvent)) : undefined,
        eventId: params.planEventId ? String(firstParam(params.planEventId)) : undefined,
        friendIds: planFriendIds,
        friends: params.planFriends ? String(firstParam(params.planFriends)) : undefined,
        latitude: optionalNumberParam(params.planLatitude),
        location: params.planLocation ? String(firstParam(params.planLocation)) : undefined,
        longitude: optionalNumberParam(params.planLongitude),
        name: String(firstParam(params.planName) ?? ''),
        time: String(firstParam(params.planTime) ?? ''),
      });
      setShowConfetti(true);
      setTimeout(() => {
        router.replace({
          pathname: '/plan-screen/my-plan' as any,
          params: {
            focusYear: String(createdPlan.year),
            focusMonth: String(createdPlan.month),
            focusDay: String(createdPlan.day),
          },
        });
      }, 2500);
    } catch {
      Alert.alert('Unable to save plan', 'Please try again.');
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* Confetti / Success Animation */}
      <ConfettiOverlay
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
        source={{ uri: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189571e2dccc/5u2xmKkpCI.lottie' }}
      />

      {/* Background Map Image */}
      <Image
        source={isDark ? require('../../assets/images/dark-map.png') : require('../../assets/images/map_bg.png')}
        style={styles.mapBackground}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Map</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map-pin" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <Text style={[styles.searchText, { color: colors.text }]}>{firstParam(params.planLocation) || 'Los Angeles, CA'}</Text>
          </View>
        </View>

        {/* Center Pin */}
        <View style={styles.pinContainer}>
          <View style={styles.pinWrapper}>
            <View style={[styles.pinCircle, { backgroundColor: colors.primary + 'CC' }]}>
              <View style={[styles.pinDot, { backgroundColor: colors.background }]} />
            </View>
            <View style={[styles.pinLine, { backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8} onPress={handleBack}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: buttonBackground(colors) }]} activeOpacity={0.8} onPress={handleConfirm}>
            <Text style={[styles.confirmText, { color: buttonForeground(colors) }]}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchText: {
    fontSize: 15,
  },
  pinContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinWrapper: {
    alignItems: 'center',
    marginBottom: 40, // Offset to make the line point exactly to the center
  },
  pinCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinLine: {
    width: 2,
    height: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    gap: 15,
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
