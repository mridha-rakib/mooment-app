import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";

const MOCK_FOLLOWERS = [
  { id: '1', name: 'Dj Koko', handle: '@sdfd._dl', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isFollowing: false },
  { id: '2', name: 'Dj Koko', handle: '@sdfd._dl', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', isFollowing: false },
  { id: '3', name: 'Dj Koko', handle: '@sdfd._dl', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isFollowing: false },
];

export default function FollowersScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [followers, setFollowers] = useState(MOCK_FOLLOWERS);

  const toggleFollow = (id: string) => {
    setFollowers(followers.map(f => f.id === id ? { ...f, isFollowing: !f.isFollowing } : f));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton iconName="x" size={18} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Followers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {followers.map((user) => (
          <View key={user.id} style={[styles.userItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
              <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{user.handle}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.followBtn, 
                { backgroundColor: colors.primary },
                user.isFollowing && [styles.followingBtn, { backgroundColor: colors.card, borderColor: colors.border }]
              ]}
              onPress={() => toggleFollow(user.id)}
            >
              <Text style={[
                styles.followBtnText, 
                { color: colors.background },
                user.isFollowing && [styles.followingBtnText, { color: colors.text }]
              ]}>
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
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
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
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 12,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingBtn: {
    borderWidth: 1,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  followingBtnText: {},
});
