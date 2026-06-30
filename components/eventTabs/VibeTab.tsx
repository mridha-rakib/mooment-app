import { useTheme } from "@/hooks/useTheme";
import { getEventMoments } from "@/lib/moments";
import type { Moment } from "@/lib/moments";
import HashtagText from '@/components/post/HashtagText';
import PostInteractionBar from '@/components/post/PostInteractionBar';
import { getStorageFileUrl } from "@/lib/storage";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CinematicButton from "../ui/CinematicButton";
import UserAvatar from "../ui/UserAvatar";
// SegmentedControl hidden — preserved for future restoration
// import SegmentedControl from "../ui/SegmentedControl";
const { width } = Dimensions.get("window");

const NOW_MODE_LOOKAHEAD_MS = 3 * 60 * 60 * 1000;
const ACTIVE_EVENT_WINDOW_MS = 12 * 60 * 60 * 1000;

type PostTagStatus = "live" | "active" | "upcoming" | "ended";

const computePostTagStatus = (scheduledAt?: string | null): PostTagStatus => {
  if (!scheduledAt) return "upcoming";
  const scheduled = new Date(scheduledAt).getTime();
  const now = Date.now();
  if (scheduled > now) return "upcoming";
  if (now - scheduled <= NOW_MODE_LOOKAHEAD_MS) return "live";
  if (now - scheduled <= ACTIVE_EVENT_WINDOW_MS) return "active";
  return "ended";
};

const formatTimeAgo = (createdAt: string): string => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const resolveMediaUrl = (moment: Moment): string | null => {
  const first = moment.mediaItems?.[0];
  if (!first) return null;
  if (first.url) return first.url;
  if (first.storageKey) {
    try {
      return getStorageFileUrl(first.storageKey);
    } catch {
      return null;
    }
  }
  return null;
};

const ROOMS_DATA = [
  {
    id: "1",
    title: "Pre-show chat with DJ Nova",
    host: "DJ Nova",
    hostAvatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    listeners: "412",
    isHost: true,
  },
  {
    id: "2",
    title: "Pre-show chat with DJ Nova",
    host: "DJ Nova",
    hostAvatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    listeners: "412",
    isHost: false,
  },
];

type VibeTabProps = {
  eventId: string;
  eventName: string;
  isHostMode: boolean;
  isParticipant?: boolean;
  scheduledAt?: string | null;
};

