import { router } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SetPasswordInfo() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.graphicContainer}>
          <View />
          <Image
            source={require("../../assets/images/set-password.png")}
            style={styles.graphic}
            width={218}
            height={312}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Set Password</Text>
          <Text style={styles.subtitle}>
            Please set a new password. To set a new password, press on continu
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.8}
          onPress={() => router.push('/auth-screen/new-password')}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0D0B10",
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
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: "#B59EBE",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
});
