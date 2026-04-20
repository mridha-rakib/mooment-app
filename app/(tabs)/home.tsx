import React from "react";
import { Dimensions, Platform, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

// Components
import FeaturedProducts, { ProductData } from "../../components/FeaturedProducts";
import FeedPost, { PostData } from "../../components/FeedPost";
import HighlightsCarousel, { HighlightData } from "../../components/HighlightsCarousel";
import HomeHeader from "../../components/HomeHeader";
import LiveChatBanner from "../../components/LiveChatBanner";
import PeopleToFollow, { SuggestedUser } from "../../components/PeopleToFollow";
import StoryCarousel, { StoryData } from "../../components/StoryCarousel";

const { width } = Dimensions.get("window");

// Dynamic Mock Data
const MOCK_STORIES: StoryData[] = [
  { id: '1', type: 'add' },
  { id: '2', type: 'live', imageUri: 'https://images.unsplash.com/photo-1540039155732-68420e6e72ca?q=80&w=200&auto=format&fit=crop' },
  { id: '3', type: 'standard', title: 'Enjoying\nsummer', imageUri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop' },
  { id: '4', type: 'standard', title: 'First\nday @office', imageUri: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=200&auto=format&fit=crop' },
  { id: '5', type: 'muted', imageUri: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&auto=format&fit=crop' },
];

const MOCK_SUGGESTED_USERS: SuggestedUser[] = [
  { id: '1', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
  { id: '4', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
  { id: '5', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=150&auto=format&fit=crop' },
   { id: '6', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
  { id: '7', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop' },
  { id: '8', name: 'Mavrick Rick', avatarUri: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=150&auto=format&fit=crop' },
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

// Posts perfectly matching all user screenshots combined!
const MOCK_POSTS: PostData[] = [
  {
    id: 'p_audio',
    postType: 'audio',
    authorName: 'Brooklyn Simmons',
    authorContextNodes: [
      { text: ' with ', type: 'muted' },
      { text: 'Ketty Perera', type: 'bold' },
      { text: ' at ', type: 'muted' },
      { text: 'Rooftop Series Vol.4', type: 'bold' }
    ],
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    caption: 'Behind the scenes at Saturday market',
    mediaUris: [],
    audioDetails: {
      duration: '2:13',
      currentTime: '0:47'
    },
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25
  },
  {
    id: 'p_text',
    postType: 'standard', // no media means it's a Text post effectively
    authorName: 'Tuval Mor',
    authorContextNodes: [
      { text: ' with ', type: 'muted' },
      { text: 'Ketty Perera', type: 'bold' }
    ],
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    isFollowing: true,
    timeAgo: '2 min ago',
    caption: 'Behind the scenes at Saturday market',
    mediaUris: [],
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25
  },
  {
    id: 's_post1',
    headerLabel: 'Suggested to follow this person',
    postType: 'standard',
    authorName: 'Giden Xenog',
    authorAvatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
    timeAgo: '3 min ago',
    caption: 'Behind the scenes at Saturday market',
    mediaUris: [],
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25
  },
  {
    id: 's_post2',
    postType: 'product',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    mediaUris: [
      'https://images.unsplash.com/photo-1629198688000-71f23e7456cc?q=80&w=1000&auto=format&fit=crop', 
      'https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=1000&auto=format&fit=crop', 
      'https://images.unsplash.com/photo-1608248593802-8eb3a69466be?q=80&w=1000&auto=format&fit=crop'  
    ],
    productDetails: {
      title: 'Medusa Skin Whitening Cream',
      price: '£28',
      buttonText: 'View'
    }
  },
  {
    id: 's_post3',
    headerLabel: 'Nearby Events you can join',
    postType: 'event',
    authorName: 'Dj Koko',
    authorContextNodes: [
      { text: ' hosting ', type: 'muted' },
      { text: 'Rooftop Session Vol.4', type: 'bold' },
      { text: ' event', type: 'muted' },
    ],
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '3 min ago',
    mediaUris: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop' 
    ],
    eventDetails: {
      isLive: true,
      tags: [
        { label: 'Music Party', bg: '#FFFFFF', color: '#000000' },
        { label: 'Busy', bg: '#E06B3B', color: '#FFFFFF' }
      ],
      title: 'Rooftop Session Vol.4',
      datetime: 'Sat, Sep 9 • 9:00 - 4:00 PM',
      distance: '0.3mi',
      attendeesAvatars: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop'
      ],
      attendeesCount: 41,
      priceLabel: '£45'
    },
    likesCount: 95,
    commentsCount: 28,
    sharesCount: 95
  },
  {
    id: 's_post4',
    postType: 'standard',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '3 min ago',
    caption: 'Just launched! Introducing LuminaGlow, our new skin-brightening cream. Get yours today!',
    mediaUris: [
      'https://images.unsplash.com/photo-1629198688000-71f23e7456cc?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1608248593802-8eb3a69466be?q=80&w=1000&auto=format&fit=crop' 
    ],
    likesCount: 95,
    commentsCount: 28,
    sharesCount: 95
  },
  {
    id: 's_post5',
    headerLabel: 'Product you may like',
    postType: 'product',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    mediaUris: [
      'https://images.unsplash.com/photo-1629198688000-71f23e7456cc?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1608248593802-8eb3a69466be?q=80&w=1000&auto=format&fit=crop'
    ],
    productDetails: {
      title: 'Medusa Skin Whitening Cream',
      price: '£28',
      buttonText: 'View'
    }
  },
  {
    id: 's_post6',
    postType: 'standard',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop',
    timeAgo: '2 min ago',
    caption: 'Setting up for tonight. The view from up here is unreal',
    isExpandable: true, // Trigger expand icon and 1/12 position shown in screenshot!
    mediaUris: [
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop'
    ],
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
  | { type: 'highlights'; id: string; data: HighlightData[] }
  | { type: 'suggested_users'; id: string; data: SuggestedUser[] };

const MOCK_FEED: FeedItem[] = [
  // --- PART 1: The "Previous" Combined Designs ---
  { type: 'post', id: 'f_audio', data: MOCK_POSTS[0] }, // Audio Post
  { type: 'post', id: 'f_text', data: MOCK_POSTS[1] }, // Text Post
  { type: 'suggested_users', id: 'f_sug', data: MOCK_SUGGESTED_USERS }, // Horizontal Users
  { 
    type: 'live_chat', 
    id: 'f_live', 
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
  { type: 'featured_products', id: 'f_products', data: MOCK_PRODUCTS }, // Product Carousel
  { type: 'highlights', id: 'f_highlights', data: MOCK_HIGHLIGHTS }, // Rings Carousel

  // --- PART 2: The Exact Seamless Sequence from the Screenshot ---
  { type: 'post', id: 's1', data: MOCK_POSTS[2] }, // "Suggested to follow this person" post
  { type: 'post', id: 's2', data: MOCK_POSTS[3] }, // Product Post (Medusa Cream)
  { type: 'post', id: 's3', data: MOCK_POSTS[4] }, // Event Post (Rooftop Session)
  { type: 'post', id: 's4', data: MOCK_POSTS[5] }, // Standard Post (LuminaGlow)
  { type: 'post', id: 's5', data: MOCK_POSTS[6] }, // Product Post 2
  { type: 'post', id: 's6', data: MOCK_POSTS[7] }, // Standard Laser Room Post (with Expand icon!)
];

export default function HomeFeed() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Navigation */}
        <HomeHeader />

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
            if (item.type === 'suggested_users') {
              return <PeopleToFollow key={item.id} users={item.data} />;
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
});
