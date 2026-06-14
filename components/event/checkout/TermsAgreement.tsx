import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface TermsAgreementProps {
  agreed: boolean;
  onToggle: () => void;
}

const TermsAgreement = ({ agreed, onToggle }: TermsAgreementProps) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card + '66' }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, { backgroundColor: colors.background }, agreed && { backgroundColor: colors.primary }]}>
        {agreed && <Feather name="check" size={14} color={colors.background} />}
      </View>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        I agree to the <Text style={[styles.link, { color: colors.text }]}>Refund & Escrow Policy</Text> and <Text style={[styles.link, { color: colors.text }]}>Terms & Conditions</Text>
      </Text>
    </TouchableOpacity>
  );
};

export default TermsAgreement;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "center",
    minHeight: 56,
    padding: 12,
    borderRadius: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  link: {
    fontWeight: "bold",
  },
});
