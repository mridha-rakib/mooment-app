import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  createStripeConnectOnboardingLink,
  getStripeConnectAccount,
  type StripeConnectAccount,
} from "@/lib/stripeConnect";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const stripeConnectCallbackPath =
  process.env.EXPO_PUBLIC_STRIPE_CONNECT_CALLBACK_PATH || "/profile-screen/bank-account";

const getOnboardingStatusLabel = (account: StripeConnectAccount): string => {
  if (account.payoutsEnabled) return "Active";
  if (account.onboardingStatus === "restricted") return "Restricted";
  if (account.detailsSubmitted) return "Pending Review";
  return "Incomplete";
};

const getOnboardingStatusColor = (account: StripeConnectAccount, colors: any): string => {
  if (account.payoutsEnabled) return colors.success;
  if (account.onboardingStatus === "restricted") return colors.danger;
  return colors.warning;
};

const formatPayoutMeta = (account: StripeConnectAccount["payoutAccounts"][number]) =>
  [account.currency?.toUpperCase(), account.country, account.status]
    .filter(Boolean)
    .join(" · ");

export default function BankAccountScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [connectedAccount, setConnectedAccount] = useState<StripeConnectAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  const primaryPayoutAccount = useMemo(
    () =>
      (connectedAccount?.payoutAccounts ?? []).find((a) => a.defaultForCurrency) ??
      (connectedAccount?.payoutAccounts ?? [])[0] ??
      null,
    [connectedAccount],
  );

  const loadAccount = useCallback(async () => {
    setIsLoading(true);

    try {
      setConnectedAccount(await getStripeConnectAccount());
    } catch {
      setConnectedAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const handleConnectStripe = async () => {
    if (isConnecting) return;

    setIsConnecting(true);

    try {
      const returnUrl = Linking.createURL(stripeConnectCallbackPath, {
        queryParams: { stripeConnect: "return" },
      });
      const onboardingLink = await createStripeConnectOnboardingLink({ returnUrl });
      const result = await WebBrowser.openAuthSessionAsync(onboardingLink.onboardingUrl, returnUrl);

      if (result.type === "success" || result.type === "dismiss") {
        setConnectedAccount(await getStripeConnectAccount());
      }
    } catch (error) {
      Alert.alert(
        "Connection Failed",
        getAuthErrorMessage(error, "Unable to connect Stripe. Please try again."),
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const statusLabel = connectedAccount ? getOnboardingStatusLabel(connectedAccount) : null;
  const statusColor = connectedAccount
    ? getOnboardingStatusColor(connectedAccount, colors)
    : colors.textSecondary;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bank Account</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Spinner color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
        >
          {connectedAccount ? (
            <>
              {/* Account Status Card */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  ACCOUNT STATUS
                </Text>

                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusValue, { color: colors.text }]}>
                      {statusLabel}
                    </Text>
                  </View>
                  <Text style={[styles.stripeId, { color: colors.textSecondary }]}>
                    {connectedAccount.stripeAccountId.slice(0, 8)}…
                    {connectedAccount.stripeAccountId.slice(-4)}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.capabilityRow}>
                  <CapabilityItem
                    label="Payouts"
                    active={connectedAccount.payoutsEnabled}
                    colors={colors}
                  />
                  <CapabilityItem
                    label="Charges"
                    active={connectedAccount.chargesEnabled}
                    colors={colors}
                  />
                  <CapabilityItem
                    label="Details"
                    active={connectedAccount.detailsSubmitted}
                    colors={colors}
                  />
                </View>

                {connectedAccount.requirements.disabledReason ? (
                  <View style={[styles.warningBox, { backgroundColor: colors.backgroundSecondary, borderColor: colors.danger }]}>
                    <Feather name="alert-triangle" size={14} color={colors.danger} />
                    <Text style={[styles.warningText, { color: colors.danger }]}>
                      {connectedAccount.requirements.disabledReason}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Payout Account Card */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                  PAYOUT ACCOUNT
                </Text>

                {primaryPayoutAccount ? (
                  <View style={styles.bankRow}>
                    <View style={[styles.bankIcon, { backgroundColor: colors.backgroundSecondary }]}>
                      <Feather
                        name={primaryPayoutAccount.type === "bank_account" ? "credit-card" : "smartphone"}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.bankDetails}>
                      <Text style={[styles.bankName, { color: colors.text }]}>
                        {primaryPayoutAccount.name} ···· {primaryPayoutAccount.last4}
                      </Text>
                      <Text style={[styles.bankMeta, { color: colors.textSecondary }]}>
                        {formatPayoutMeta(primaryPayoutAccount)}
                      </Text>
                    </View>
                    {primaryPayoutAccount.defaultForCurrency && (
                      <View style={[styles.defaultBadge, { backgroundColor: colors.backgroundSecondary }]}>
                        <Text style={[styles.defaultBadgeText, { color: colors.textSecondary }]}>
                          Default
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyBank}>
                    <Feather name="credit-card" size={24} color={colors.textSecondary} />
                    <Text style={[styles.emptyBankText, { color: colors.textSecondary }]}>
                      No payout account added yet.
                    </Text>
                    <Text style={[styles.emptyBankSubtext, { color: colors.textSecondary }]}>
                      Complete Stripe onboarding to add bank details.
                    </Text>
                  </View>
                )}
              </View>

              {/* Update button */}
              <TouchableOpacity
                style={[
                  styles.connectBtn,
                  { backgroundColor: colors.primary },
                  isConnecting && styles.connectBtnDisabled,
                ]}
                onPress={handleConnectStripe}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Spinner color={colors.background} />
                ) : (
                  <>
                    <Feather name="external-link" size={16} color={colors.background} />
                    <Text style={[styles.connectBtnText, { color: colors.background }]}>
                      Manage Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* No account connected */
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="briefcase" size={36} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Bank account not connected
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Connect a bank account via Stripe to receive payouts from your events.
              </Text>
              <TouchableOpacity
                style={[
                  styles.connectBtn,
                  { backgroundColor: colors.primary },
                  isConnecting && styles.connectBtnDisabled,
                ]}
                onPress={handleConnectStripe}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Spinner color={colors.background} />
                ) : (
                  <>
                    <Feather name="link" size={16} color={colors.background} />
                    <Text style={[styles.connectBtnText, { color: colors.background }]}>
                      Connect Bank Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function CapabilityItem({
  label,
  active,
  colors,
}: {
  label: string;
  active: boolean;
  colors: any;
}) {
  return (
    <View style={styles.capabilityItem}>
      <Feather
        name={active ? "check-circle" : "circle"}
        size={14}
        color={active ? colors.success : colors.textSecondary}
      />
      <Text style={[styles.capabilityLabel, { color: active ? colors.text : colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: { fontSize: 16, fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusValue: { fontSize: 15, fontWeight: "700" },
  stripeId: { fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  capabilityRow: { flexDirection: "row", gap: 20 },
  capabilityItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  capabilityLabel: { fontSize: 12, fontWeight: "500" },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningText: { fontSize: 12, flex: 1, lineHeight: 18 },
  bankRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bankDetails: { flex: 1 },
  bankName: { fontSize: 14, fontWeight: "700" },
  bankMeta: { fontSize: 12, marginTop: 2 },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: "700" },
  emptyBank: { alignItems: "center", paddingVertical: 16, gap: 6 },
  emptyBankText: { fontSize: 14, fontWeight: "600" },
  emptyBankSubtext: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  emptyState: { alignItems: "center", paddingTop: 40, paddingHorizontal: 20, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
    marginTop: 8,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { fontSize: 15, fontWeight: "700" },
});
