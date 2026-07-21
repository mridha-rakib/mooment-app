import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getAuthErrorMessage } from "@/lib/authErrors";
import { cancelEvent, type EventResponse } from "@/lib/events";
import { shareMoment, toggleMomentReaction, toggleMomentSave, type MomentInteractionSummary, type RepostPayload } from "@/lib/moments";
import { getStorageFileUrl } from "@/lib/storage";
import { navigateToProfile } from "@/lib/profileNavigation";
import { blockUser, followUser, unfollowUser } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import MoreMenuModal from "@/components/post/MoreMenuModal";
import ReportModal from "@/components/modals/ReportModal";
import ReportDetailsModal from "@/components/modals/ReportDetailsModal";
import CommentsModal from "@/components/post/CommentsModal";
import ShareModal from "@/components/post/ShareModal";
import PostInteractionBar from "@/components/post/PostInteractionBar";
import UserAvatar from "@/components/ui/UserAvatar";
import PublicGoingSummaryRow from "@/components/events/PublicGoingSummaryRow";
import EventCancellationReasonModal from "@/components/events/EventCancellationReasonModal";

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

type EventBadgeStatus = "live" | "upcoming" | "ended";
type EventLifecycleStatus = Pick<EventResponse, "status" | "scheduledAt" | "endAt">;

const EVENT_STATUS_LABELS: Record<EventBadgeStatus, string> = {
  live: "Live Now",
  upcoming: "Upcoming",
  ended: "Ended",
};

const parseEventTime = (value?: string | Date | null): number | null => {
  if (!value) return null;
  const time = new Date(value as string).getTime();
  return Number.isNaN(time) ? null : time;
};

const getEventBadgeStatus = (event: EventLifecycleStatus, nowMs: number): EventBadgeStatus => {
  const endMs = parseEventTime(event.endAt);

  if (event.status === "completed" || event.status === "cancelled") {
    return "ended";
  }

  if (endMs !== null && endMs <= nowMs) {
    return "ended";
  }

  if (event.status === "live") {
    return "live";
  }

  const startMs = parseEventTime(event.scheduledAt);

  if (startMs !== null && startMs <= nowMs) {
    return "live";
  }

  return "upcoming";
};

const getNextEventBadgeBoundary = (event: EventLifecycleStatus, nowMs: number): number | null => {
  if (event.status === "completed" || event.status === "cancelled") {
    return null;
  }

  const startMs = parseEventTime(event.scheduledAt);
  const endMs = parseEventTime(event.endAt);
  const boundaries = [startMs, endMs].filter(
    (time): time is number => time !== null && time > nowMs,
  );

  return boundaries.length > 0 ? Math.min(...boundaries) : null;
};

const normalizeId = (value?: string | null) => value?.trim().toLowerCase() || null;

