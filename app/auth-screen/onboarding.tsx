import { useRouter } from "expo-router";
import React from "react";
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Onboarding() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require("../../assets/images/splash.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlayContainer}>
          {/* Manually simulate a seamless gradient fade to theme background using steps */}
          <View style={styles.fade1} />
          <View style={styles.fade2} />
          <View style={styles.fade3} />
          <View style={styles.fade4} />
          
          <View style={styles.solidBottom}>
            <SafeAreaView>
              <View style={styles.content}>
                <Text style={styles.title}>Discover Your Vibe</Text>
                <Text style={styles.subtitle}>
                  Find events happening near you! Connect with hosts and attendees, Get tickets seamlessly and share experiences.
                </Text>
                
                <TouchableOpacity 
                  style={styles.button} 
                  activeOpacity={0.8}
                  onPress={() => router.push('/auth-screen/login')}
                >
                  <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E0D12",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  fade1: {
    height: 30,
    backgroundColor: 'rgba(14, 13, 18, 0.2)',
  },
  fade2: {
    height: 30,
    backgroundColor: 'rgba(14, 13, 18, 0.4)',
  },
  fade3: {
    height: 30,
    backgroundColor: 'rgba(14, 13, 18, 0.6)',
  },
  fade4: {
    height: 30,
    backgroundColor: 'rgba(14, 13, 18, 0.8)',
  },
  solidBottom: {
    paddingBottom: 20,
    backgroundColor: "#0E0D12",
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 20,
    marginBottom: 40,
    color: "#8E8E9B",
  },
  button: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B59EBE",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0E0D12",
  },
});
