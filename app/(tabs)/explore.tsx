import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";

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
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isEmpty, setIsEmpty] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);

  const toggleFollow = (id: string) => {
    setFollowedUsers(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  const renderItem = (item: ActivityItem) => {
     if (item.type === 'follow') {
      return (
        <View key={item.id} style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.cardContent} 
            activeOpacity={0.7}
            onPress={() => router.push('/profile-screen/user-profile')}
          >
            <Image source={{ uri: item.user?.avatar }} style={styles.avatar} />
            <View style={styles.textContainer}>
              <Text style={[styles.mainText, { color: colors.textSecondary }]}>
                <Text style={[styles.boldText, { color: colors.text }]}>{item.user?.name}</Text> started following you
              </Text>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.time}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.followBtn, 
              followedUsers.includes(item.id) 
                ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border } 
                : { backgroundColor: colors.primary }
            ]} 
            activeOpacity={0.8}
            onPress={() => toggleFollow(item.id)}
          >
            <Text style={[
              styles.followBtnText, 
              { color: followedUsers.includes(item.id) ? colors.text : colors.background }
            ]}>
              {followedUsers.includes(item.id) ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <TouchableOpacity 
          key={item.id} 
          style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.push('/event-screen/event')}
        >
          <View style={styles.cardContent}>
            <View style={[styles.ticketIconContainer, { backgroundColor: isDark ? 'rgba(212, 176, 235, 0.1)' : 'rgba(212, 176, 235, 0.2)' }]}>
              <Ionicons name="ticket" size={20} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.mainText, { color: colors.textSecondary }]} numberOfLines={2}>
                Ticket confirmed for <Text style={[styles.boldText, { color: colors.text }]}>{item.event}</Text>
              </Text>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.time}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      );
    }
  };

  if (isEmpty) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitleCentered, { color: colors.text }]}>Activity</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: colors.card }]}>
            <Feather name="star" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Activity yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Likes, comments, follows, tickets and rewards will show up here
          </Text>
          <TouchableOpacity style={[styles.discoverBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8} onPress={() => setIsEmpty(false)}>
            <Text style={[styles.discoverBtnText, { color: colors.background }]}>Go discover something</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Activity</Text>
        <TouchableOpacity onPress={() => setIsEmpty(true)}>
          <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Today</Text>
        {TODAY_DATA.map(renderItem)}

        <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Last week</Text>
        {LAST_WEEK_DATA.map(renderItem)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
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
    fontSize: 18,
    fontWeight: "bold",
  },
  headerTitleCentered: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 16,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  mainText: {
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  followBtnText: {
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  discoverBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  discoverBtnText: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
