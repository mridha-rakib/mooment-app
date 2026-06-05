import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

const INITIAL_REVIEWS = [
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

type Review = (typeof INITIAL_REVIEWS)[number];
type ReviewCardProps = {
  colors: ReturnType<typeof useTheme>["colors"];
  onOpenProfile: () => void;
  onToggleLike: (id: string) => void;
  review: Review;
};

function ReviewCard({ colors, onOpenProfile, onToggleLike, review }: ReviewCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggleLike = () => {
    scale.value = withSequence(
      withSpring(1.4, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 }),
    );
    onToggleLike(review.id);
  };

  return (
    <View style={[styles.reviewCard, { backgroundColor: "#111112", borderColor: colors.border }]}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity style={styles.userInfo} onPress={onOpenProfile} activeOpacity={0.7}>
          <Image source={{ uri: review.avatar }} style={styles.avatar} />
          <Text style={[styles.userName, { color: colors.text }]}>{review.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleToggleLike} activeOpacity={0.7}>
          <Animated.View style={animatedStyle}>
            <Feather
              name={review.liked ? "thumbs-up" : "thumbs-down"}
              size={16}
              color={review.liked ? colors.primary : colors.text}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onOpenProfile} activeOpacity={0.7}>
        <Text style={[styles.reviewText, { color: colors.text }]}>{review.text}</Text>
      </TouchableOpacity>
      <Text style={[styles.reviewTime, { color: colors.textSecondary }]}>{review.time}</Text>
    </View>
  );
}

export default function ReviewsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);

  const toggleLike = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviews(prev => prev.map(r => r.id === id ? { ...r, liked: !r.liked } : r));
  };

  const openProfile = () => router.push('/profile-screen/user-profile');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reviews </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {reviews.map((review) => (
          <ReviewCard
            colors={colors}
            key={review.id}
            onOpenProfile={openProfile}
            onToggleLike={toggleLike}
            review={review}
          />
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
