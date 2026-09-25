import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";

const CONFIRM_WORD = "DELETE";

const CONSEQUENCES = [
  "Account access will be permanently removed.",
  'Your posts will appear as "Deleted User".',
  "Existing tickets you bought remain valid.",
  "Events you host will not automatically disappear.",
  "Refunds are not automatically generated.",
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const deleteAccount = useAuthStore((state) => state.deleteAccount);

  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmText.trim() === CONFIRM_WORD && password.length > 0;
  const canSubmit = isConfirmed && !isDeleting;

  const handleDelete = async () => {
    if (!canSubmit) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteAccount(password);
      // Clear any protected screens left in the stack before landing on auth,
      // mirroring the logout navigation reset.
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/auth-screen/onboarding");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete your account. Please try again.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 32, 48) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>Delete your account?</Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            This can’t be undone. Please read what happens before you continue.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {CONSEQUENCES.map((line) => (
              <View key={line} style={styles.consequenceRow}>
                <Feather
                  name="alert-triangle"
                  size={15}
                  color={colors.danger}
                  style={styles.consequenceIcon}
                />
                <Text style={[styles.consequenceText, { color: colors.text }]}>{line}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            TYPE “{CONFIRM_WORD}” TO CONFIRM
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colors.textSecondary}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDeleting}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>CURRENT PASSWORD</Text>
          <View
            style={[
              styles.passwordRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isDeleting}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.deleteBtn,
              { backgroundColor: colors.danger },
              !canSubmit && styles.deleteBtnDisabled,
            ]}
            onPress={handleDelete}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Permanently delete account"
          >
            {isDeleting ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => router.back()}
            disabled={isDeleting}
            accessibilityRole="button"
            accessibilityLabel="Cancel account deletion"
          >
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  lead: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  consequenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 6,
  },
  consequenceIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  consequenceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 22,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  deleteBtn: {
    marginTop: 24,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelBtn: {
    marginTop: 14,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
