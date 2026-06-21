import CommentsModal from "@/components/post/CommentsModal";
import FeedPost, { PostData } from '@/components/post/FeedPost';
import ShareModal from "@/components/post/ShareModal";
import { useTheme } from '@/hooks/useTheme';
import { getSavedMoments } from '@/lib/moments';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FALLBACK_AVATAR = 'https://ui-avatars.com/api/?name=User&background=888&color=fff&size=200';

export default function SavedPostsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePost, setActivePost] = useState<PostData | null>(null);

  const loadSavedPosts = useCallback(async () => {
    setIsLoading(true);

    try {
      const moments = await getSavedMoments();
      const mapped = moments
        .map((moment) => mapMomentToPost(moment, { fallbackAvatar: FALLBACK_AVATAR }))
        .filter((post): post is PostData => post !== null);

      setPosts(mapped);
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSavedPosts();
  }, [loadSavedPosts]);

  const handleCommentPress = (post: PostData) => {
    setActivePost(post);
    setCommentModalVisible(true);
  };

  const handleSharePress = (post: PostData) => {
    setActivePost(post);
    setShareModalVisible(true);
  };

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
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centerState}>
            <Feather name="bookmark" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No saved posts yet</Text>
          </View>
        ) : (
          posts.map(post => (
            <View key={post.id} style={styles.postWrapper}>
              <FeedPost
                post={post}
                onCommentPress={handleCommentPress}
                onSharePress={handleSharePress}
              />
            </View>
          ))
        )}
      </ScrollView>

      <CommentsModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        momentId={activePost?.id}
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
  },
  centerState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
