import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getMyEarningsSummary, requestWithdrawal, type CreatorEarningsSummary } from "@/lib/payments";
import { getPayoutSettings, getMyPayouts, type PayoutSettings, type CreatorPayout } from "@/lib/payoutSettings";
import { getStripeConnectAccount, type StripeConnectAccount } from "@/lib/stripeConnect";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const fmt = (n: number) => `$${n.toFixed(2)}`;

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  instant_debit_card: "Debit Card · Instant",
};

const ARRIVAL_TIMES: Record<string, string> = {
  bank_transfer: "1–3 business days",
  instant_debit_card: "Usually within minutes",
};

const STATUS_COLOR_KEY: Record<CreatorPayout["status"], "success" | "warning" | "primary" | "danger" | "textSecondary"> = {
  completed: "success",
  processing: "primary",
  pending: "warning",
  failed: "danger",
  cancelled: "textSecondary",
};

function BalanceCard({
  label,
  amount,
  colorKey,
  colors,
}: {
  label: string;
  amount: number;
  colorKey?: string;
  colors: any;
}) {
  const color = colorKey ? (colors[colorKey] ?? colors.text) : colors.text;

  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.balanceAmount, { color }]}>{fmt(amount)}</Text>
    </View>
  );
}

function PayoutRow({ payout, colors }: { payout: CreatorPayout; colors: any }) {
  const colorKey = STATUS_COLOR_KEY[payout.status] ?? "textSecondary";
  const statusColor = colors[colorKey];

  return (
    <View style={[styles.payoutRow, { borderBottomColor: colors.border }]}>
      <View style={styles.payoutLeft}>
        <Text style={[styles.payoutAmount, { color: colors.text }]}>{fmt(payout.totalAmount)}</Text>
        <Text style={[styles.payoutDate, { color: colors.textSecondary }]}>
          {new Date(payout.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${statusColor}20` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
        </Text>
      </View>
    </View>
  );
}

export default function WithdrawScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [summary, setSummary] = useState<CreatorEarningsSummary | null>(null);
  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [stripeAccount, setStripeAccount] = useState<StripeConnectAccount | null>(null);
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amountText, setAmountText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const availableBalance = summary?.eligibleAmount ?? 0;
  const parsedAmount = parseFloat(amountText) || 0;

  const amountError =
    amountText.length > 0 && parsedAmount <= 0
      ? "Enter an amount greater than $0.00"
      : amountText.length > 0 && parsedAmount > availableBalance
      ? `Maximum available is ${fmt(availableBalance)}`
      : null;

  const canWithdraw =
    availableBalance > 0 &&
    parsedAmount > 0 &&
    parsedAmount <= availableBalance &&
    !amountError &&
    !isSubmitting;

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const [s, ps, sc, py] = await Promise.all([
        getMyEarningsSummary(),
        getPayoutSettings().catch(() => null),
        getStripeConnectAccount().catch(() => null),
        getMyPayouts(),
      ]);

      setSummary(s);
      setSettings(ps);
      setStripeAccount(sc);
      setPayouts(py);
    } catch {
      setError("Failed to load withdrawal data. Pull to refresh.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void load(true);
  }, [load]);

  const handleWithdrawAll = () => {
    if (availableBalance > 0) {
      setAmountText(availableBalance.toFixed(2));
    }
  };

  const handleSubmit = async () => {
    if (!canWithdraw || isSubmitting) return;

    const amount = parseFloat(amountText);
    const isWithdrawAll = Math.abs(amount - availableBalance) < 0.001;

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ${fmt(amount)} via ${METHOD_LABELS[settings?.withdrawalMethod ?? "bank_transfer"] ?? "Bank Transfer"}?\n\nEstimated arrival: ${ARRIVAL_TIMES[settings?.withdrawalMethod ?? "bank_transfer"]}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);

            try {
              const payout = await requestWithdrawal(
                isWithdrawAll ? undefined : { amount },
              );

              setAmountText("");
              await load(true);

              Alert.alert(
                "Withdrawal Request Submitted",
                `Your withdrawal of ${fmt(payout.totalAmount)} has been submitted.\n\nYou'll be notified once it's completed. ${ARRIVAL_TIMES[settings?.withdrawalMethod ?? "bank_transfer"]}.`,
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Withdrawal failed. Please try again.";
              Alert.alert("Withdrawal Failed", msg);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const onboardingIncomplete = stripeAccount && !stripeAccount.payoutsEnabled;

  if (isLoading) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Withdraw</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Spinner color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Withdraw</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40` }]}>
            <Feather name="alert-circle" size={14} color={colors.danger} />
            <Text style={[styles.errorBoxText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Stripe onboarding warning */}
        {onboardingIncomplete ? (
          <View style={[styles.warnBox, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}>
            <Feather name="alert-triangle" size={14} color={colors.warning} />
            <Text style={[styles.warnBoxText, { color: colors.warning }]}>
              Your bank account setup is incomplete. Please finish onboarding in Settings → Bank Account before withdrawing.
            </Text>
          </View>
        ) : null}

        {/* Balance cards */}
        <View style={styles.balanceGrid}>
          <BalanceCard
            label="Available"
            amount={summary?.eligibleAmount ?? 0}
            colorKey="success"
            colors={colors}
          />
          <BalanceCard
            label="Held"
            amount={summary?.heldAmount ?? 0}
            colors={colors}
          />
          <BalanceCard
            label="Pending"
            amount={summary?.pendingWithdrawalAmount ?? 0}
            colorKey="warning"
            colors={colors}
          />
          <BalanceCard
            label="Lifetime"
            amount={summary?.totalEarnedAmount ?? 0}
            colors={colors}
          />
        </View>

        {/* Withdrawal form */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Request Withdrawal</Text>

          {/* Amount input */}
          <View style={styles.amountRow}>
            <View
              style={[
                styles.amountInputWrap,
                { borderColor: amountError ? colors.danger : colors.border, backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.currencySign, { color: colors.textSecondary }]}>$</Text>
              <TextInput
                ref={inputRef}
                style={[styles.amountInput, { color: colors.text }]}
                value={amountText}
                onChangeText={(t) => {
                  const clean = t.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d{0,2}).*$/, "$1");
                  setAmountText(clean);
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="done"
                editable={!isSubmitting}
              />
            </View>
            <TouchableOpacity
              style={[styles.withdrawAllBtn, { borderColor: colors.primary }]}
              onPress={handleWithdrawAll}
              disabled={availableBalance <= 0 || isSubmitting}
            >
              <Text style={[styles.withdrawAllText, { color: colors.primary }]}>Withdraw All</Text>
            </TouchableOpacity>
          </View>

          {amountError ? (
            <Text style={[styles.fieldError, { color: colors.danger }]}>{amountError}</Text>
          ) : null}

          {/* Method + arrival */}
          <View style={[styles.methodRow, { borderTopColor: colors.border }]}>
            <View style={styles.methodLeft}>
              <Feather name="credit-card" size={14} color={colors.textSecondary} />
              <Text style={[styles.methodLabel, { color: colors.text }]}>
                {METHOD_LABELS[settings?.withdrawalMethod ?? "bank_transfer"]}
              </Text>
            </View>
            <Text style={[styles.arrivalText, { color: colors.success }]}>
              {ARRIVAL_TIMES[settings?.withdrawalMethod ?? "bank_transfer"]}
            </Text>
          </View>

          {/* Fee note */}
          <View style={[styles.feeRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Processing Fee</Text>
            <Text style={[styles.feeValue, { color: colors.text }]}>None</Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: canWithdraw ? buttonBackground(colors) : `${buttonBackground(colors)}55` },
            ]}
            onPress={handleSubmit}
            disabled={!canWithdraw}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <Spinner color={buttonForeground(colors)} />
            ) : (
              <Text style={[styles.submitBtnText, { color: buttonForeground(colors) }]}>
                {parsedAmount > 0 ? `Withdraw ${fmt(parsedAmount)}` : "Request Withdrawal"}
              </Text>
            )}
          </TouchableOpacity>

          {availableBalance <= 0 && (
            <Text style={[styles.noBalanceNote, { color: colors.textSecondary }]}>
              No funds available to withdraw yet. Earnings become eligible after the event hold period.
            </Text>
          )}
        </View>

        {/* Payout history */}
        {payouts.length > 0 && (
          <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Payouts</Text>
            {payouts.slice(0, 10).map((p) => (
              <PayoutRow key={p.id} payout={p} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorBoxText: { flex: 1, fontSize: 13, lineHeight: 20 },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  warnBoxText: { flex: 1, fontSize: 13, lineHeight: 20 },
  balanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  balanceCard: {
    width: "47.5%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  balanceLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  balanceAmount: { fontSize: 20, fontWeight: "800" },
  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 0,
  },
  formTitle: { fontSize: 15, fontWeight: "700", marginBottom: 16 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  amountInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  currencySign: { fontSize: 18, fontWeight: "600", marginRight: 4 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: "700" },
  withdrawAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  withdrawAllText: { fontSize: 13, fontWeight: "700" },
  fieldError: { fontSize: 12, marginBottom: 8 },
  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    marginTop: 12,
    paddingBottom: 10,
  },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  methodLabel: { fontSize: 13, fontWeight: "500" },
  arrivalText: { fontSize: 12, fontWeight: "600" },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 14,
    marginTop: 2,
  },
  feeLabel: { fontSize: 13 },
  feeValue: { fontSize: 13, fontWeight: "600" },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700" },
  noBalanceNote: { fontSize: 12, textAlign: "center", lineHeight: 18, marginTop: 10 },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  historyTitle: { fontSize: 14, fontWeight: "700", marginBottom: 12 },
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  payoutLeft: { gap: 3 },
  payoutAmount: { fontSize: 15, fontWeight: "700" },
  payoutDate: { fontSize: 11 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
});
