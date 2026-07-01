import { useFocusEffect } from "@react-navigation/native";
import { Comment02Icon, Share01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  cancelEvent,
  getMyProfileEvents,
  getProfileEvents,
  toggleEventSave,
  type EventResponse,
  type ProfileEventGroups,
} from "@/lib/events";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { shareMoment, toggleMomentReaction, type MomentInteractionSummary, type RepostPayload } from "@/lib/moments";
import { getStorageFileUrl } from "@/lib/storage";
import { blockUser } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import CommentsModal from "../post/CommentsModal";
import MoreMenuModal from "../post/MoreMenuModal";
import ShareModal from "../post/ShareModal";
import type { PostData } from "../post/FeedPost";
import ReportDetailsModal from "../modals/ReportDetailsModal";
import ReportModal from "../modals/ReportModal";
import UserAvatar from "../ui/UserAvatar";

const EMPTY_PROFILE_EVENTS: ProfileEventGroups = {
  active: [],
  past: [],
};

type ProfileEventsProps = {
  onCommentPress: (post: PostData) => void;
  onSharePress: (post: PostData) => void;
  isOwnProfile?: boolean;
  profileUserId: string;
  profileIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
};

const formatTimeAgo = (createdAt?: string | null) => {
  if (!createdAt) {
    return "Just now";
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours} hr ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
};

