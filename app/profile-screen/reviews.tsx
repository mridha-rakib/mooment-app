import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from "react-native";
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";

const REVIEW_DATA = [
  {
    id: '1',
    name: 'Jane Cooper',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    text: "Doors open at 9 pm sharp. Rooftop level 7. Can't waint to see you all there tonight",
    time: "8:30pm",
    liked: true,
  },
  {
    id: '2',
    name: 'Jane Cooper',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    text: "Doors open at 9 pm sharp. Rooftop level 7. Can't waint to see you all there tonight",
    time: "8:30pm",
    liked: false,
  },
  {
    id: '3',
    name: 'Jane Cooper',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    text: "Doors open at 9 pm sharp. Rooftop level 7. Can't waint to see you all there tonight",
    time: "8:30pm",
    liked: true,
  },
];

export default function ReviewsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {REVIEW_DATA.map((review) => (
          <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reviewHeader}>
              <View style={styles.userInfo}>
                <Image source={{ uri: review.avatar }} style={styles.avatar} />
                <Text style={[styles.userName, { color: colors.text }]}>{review.name}</Text>
              </View>
              <TouchableOpacity>
                <Feather 
                  name={review.liked ? "thumbs-up" : "thumbs-down"} 
                  size={16} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reviewText, { color: colors.text }]}>{review.text}</Text>
            <Text style={[styles.reviewTime, { color: colors.textSecondary }]}>{review.time}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  reviewTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
});
