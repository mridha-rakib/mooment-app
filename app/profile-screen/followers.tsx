import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MOCK_FOLLOWERS = [
  { id: '1', name: 'Dj Koko', handle: '@sdfd._dl', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isFollowing: false },
  { id: '2', name: 'Dj Koko', handle: '@sdfd._dl', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', isFollowing: false },
  { id: '3', name: 'Dj Koko', handle: '@sdfd._dl', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isFollowing: false },
];

export default function FollowersScreen() {
  const router = useRouter();
  const [followers, setFollowers] = useState(MOCK_FOLLOWERS);

  const toggleFollow = (id: string) => {
    setFollowers(followers.map(f => f.id === id ? { ...f, isFollowing: !f.isFollowing } : f));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <BlurView intensity={20} tint="dark" style={styles.closeCircle}>
            <Feather name="x" size={18} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {followers.map((user) => (
          <View key={user.id} style={styles.userItem}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userHandle}>{user.handle}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.followBtn, user.isFollowing && styles.followingBtn]} 
              onPress={() => toggleFollow(user.id)}
            >
              <Text style={[styles.followBtnText, user.isFollowing && styles.followingBtnText]}>
                {user.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
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
  closeBtn: {},
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A22',
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E85B81', // pinkish-red from screenshot
    padding: 2,
    marginRight: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userHandle: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  followBtn: {
    backgroundColor: '#B2ABBA', // Light purple-grey
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingBtn: {
    backgroundColor: '#13131A',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  followBtnText: {
    color: '#0e0d12',
    fontSize: 12,
    fontWeight: 'bold',
  },
  followingBtnText: {
    color: '#FFFFFF',
  },
});
