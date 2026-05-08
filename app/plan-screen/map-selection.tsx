import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MapSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleConfirm = () => {
    setShowConfetti(true);
    // Navigate to My Plan screen after a delay to show confetti
    setTimeout(() => {
      router.replace({
        pathname: '/plan-screen/my-plan' as any,
        params: { ...params },
      });
    }, 2500);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Confetti / Success Animation */}
      <ConfettiOverlay
        visible={showConfetti}
        onFinish={() => setShowConfetti(false)}
        source={{ uri: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189571e2dccc/5u2xmKkpCI.lottie' }}
      />

      {/* Background Map Image */}
      <Image
        source={require('../../assets/images/dark-map.png')}
        style={styles.mapBackground}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Map</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Feather name="map-pin" size={18} color="#8E8E9B" style={styles.searchIcon} />
            <Text style={styles.searchText}>{params.planLocation || 'Los Angeles, CA'}</Text>
          </View>
        </View>

        {/* Center Pin */}
        <View style={styles.pinContainer}>
          <View style={styles.pinWrapper}>
            <View style={styles.pinCircle}>
              <View style={styles.pinDot} />
            </View>
            <View style={styles.pinLine} />
          </View>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={handleBack}>
            <Text style={styles.cancelText}>Canel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d12',
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
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(194, 181, 205, 0.8)', // Theme purple
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  pinLine: {
    width: 2,
    height: 24,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#C2B5CD', // Theme purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: '700',
  },
});
