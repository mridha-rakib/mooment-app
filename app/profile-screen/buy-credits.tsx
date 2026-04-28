import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CREDIT_PACKAGES = [
  { id: '1', credits: 25, price: '$26.25' },
  { id: '2', credits: 50, price: '$52.50' }, // Corrected from 100 to 50 based on logical pricing
  { id: '3', credits: 100, price: '$105.00' },
  { id: '4', credits: 250, price: '$262.50' },
  { id: '5', credits: 500, price: '$525.00' },
];

export default function BuyCreditsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <BlurView intensity={20} tint="dark" style={styles.backCircle}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Mooment Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {CREDIT_PACKAGES.map((pkg) => (
          <View key={pkg.id} style={styles.packageCard}>
            <View style={styles.iconWrapper}>
              <Feather name="link-2" size={14} color="#8E8E9B" />
            </View>
            <Text style={styles.creditsText}>{pkg.credits} Mooment Credits for</Text>
            <View style={styles.bottomRow}>
              <Text style={styles.priceText}>{pkg.price}</Text>
              <TouchableOpacity style={styles.buyBtn}>
                <Text style={styles.buyBtnText}>Buy</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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
  backBtn: {},
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  packageCard: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A22',
    padding: 20,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A22',
    borderWidth: 1,
    borderColor: '#2A2A32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsText: {
    color: '#8E8E9B',
    fontSize: 12,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  buyBtn: {
    backgroundColor: '#B2ABBA', // Light purple-grey
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyBtnText: {
    color: '#0e0d12',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
