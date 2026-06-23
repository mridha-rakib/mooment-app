import FeedPost, { type PostData } from '@/components/post/FeedPost';
import { useTheme } from '@/hooks/useTheme';
import { normalizeHashtag } from '@/lib/hashtags';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { getHashtagMoments } from '@/lib/moments';
import { getStorageFileUrl } from '@/lib/storage';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop';

export default function HashtagPostsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tag?: string }>();
  const tag = normalizeHashtag(typeof params.tag === 'string' ? params.tag : '');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!tag) {
      setPosts([]);
      setIsLoading(false);
      return;
    }

    try {
      const moments = await getHashtagMoments(tag, 100);
      setPosts(moments
        .map((moment) => mapMomentToPost(moment, { fallbackAvatar: FALLBACK_AVATAR, storageUrlResolver: getStorageFileUrl }))
        .filter((post): post is PostData => Boolean(post)));
    } catch {
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [tag]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  const refresh = async () => {
    setIsRefreshing(true);
    await loadPosts();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>#{tag}</Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : posts.length === 0 ? (
        <View style={styles.center}><Text style={{ color: colors.textSecondary }}>No posts found for #{tag}.</Text></View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.primary} />}>
          {posts.map((post) => <FeedPost key={post.id} post={post} />)}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  backButton: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  title: { fontSize: 18, fontWeight: '700' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  bottomSpace: { height: 40 },
});
