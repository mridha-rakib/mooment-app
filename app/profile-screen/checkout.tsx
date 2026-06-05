import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  getMoomentCreditCheckout,
  getMoomentCreditPackages,
  purchaseMoomentCredits,
  type MoomentCreditCheckout,
  type MoomentCreditPaymentMethod,
} from "@/lib/moomentCredits";

const FALLBACK_CHECKOUT = {
  credits: 25,
  itemLabel: "25 Mooment Credits",
  subtitle: "bought 25 Mooment Credit",
  itemAmount: "$45",
  subtotal: "$45",
  platformFee: "$45",
  taxLabel: "Tax 5%",
  tax: "$45",
  total: "$45",
};

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

export default function CheckoutScreen() {
  const router = useRouter();
  const { packageId } = useLocalSearchParams<{ packageId?: string }>();
  const insets = useSafeAreaInsets();
  const [checkout, setCheckout] = useState<MoomentCreditCheckout | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(packageId ?? null);
  const [paymentMethod, setPaymentMethod] = useState<MoomentCreditPaymentMethod>('stripe');
  const [agreed, setAgreed] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCheckout = async () => {
      try {
        let creditPackageId = packageId;

        if (!creditPackageId) {
          const packages = await getMoomentCreditPackages();
          creditPackageId = packages[0]?.id;
        }

        if (!creditPackageId) {
          return;
        }

        const checkoutDetails = await getMoomentCreditCheckout(creditPackageId);

        if (isMounted) {
          setSelectedPackageId(creditPackageId);
          setCheckout(checkoutDetails);
        }
      } catch {
        if (isMounted) {
          setCheckout(null);
        }
      }
    };

    void loadCheckout();

    return () => {
      isMounted = false;
    };
  }, [packageId]);

  const credits = checkout?.creditPackage.credits ?? FALLBACK_CHECKOUT.credits;
  const itemLabel = checkout?.lineItems.itemLabel ?? FALLBACK_CHECKOUT.itemLabel;
  const eventSubtitle = checkout ? `bought ${credits} Mooment Credit` : FALLBACK_CHECKOUT.subtitle;
  const itemAmount = checkout ? formatCurrency(checkout.lineItems.itemAmountUsd) : FALLBACK_CHECKOUT.itemAmount;
  const subtotal = checkout ? formatCurrency(checkout.lineItems.subtotalUsd) : FALLBACK_CHECKOUT.subtotal;
  const platformFee = checkout ? formatCurrency(checkout.lineItems.platformFeeUsd) : FALLBACK_CHECKOUT.platformFee;
  const taxLabel = checkout ? `Tax ${checkout.lineItems.taxPercent}%` : FALLBACK_CHECKOUT.taxLabel;
  const tax = checkout ? formatCurrency(checkout.lineItems.taxUsd) : FALLBACK_CHECKOUT.tax;
  const total = checkout ? formatCurrency(checkout.lineItems.totalUsd) : FALLBACK_CHECKOUT.total;

  const handleContinue = async () => {
    if (isSubmitting) {
      return;
    }

    if (!selectedPackageId) {
      Alert.alert("Unable to continue", "Please select a Mooment credit package and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await purchaseMoomentCredits({
        packageId: selectedPackageId,
        paymentMethod,
        acceptedTerms: agreed,
      });

      router.push({
        pathname: '/profile-screen/payment-success',
        params: { purchaseId: result.purchase.id },
      } as any);
    } catch (error) {
      Alert.alert(
        "Unable to complete payment",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Event Section */}
        <Text style={styles.sectionTitle}>Event</Text>
        <View style={styles.eventCard}>
          <View style={styles.eventIconWrapper}>
            <Feather name="disc" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>Mooment Credits</Text>
            <Text style={styles.eventSubtitle}>{eventSubtitle}</Text>
          </View>
        </View>

        {/* Order Section */}
        <Text style={styles.sectionTitle}>Order</Text>
        <View style={styles.orderCard}>
          <View style={styles.orderRow}>
            <Text style={styles.orderLabel}>{itemLabel}</Text>
            <Text style={styles.orderValue}>{itemAmount}</Text>
          </View>
          
          <View style={styles.separator} />

          <View style={styles.orderRow}>
            <Text style={styles.orderSubtext}>Subtotal</Text>
            <Text style={styles.orderValue}>{subtotal}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderSubtext}>Platform fee</Text>
            <Text style={styles.orderValue}>{platformFee}</Text>
          </View>
          <View style={styles.orderRow}>
            <Text style={styles.orderSubtext}>{taxLabel}</Text>
            <Text style={styles.orderValue}>{tax}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.orderRow}>
            <Text style={styles.orderTotalLabel}>Total</Text>
            <Text style={styles.orderTotalValue}>{total}</Text>
          </View>
        </View>

        {/* Pay with Section */}
        <Text style={styles.sectionTitle}>Pay with</Text>

        {/* Stripe */}
        <TouchableOpacity 
          style={styles.paymentMethodCard}
          onPress={() => setPaymentMethod('stripe')}
          activeOpacity={0.8}
        >
          <View style={[styles.radioOuter, paymentMethod === 'stripe' && styles.radioOuterSelected]}>
            {paymentMethod === 'stripe' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.paymentIconWrapper}>
            <Text style={styles.stripeIconText}>S</Text>
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Stripe</Text>
            <Text style={styles.paymentSubtitle}>From your added stripe account</Text>
          </View>
        </TouchableOpacity>

        {/* Credit Card */}
        <TouchableOpacity 
          style={styles.paymentMethodCard}
          onPress={() => setPaymentMethod('card')}
          activeOpacity={0.8}
        >
          <View style={[styles.radioOuter, paymentMethod === 'card' && styles.radioOuterSelected]}>
            {paymentMethod === 'card' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.paymentIconWrapper}>
            <Feather name="credit-card" size={14} color="#8E8E9B" />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Credit Card</Text>
            <Text style={styles.paymentSubtitle}>Stripe Secure payment</Text>
          </View>
        </TouchableOpacity>

        {/* Apple Pay */}
        <TouchableOpacity 
          style={styles.paymentMethodCard}
          onPress={() => setPaymentMethod('apple')}
          activeOpacity={0.8}
        >
          <View style={[styles.radioOuter, paymentMethod === 'apple' && styles.radioOuterSelected]}>
            {paymentMethod === 'apple' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.paymentIconWrapper}>
            <FontAwesome5 name="apple" size={16} color="#8E8E9B" />
          </View>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Apple Pay</Text>
            <Text style={styles.paymentSubtitle}>Touch ID or Face ID</Text>
          </View>
        </TouchableOpacity>

        {/* Agreement */}
        <TouchableOpacity 
          style={styles.agreementRow} 
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Feather name="check" size={12} color="#0e0d12" />}
          </View>
          <Text style={styles.agreementText}>
            I agree to the <Text style={styles.agreementLink}>Policy</Text> and <Text style={styles.agreementLink}>Conditions</Text>
          </Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity 
          style={styles.continueBtn}
          onPress={handleContinue}
          disabled={isSubmitting}
        >
          <Text style={styles.continueBtnText}>Continue to payment</Text>
        </TouchableOpacity>

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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 20,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B2E', // Deep purplish dark color from screenshot
    borderRadius: 12,
    padding: 16,
  },
  eventIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#6353E0', // Bright purple background for the icon
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventSubtitle: {
    color: '#8E8E9B', // or a slightly more purple gray like #A39DBE
    fontSize: 12,
  },
  orderCard: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A22',
    padding: 16,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderLabel: {
    color: '#E0E0E0',
    fontSize: 13,
  },
  orderSubtext: {
    color: '#8E8E9B',
    fontSize: 13,
  },
  orderValue: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A22',
    marginVertical: 4,
  },
  orderTotalLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderTotalValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
    padding: 16,
    marginBottom: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8E8E9B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  radioOuterSelected: {
    borderColor: '#7A52F4', // Purple
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7A52F4',
  },
  paymentIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1A1A22',
    borderWidth: 1,
    borderColor: '#2A2A32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stripeIconText: {
    color: '#8E8E9B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentSubtitle: {
    color: '#8E8E9B',
    fontSize: 11,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#13131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
    marginTop: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#8E8E9B',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#B2ABBA', // Using light purple theme color
    borderColor: '#B2ABBA',
  },
  agreementText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  agreementLink: {
    color: '#8E8E9B',
  },
  continueBtn: {
    backgroundColor: '#B2ABBA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#0e0d12',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
