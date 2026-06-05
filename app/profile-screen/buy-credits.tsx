import BackButton from "@/components/ui/BackButton";
import { getMoomentCreditPackages } from "@/lib/moomentCredits";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const CREDIT_PACKAGES = [
  { id: '1', credits: 25, price: '$26.25' },
  { id: '2', credits: 50, price: '$52.50' }, // Corrected from 100 to 50 based on logical pricing
  { id: '3', credits: 100, price: '$105.00' },
  { id: '4', credits: 250, price: '$262.50' },
  { id: '5', credits: 500, price: '$525.00' },
];

const formatCreditPrice = (priceUsd: number) => `$${priceUsd.toFixed(2)}`;

export default function BuyCreditsScreen() {
  const router = useRouter();
  const [creditPackages, setCreditPackages] = useState(CREDIT_PACKAGES);

  useEffect(() => {
    let isMounted = true;

    getMoomentCreditPackages()
      .then((packages) => {
        if (!isMounted || packages.length === 0) {
          return;
        }

        setCreditPackages(
          packages.map((pkg) => ({
            id: pkg.id,
            credits: pkg.credits,
            price: formatCreditPrice(pkg.priceUsd),
          })),
        );
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Buy Mooment Credits</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {creditPackages.map((pkg) => (
          <View key={pkg.id} style={styles.packageCard}>
            <Svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ marginBottom: 16 }}>
              <Path d="M0 12C0 5.37258 5.37258 0 12 0H32C38.6274 0 44 5.37258 44 12V32C44 38.6274 38.6274 44 32 44H12C5.37258 44 0 38.6274 0 32V12Z" fill="#686868" fillOpacity={0.1} />
              <Path d="M23.6667 26.9993C27.3486 26.9993 30.3333 24.0146 30.3333 20.3327C30.3333 16.6508 27.3486 13.666 23.6667 13.666C19.9848 13.666 17 16.6508 17 20.3327C17 24.0146 19.9848 26.9993 23.6667 26.9993Z" stroke="#B3B3B3" strokeWidth={1.25} strokeLinecap="round" />
              <Path d="M14.6304 21.166C14.021 22.0973 13.6666 23.2106 13.6666 24.4067C13.6666 27.6795 16.3198 30.3327 19.5926 30.3327C20.7887 30.3327 21.902 29.9783 22.8333 29.3688" stroke="#B3B3B3" strokeWidth={1.25} strokeLinecap="round" />
              <Path d="M25.1426 18.8381C24.9624 18.078 24.0454 17.3921 22.9447 17.9052C21.8439 18.4183 21.6691 20.0693 23.3341 20.2447C24.0867 20.324 24.5773 20.1527 25.0265 20.6371C25.4757 21.1216 25.5592 22.4687 24.4108 22.8318C23.2625 23.1949 22.1254 22.6276 22.0016 21.8221M23.6551 17.0039V17.7281M23.6551 22.9436V23.6706" stroke="#B3B3B3" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.creditsText}>{pkg.credits} Mooment Credits for</Text>
            <View style={styles.bottomRow}>
              <Text style={styles.priceText}>{pkg.price}</Text>
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => router.push({
                  pathname: '/profile-screen/checkout',
                  params: { packageId: pkg.id },
                } as any)}
              >
                <Text style={styles.buyBtnText}>Buy</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 15,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  packageCard: {
    backgroundColor: 'rgba(17, 17, 17, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A22',
    padding: 20,
    marginBottom: 12,
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
