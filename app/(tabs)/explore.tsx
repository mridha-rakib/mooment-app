import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ActivityItem = {
  id: string;
  type: 'follow' | 'ticket';
  user?: {
    name: string;
    avatar: string;
  };
  event?: string;
  time: string;
};

const TODAY_DATA: ActivityItem[] = [
  {
    id: '1',
    type: 'follow',
    user: {
      name: '@catfish',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
    },
    time: '2 hr ago',
  },
  {
    id: '2',
    type: 'ticket',
    event: 'Rooftop Sessions Vol.4',
    time: '2 hr ago',
  },
];

const LAST_WEEK_DATA: ActivityItem[] = [
  {
    id: '3',
    type: 'follow',
    user: {
      name: '@catfish',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop'
    },
    time: '2 hr ago',
  },
  {
    id: '4',
    type: 'ticket',
    event: 'Rooftop Sessions Vol.4',
    time: '2 hr ago',
  },
];

export default function Explore() {
  const [isEmpty, setIsEmpty] = useState(false);

  const renderItem = (item: ActivityItem) => {
    if (item.type === 'follow') {
      return (
        <View key={item.id} style={styles.activityCard}>
          <View style={styles.cardContent}>
            <Image source={{ uri: item.user?.avatar }} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={styles.mainText}>
                <Text style={styles.boldText}>{item.user?.name}</Text> started following you
              </Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
            <Text style={styles.followBtnText}>Follow</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View key={item.id} style={styles.activityCard}>
          <View style={styles.cardContent}>
            <View style={styles.ticketIconContainer}>
              <Ionicons name="ticket" size={20} color="#D4B0EB" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.mainText} numberOfLines={2}>
                Ticket confirmed for <Text style={styles.boldText}>{item.event}</Text>
              </Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#8E8E9B" />
        </View>
      );
    }
  };

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitleCentered}>Activity</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Feather name="star" size={32} color="#8E8E9B" />
          </View>
          <Text style={styles.emptyTitle}>No Activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Likes, comments, follows, tickets and rewards will show up here
          </Text>
          <TouchableOpacity style={styles.discoverBtn} activeOpacity={0.8} onPress={() => setIsEmpty(false)}>
            <Text style={styles.discoverBtnText}>Go discover something</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity onPress={() => setIsEmpty(true)}>
          <Text style={styles.markReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Today</Text>
        {TODAY_DATA.map(renderItem)}

        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Last week</Text>
        {LAST_WEEK_DATA.map(renderItem)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0d12",
    paddingTop:40
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerTitleCentered: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  markReadText: {
    color: "#D4B0EB",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: "#8E8E9B",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1A1A22",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  ticketIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(212, 176, 235, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  mainText: {
    color: "#D0D0D8",
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  timeText: {
    color: "#8E8E9B",
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  followBtnText: {
    color: "#0e0d12",
    fontSize: 13,
    fontWeight: "bold",
  },
  /* Empty State Styles */
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginBottom: 100,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1A1A22",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptySubtitle: {
    color: "#8E8E9B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  discoverBtn: {
    backgroundColor: "#B2ABBA",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  discoverBtnText: {
    color: "#0e0d12",
    fontSize: 15,
    fontWeight: "bold",
  },
});
