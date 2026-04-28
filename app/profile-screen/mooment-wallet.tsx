import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function MoomentWalletScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mooment Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>MOOMENT CREDIT</Text>
        <Text style={styles.amount}>55.00</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.buyBtn}
            onPress={() => router.push('/profile-screen/buy-credits')}
          >
            <Text style={styles.buyBtnText}>Buy Mooment Credits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn}>
            <Text style={styles.sendBtnText}>Send to Stripe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80, // Position text lower down
    paddingHorizontal: 20,
  },
  label: {
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    paddingHorizontal: 5,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: '#13131A', // Dark
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sendBtn: {
    flex: 1,
    backgroundColor: '#B2ABBA', // Purple/gray
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#0e0d12',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
