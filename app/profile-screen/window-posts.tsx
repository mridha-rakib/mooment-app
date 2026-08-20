import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import { getUserProfileWindowPosts, type ProfileWindowPostResponse } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 20;
const EVENT_WINDOW_VIDEO_ENABLED = false;

const formatPostedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
};

const formatWindowRange = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const resolveAuthorAvatarUri = (author?: ProfileWindowPostResponse["author"]) => {
  if (author?.avatarUrl?.trim()) {
    return author.avatarUrl.trim();
  }

  if (!author?.avatarKey) {
    return null;
  }

  try {
    return getStorageFileUrl(author.avatarKey);
  } catch {
    return null;
  }
};

function ProfileWindowVideoDisabled() {
  return (
    <View style={[styles.media, styles.mediaFallback]}>
      <Feather name="video-off" size={22} color="#8E8E9B" />
    </View>
  );
}

function ProfileWindowAudio({ uri, headers }: { uri: string; headers?: Record<string, string> }) {
  const source = useMemo(() => ({ uri, headers }), [headers, uri]);
  const player = useAudioPlayer(source, { downloadFirst: false, updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : 0;
  const currentTime = duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration - 0.25) await player.seekTo(0);
    player.play();
  };

  return (
    <TouchableOpacity style={styles.audioPlayer} onPress={() => void toggle()}>
      <View style={styles.audioPlayButton}>
        <Feather name={status.playing ? "pause" : "play"} size={17} color="#FFFFFF" />
      </View>
      <View style={styles.audioTrack}>
        <View style={[styles.audioProgress, { width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }]} />
      </View>
      <Text style={styles.audioTime}>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileWindowPostsScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ userId?: string; eventId?: string; title?: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const mediaRequestHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );
  const [posts, setPosts] = useState<ProfileWindowPostResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!params.userId || !params.eventId) {
      setLoadError("Profile Windows unavailable.");
      setIsLoading(false);
      return;
    }

    if (append) setIsLoadingMore(true); else setIsLoading(true);
    setLoadError(null);

    try {
      const result = await getUserProfileWindowPosts(params.userId, params.eventId, { page: nextPage, limit: PAGE_SIZE });
      setPosts((current) => (append ? [...current, ...result.posts] : result.posts));
      setPage(nextPage);
      setHasMore(Boolean(result.pagination && result.pagination.page < result.pagination.totalPages));
    } catch (error) {
      setLoadError(getAuthErrorMessage(error, "Unable to load Window posts."));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [params.eventId, params.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const renderPost = ({ item }: { item: ProfileWindowPostResponse }) => {
    const windowTime = formatWindowRange(item.window.startsAt, item.window.endsAt);
    const avatarUri = resolveAuthorAvatarUri(item.author);

    return (
      <View style={[styles.post, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.postHeader}>
          <UserAvatar
            uri={avatarUri}
            name={avatarUri ? item.author?.name : null}
            size={30}
            style={styles.participantAvatar}
            iconSize={15}
          />
          <View style={styles.postMeta}>
            <Text style={[styles.participantName, { color: colors.text }]}>Profile post</Text>
            <Text style={[styles.postedAt, { color: colors.textSecondary }]}>{formatPostedAt(item.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.windowContext, { borderColor: colors.border }]}>
          <Text style={[styles.windowTitle, { color: colors.text }]} numberOfLines={1}>
            {item.window.title?.trim() || "Untitled window"}
          </Text>
          {windowTime ? <Text style={[styles.windowTime, { color: colors.textSecondary }]}>{windowTime}</Text> : null}
        </View>
        {item.text ? <Text style={[styles.postText, { color: colors.text }]}>{item.text}</Text> : null}
        {item.mediaItems.map((media, index) => {
          if (!media.url) return null;
          if (media.type === "image") {
            return <Image key={`${item.id}-${index}`} source={{ uri: media.url, headers: mediaRequestHeaders }} style={styles.media} contentFit="cover" />;
          }
          if (media.type === "video") {
            return EVENT_WINDOW_VIDEO_ENABLED
              ? null
              : <ProfileWindowVideoDisabled key={`${item.id}-${index}`} />;
          }
          return <ProfileWindowAudio key={`${item.id}-${index}`} uri={media.url} headers={mediaRequestHeaders} />;
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={18} />
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {params.title?.trim() || "Window posts"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : loadError ? (
        <View style={styles.emptyState}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void load()}>
            <Feather name="refresh-cw" size={16} color={colors.text} />
            <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={posts.length === 0 ? styles.emptyListContent : styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} tintColor={colors.primary} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!hasMore || isLoadingMore) return;
            void load(page + 1, true);
          }}
          ListEmptyComponent={<Text style={[styles.emptyGalleryText, { color: colors.textSecondary }]}>No posts available.</Text>}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.textSecondary} style={styles.footerLoader} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "bold", marginHorizontal: 8 },
  loading: { marginVertical: 48 },
  content: { padding: 16, paddingBottom: 100 },
  emptyListContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 30, gap: 10 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  retryButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 6 },
  retryText: { fontSize: 14, fontWeight: "600" },
  post: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 14 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  participantAvatar: { width: 30, height: 30, borderRadius: 15 },
  postMeta: { flex: 1 },
  participantName: { fontSize: 13, fontWeight: "700" },
  postedAt: { fontSize: 11.5, marginTop: 1 },
  windowContext: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 9, marginBottom: 10 },
  windowTitle: { fontSize: 13, fontWeight: "700" },
  windowTime: { fontSize: 11.5, marginTop: 2 },
  postText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  media: { width: "100%", aspectRatio: 1, borderRadius: 8, marginTop: 8, overflow: "hidden" },
  mediaFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#1F1F27" },
  audioPlayer: { marginTop: 8, minHeight: 46, borderRadius: 8, backgroundColor: "#1F1F27", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 10 },
  audioPlayButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#AC86D4", alignItems: "center", justifyContent: "center" },
  audioTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#3A3A45", overflow: "hidden" },
  audioProgress: { height: "100%", backgroundColor: "#AC86D4" },
  audioTime: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyGalleryText: { textAlign: "center" },
  footerLoader: { paddingVertical: 18 },
});
