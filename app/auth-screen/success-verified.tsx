import { ChevronLeft } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import LottieView from 'lottie-react-native';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { useTheme } from "@/hooks/useTheme";

export default function SuccessVerified() {
  const [showConfetti, setShowConfetti] = useState(false);
  const { colors, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      <View style={styles.container}>
        <View style={styles.content}>
          
          <View style={styles.graphicContainer}>
            <Image 
              source={require("../../assets/images/success.png")} 
              style={{ width: 147, height: 170 }} 
            />
            <View style={styles.animationOverlay}>
              <LottieView
                source={{ uri: 'https://lottie.host/7608e08d-8067-466d-8e43-85e6561e1b19/8CAs5A4F0m.json' }}
                autoPlay
                loop={false}
                style={styles.lottie}
              />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Successfully Verified</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your email has been verified successfully. You can now continue to set up your account and password.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: colors.primary }]} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/onboarding-settings')}
          >
            <Text style={[styles.continueButtonText, { color: colors.background }]}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backLink} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/login')}
          >
            <HugeiconsIcon icon={ChevronLeft} size={16} color={colors.textSecondary} />
            <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  graphicContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  animationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 180,
    height: 180,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  continueButton: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 4,
  },
});