const isSameId = (left?: string | null, right?: string | null) => {
  const normalizedLeft = normalizeId(left);
  const normalizedRight = normalizeId(right);

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

type Props = {
  event: EventResponse;
  headerLabel?: string;
  repostCaption?: string | null;
  taggedFriendNames?: string[];
  onRepostSuccess?: () => void;
  onEventCancelled?: (eventId: string) => void;
  onSaveChange?: (interactionMomentId: string, isSaved: boolean) => void;
  embedded?: boolean;
};

export default function EventFeedCard({ event, headerLabel, repostCaption, taggedFriendNames = [], onRepostSuccess, onEventCancelled, onSaveChange, embedded = false }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [bannerFailed, setBannerFailed] = useState(false);

  const bannerUri = useMemo(() => {
    if (!event.bannerImageKey || bannerFailed) return null;
    try { return getStorageFileUrl(event.bannerImageKey); } catch { return null; }
  }, [bannerFailed, event.bannerImageKey]);

  const hostAvatarUri = useMemo(() => {
    if (event.host?.avatarKey) {
      try { return getStorageFileUrl(event.host.avatarKey); } catch { /* fall through */ }
    }
    return event.host?.avatarUrl ?? null;
  }, [event.host?.avatarKey, event.host?.avatarUrl]);

  const hostName = event.host?.name?.trim() || event.host?.username?.trim() || "Event host";
  const categories = event.categories?.length > 0 ? event.categories : event.category ? [event.category] : [];
  const displayCategories = categories.slice(0, 3);
  const categoryCount = displayCategories.length;
  const overlayLayout = useMemo(() => {
    if (categoryCount >= 3) {
      return {
        overlay: { bottom: 6, height: 176, paddingBottom: 8 },
        panel: { height: 160, paddingVertical: 8, gap: 4 },
      };
    }

    if (categoryCount === 2) {
      return {
        overlay: { bottom: 8, height: 158, paddingBottom: 10 },
        panel: { height: 138, paddingVertical: 10, gap: 5 },
      };
    }

    return {
      overlay: { bottom: 0, height: 138, paddingBottom: 20 },
      panel: { height: 118, paddingVertical: 10, gap: 5 },
    };
  }, [categoryCount]);
  const firstCategory = categories[0] ?? null;
  const eventDate = formatDate(event.scheduledAt);
  const eventTime = formatTime(event.scheduledAt);
  const location = getLocation(event);
  const timestamp = timeAgo(event.publishedAt ?? event.createdAt);
  const isPublic = event.privacy === "public";
  const isOwnEvent = Boolean(currentUserId && currentUserId === event.userId);
  const eventId = event.id?.trim() || null;
  const canViewEventStats = Boolean(
    eventId && currentUserId && (isSameId(currentUserId, event.userId) || isSameId(currentUserId, event.host?.id)),
  );
  const hostId = event.host?.id ?? event.userId;
  const eventStatus = event.status;
  const eventScheduledAt = event.scheduledAt;
  const eventEndAt = event.endAt;
  const [statusNowMs, setStatusNowMs] = useState(() => Date.now());
  const eventBadgeStatus = useMemo(
    () => getEventBadgeStatus({
      status: eventStatus,
      scheduledAt: eventScheduledAt,
      endAt: eventEndAt,
    }, statusNowMs),
    [eventEndAt, eventScheduledAt, eventStatus, statusNowMs],
  );
  const eventBadgeLabel = EVENT_STATUS_LABELS[eventBadgeStatus];

  const [isFollowing, setIsFollowing] = useState(Boolean(event.host?.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const mountedRef = useRef(true);
  const moreBtnRef = useRef<View>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [isSaved, setIsSaved] = useState(Boolean(event.isSaved));
  const [isSavePending, setIsSavePending] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(event.isLiked));
  const [likesCount, setLikesCount] = useState(event.likesCount ?? 0);
  const [commentsCount, setCommentsCount] = useState(event.commentsCount ?? 0);
  const [sharesCount, setSharesCount] = useState(event.sharesCount ?? 0);
  const [isLikePending, setIsLikePending] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [cancelReasonVisible, setCancelReasonVisible] = useState(false);
  const [isCancellingEvent, setIsCancellingEvent] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setIsFollowing(Boolean(event.host?.isFollowing));
  }, [event.host?.isFollowing]);

  useEffect(() => {
    setIsLiked(Boolean(event.isLiked));
    setIsSaved(Boolean(event.isSaved));
    setLikesCount(event.likesCount ?? 0);
    setCommentsCount(event.commentsCount ?? 0);
    setSharesCount(event.sharesCount ?? 0);
  }, [event.commentsCount, event.isLiked, event.isSaved, event.likesCount, event.sharesCount]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const scheduleNextBoundary = () => {
      const nowMs = Date.now();
      const nextBoundary = getNextEventBadgeBoundary({
        status: eventStatus,
        scheduledAt: eventScheduledAt,
        endAt: eventEndAt,
      }, nowMs);

      if (nextBoundary === null) {
        return;
      }

      const delayMs = Math.min(Math.max(nextBoundary - nowMs + 250, 0), 2_147_483_647);
      timeoutId = setTimeout(() => {
        if (isCancelled) {
          return;
        }

        setStatusNowMs(Date.now());
        scheduleNextBoundary();
      }, delayMs);
    };

    setStatusNowMs(Date.now());
    scheduleNextBoundary();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [eventEndAt, eventScheduledAt, eventStatus]);

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

  const handleRepost = async (payload: RepostPayload) => {
    if (!event.interactionMomentId) return;

    try {
      const share = await shareMoment(event.interactionMomentId, payload);
      applyInteractionSummary({
        momentId: event.interactionMomentId,
        likesCount: share.moment.likesCount,
        commentsCount: share.moment.commentsCount,
        sharesCount: share.moment.sharesCount,
        isLiked: share.moment.isLiked,
      });
      setShareVisible(false);
      onRepostSuccess?.();
    } catch (error) {
      Alert.alert("Unable to repost", getAuthErrorMessage(error, "Please try again."));
      throw error;
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
    setCancelReasonVisible(true);
  };

  const submitEventCancellation = async (payload: Parameters<typeof cancelEvent>[1]) => {
    if (isCancellingEvent) return;

    setIsCancellingEvent(true);
    try {
      await cancelEvent(event.id, payload);
      setCancelReasonVisible(false);
      onEventCancelled?.(event.id);
      Alert.alert("Event cancelled", "Refunds are being processed for attendees.");
    } catch (error) {
      Alert.alert("Unable to cancel event", getAuthErrorMessage(error, "Please try again."));
    } finally {
      if (mountedRef.current) setIsCancellingEvent(false);
    }
  };

  const handleSave = async () => {
    if (isSavePending || !event.interactionMomentId) return;
    const prev = isSaved;
    setIsSaved(!prev);
    setIsSavePending(true);
    try {
      const result = await toggleMomentSave(event.interactionMomentId);
      if (mountedRef.current) setIsSaved(result.isSaved);
      onSaveChange?.(event.interactionMomentId, result.isSaved);
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
    router.push({ pathname: "/event-screen/event", params: { eventId: event.id, source: "feed" } });

  const goToEventStats = () => {
    if (!eventId || !canViewEventStats) {
      return;
    }

    router.push({
      pathname: "/profile-screen/event-dashboard",
      params: {
        eventId,
        eventName: event.name ?? "Event",
      },
    });
  };

  const goToHostProfile = () => {
    navigateToProfile(router, currentUserId, {
      userId: hostId,
      name: hostName,
      avatar: hostAvatarUri,
      isFollowing,
    });
  };

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
    <View style={[styles.card, embedded && styles.embeddedCard]}>
      {headerLabel ? (
        <View style={styles.repostContext}>
          <Text style={styles.repostLabel}>{headerLabel}</Text>
          {repostCaption ? <Text style={styles.repostCaption}>{repostCaption}</Text> : null}
          {taggedFriendNames.length > 0 ? <Text style={styles.repostTags}>with {taggedFriendNames.join(", ")}</Text> : null}
        </View>
      ) : null}
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.hostRow} activeOpacity={0.7} onPress={goToHostProfile}>
          <UserAvatar uri={hostAvatarUri} name={hostName} size={40} style={styles.avatar} />
          <View style={styles.hostMeta}>
            <Text style={styles.hostName} numberOfLines={1}>{hostName}</Text>
            <View style={styles.hostSubRow}>
              {Boolean(timestamp) && <Text style={styles.timestamp}>{timestamp}</Text>}
              {Boolean(timestamp) && <View style={styles.dot} />}
              <Feather name={isPublic ? "globe" : "lock"} size={11} color="#777" />
            </View>
          </View>
        </TouchableOpacity>

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
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={event.id}
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.bannerFallback]}>
            <Feather name="calendar" size={32} color="#333" />
          </View>
        )}

        {/* dark tint over image */}
        <View style={styles.imageTint} />

        <View
          style={[
            styles.statusBadge,
            eventBadgeStatus === "live" && styles.liveStatusBadge,
            eventBadgeStatus === "upcoming" && styles.upcomingStatusBadge,
            eventBadgeStatus === "ended" && styles.endedStatusBadge,
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.statusDot,
              eventBadgeStatus === "live" && styles.liveStatusDot,
              eventBadgeStatus === "upcoming" && styles.upcomingStatusDot,
              eventBadgeStatus === "ended" && styles.endedStatusDot,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              eventBadgeStatus === "live" && styles.liveStatusText,
              eventBadgeStatus === "upcoming" && styles.upcomingStatusText,
              eventBadgeStatus === "ended" && styles.endedStatusText,
            ]}
          >
            {eventBadgeLabel}
          </Text>
        </View>

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

              <PublicGoingSummaryRow
                eventId={eventId}
                eventName={event.name ?? "Event"}
                summary={event.publicGoingSummary}
                canViewCreatorList={canViewEventStats}
                style={styles.goingRow}
                textStyle={styles.goingText}
              />
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
        <PostInteractionBar
          likesCount={likesCount}
          commentsCount={commentsCount}
          sharesCount={sharesCount}
          isLiked={isLiked}
          onLikePress={handleLike}
          onCommentPress={() => setCommentsVisible(true)}
          onSharePress={() => setShareVisible(true)}
          likeDisabled={isLikePending || !event.interactionMomentId}
          commentDisabled={!event.interactionMomentId}
          shareDisabled={!event.interactionMomentId}
        />
        {canViewEventStats && (
          <>
            <View style={styles.actionBarSpacer} />
            <TouchableOpacity
              style={styles.viewStatBtn}
              activeOpacity={0.8}
              onPress={goToEventStats}
            >
              <Text style={styles.viewStatText}>View Stat</Text>
            </TouchableOpacity>
          </>
        )}
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
        item={{
          type: "event",
          id: event.id,
          preview: event.name,
          imageUrl: bannerUri,
          authorName: hostName,
          canShareToChat: event.privacy === "public",
          categoryLabels: displayCategories,
          dateTimeLabel: [eventDate, eventTime].filter(Boolean).join(" · "),
          locationLabel: location,
        }}
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

      <EventCancellationReasonModal
        visible={cancelReasonVisible}
        pending={isCancellingEvent}
        onClose={() => {
          if (!isCancellingEvent) setCancelReasonVisible(false);
        }}
        onSubmit={submitEventCancellation}
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
  embeddedCard: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  repostContext: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2, gap: 4 },
  repostLabel: { color: "#AFAFB8", fontSize: 12, fontWeight: "700" },
  repostCaption: { color: "#FFFFFF", fontSize: 14, lineHeight: 19 },
  repostTags: { color: "#AFAFB8", fontSize: 12 },

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
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 20,
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#AC86D4",
    marginRight: 20,
  },
  followingBtn: {
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 20,
  },
  followPlus: {
    color: "#AC86D4",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    marginRight: 4,
  },
  followText: {
    color: "#AC86D4",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0,
  },
  followingText: {
    color: "#8E8E9B",
    fontSize: 11,
    fontWeight: "600",
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
  statusBadge: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 3,
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveStatusBadge: {
    backgroundColor: "rgba(8, 45, 22, 0.82)",
  },
  upcomingStatusBadge: {
    backgroundColor: "rgba(28, 46, 78, 0.82)",
  },
  endedStatusBadge: {
    backgroundColor: "rgba(46, 46, 50, 0.82)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveStatusDot: {
    backgroundColor: "#18D66B",
  },
  upcomingStatusDot: {
    backgroundColor: "#8AB4F8",
  },
  endedStatusDot: {
    backgroundColor: "#B8B8C2",
  },
  statusText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  liveStatusText: {
    color: "#18D66B",
  },
  upcomingStatusText: {
    color: "#8AB4F8",
  },
  endedStatusText: {
    color: "#B8B8C2",
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
    backgroundColor: "#FFFFFF",
  },
  infoPanel: {
    flex: 1,
    borderRadius: 12,
    paddingLeft: 8,
    paddingRight: 8,
    justifyContent: "flex-end",
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
  goingRow: {
    alignSelf: "flex-start",
  },
  goingText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: -0.08,
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
    backgroundColor: "#FFFFFF",
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
  },
  actionBarSpacer: {
    flex: 1,
  },
  viewStatBtn: {
    alignItems: "center",
    backgroundColor: "#1F1F22",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewStatText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.08,
  },
});
