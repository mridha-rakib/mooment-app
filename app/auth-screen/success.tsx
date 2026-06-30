import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { useTheme } from "@/hooks/useTheme";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export default function Success() {
  const [showConfetti, setShowConfetti] = useState(false);
  const { colors, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    // Show confetti after a short delay when the screen appears
    const timer = setTimeout(() => {
      setShowConfetti(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Confetti Animation */}
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.graphicContainer}>
            <View style={[styles.glow, { backgroundColor: isDark ? "#0A291A" : "#E8F5E9" }]} />
            <View style={[styles.iconCircle, { borderColor: colors.success, backgroundColor: colors.background }]}>
              <Feather name="check" size={32} color={colors.success} />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Successfully Verified</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your account is verified. You can Enjoy browsing the application
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: buttonBackground(colors) }]} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/login')}
          >
            <Text style={[styles.continueButtonText, { color: buttonForeground(colors) }]}>Continue</Text>
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
    paddingBottom: 40,
  },
  graphicContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 60,
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
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
