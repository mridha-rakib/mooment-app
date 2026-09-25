import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getEventWindowPosts, type EventWindowPost } from "@/lib/eventWindows";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import UserAvatar from "@/components/ui/UserAvatar";
import { Feather } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Video is intentionally disabled project-wide (see
// AttendeeEventWindowsTab#EVENT_WINDOW_VIDEO_ENABLED) — this gallery never
// enables it independently. A short, self-contained duplicate of the same
// disabled-placeholder/audio-player pattern is used here rather than
// exporting internals out of AttendeeEventWindowsTab, to avoid touching that
// already-tested component for this unrelated navigation surface.
const EVENT_WINDOW_VIDEO_ENABLED = false;

function GalleryVideoDisabled() {
  return (
    <View style={[styles.media, styles.mediaFallback]}>
      <Feather name="video-off" size={22} color="#8E8E9B" />
    </View>
  );
}

function GalleryAudio({ uri, headers }: { uri: string; headers?: Record<string, string> }) {
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

const formatPostedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
};

const resolveAuthorAvatarUri = (author?: EventWindowPost["author"]) => {
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

export default function WindowGalleryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ eventId: string; windowId: string; title?: string }>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const mediaRequestHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  const [posts, setPosts] = useState<EventWindowPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (cursor: string | null = null) => {
    if (cursor) setIsLoadingMore(true); else setIsLoading(true);
    setLoadError(null);
    try {
      const page = await getEventWindowPosts(params.eventId, params.windowId, { cursor });
      setPosts((current) => (cursor ? [...current, ...page.posts] : page.posts));
      setNextCursor(page.nextCursor);
    } catch (error) {
      // The backend independently re-verifies access here
      // (ensureCanViewWindowPosts) regardless of what the participation
      // list showed — a 403 surfaces as this same error state, not a crash.
      setLoadError(getAuthErrorMessage(error, "Unable to load this scene's gallery."));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [params.eventId, params.windowId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {params.title?.trim() || "Scene gallery"}
        </Text>
        <View style={styles.headerPlaceholder} />
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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {posts.length === 0 ? (
            <Text style={[styles.emptyGalleryText, { color: colors.textSecondary }]}>No posts available.</Text>
          ) : posts.map((post) => {
            const avatarUri = resolveAuthorAvatarUri(post.author);

            return (
            <View key={post.id} style={[styles.post, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
              <View style={styles.postHeader}>
                <UserAvatar
                  uri={avatarUri}
                  name={avatarUri ? post.author?.name : null}
                  size={32}
                  style={styles.participantAvatar}
                  iconSize={15}
                />
                <View style={styles.postMeta}>
                  <Text style={[styles.participantName, { color: colors.text }]}>
                    {post.userId === currentUserId ? "You" : "Participant"}
                  </Text>
                  <Text style={[styles.postedAt, { color: colors.textSecondary }]}>{formatPostedAt(post.createdAt)}</Text>
                </View>
              </View>
              {post.text ? <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text> : null}
              {post.mediaItems.map((media, index) => {
                if (!media.url) return null;
                if (media.type === "image") {
                  return <Image key={`${post.id}-${index}`} source={{ uri: media.url, headers: mediaRequestHeaders }} style={styles.media} contentFit="cover" />;
                }
                if (media.type === "video") {
                  // EVENT_WINDOW_VIDEO_ENABLED is always false project-wide
                  // right now, so this always takes the disabled branch —
                  // kept as a real conditional (not a bare call) so
                  // re-enabling video is still the same single-flag flip
                  // used everywhere else, not a second code path to remember.
                  return EVENT_WINDOW_VIDEO_ENABLED
                    ? null
                    : <GalleryVideoDisabled key={`${post.id}-${index}`} />;
                }
                return <GalleryAudio key={`${post.id}-${index}`} uri={media.url} headers={mediaRequestHeaders} />;
              })}
            </View>
            );
          })}

          {nextCursor ? (
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.border, alignSelf: "center" }]}
              onPress={() => void load(nextCursor)}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={[styles.retryText, { color: colors.text }]}>Load more</Text>}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { alignItems: "center", borderRadius: 10, height: 36, justifyContent: "center", width: 36 },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", marginHorizontal: 8 },
  headerPlaceholder: { width: 36 },
  loading: { marginVertical: 48 },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 30, gap: 10 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  emptyGalleryText: { fontSize: 13, textAlign: "center", paddingVertical: 24 },
  retryButton: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 6 },
  retryText: { fontSize: 14, fontWeight: "600" },
  content: { padding: 20, paddingBottom: 60, gap: 12 },
  post: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  participantAvatar: { width: 32, height: 32, borderRadius: 16 },
  postMeta: { flex: 1 },
  participantName: { fontSize: 13, fontWeight: "700" },
  postedAt: { fontSize: 11, marginTop: 2 },
  postText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  media: { width: "100%", aspectRatio: 1.25, borderRadius: 6, overflow: "hidden", backgroundColor: "#111111", marginTop: 4 },
  mediaFallback: { alignItems: "center", justifyContent: "center" },
  audioPlayer: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#202024", marginTop: 4 },
  audioPlayButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#6B4E71" },
  audioTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: "#50505A" },
  audioProgress: { height: "100%", backgroundColor: "#FFFFFF" },
  audioTime: { color: "#D0D0D8", fontSize: 11, fontVariant: ["tabular-nums"] },
});
