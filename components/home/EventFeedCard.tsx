import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getAuthErrorMessage } from "@/lib/authErrors";
import { cancelEvent, toggleEventSave, type EventResponse } from "@/lib/events";
import { shareMoment, toggleMomentReaction, type MomentInteractionSummary } from "@/lib/moments";
import { getStorageFileUrl } from "@/lib/storage";
import { blockUser, followUser, unfollowUser } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import MoreMenuModal from "@/components/post/MoreMenuModal";
import ReportModal from "@/components/modals/ReportModal";
import ReportDetailsModal from "@/components/modals/ReportDetailsModal";
import CommentsModal from "@/components/post/CommentsModal";
import ShareModal from "@/components/post/ShareModal";

const timeAgo = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr as string).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateStr as string));
};

const formatDate = (scheduledAt?: string | Date | null): string => {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt as string);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
};

const formatTime = (scheduledAt?: string | Date | null): string => {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt as string);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(d);
};

const getLocation = (event: EventResponse): string =>
  event.location?.venue?.trim()
  || event.location?.searchLabel?.trim()
  || event.location?.address?.trim()
  || "";

type Props = { event: EventResponse };

export default function EventFeedCard({ event }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const bannerUri = useMemo(() => {
    if (!event.bannerImageKey || bannerFailed) return null;
    try { return getStorageFileUrl(event.bannerImageKey); } catch { return null; }
  }, [bannerFailed, event.bannerImageKey]);

  const hostAvatarUri = useMemo(() => {
    if (avatarFailed) return null;
    if (event.host?.avatarKey) {
      try { return getStorageFileUrl(event.host.avatarKey); } catch { /* fall through */ }
    }
    return event.host?.avatarUrl ?? null;
  }, [avatarFailed, event.host?.avatarKey, event.host?.avatarUrl]);

  const hostName = event.host?.name?.trim() || event.host?.username?.trim() || "Event host";
  const categories = event.categories?.length > 0 ? event.categories : event.category ? [event.category] : [];
  const displayCategories = categories.slice(0, 3);
  const categoryCount = displayCategories.length;
  const overlayLayout = useMemo(() => {
    if (categoryCount >= 3) {
      return {
        overlay: { bottom: 6, height: 170, paddingBottom: 8 },
        panel: { height: 154, paddingVertical: 8, gap: 4 },
      };
    }

    if (categoryCount === 2) {
      return {
        overlay: { bottom: 8, height: 138, paddingBottom: 10 },
        panel: { height: 118, paddingVertical: 10, gap: 5 },
      };
    }

    return {
      overlay: { bottom: 0, height: 116, paddingBottom: 20 },
      panel: { height: 96, paddingVertical: 10, gap: 5 },
    };
  }, [categoryCount]);
  const firstCategory = categories[0] ?? null;
  const eventDate = formatDate(event.scheduledAt);
  const eventTime = formatTime(event.scheduledAt);
  const location = getLocation(event);
  const timestamp = timeAgo(event.publishedAt ?? event.createdAt);
  const isPublic = event.privacy === "public";
  const isOwnEvent = Boolean(currentUserId && currentUserId === event.userId);
  const hostId = event.host?.id ?? event.userId;

  const [isFollowing, setIsFollowing] = useState(Boolean(event.host?.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const mountedRef = useRef(true);
  const moreBtnRef = useRef<View>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(event.isLiked));
  const [likesCount, setLikesCount] = useState(event.likesCount ?? 0);
  const [commentsCount, setCommentsCount] = useState(event.commentsCount ?? 0);
  const [sharesCount, setSharesCount] = useState(event.sharesCount ?? 0);
  const [isLikePending, setIsLikePending] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setIsFollowing(Boolean(event.host?.isFollowing));
  }, [event.host?.isFollowing]);

  useEffect(() => {
    setIsLiked(Boolean(event.isLiked));
    setLikesCount(event.likesCount ?? 0);
    setCommentsCount(event.commentsCount ?? 0);
    setSharesCount(event.sharesCount ?? 0);
  }, [event.commentsCount, event.isLiked, event.likesCount, event.sharesCount]);

  const applyInteractionSummary = (summary: MomentInteractionSummary) => {
    setIsLiked(summary.isLiked);
    setLikesCount(summary.likesCount);
    setCommentsCount(summary.commentsCount);
    setSharesCount(summary.sharesCount);
  };

  const handleLike = async () => {
    if (!event.interactionMomentId || isLikePending) return;

    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;
    setIsLiked(!previousIsLiked);
    setLikesCount((count) => Math.max(0, count + (previousIsLiked ? -1 : 1)));
    setIsLikePending(true);

    try {
      applyInteractionSummary(await toggleMomentReaction(event.interactionMomentId));
    } catch (error) {
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      Alert.alert("Unable to update reaction", getAuthErrorMessage(error, "Please try again."));
    } finally {
      if (mountedRef.current) setIsLikePending(false);
    }
  };

  const handleRepost = async () => {
    if (!event.interactionMomentId) return;

    try {
      const share = await shareMoment(event.interactionMomentId);
      applyInteractionSummary({
        momentId: event.interactionMomentId,
        likesCount: share.moment.likesCount,
        commentsCount: share.moment.commentsCount,
        sharesCount: share.moment.sharesCount,
        isLiked: share.moment.isLiked,
      });
      setShareVisible(false);
    } catch (error) {
      Alert.alert("Unable to repost", getAuthErrorMessage(error, "Please try again."));
    }
  };

  const toggleFollow = async () => {
    if (isOwnEvent || isFollowPending || !hostId) return;

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setIsFollowPending(true);

    try {
      const result = wasFollowing ? await unfollowUser(hostId) : await followUser(hostId);
      if (mountedRef.current) setIsFollowing(result.isFollowing);
    } catch (error) {
      if (mountedRef.current) setIsFollowing(wasFollowing);
      Alert.alert(
        wasFollowing ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      if (mountedRef.current) setIsFollowPending(false);
    }
  };

  const handleMorePress = () => {
    moreBtnRef.current?.measureInWindow((_x, y, _w, h) => {
      setMenuTop(y + h + 5);
      setShowMoreMenu(true);
    });
  };

  const handleCancelEvent = () => {
    setShowMoreMenu(false);
    Alert.alert(
      "Cancel Event",
      "Are you sure you want to cancel this event? This cannot be undone.",
      [
        { text: "Keep Event", style: "cancel" },
        {
          text: "Cancel Event",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelEvent(event.id);
            } catch (error) {
              Alert.alert("Unable to cancel event", getAuthErrorMessage(error, "Please try again."));
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (isSavePending) return;
    const prev = isSaved;
    setIsSaved(!prev);
    setIsSavePending(true);
    try {
      const result = await toggleEventSave(event.id);
      if (mountedRef.current) setIsSaved(result.isSaved);
    } catch {
      if (mountedRef.current) setIsSaved(prev);
    } finally {
      if (mountedRef.current) setIsSavePending(false);
    }
  };

  const handleBlock = () => {
    const targetId = hostId;
    if (!targetId) return;

    Alert.alert(
      "Block User",
      "You won't see posts from this user in your feed anymore. They won't be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setIsHidden(true);
            try {
              await blockUser(targetId);
            } catch {
              if (mountedRef.current) setIsHidden(false);
            }
          },
        },
      ],
    );
  };

  const goToEvent = () =>
    router.push({ pathname: "/event-screen/event", params: { eventId: event.id } });

  const goToCategory = (category: string) =>
    router.push({ pathname: "/discover-screen/event-category", params: { category } });

  const goToMap = () => {
    const locationName =
      event.location?.venue?.trim()
      || event.location?.address?.trim()
      || event.location?.searchLabel?.trim()
      || "";

    router.push({
      pathname: "/plan-screen/view-location",
      params: {
        eventName: event.name?.trim() || "Event Location",
        locationName: locationName || "Event Location",
        latitude: event.location?.latitude?.toString() ?? "",
        longitude: event.location?.longitude?.toString() ?? "",
        eventCategory: firstCategory ?? "",
        markerImage: bannerUri ?? "",
      },
    });
  };

  if (isHidden) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.hostRow}>
          {hostAvatarUri ? (
            <Image
              source={{ uri: hostAvatarUri }}
              style={styles.avatar}
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Feather name="user" size={16} color="#666" />
            </View>
          )}
          <View style={styles.hostMeta}>
            <Text style={styles.hostName} numberOfLines={1}>{hostName}</Text>
            <View style={styles.hostSubRow}>
              {Boolean(timestamp) && <Text style={styles.timestamp}>{timestamp}</Text>}
              {Boolean(timestamp) && <View style={styles.dot} />}
              <Feather name={isPublic ? "globe" : "lock"} size={11} color="#777" />
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {!isOwnEvent && (
            isFollowing ? (
              <TouchableOpacity
                style={styles.followingBtn}
                activeOpacity={0.75}
                disabled={isFollowPending}
                onPress={toggleFollow}
              >
                <Text style={styles.followingText}>Following</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.followBtn}
                activeOpacity={0.75}
                disabled={isFollowPending}
                onPress={toggleFollow}
              >
                <Text style={styles.followPlus}>+</Text>
                <Text style={styles.followText}>Follow</Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity
            ref={moreBtnRef}
            style={styles.moreBtn}
            activeOpacity={0.75}
            onPress={handleMorePress}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#B3B3B3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Image container ─────────────────────────────────────── */}
      <View style={styles.imageContainer}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.bannerFallback]}>
            <Feather name="calendar" size={32} color="#333" />
          </View>
        )}

        {/* dark tint over image */}
        <View style={styles.imageTint} />

        {/* info section pinned to image bottom */}
        <View style={[styles.infoOverlay, overlayLayout.overlay]}>
          {/* left: accent bar + gradient panel */}
          <View style={styles.infoLeft}>
            <View style={[styles.accentBar, { height: overlayLayout.panel.height }]} />
            <LinearGradient
              colors={["#1F1A23", "rgba(102,102,102,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.infoPanel, overlayLayout.panel]}
            >
              {displayCategories.length > 0 ? (
                <View style={styles.tagsRow}>
                  {displayCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={styles.categoryTag}
                      activeOpacity={0.85}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${category} events`}
                      onPress={() => goToCategory(category)}
                    >
                      <Text style={styles.categoryTagText} numberOfLines={1}>{category}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <Text style={styles.eventName} numberOfLines={1}>
                {event.name?.trim() || "Untitled Event"}
              </Text>

              {(eventDate || eventTime) ? (
                <View style={styles.metaRow}>
                  {Boolean(eventDate) && <Text style={styles.metaText}>{eventDate}</Text>}
                  {Boolean(eventDate) && Boolean(eventTime) && <View style={styles.metaDot} />}
                  {Boolean(eventTime) && <Text style={styles.metaText}>{eventTime}</Text>}
                </View>
              ) : null}

              {Boolean(location) ? (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={10} color="rgba(255,255,255,0.65)" />
                  <Text style={[styles.metaText, styles.metaLocation]} numberOfLines={1}>{location}</Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>

          {/* right: View Map + View */}
          <View style={styles.infoRight}>
            <TouchableOpacity style={styles.viewMapBtn} activeOpacity={0.8} onPress={goToMap}>
              <Text style={styles.viewMapText}>View Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewBtn} activeOpacity={0.8} onPress={goToEvent}>
              <Text style={styles.viewBtnText}>View</Text>
              <Feather name="chevron-right" size={14} color="#111111" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Action bar ──────────────────────────────────────────── */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          disabled={isLikePending || !event.interactionMomentId}
          onPress={handleLike}
        >
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#EF2C2C" : "#B3B3B3"} />
          <Text style={styles.actionCount}>{likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          disabled={!event.interactionMomentId}
          onPress={() => setCommentsVisible(true)}
        >
          <Feather name="message-circle" size={18} color="#B3B3B3" />
          <Text style={styles.actionCount}>{commentsCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          disabled={!event.interactionMomentId}
          onPress={() => setShareVisible(true)}
        >
          <Feather name="share-2" size={18} color="#B3B3B3" />
          <Text style={styles.actionCount}>{sharesCount}</Text>
        </TouchableOpacity>
      </View>

      <CommentsModal
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        momentId={event.interactionMomentId}
        likesCount={likesCount}
        sharesCount={sharesCount}
        onInteractionChange={applyInteractionSummary}
      />

      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        onRepost={handleRepost}
        shareUrl={`https://mooment.app/events/${event.id}`}
      />

      <MoreMenuModal
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        showDelete={isOwnEvent}
        deleteLabel="Cancel Event"
        onReport={!isOwnEvent ? () => setShowReportModal(true) : undefined}
        onSave={!isOwnEvent ? handleSave : undefined}
        isSaved={!isOwnEvent ? isSaved : undefined}
        onBlock={!isOwnEvent && Boolean(hostId) ? handleBlock : undefined}
        onDelete={isOwnEvent ? handleCancelEvent : undefined}
        top={menuTop}
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={(_reason) => {
          setShowReportModal(false);
          setTimeout(() => setShowReportDetailsModal(true), 300);
        }}
      />

      <ReportDetailsModal
        visible={showReportDetailsModal}
        onClose={() => setShowReportDetailsModal(false)}
        onDone={(_details) => {
          setShowReportDetailsModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(17, 17, 17, 0.95)",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: "hidden",
  },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  hostRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    backgroundColor: "#222",
    alignItems: "center",
    justifyContent: "center",
  },
  hostMeta: {
    flex: 1,
    gap: 3,
  },
  hostName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  hostSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timestamp: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#777777",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#AC86D4",
  },
  followingBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(178, 171, 186, 0.45)",
    backgroundColor: "rgba(172, 134, 212, 0.15)",
  },
  followPlus: {
    color: "#AC86D4",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 16,
  },
  followText: {
    color: "#AC86D4",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
  followingText: {
    color: "#B2ABBA",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
  moreBtn: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Image area
  imageContainer: {
    height: 250,
    width: "100%",
    backgroundColor: "#111",
  },
  bannerFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  imageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 11, 11, 0.55)",
  },
  infoOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 12,
  },
  infoLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  accentBar: {
    width: 4,
    borderRadius: 999,
    backgroundColor: "#B2ABBA",
  },
  infoPanel: {
    flex: 1,
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 8,
    justifyContent: "center",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  categoryTag: {
    backgroundColor: "#EDE9F8",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryTagText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
  eventName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  metaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: -0.08,
  },
  metaLocation: {
    flex: 1,
    color: "rgba(255,255,255,0.75)",
    marginLeft: 3,
  },
  infoRight: {
    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    gap: 10,
  },
  viewMapBtn: {
    backgroundColor: "rgba(51, 51, 51, 0.6)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 76,
    alignItems: "center",
  },
  viewMapText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
  viewBtn: {
    backgroundColor: "#B2ABBA",
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    width: 76,
    justifyContent: "center",
  },
  viewBtnText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
  },

  // ── Action bar
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 20,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionCount: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.08,
  },
});
