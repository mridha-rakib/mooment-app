import { Feather, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FeedPost, { PostData } from "./FeedPost";

const { width } = Dimensions.get("window");

export type UserProfileData = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  stats: {
    posts: number;
    reviews: number;
    followers: number;
    following: number;
  };
};

type ProfileViewProps = {
  user: UserProfileData;
  posts: PostData[];
  isOwnProfile?: boolean;
};

export default function ProfileView({ user, posts, isOwnProfile = false }: ProfileViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'shop'>('feed');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <BlurView intensity={20} tint="dark" style={styles.glassCircle}>
            <Feather name="chevron-left" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
          <BlurView intensity={20} tint="dark" style={styles.glassCircle}>
            <Feather name="more-horizontal" size={20} color="#FFFFFF" />
          </BlurView>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{user.stats.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{user.stats.reviews}</Text>
                <Text style={styles.statLabel}>Reviews</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{user.stats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{user.stats.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          <View style={styles.bioContainer}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>{user.handle}</Text>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8}>
              <BlurView intensity={20} tint="dark" style={styles.chatBtnGlass}>
                <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#FFFFFF" />
              </BlurView>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
              <Text style={styles.followBtnText}>{isOwnProfile ? 'Edit Profile' : 'Follow'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'feed' && styles.activeTab]} 
            onPress={() => setActiveTab('feed')}
          >
            <Feather name="home" size={20} color={activeTab === 'feed' ? '#FFFFFF' : '#8E8E9B'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'events' && styles.activeTab]} 
            onPress={() => setActiveTab('events')}
          >
            <Feather name="calendar" size={20} color={activeTab === 'events' ? '#FFFFFF' : '#8E8E9B'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'shop' && styles.activeTab]} 
            onPress={() => setActiveTab('shop')}
          >
            <Feather name="shopping-bag" size={20} color={activeTab === 'shop' ? '#FFFFFF' : '#8E8E9B'} />
          </TouchableOpacity>
        </View>

        {/* Feed Content */}
        <View style={styles.feedContainer}>
          {activeTab === 'feed' ? (
            posts.map((post) => (
              <FeedPost 
                key={post.id} 
                post={post} 
                onCommentPress={() => {}} 
                onSharePress={() => {}} 
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No content in this category yet.</Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  glassCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backBtn: {},
  moreBtn: {},
  
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatarBorder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FF7D54', // Orange border from screenshot
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8E8E9B',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A3A',
  },
  
  bioContainer: {
    marginTop: 15,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  handle: {
    color: '#8E8E9B',
    fontSize: 13,
    marginTop: 2,
  },
  bioText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  chatBtn: {
    width: 48,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chatBtnGlass: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#B2ABBA', // Lavender color from screenshot
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnText: {
    color: '#0e0d12',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  tabContainer: {
    flexDirection: 'row',
    marginTop: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A22',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  
  feedContainer: {
    paddingTop: 10,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E9B',
    textAlign: 'center',
  }
});
