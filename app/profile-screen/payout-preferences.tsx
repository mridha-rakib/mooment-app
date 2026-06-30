import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getPayoutSettings, updatePayoutSettings } from "@/lib/payoutSettings";
import type { PayoutPreference, PayoutSettings } from "@/lib/payoutSettings";
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
  value: PayoutPreference;
  label: string;
  description: string;
  icon: string;
};

const OPTIONS: Option[] = [
  {
    value: "manual",
    label: "Manual Withdraw",
    description: "Withdraw your available balance whenever you choose.",
    icon: "hand",
  },
  {
    value: "weekly",
    label: "Automatic Weekly",
    description: "Your available balance is paid out automatically every week.",
    icon: "calendar",
  },
  {
    value: "monthly",
    label: "Automatic Monthly",
    description: "Your available balance is paid out automatically every month.",
    icon: "clock",
  },
];

export default function PayoutPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [settings, setSettings] = useState<PayoutSettings | null>(null);
  const [selected, setSelected] = useState<PayoutPreference>("manual");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getPayoutSettings();

      setSettings(data);
      setSelected(data.payoutPreference);
    } catch {
      setError("Failed to load payout preferences. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (isSaving || selected === settings?.payoutPreference) return;

    setIsSaving(true);

    try {
      const updated = await updatePayoutSettings({ payoutPreference: selected });

      setSettings(updated);
      Alert.alert("Saved", "Payout preference updated successfully.");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save preference. Please try again.",
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payout Preferences</Text>
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
              Choose how your available earnings are paid out.
            </Text>

            {OPTIONS.map((option) => {
              const isActive = selected === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && { borderColor: colors.primary },
                  ]}
                  onPress={() => setSelected(option.value)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionIcon, { backgroundColor: isActive ? colors.primary : colors.backgroundSecondary }]}>
                    <Feather name={option.icon as any} size={20} color={isActive ? colors.background : colors.textSecondary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{option.description}</Text>
                  </View>
                  <View style={[
                    styles.radioCircle,
                    { borderColor: isActive ? colors.primary : colors.textSecondary },
                  ]}>
                    {isActive && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 24) }]}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: buttonBackground(colors) },
                (isSaving || selected === settings?.payoutPreference) && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving || selected === settings?.payoutPreference}
            >
              {isSaving ? (
                <Spinner color={buttonForeground(colors)} />
              ) : (
                <Text style={[styles.saveBtnText, { color: buttonForeground(colors) }]}>Save Preference</Text>
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
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  optionDesc: { fontSize: 12, lineHeight: 18 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
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
