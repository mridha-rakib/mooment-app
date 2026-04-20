import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

// Components
import StoryCarousel, { StoryData } from "../../components/StoryCarousel";
import FeedPost, { PostData } from "../../components/FeedPost";
import LiveChatBanner from "../../components/LiveChatBanner";
import FeaturedProducts, { ProductData } from "../../components/FeaturedProducts";
import HighlightsCarousel, { HighlightData } from "../../components/HighlightsCarousel";

const { width } = Dimensions.get("window");

// Dynamic Mock Data
const MOCK_STORIES: StoryData[] = [
  { id: '1', type: 'add' },
  { id: '2', type: 'live', imageUri: 'https://images.unsplash.com/photo-1540039155732-68420e6e72ca?q=80&w=200&auto=format&fit=crop' },
  { id: '3', type: 'standard', title: 'Enjoying\nsummer', imageUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop' },
  { id: '4', type: 'standard', title: 'First\nday @office', imageUri: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=200&auto=format&fit=crop' },
  { id: '5', type: 'muted', imageUri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&auto=format&fit=crop' },
];

const MOCK_HIGHLIGHTS: HighlightData[] = [
  { id: '1', title: 'Birthday\nParty', imageUri: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=200&auto=format&fit=crop', ringColor: '#B624A9' },
  { id: '2', title: 'Enjoying\nsummer', imageUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop', ringColor: '#42B0D5' },
  { id: '3', title: 'First\nday @office', imageUri: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=200&auto=format&fit=crop', ringColor: '#C4708A' },
  { id: '4', title: 'Birthday\nParty', imageUri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=200&auto=format&fit=crop', ringColor: '#D4B0EB' },
  { id: '5', title: 'Day Out', imageUri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=200&auto=format&fit=crop', ringColor: '#B624A9' },
];

const MOCK_PRODUCTS: ProductData[] = [
  { id: '1', title: 'T-Shirt', brand: 'DJ Loko', price: '£28', imageUri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop' },
  { id: '2', title: 'Overalls', brand: 'DJ Loko', price: '£28', imageUri: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=200&auto=format&fit=crop' },
  { id: '3', title: 'T-Shirt', brand: 'DJ Loko', price: '£28', imageUri: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=200&auto=format&fit=crop' },
  { id: '4', title: 'Dress', brand: 'DJ Loko', price: '£55', imageUri: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80&w=200&auto=format&fit=crop' },
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
  },
  {
    id: 'p3',
    headerLabel: 'Nearby Events going on',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    isPublic: true,
    mediaUris: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop'
    ],
    eventDetails: {
      isLive: true,
      tags: [
        { label: 'Music Party', bg: '#FFFFFF', color: '#000000' },
        { label: 'Busy', bg: '#FFFFFF', color: '#F2545B' }
      ],
      title: 'Rooftop Session Vol.4',
      datetime: 'Sat, Sep 9 • 9:00 - 4:00 PM',
      distance: '0.3mi',
      attendeesAvatars: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop'
      ],
      attendeesCount: 41
    },
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25
  }
];

// Feed Engine - Polymorphic Architecture
type FeedItem = 
  | { type: 'post'; id: string; data: PostData }
  | { type: 'live_chat'; id: string; data: any }
  | { type: 'featured_products'; id: string; data: ProductData[] }
  | { type: 'highlights'; id: string; data: HighlightData[] };

const MOCK_FEED: FeedItem[] = [
  { type: 'post', id: 'f1', data: MOCK_POSTS[0] }, // Dj Koko standard post
  { 
    type: 'live_chat', 
    id: 'f2', 
    data: { 
      contextBold: 'Dickenson, Johnson',
      contextNormal: 'are on the live room',
      title: 'Pre-show chat with DJ Nova',
      listeningCount: 412,
      avatars: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=150&auto=format&fit=crop'
      ]
    }
  },
  { type: 'featured_products', id: 'f3', data: MOCK_PRODUCTS },
  { type: 'post', id: 'f4', data: MOCK_POSTS[1] }, // Sarah Jenna post
  { type: 'post', id: 'f5', data: MOCK_POSTS[2] }, // Dj Koko Event post
  { type: 'highlights', id: 'f6', data: MOCK_HIGHLIGHTS }
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

          {/* Core Polymorphic Feed Engine */}
          {MOCK_FEED.map((item) => {
            if (item.type === 'post') {
              return <FeedPost key={item.id} post={item.data} />;
            }
            if (item.type === 'live_chat') {
              return <LiveChatBanner key={item.id} {...item.data} />;
            }
            if (item.type === 'featured_products') {
              return <FeaturedProducts key={item.id} products={item.data} />;
            }
            if (item.type === 'highlights') {
              return <HighlightsCarousel key={item.id} highlights={item.data} />;
            }
            return null;
          })}

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
