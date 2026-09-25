import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface EventCardProps {
  title: string;
  dateTime: string;
}

const EventCard = ({ title, dateTime }: EventCardProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Event</Text>
      <View style={[styles.card, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
        <View style={[styles.iconBg, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : "rgba(142, 84, 233, 0.1)" }]}>
          <Ionicons name="apps" size={20} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.dateTime, { color: colors.textSecondary }]}>{dateTime}</Text>
        </View>
      </View>
    </View>
  );
};

export default EventCard;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  dateTime: {
    fontSize: 11,
    lineHeight: 16,
  },
});
