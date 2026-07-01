import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedPost, { type PostData } from '@/components/post/FeedPost';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { getMoment, type MomentInteractionSummary } from '@/lib/moments';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { safeBack } from '@/lib/navigation';
import { getStorageFileUrl } from '@/lib/storage';

export default function ViewPostScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!postId) {
      setError('This post is unavailable.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const moment = await getMoment(postId);
      const mapped = mapMomentToPost(moment, { storageUrlResolver: getStorageFileUrl });
      if (!mapped) throw new Error('This post has no displayable content.');
      setPost(mapped);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError, 'This post was deleted, is private, or is unavailable.'));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { void loadPost(); }, [loadPost]);

  const applyInteraction = (id: string, summary: MomentInteractionSummary) => {
    setPost((current) => current?.id === id ? {
      ...current,
      likesCount: summary.likesCount,
      commentsCount: summary.commentsCount,
      sharesCount: summary.sharesCount,
      isLiked: summary.isLiked,
    } : current);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack(router, '/(tabs)/home')} style={[styles.back, { borderColor: colors.border }]}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Post</Text>
        <View style={styles.headerSpacer} />
      </View>
      {loading ? <ActivityIndicator style={styles.center} color={colors.primary} /> : post ? (
        <FeedPost post={post} onInteractionChange={applyInteraction} />
      ) : (
        <View style={styles.center}>
          <Feather name="alert-circle" size={30} color={colors.textSecondary} />
          <Text style={[styles.error, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={loadPost}><Text style={[styles.retry, { color: colors.primary }]}>Try again</Text></TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 38 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  error: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  retry: { fontSize: 14, fontWeight: '700' },
});
