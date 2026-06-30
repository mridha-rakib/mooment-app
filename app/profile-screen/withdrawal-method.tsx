import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getPayoutSettings, updatePayoutSettings } from "@/lib/payoutSettings";
import type { PayoutSettings, WithdrawalMethod } from "@/lib/payoutSettings";
import React, { useCallback, useEffect, useState } from "react";
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

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
type Option = {
  value: WithdrawalMethod;
  label: string;
  arrivalTime: string;
  description: string;
  icon: string;
  note?: string;
};

const OPTIONS: Option[] = [
  {
    value: "bank_transfer",
    label: "Bank Transfer",
    arrivalTime: "1–3 business days",
    description: "Standard payout via bank transfer.",
    icon: "credit-card",
  },
  {
    value: "instant_debit_card",
    label: "Debit Card · Instant",
    arrivalTime: "Usually within minutes",
    description: "Funds deposited to your debit card almost instantly.",
    icon: "zap",
    note: "Additional processing fees may apply.",
  },
];

export default function WithdrawalMethodScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [selected, setSelected] = useState<WithdrawalMethod>("bank_transfer");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPayoutSettings();

      setSettings(data);
      setSelected(data.withdrawalMethod);
    } catch {
      setError("Failed to load withdrawal settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSelect = (value: WithdrawalMethod) => {
    if (value === "instant_debit_card" && !settings?.instantPayoutEligible) return;
    setSelected(value);
  };

  const handleSave = async () => {
    if (isSaving || selected === settings?.withdrawalMethod) return;

    setIsSaving(true);

    try {
      const updated = await updatePayoutSettings({ withdrawalMethod: selected });

      setSettings(updated);
      Alert.alert("Saved", "Withdrawal method updated successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Withdrawal Method</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <Spinner color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={loadSettings}
          >
            <Text style={[styles.retryBtnText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          >
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose how your funds are transferred when a payout is issued.
            </Text>

            {OPTIONS.map((option) => {
              const isInstant = option.value === "instant_debit_card";
              const isEligible = !isInstant || (settings?.instantPayoutEligible ?? false);
              const isActive = selected === option.value;
              const isDisabled = !isEligible;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && { borderColor: colors.primary },
                    isDisabled && styles.optionDisabled,
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={isDisabled ? 1 : 0.75}
                  disabled={isDisabled}
                >
                  <View style={[
                    styles.optionIcon,
                    { backgroundColor: isActive && !isDisabled ? colors.primary : colors.backgroundSecondary },
                  ]}>
                    <Feather
                      name={option.icon as any}
                      size={20}
                      color={isActive && !isDisabled ? colors.background : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <View style={styles.optionLabelRow}>
                      <Text style={[styles.optionLabel, { color: isDisabled ? colors.textSecondary : colors.text }]}>
                        {option.label}
                      </Text>
                      {isInstant && !isEligible && (
                        <View style={[styles.comingSoonBadge, { backgroundColor: colors.backgroundSecondary }]}>
                          <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                            Coming Soon
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.arrivalTime, { color: isDisabled ? colors.textSecondary : colors.success }]}>
                      {option.arrivalTime}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                      {option.description}
                    </Text>
                    {option.note ? (
                      <Text style={[styles.noteText, { color: colors.warning }]}>
                        {option.note}
                      </Text>
                    ) : null}
                  </View>
                  {!isDisabled && (
                    <View style={[
                      styles.radioCircle,
                      { borderColor: isActive ? colors.primary : colors.textSecondary },
                    ]}>
                      {isActive && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 24) }]}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: buttonBackground(colors) },
                (isSaving || selected === settings?.withdrawalMethod) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving || selected === settings?.withdrawalMethod}
            >
              {isSaving ? (
                <Spinner color={buttonForeground(colors)} />
              ) : (
                <Text style={[styles.saveBtnText, { color: buttonForeground(colors) }]}>Save Method</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryBtnText: { fontSize: 14, fontWeight: "600" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  subtitle: { fontSize: 13, marginBottom: 20, lineHeight: 20 },
  optionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  optionDisabled: { opacity: 0.55 },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  optionText: { flex: 1 },
  optionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  optionLabel: { fontSize: 15, fontWeight: "600" },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  comingSoonText: { fontSize: 10, fontWeight: "700" },
  arrivalTime: { fontSize: 12, fontWeight: "600", marginBottom: 3 },
  optionDesc: { fontSize: 12, lineHeight: 18 },
  noteText: { fontSize: 11, marginTop: 4, fontStyle: "italic" },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { fontSize: 16, fontWeight: "700" },
});
