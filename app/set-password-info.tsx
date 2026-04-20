import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function SetPasswordInfo() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.graphicContainer}>
          {/* Glowing purple aura */}
          <View style={styles.glow} />
          
          {/* Stylized graphic representing the image placeholder */}
          <View style={styles.graphicPlaceholder}>
            <View style={styles.messageBubble}>
              <View style={styles.dotsRow}>
                <View style={styles.dot} />
                <View style={[styles.dot, { opacity: 0.5 }]} />
                <View style={[styles.dot, { opacity: 0.2 }]} />
              </View>
            </View>
            <View style={styles.userFigure}>
              <MaterialCommunityIcons name="account-circle" size={48} color="#5B42D9" />
              <View style={styles.userBody} />
            </View>
          </View>
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
    backgroundColor: "#0e0d12",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "flex-end",
    paddingBottom: 40,
    paddingTop: 80,
  },
  graphicContainer: {
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 80,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#2B1B4D",
    opacity: 0.6,
    shadowColor: "#8E54E9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
  },
  graphicPlaceholder: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  messageBubble: {
    width: 80,
    height: 50,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderBottomRightRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 20,
    left: 10,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  dotsRow: {
    flexDirection: "row",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4285F4",
    marginHorizontal: 3,
  },
  userFigure: {
    position: "absolute",
    bottom: 10,
    right: 20,
    alignItems: "center",
  },
  userBody: {
    width: 20,
    height: 24,
    backgroundColor: "#27273A",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginTop: -8,
    zIndex: -1,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 20,
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
