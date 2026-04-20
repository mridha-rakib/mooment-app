import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Switch, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

export default function OnboardingSettings() {
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Mooment!</Text>
            <Text style={styles.subtitle}>To get the best experience. Please enable</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Feather name="map-pin" size={20} color="#8E8E9B" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Location Service</Text>
                <Text style={styles.cardDescription}>Find events near you by allowing location access</Text>
              </View>
              <Switch
                trackColor={{ false: "#2B2B36", true: "#B59EBE" }}
                thumbColor={Platform.OS === 'ios' ? undefined : "#FFFFFF"}
                ios_backgroundColor="#2B2B36"
                onValueChange={setLocationEnabled}
                value={locationEnabled}
              />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Feather name="bell" size={20} color="#8E8E9B" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Notifications</Text>
                <Text style={styles.cardDescription}>Stay updated with the latest events and alerts</Text>
              </View>
              <Switch
                trackColor={{ false: "#2B2B36", true: "#B59EBE" }}
                thumbColor={Platform.OS === 'ios' ? undefined : "#FFFFFF"}
                ios_backgroundColor="#2B2B36"
                onValueChange={setNotificationsEnabled}
                value={notificationsEnabled}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.doneButton} 
            activeOpacity={0.8}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            You can change these at any time from the <Text style={styles.footerHighlight}>app settings</Text>
          </Text>
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
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingTop: 80,
  },
  header: {
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
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0e0d12",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2B2B36",
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2B2B36",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: "#8E8E9B",
    lineHeight: 16,
  },
  doneButton: {
    backgroundColor: "#B59EBE",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  doneButtonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 12,
    color: "#8E8E9B",
    textAlign: "center",
  },
  footerHighlight: {
    color: "#B59EBE",
    fontWeight: "bold",
  },
});
