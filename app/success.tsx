import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function Success() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.graphicContainer}>
            <View style={styles.glow} />
            <View style={styles.iconCircle}>
              <Feather name="check" size={32} color="#2DB46D" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Successfully Verified</Text>
            <Text style={styles.subtitle}>
              Your account is verified. You can Enjoy browsing the application
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.continueButton} 
            activeOpacity={0.8}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
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
    backgroundColor: "#0A291A",
    opacity: 0.8,
    shadowColor: "#2DB46D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#2DB46D",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0e0d12",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 60,
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
