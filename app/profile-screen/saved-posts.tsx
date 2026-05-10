import CommentsModal from "@/components/post/CommentsModal";
import FeedPost, { PostData } from '@/components/post/FeedPost';
import ShareModal from "@/components/post/ShareModal";
import { useTheme } from '@/hooks/useTheme';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MOCK_SAVED_POSTS: PostData[] = [
  {
    id: '1',
    postType: 'standard',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    timeAgo: '2 min ago',
    caption: 'Setting up for tonight. The view from up here is unreal',
    mediaUris: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop'],
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25,
  },
  {
    id: '2',
    postType: 'standard',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
    timeAgo: '2 min ago',
    caption: 'Setting up for tonight. The view from up here is unreal',
    mediaUris: ['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop'],
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25,
  }
];

export default function SavedPostsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const handleCommentPress = () => setCommentModalVisible(true);
  const handleSharePress = () => setShareModalVisible(true);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Posts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {MOCK_SAVED_POSTS.map(post => (
          <View key={post.id} style={styles.postWrapper}>
            <FeedPost
              post={post}
              onCommentPress={handleCommentPress}
              onSharePress={handleSharePress}
            />
          </View>
        ))}
      </ScrollView>

      <CommentsModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
      />

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 80,
  },
  postWrapper: {
    marginBottom: 0,
  }
});
