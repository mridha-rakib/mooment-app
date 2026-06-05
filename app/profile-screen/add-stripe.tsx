import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  createStripeConnectOnboardingLink,
  getStripeConnectAccount,
  type StripeConnectAccount,
} from "@/lib/stripeConnect";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const stripeConnectCallbackPath = process.env.EXPO_PUBLIC_STRIPE_CONNECT_CALLBACK_PATH || "/profile-screen/add-stripe";

const maskStripeAccountId = (stripeAccountId?: string | null) => {
  if (!stripeAccountId) {
    return "Stripe account";
  }

  return `${stripeAccountId.slice(0, 8)}...${stripeAccountId.slice(-4)}`;
};

const getConnectedStatus = (account: StripeConnectAccount) => {
  if (account.payoutsEnabled) {
    return "Ready";
  }

  if (account.detailsSubmitted) {
    return "Pending";
  }

  return "Incomplete";
};

const formatPayoutMeta = (account: NonNullable<StripeConnectAccount["payoutAccounts"][number]>) =>
  [account.currency?.toUpperCase(), account.country, account.status].filter(Boolean).join(" · ");

export default function AddStripeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<StripeConnectAccount | null>(null);

  const primaryPayoutAccount = useMemo(
    () =>
      (connectedAccount?.payoutAccounts ?? []).find((account) => account.defaultForCurrency) ??
      (connectedAccount?.payoutAccounts ?? [])[0] ??
      null,
    [connectedAccount],
  );

  const loadConnectedAccount = useCallback(async () => {
    try {
      setConnectedAccount(await getStripeConnectAccount());
    } catch {
      setConnectedAccount(null);
    }
  }, []);

  useEffect(() => {
    void loadConnectedAccount();
  }, [loadConnectedAccount]);

  const handleConnectStripe = async () => {
    if (isConnecting) {
      return;
    }

    setIsConnecting(true);

    try {
      const returnUrl = Linking.createURL(stripeConnectCallbackPath, {
        queryParams: { stripeConnect: "return" },
      });
      const onboardingLink = await createStripeConnectOnboardingLink();

      const result = await WebBrowser.openAuthSessionAsync(
        onboardingLink.onboardingUrl,
        returnUrl,
      );

      if (result.type === "success" || result.type === "dismiss") {
        setConnectedAccount(await getStripeConnectAccount());
      }
    } catch (error) {
      Alert.alert(
        "Unable to connect Stripe",
        getAuthErrorMessage(error, "Please try again in a moment."),
      );
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.safe}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={styles.headerTitle}>Add Stripe Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.connectCard}>
          <View style={styles.brandRow}>
            <View style={styles.stripeMark}>
              <Text style={styles.stripeMarkText}>S</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.label}>STRIPE CONNECT</Text>
              <Text style={styles.cardTitle}>Receive payouts securely</Text>
            </View>
          </View>

          <Text style={styles.description}>
            Connect your Stripe account to verify payout details and transfer your available balance.
          </Text>

          <View style={styles.divider} />

          <View style={styles.checkRow}>
            <Feather name="shield" size={18} color="#B2ABBA" />
            <Text style={styles.checkText}>Verification is handled by Stripe</Text>
          </View>
          <View style={styles.checkRow}>
            <Feather name="credit-card" size={18} color="#B2ABBA" />
            <Text style={styles.checkText}>Bank details stay managed in Stripe</Text>
          </View>
          <View style={styles.checkRow}>
            <Feather name="repeat" size={18} color="#B2ABBA" />
            <Text style={styles.checkText}>Withdrawals use your connected account</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Feather name="lock" size={16} color="#8E8E9B" />
          <Text style={styles.noticeText}>
            Mooment never asks you to paste a Stripe ID manually.
          </Text>
        </View>

        {connectedAccount ? (
          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View>
                <Text style={styles.accountLabel}>CONNECTED ACCOUNT</Text>
                <Text style={styles.accountTitle}>{maskStripeAccountId(connectedAccount.stripeAccountId)}</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{getConnectedStatus(connectedAccount)}</Text>
              </View>
            </View>

            <View style={styles.accountDivider} />

            {primaryPayoutAccount ? (
              <View style={styles.bankRow}>
                <View style={styles.bankIcon}>
                  <Feather
                    name={primaryPayoutAccount.type === "bank_account" ? "credit-card" : "smartphone"}
                    size={18}
                    color="#B2ABBA"
                  />
                </View>
                <View style={styles.bankCopy}>
                  <Text style={styles.bankName}>
                    {primaryPayoutAccount.name} •••• {primaryPayoutAccount.last4}
                  </Text>
                  <Text style={styles.bankMeta}>{formatPayoutMeta(primaryPayoutAccount)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.bankRow}>
                <View style={styles.bankIcon}>
                  <Feather name="credit-card" size={18} color="#8E8E9B" />
                </View>
                <View style={styles.bankCopy}>
                  <Text style={styles.bankName}>No payout account added yet</Text>
                  <Text style={styles.bankMeta}>Finish Stripe onboarding to add bank details.</Text>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 30) }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isConnecting && styles.saveBtnDisabled]}
          onPress={handleConnectStripe}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <Spinner color="#0e0d12" />
          ) : (
            <Text style={styles.saveBtnText}>{connectedAccount ? "Update Stripe" : "Connect Stripe"}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  label: {
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  connectCard: {
    backgroundColor: '#1A1A22',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripeMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#635BFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stripeMarkText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  brandCopy: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 5,
  },
  description: {
    color: '#B8B8C6',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 18,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  noticeText: {
    color: '#8E8E9B',
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 10,
    flex: 1,
  },
  accountCard: {
    backgroundColor: '#1A1A22',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountLabel: {
    color: '#8E8E9B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  accountTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: 'rgba(178, 171, 186, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: '#B2ABBA',
    fontSize: 11,
    fontWeight: '800',
  },
  accountDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bankCopy: {
    flex: 1,
  },
  bankName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bankMeta: {
    color: '#8E8E9B',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30, // Extra padding for safe area at bottom
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#13131A', // Very dark grey
    borderRadius: 12,
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B2ABBA', // Light purple-grey
    borderRadius: 12,
    marginLeft: 10,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
