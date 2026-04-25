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
          <View style={styles.glow} />
          <Image
            source={require("../assets/images/Verify_sucsess.png")}
            style={styles.graphic}
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
          onPress={() => router.push("/new-password")}
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
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
  },

  glow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 75,

    // lighter background glow
    backgroundColor: "rgba(142, 84, 233, 0.25)",

    // iOS shadow
    shadowColor: "#C6A6FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 190,

    // Android shadow
    elevation: 30,
  },

  graphic: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 86,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    color: "#B7B3BD",
    textAlign: "center",
    paddingHorizontal: 72,
    lineHeight: 14,
  },
  continueButton: {
    backgroundColor: "#B9B0C2",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  continueButtonText: {
    color: "#17121B",
    fontSize: 11,
    fontWeight: "500",
  },
});
