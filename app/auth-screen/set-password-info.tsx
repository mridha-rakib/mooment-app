import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function SetPasswordInfo() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <View style={styles.graphicContainer}>
          <Image
            source={require("../../assets/images/set-password.png")}
            style={styles.graphic}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Set Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Please set a new password. To set a new password, press on continue
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          onPress={() => router.push('/auth-screen/new-password')}
        >
          <Text style={[styles.continueButtonText, { color: colors.background }]}>Continue</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 14,
    justifyContent: "center",
    paddingBottom: 24,
    transform: [{ translateY: -6 }],
  },
  graphicContainer: {
    height: 212,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
  },
  graphic: {
    width: 218,
    height: 212,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 86,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 40,
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
