import { ChevronLeft } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SuccessVerified() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          
          <Image 
            source={require("../../assets/images/success.png")} 
            style={{ width: 147, height: 170, marginBottom: 40 }} 
          />

          <View style={styles.textContainer}>
            <Text style={styles.title}>Successfully Verified</Text>
            <Text style={styles.subtitle}>
              Your email has been verified successfully. You can now continue to set up your account and password.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.continueButton} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/onboarding-settings')}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backLink} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/login')}
          >
            <HugeiconsIcon icon={ChevronLeft} size={16} color="#8E8E9B" />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e0d12",
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
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: "#B59EBE",
    width: '100%',
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  continueButtonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  backLinkText: {
    color: "#8E8E9B",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 4,
  },
});
