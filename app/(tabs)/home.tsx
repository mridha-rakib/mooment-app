import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

// Components
import StoryCarousel, { StoryData } from "../../components/StoryCarousel";
import FeedPost, { PostData } from "../../components/FeedPost";
import LiveChatBanner from "../../components/LiveChatBanner";

const { width } = Dimensions.get("window");

// Dynamic Mock Data
const MOCK_STORIES: StoryData[] = [
  { id: '1', type: 'add' },
  { id: '2', type: 'live', imageUri: 'https://images.unsplash.com/photo-1540039155732-68420e6e72ca?q=80&w=200&auto=format&fit=crop' },
  { id: '3', type: 'standard', title: 'Enjoying\nsummer', imageUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop' },
  { id: '4', type: 'standard', title: 'First\nday @office', imageUri: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=200&auto=format&fit=crop' },
  { id: '5', type: 'muted', imageUri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&auto=format&fit=crop' },
];

const MOCK_POSTS: PostData[] = [
  {
    id: 'p1',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    caption: 'Setting up for tonight. The view from up here is unreal',
    mediaUris: [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop'
    ],
    ticketsCount: 5,
    likedBy: 'DJ Mahi, Keka Ferdousi...3+ more',
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25
  },
  {
    id: 'p2',
    authorName: 'Sarah Jenna',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
    timeAgo: '1 hr ago',
    caption: 'Beach days are the best days 🌊 Can\'t wait to go back to this amazing resort next month. Who wants to join?',
    mediaUris: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=1000&auto=format&fit=crop'
    ],
    likesCount: 142,
    commentsCount: 12
  }
];

export default function HomeFeed() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Navigation */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.feedBtn} activeOpacity={0.8}>
            <View style={styles.greenDot} />
            <Text style={styles.feedText}>Feed</Text>
            <Feather name="chevron-down" size={14} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.logoText}>Mooment</Text>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
              <Feather name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
              <Feather name="sliders" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Feed Content */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Dynamic Stories Component */}
          <StoryCarousel stories={MOCK_STORIES} />

          {/* Dynamic Feed Posts Components */}
          {MOCK_POSTS.map((post) => (
            <React.Fragment key={post.id}>
              <FeedPost post={post} />
              
              {/* Insert LiveChatBanner after the Dj Koko post to match screenshot exactly */}
              {post.id === 'p1' && (
                <LiveChatBanner 
                  title="Pre-show chat with DJ Nova"
                  listeningCount={412}
                  avatars={[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=150&auto=format&fit=crop'
                  ]}
                />
              )}
            </React.Fragment>
          ))}

          {/* Additional padding at the bottom of feed */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 60,
  },
  feedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DB46D",
    marginRight: 6,
  },
  feedText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginRight: 4,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "serif",
    fontStyle: "italic",
    position: 'absolute',
    left: width / 2 - 45,
  },
  headerIcons: {
    flexDirection: "row",
  },
  iconBtn: {
    marginLeft: 20,
  },
});
