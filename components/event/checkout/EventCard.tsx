import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, commonStyles } from "./constants";

interface EventCardProps {
  title: string;
  dateTime: string;
}

const EventCard = ({ title, dateTime }: EventCardProps) => {
  return (
    <View style={styles.container}>
      <Text style={commonStyles.sectionTitle}>Event</Text>
      <View style={styles.card}>
        <View style={styles.iconBg}>
          <Ionicons name="apps" size={20} color={COLORS.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.dateTime}>{dateTime}</Text>
        </View>
      </View>
    </View>
  );
};

export default EventCard;

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(212, 176, 235, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  dateTime: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
