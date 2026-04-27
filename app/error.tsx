import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function ErrorScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.graphicContainer}>
            <View style={styles.glow} />
            <View style={styles.concentricCircle1}>
              <View style={styles.concentricCircle2}>
                <View style={styles.iconCircle}>
                  <Feather name="x" size={28} color="#E64A54" />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Error !</Text>
            <Text style={styles.subtitle}>
              You have input wrong code. Please try again!
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.retryButton} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/verify-email')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
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
    backgroundColor: "#331215",
    opacity: 0.8,
    shadowColor: "#E64A54",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
  },
  concentricCircle1: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: "rgba(230, 74, 84, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  concentricCircle2: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: "rgba(230, 74, 84, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#E64A54",
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
  retryButton: {
    backgroundColor: "#E64A54",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
