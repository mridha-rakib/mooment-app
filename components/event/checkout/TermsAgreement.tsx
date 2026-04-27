import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "./constants";

interface TermsAgreementProps {
  agreed: boolean;
  onToggle: () => void;
}

const TermsAgreement = ({ agreed, onToggle }: TermsAgreementProps) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
        {agreed && <Feather name="check" size={14} color="#FFF" />}
      </View>
      <Text style={styles.text}>
        I agree to the <Text style={styles.link}>Refund & Escrow Policy</Text> and <Text style={styles.link}>Terms & Conditions</Text>
      </Text>
    </TouchableOpacity>
  );
};

export default TermsAgreement;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    alignItems: "flex-start",
    paddingRight: 20,
    backgroundColor: "rgba(19, 19, 26, 0.4)",
    padding: 16,
    borderRadius: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.accentPurple,
  },
  text: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: COLORS.text,
    fontWeight: "bold",
  },
});
