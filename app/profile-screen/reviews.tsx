import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {REVIEW_DATA.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.userInfo}>
                <Image source={{ uri: review.avatar }} style={styles.avatar} />
                <Text style={styles.userName}>{review.name}</Text>
              </View>
              <TouchableOpacity>
                <Feather 
                  name={review.liked ? "thumbs-up" : "thumbs-down"} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.reviewText}>{review.text}</Text>
            <Text style={styles.reviewTime}>{review.time}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  reviewCard: {
    backgroundColor: '#13131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A22',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  reviewText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  reviewTime: {
    color: '#8E8E9B',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
});
