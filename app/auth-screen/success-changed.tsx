import { ChevronLeft } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function SuccessChanged() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <View style={styles.content}>
          
          <Image source={require("../../assets/images/success.png")} style={{ width: 147, height: 170, marginBottom: 40 }} />

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Successfully Changed</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Return to the login page to enter your account with your new password
            </Text>
          </View>

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
