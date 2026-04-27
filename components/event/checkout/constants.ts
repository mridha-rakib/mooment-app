import { StyleSheet } from "react-native";

export const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentPurple: "#8E54E9",
  accentOrange: "#FF6B3D",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.1)",
  checkbox: "#8E54E9",
};

export const commonStyles = StyleSheet.create({
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: COLORS.accentPurple,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accentPurple,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 12,
  },
});