const VibeTab = ({ eventId, eventName, isHostMode, isParticipant = false, scheduledAt }: VibeTabProps) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isMomentsLoading, setIsMomentsLoading] = useState(false);

  const postTagStatus = computePostTagStatus(scheduledAt);
  const eventHasStarted = postTagStatus === "live" || postTagStatus === "active";
  const canPost = eventHasStarted && (isParticipant || isHostMode);

  const loadMoments = useCallback(async () => {
    setIsMomentsLoading(true);
    try {
      const data = await getEventMoments(eventId);
      setMoments(data);
    } catch {
      // fail silently — show empty state
    } finally {
      setIsMomentsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadMoments();
  }, [loadMoments]);

  const handlePostMooment = () => {
    if (!eventHasStarted) {
      Alert.alert(
        "Event not started",
        "You can post moments once the event begins.",
      );
      return;
    }

    if (!isParticipant && !isHostMode) {
      Alert.alert(
        "Join the event",
        "Purchase a ticket to share moments from this event.",
      );
      return;
    }

    router.push({
      pathname: "/post-screen/create-post",
      params: { eventId, eventName },
    });
  };

  const renderLive = () => (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        2 Active Rooms
      </Text>
      <View style={styles.roomsRow}>
        {ROOMS_DATA.map((room) => (
          <View key={room.id} style={styles.roomContainer}>
            <View
              style={[
                styles.ovalCard,
                { backgroundColor: "#0D0D25", borderColor: "#AC86D4" },
              ]}
            >
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => router.push("/profile-screen/user-profile")}
              >
                <UserAvatar
                  uri={room.hostAvatar}
                  name={room.host}
                  size={54}
                  style={[styles.roomAvatar, { borderColor: colors.primary }]}
                />
                <View
                  style={[
                    styles.onlineIndicator,
                    { borderColor: colors.background, backgroundColor: "#16D869" },
                  ]}
                />
              </TouchableOpacity>

              {room.isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}

              <CinematicButton
                text="Join"
                height={32}
                width={50}
                borderRadius={12}
                onPress={() => router.push("/live-screen/live-room-screen")}
                style={{ marginTop: 10 }}
              />
            </View>

            <View style={styles.roomInfo}>
              <Text style={[styles.roomTitle, { color: colors.text }]}>
                {room.title}
              </Text>
              <Text style={[styles.speakingText, { color: colors.textSecondary }]}>
                <TouchableOpacity onPress={() => router.push("/profile-screen/user-profile")}>
                  <Text style={[styles.hostNameHighlight, { color: colors.text }]}>
                    {room.host}
                  </Text>
                </TouchableOpacity>{" "}
                is speaking
              </Text>

              <View style={styles.listenerRow}>
                <View style={styles.avatarCluster}>
                  {["Alex", "Maya", "Sam"].map((name, i) => (
                    <UserAvatar
                      key={name}
                      uri={null}
                      name={name}
                      size={26}
                      style={[
                        styles.avatarSmall,
                        { zIndex: 3 - i, marginLeft: i > 0 ? -8 : 0, borderColor: colors.background },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.listenerCount, { color: colors.textSecondary }]}>
                  {room.listeners} listening
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMooments = () => (
    <View style={{ marginTop: 20 }}>
      <TouchableOpacity
        style={[
          styles.postBtn,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
        onPress={handlePostMooment}
        activeOpacity={0.85}
      >
        <Feather name="camera" size={20} color={colors.primary} />
        <Text style={[styles.postBtnText, { color: colors.text }]}>
          Share a Mooment
        </Text>
      </TouchableOpacity>

      {isMomentsLoading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : moments.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="camera" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No mooments yet
          </Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
            Be the first to share a moment from this event
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {moments.length} {moments.length === 1 ? "Mooment" : "Mooments"}
          </Text>

          {moments.map((item) => {
            const mediaUrl = resolveMediaUrl(item);
            const authorName = item.author?.name ?? "Unknown";
            const avatarKey = item.author?.avatarUrl ?? item.author?.avatarKey;
            const avatarUri = avatarKey
              ? (avatarKey.startsWith("http") ? avatarKey : (() => {
                  try { return getStorageFileUrl(avatarKey); } catch { return undefined; }
                })())
              : undefined;

            return (
              <View
                key={item.id}
                style={[styles.postCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.postHeader}>
                  <UserAvatar uri={avatarUri} name={authorName} size={36} style={styles.postAvatar} />
                  <View style={styles.postUserInfo}>
                    <Text style={[styles.postUserName, { color: colors.text }]}>
                      {authorName}
                    </Text>
                    <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                      {formatTimeAgo(item.createdAt)}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.moreBtn}>
                    <Feather name="more-horizontal" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {!!item.caption && (
                  <HashtagText
                    style={[styles.postText, { color: colors.text }]}
                    hashtagStyle={{ color: colors.primary, fontWeight: '700' }}
                  >
                    {item.caption}
                  </HashtagText>
                )}

                {mediaUrl && item.mediaItems?.[0]?.type === "image" && (
                  <Image source={{ uri: mediaUrl }} style={styles.postImage} contentFit="cover" />
                )}

                <PostInteractionBar
                  likesCount={item.likesCount}
                  commentsCount={item.commentsCount}
                  sharesCount={item.sharesCount}
                  isLiked={item.isLiked}
                />
              </View>
            );
          })}
        </>
      )}
    </View>
  );

  return (
    <View>
      {/* Live section hidden — SegmentedControl and renderLive() preserved for future restoration */}
      {renderMooments()}
    </View>
  );
};

export default VibeTab;

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  roomsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roomContainer: {
    width: (width - 48) / 2,
    alignItems: "center",
  },
  ovalCard: {
    width: "65%",
    borderRadius: 55,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  roomAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#16D869",
    borderWidth: 2,
  },
  hostBadge: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#AC86D4",
    marginTop: 10,
    alignSelf: "center",
  },
  hostBadgeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#AC86D4",
  },
  roomInfo: {
    width: "100%",
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 18,
  },
  speakingText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  hostNameHighlight: {
    fontWeight: "bold",
  },
  listenerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  avatarCluster: {
    flexDirection: "row",
  },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  listenerCount: {
    fontSize: 11,
  },
  postBtn: {
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  postBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 240,
  },
  postCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postAvatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  postTime: {
    fontSize: 12,
  },
  moreBtn: {
    padding: 4,
  },
  postText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1.8,
    borderRadius: 12,
    marginBottom: 14,
  },
});