const formatEventDate = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return "";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatEventTime = (dateValue?: string | null) => {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatEventTimeRange = (scheduledAt?: string | null, endAt?: string | null) => {
  const start = formatEventTime(scheduledAt);

  if (!start) {
    return "";
  }

  const end = formatEventTime(endAt);

  return end ? `${start} - ${end}` : start;
};

const isLiveEvent = (event: EventResponse) => {
  if (!event.scheduledAt || !event.endAt || event.status === "cancelled") {
    return false;
  }

  const scheduledTime = new Date(event.scheduledAt).getTime();
  const endTime = new Date(event.endAt).getTime();
  const now = Date.now();

  return Number.isFinite(scheduledTime) && Number.isFinite(endTime) && scheduledTime <= now && endTime >= now;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMiles = (from: [number, number], to: [number, number]) => {
  const earthRadiusKm = 6371;
  const [fromLongitude, fromLatitude] = from;
  const [toLongitude, toLatitude] = to;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distanceKm = 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distanceKm * 0.621371;
};

const formatLocationLabel = (event: EventResponse) =>
  event.location?.venue || event.location?.address || event.location?.searchLabel || "";

const formatDistanceOrLocation = (event: EventResponse, userLocation: [number, number] | null) => {
  const latitude = event.location?.latitude;
  const longitude = event.location?.longitude;

  if (
    userLocation &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  ) {
    const miles = getDistanceMiles(userLocation, [longitude, latitude]);

    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()}mi`;
  }

  return formatLocationLabel(event);
};

const resolveStorageUrl = (key?: string | null, fallback?: string | null) => {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};

const getEventCategories = (event: EventResponse) => (
  event.categories?.length ? event.categories : event.category ? [event.category] : []
).filter((category) => Boolean(category?.trim())).slice(0, 3);

const getBannerUri = (event: EventResponse) => {
  const key = event.bannerImageKey ?? event.bannerOriginalImageKey;

  return resolveStorageUrl(key, null);
};

const getStatusBadge = (event: EventResponse, filter: "active" | "past") => {
  if (filter === "active" && isLiveEvent(event)) {
    return { label: "Live Now", tone: "live" as const };
  }

  if (event.status === "cancelled") {
    return { label: "Cancelled", tone: "past" as const };
  }

  if (filter === "past" || event.status === "completed") {
    return { label: "Past", tone: "past" as const };
  }

  return null;
};

type ProfileEventInteractionBarProps = {
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  onLikePress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  likeDisabled?: boolean;
  commentDisabled?: boolean;
  shareDisabled?: boolean;
};

function ProfileEventInteractionBar({
  likesCount,
  commentsCount,
  sharesCount,
  isLiked,
  onLikePress,
  onCommentPress,
  onSharePress,
  likeDisabled = false,
  commentDisabled = false,
  shareDisabled = false,
}: ProfileEventInteractionBarProps) {
  return (
    <View style={styles.interactionBar}>
      <TouchableOpacity
        style={styles.interactionAction}
        activeOpacity={0.7}
        onPress={onLikePress}
        disabled={likeDisabled}
      >
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={20}
          color={isLiked ? "#EF2C2C" : "#B3B3B3"}
        />
        <Text style={styles.interactionCount}>{likesCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionAction}
        activeOpacity={0.7}
        onPress={onCommentPress}
        disabled={commentDisabled}
      >
        <HugeiconsIcon icon={Comment02Icon} size={20} color="#B3B3B3" />
        <Text style={styles.interactionCount}>{commentsCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.interactionAction}
        activeOpacity={0.7}
        onPress={onSharePress}
        disabled={shareDisabled}
      >
        <HugeiconsIcon icon={Share01Icon} size={20} color="#B3B3B3" />
        <Text style={styles.interactionCount}>{sharesCount}</Text>
      </TouchableOpacity>
    </View>
  );
}

type ProfileEventCardProps = {
  event: EventResponse;
  filter: "active" | "past";
  isOwnProfile: boolean;
  profileIsFollowing?: boolean;
  userLocation: [number, number] | null;
  fallbackAuthor: { name: string; avatar?: string | null };
  onCancelEvent: (event: EventResponse) => void;
};

function ProfileEventCard({
  event,
  filter,
  isOwnProfile,
  profileIsFollowing,
  userLocation,
  fallbackAuthor,
  onCancelEvent,
}: ProfileEventCardProps) {
  const [bannerFailed, setBannerFailed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(event.isLiked));
  const [likesCount, setLikesCount] = useState(event.likesCount ?? 0);
  const [commentsCount, setCommentsCount] = useState(event.commentsCount ?? 0);
  const [sharesCount, setSharesCount] = useState(event.sharesCount ?? 0);
  const [isLikePending, setIsLikePending] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const moreBtnRef = useRef<View>(null);
  const mountedRef = useRef(true);

  const hostName = event.host?.name?.trim() || event.host?.username?.trim() || fallbackAuthor.name;
  const hostAvatarUri = resolveStorageUrl(event.host?.avatarKey, event.host?.avatarUrl ?? fallbackAuthor.avatar ?? null);
  const bannerUri = bannerFailed ? null : getBannerUri(event);
  const categories = getEventCategories(event);
  const categoryCount = categories.length;
  const statusBadge = getStatusBadge(event, filter);
  const eventDate = formatEventDate(event.scheduledAt);
  const eventTimeRange = formatEventTimeRange(event.scheduledAt, event.endAt);
  const distanceOrLocation = formatDistanceOrLocation(event, userLocation);
  const timestamp = formatTimeAgo(event.publishedAt ?? event.createdAt);
  const isPublic = event.privacy === "public";
  const hostId = event.host?.id ?? event.userId;
  const overlayHeight = categoryCount >= 3 ? 140 : categoryCount === 2 ? 128 : 116;
  const panelHeight = categoryCount >= 3 ? 120 : categoryCount === 2 ? 108 : 96;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const goToEvent = () => {
    router.push({ pathname: "/event-screen/event", params: { eventId: event.id } });
  };

  const goToProfile = () => {
    router.push({
      pathname: "/profile-screen/user-profile",
      params: {
        userId: hostId,
        name: hostName,
        isFollowing: String(Boolean(profileIsFollowing ?? event.host?.isFollowing)),
        ...(hostAvatarUri ? { avatar: hostAvatarUri } : {}),
      },
    } as any);
  };

  const goToMap = () => {
    router.push("/(tabs)/home?view=map" as any);
  };

  const goToStats = () => {
    router.push({
      pathname: "/profile-screen/event-dashboard",
      params: { eventId: event.id, eventName: event.name ?? "Event" },
    } as any);
  };

  const handleMorePress = () => {
    moreBtnRef.current?.measureInWindow((_x, y, _w, h) => {
      setMenuTop(y + h + 5);
      setShowMoreMenu(true);
    });
  };

  const handleLike = async () => {
    if (!event.interactionMomentId || isLikePending) {
      return;
    }

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
      if (mountedRef.current) {
        setIsLikePending(false);
      }
    }
  };

  const handleRepost = async (payload: RepostPayload) => {
    if (!event.interactionMomentId) {
      return;
    }

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
    } catch (error) {
      Alert.alert("Unable to repost", getAuthErrorMessage(error, "Please try again."));
    }
  };

  const handleSave = async () => {
    if (isSavePending) {
      return;
    }

    const previous = isSaved;

    setIsSaved(!previous);
    setIsSavePending(true);

    try {
      const result = await toggleEventSave(event.id);

      if (mountedRef.current) {
        setIsSaved(result.isSaved);
      }
    } catch {
      if (mountedRef.current) {
        setIsSaved(previous);
      }
    } finally {
      if (mountedRef.current) {
        setIsSavePending(false);
      }
    }
  };

  const handleBlock = () => {
    if (!hostId) {
      return;
    }

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
              await blockUser(hostId);
            } catch {
              if (mountedRef.current) {
                setIsHidden(false);
              }
            }
          },
        },
      ],
    );
  };

  if (isHidden) {
    return null;
  }

  return (
    <View style={styles.eventCard}>
      <View style={styles.cardHeader}>
        <TouchableOpacity style={styles.hostRow} activeOpacity={0.75} onPress={goToProfile}>
          <UserAvatar uri={hostAvatarUri} name={hostName} size={40} style={styles.hostAvatar} />
          <View style={styles.hostMeta}>
            <Text style={styles.hostName} numberOfLines={1}>{hostName}</Text>
            <View style={styles.hostSubRow}>
              <Text style={styles.timestamp} numberOfLines={1}>{timestamp}</Text>
              <View style={styles.dot} />
              <Feather name={isPublic ? "globe" : "lock"} size={12} color="#777777" />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          ref={moreBtnRef}
          style={styles.moreButton}
          activeOpacity={0.75}
          onPress={handleMorePress}
        >
          <Feather name="more-horizontal" size={20} color="#B3B3B3" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageFrame}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={styles.eventImage}
            resizeMode="cover"
            onError={() => setBannerFailed(true)}
          />
        ) : (
          <View style={styles.eventImageFallback}>
            <Feather name="calendar" size={34} color="#555555" />
          </View>
        )}

        <TouchableOpacity
          style={styles.imagePressLayer}
          activeOpacity={0.92}
          onPress={goToEvent}
          accessibilityRole="button"
          accessibilityLabel={`Open ${event.name || "event"}`}
        />
        <View pointerEvents="none" style={styles.imageTint} />

        {statusBadge && (
          <View style={[styles.statusBadge, statusBadge.tone === "live" ? styles.liveStatusBadge : styles.pastStatusBadge]}>
            {statusBadge.tone === "live" && <View style={styles.liveDot} />}
            <Text style={[styles.statusBadgeText, statusBadge.tone === "live" ? styles.liveStatusText : styles.pastStatusText]}>
              {statusBadge.label}
            </Text>
          </View>
        )}

        <View style={[styles.eventOverlay, { height: overlayHeight }]}>
          <View style={styles.overlayLeft}>
            <View style={[styles.accentBar, { height: panelHeight }]} />
            <LinearGradient
              colors={["#1F1A23", "rgba(102, 102, 102, 0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.eventInfoPanel, { height: panelHeight }]}
            >
              {categories.length > 0 && (
                <View style={styles.categoriesRow}>
                  {categories.map((category) => (
                    <View
                      key={category}
                      style={[
                        styles.categoryPill,
                        categoryCount >= 3 && styles.categoryPillCompact,
                      ]}
                    >
                      <Text style={styles.categoryText} numberOfLines={1} ellipsizeMode="tail">
                        {category}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.eventTextBlock}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.name?.trim() || "Untitled Event"}
                </Text>

                <View style={styles.eventMetaRow}>
                  {eventDate ? <Text style={styles.eventMetaText} numberOfLines={1}>{eventDate}</Text> : null}
                  {eventDate && eventTimeRange ? <View style={styles.metaDot} /> : null}
                  {eventTimeRange ? <Text style={styles.eventMetaText} numberOfLines={1}>{eventTimeRange}</Text> : null}
                  {(eventDate || eventTimeRange) && distanceOrLocation ? <View style={styles.metaDot} /> : null}
                  {distanceOrLocation ? (
                    <Text style={[styles.eventMetaText, styles.distanceText]} numberOfLines={1}>
                      {distanceOrLocation}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.goingRow}>
                  <Text style={styles.goingText}>{event.memberCount ?? 0} going</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={[styles.overlayRight, { height: panelHeight }]}>
            <TouchableOpacity style={styles.viewMapButton} activeOpacity={0.8} onPress={goToMap}>
              <Text style={styles.viewMapText}>View Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <ProfileEventInteractionBar
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

        {isOwnProfile && (
          <TouchableOpacity style={styles.viewStatButton} activeOpacity={0.8} onPress={goToStats}>
            <Text style={styles.viewStatText}>View Stat</Text>
          </TouchableOpacity>
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
        onRepost={event.interactionMomentId ? handleRepost : undefined}
        shareUrl={`https://mooment.app/events/${event.id}`}
        item={{
          type: "event",
          id: event.id,
          preview: event.name,
          imageUrl: bannerUri,
          authorName: hostName,
          canShareToChat: event.privacy === "public",
          categoryLabels: categories,
          dateTimeLabel: [formatEventDate(event.scheduledAt), formatEventTimeRange(event.scheduledAt, event.endAt)].filter(Boolean).join(" · "),
          locationLabel: distanceOrLocation,
        }}
      />

      <MoreMenuModal
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        showDelete={isOwnProfile}
        deleteLabel="Cancel Event"
        onReport={!isOwnProfile ? () => setShowReportModal(true) : undefined}
        onSave={!isOwnProfile ? handleSave : undefined}
        isSaved={!isOwnProfile ? isSaved : undefined}
        onBlock={!isOwnProfile && Boolean(hostId) ? handleBlock : undefined}
        onDelete={isOwnProfile ? () => onCancelEvent(event) : undefined}
        top={menuTop}
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={() => {
          setShowReportModal(false);
          setTimeout(() => setShowReportDetailsModal(true), 300);
        }}
      />

      <ReportDetailsModal
        visible={showReportDetailsModal}
        onClose={() => setShowReportDetailsModal(false)}
        onDone={() => {
          setShowReportDetailsModal(false);
        }}
      />
    </View>
  );
}

export default function ProfileEvents({
  isOwnProfile = true,
  profileUserId,
  profileIsFollowing,
}: ProfileEventsProps) {
  const [filter, setFilter] = useState<'active' | 'past'>('active');
  const [events, setEvents] = useState<ProfileEventGroups>(EMPTY_PROFILE_EVENTS);
  const user = useAuthStore((state) => state.user);
  const userLocation = useMemo(
    () =>
      typeof user?.currentLocation?.longitude === "number" && typeof user.currentLocation.latitude === "number"
        ? ([user.currentLocation.longitude, user.currentLocation.latitude] as [number, number])
        : null,
    [user?.currentLocation?.latitude, user?.currentLocation?.longitude],
  );
  const fallbackAuthor = useMemo(
    () => ({
      name: user?.name?.trim() || "Mooment User",
      avatar: resolveStorageUrl(user?.avatarKey, null),
    }),
    [user?.avatarKey, user?.name],
  );
  const visibleEvents = useMemo(
    () => events[filter].filter((event) => event.userId.toLowerCase() === profileUserId.toLowerCase()),
    [events, filter, profileUserId],
  );

  const handleCancelEvent = useCallback((event: EventResponse) => {
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
              const cancelledEvent = await cancelEvent(event.id);

              setEvents((prev) => ({
                active: prev.active.filter((e) => e.id !== event.id),
                past: [cancelledEvent, ...prev.past.filter((e) => e.id !== event.id)],
              }));
            } catch (error) {
              Alert.alert("Unable to cancel event", getAuthErrorMessage(error, "Please try again."));
            }
          },
        },
      ],
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadEvents = async () => {
        try {
          const profileEvents = isOwnProfile
            ? await getMyProfileEvents()
            : await getProfileEvents(profileUserId);

          if (isActive) {
            setEvents(profileEvents);
          }
        } catch {
          if (isActive) {
            setEvents(EMPTY_PROFILE_EVENTS);
          }
        }
      };

      void loadEvents();

      return () => {
        isActive = false;
      };
    }, [isOwnProfile, profileUserId]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.toggleWrapper}>
        <BlurView intensity={20} tint="dark" style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, filter === 'active' && styles.toggleBtnActive]}
            onPress={() => setFilter('active')}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Feather name="zap" size={14} color={filter === 'active' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
              <Text style={[styles.toggleText, filter === 'active' && styles.toggleTextActive]}>Active</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, filter === 'past' && styles.toggleBtnActive]}
            onPress={() => setFilter('past')}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Feather name="clock" size={14} color={filter === 'past' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
              <Text style={[styles.toggleText, filter === 'past' && styles.toggleTextActive]}>Past</Text>
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>

      <View style={styles.list}>
        {visibleEvents.map((event) => (
          <ProfileEventCard
            key={event.id}
            event={event}
            filter={filter}
            isOwnProfile={isOwnProfile}
            profileIsFollowing={profileIsFollowing}
            userLocation={userLocation}
            fallbackAuthor={fallbackAuthor}
            onCancelEvent={handleCancelEvent}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
  },
  toggleWrapper: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(104, 104, 104, 0.1)',
    padding: 4,
    height: 40,
    alignItems: 'center',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(104, 104, 104, 0.4)',
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  list: {
    marginTop: 18,
  },
  eventCard: {
    backgroundColor: 'rgba(17, 17, 17, 0.85)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    height: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostAvatar: {
    flexShrink: 0,
  },
  hostMeta: {
    flex: 1,
    minWidth: 0,
    height: 36,
    justifyContent: 'center',
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  hostSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 16,
  },
  timestamp: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#777777',
  },
  moreButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  imageFrame: {
    height: 250,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: '#1C1C1C',
  },
  eventImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  eventImageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#222222',
  },
  imagePressLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  imageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 11, 11, 0.6)',
    zIndex: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    minHeight: 22,
    paddingHorizontal: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  liveStatusBadge: {
    backgroundColor: 'rgba(20, 37, 22, 0.8)',
  },
  pastStatusBadge: {
    backgroundColor: 'rgba(51, 51, 51, 0.72)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0DC143',
  },
  statusBadgeText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  liveStatusText: {
    color: '#0DC143',
  },
  pastStatusText: {
    color: '#FFFFFF',
  },
  eventOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 20,
    zIndex: 4,
  },
  overlayLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 4,
    borderRadius: 999,
    backgroundColor: '#B2ABBA',
    alignSelf: 'stretch',
  },
  eventInfoPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    justifyContent: 'flex-start',
    gap: 8,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '100%',
  },
  categoryPill: {
    maxWidth: 132,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#EDE9F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillCompact: {
    maxWidth: 96,
  },
  categoryText: {
    color: '#111111',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  eventTextBlock: {
    gap: 8,
    minWidth: 0,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: -0.08,
  },
  eventMetaRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMetaText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: -0.08,
    flexShrink: 1,
  },
  distanceText: {
    maxWidth: 72,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    flexShrink: 0,
  },
  goingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 20,
  },
  goingText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    letterSpacing: -0.08,
  },
  overlayRight: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  viewMapButton: {
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(51, 51, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMapText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.08,
  },
  cardFooter: {
    height: 28,
    marginTop: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  interactionAction: {
    minWidth: 43,
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interactionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.08,
  },
  viewStatButton: {
    width: 80,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#B3B3B3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewStatText: {
    color: '#111111',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.08,
  },
});
