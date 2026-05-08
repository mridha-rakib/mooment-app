import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import ConfettiOverlay from "@/components/ui/ConfettiOverlay";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.safe}>
      {/* Confetti Animation */}
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton 
          iconName="x" 
          onPress={() => router.push('/(tabs)/profile')} 
        />
      </View>

      <View style={styles.content}>
        <Image 
          source={require('@/assets/images/success.png')} 
          style={styles.successImage} 
          resizeMode="contain"
        />
        <Text style={styles.title}>Payment successful</Text>
        <Text style={styles.subtitle}>You have successfully bought{'\n'}Mooment Credis</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => router.push('/profile-screen/mooment-wallet')}
        >
          <Text style={styles.primaryBtnText}>View My Mooment Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.secondaryBtnText}>Back to Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  successImage: {
    width: 160,
    height: 160,
    marginBottom: 30,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8E8E9B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 15,
  },
  primaryBtn: {
    backgroundColor: '#B2ABBA', // Light purple
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#0e0d12',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: '#2A2A32', // Dark gray
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
