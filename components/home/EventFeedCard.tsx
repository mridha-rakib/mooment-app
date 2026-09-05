import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { MAP_MARKER_GLOW_CONFIG } from "@/constants/mapMarkerGlow";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { isEventEndedByTime } from "@/lib/eventStepTwoValidation";
import { cancelEvent, type EventResponse } from "@/lib/events";
import { shareMoment, toggleMomentReaction, toggleMomentSave, type MomentInteractionSummary, type RepostPayload } from "@/lib/moments";
import { getStorageFileUrl } from "@/lib/storage";
import { navigateToProfile } from "@/lib/profileNavigation";
import { retryBlockOnly, submitReportWithOptionalBlock } from "@/lib/reportBlockFlow";
import { submitReport } from "@/lib/reports";
import { notifySuccess } from "@/lib/successFeedback";
import { blockUser, followUser, unfollowUser } from "@/lib/users";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";
import { refreshHostedEventEligibility } from "@/stores/hostedEventEligibilityStore";
import MoreMenuModal from "@/components/post/MoreMenuModal";
import ReportModal from "@/components/modals/ReportModal";
import ReportDetailsModal from "@/components/modals/ReportDetailsModal";
import ReportedContentCard, { type ReportedContentOutcome } from "@/components/post/ReportedContentCard";
import CommentsModal from "@/components/post/CommentsModal";
import ShareModal from "@/components/post/ShareModal";
import PostInteractionBar from "@/components/post/PostInteractionBar";
import UserAvatar from "@/components/ui/UserAvatar";
import PublicGoingSummaryRow from "@/components/events/PublicGoingSummaryRow";
import CrowdStatusBadge from "@/components/events/CrowdStatusBadge";
import EventCancellationReasonModal from "@/components/events/EventCancellationReasonModal";

const TIME_AGO_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const TIME_FORMATTER = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

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
  return TIME_AGO_FORMATTER.format(new Date(dateStr as string));
};

const formatLikedByContext = (event: EventResponse) => {
  const previewNames = (event.socialContext?.previewUsers ?? [])
    .map((user) => user.name?.trim())
    .filter((name): name is string => Boolean(name));
  const total = event.socialContext?.totalMutualReactions ?? 0;

  if (previewNames.length === 0 || total <= 0) {
    return null;
  }

  const remaining = Math.max(0, total - previewNames.length);
  const names = previewNames.join(", ");

  return remaining > 0 ? `${names}... +${remaining} more` : names;
};

const formatDate = (scheduledAt?: string | Date | null): string => {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt as string);
  if (Number.isNaN(d.getTime())) return "";
  return DATE_FORMATTER.format(d);
};

const formatTime = (scheduledAt?: string | Date | null): string => {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt as string);
  if (Number.isNaN(d.getTime())) return "";
  return TIME_FORMATTER.format(d);
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

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

type Props = {
  event: EventResponse;
  headerLabel?: string;
  repostCaption?: string | null;
  taggedFriendNames?: string[];
  onRepostSuccess?: () => void;
  onEventCancelled?: (eventId: string) => void;
  onSaveChange?: (interactionMomentId: string, isSaved: boolean) => void;
  // Fired once a Report+Block flow's block step actually succeeds — lets the
  // Feed screen drop this host's *other* already-rendered items from the
  // currently mounted list. This card's own slot is handled locally below.
  onHostBlocked?: (ownerId: string) => void;
  // Fired after a follow/unfollow of this event's host — optimistically and
  // again once the API call resolves (or rolls back on failure) — so other
  // currently-loaded surfaces representing this same host (feed cards,
  // People-to-follow) can reconcile to the same state.
  onHostFollowChange?: (hostId: string, isFollowing: boolean) => void;
  embedded?: boolean;
};

function EventFeedCard({ event, headerLabel, repostCaption, taggedFriendNames = [], onRepostSuccess, onEventCancelled, onSaveChange, onHostBlocked, onHostFollowChange, embedded = false }: Props) {
  const { colors, isDark } = useTheme();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUser = useAuthStore((s) => s.user);
  const completedProfileTypes = useAuthStore((s) => s.completedProfileTypes);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const loadEventForEdit = useEventDraftStore((s) => s.loadFromEvent);
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
    // minHeight (not a fixed height) below: the panel's real height depends
    // on how many lines the category chips wrap to, which varies with chip
    // label length and device width. A hard `height` guess was previously
    // used here, and content taller than the guess overflowed upward past
    // the panel's top edge (chips escaping the overlay — see screenshot).
    // minHeight preserves the exact original box size in the common,
    // non-wrapping case, but lets the panel grow downward-from-content when
    // chips actually need a second row, instead of clipping/escaping.
    if (categoryCount >= 3) {
      return {
        overlay: { bottom: 6, minHeight: 176, paddingBottom: 8 },
        panel: { minHeight: 160, paddingVertical: 8, gap: 4 },
      };
    }

    if (categoryCount === 2) {
      return {
        overlay: { bottom: 8, minHeight: 158, paddingBottom: 10 },
        panel: { minHeight: 138, paddingVertical: 10, gap: 5 },
      };
    }

    return {
      overlay: { bottom: 0, minHeight: 138, paddingBottom: 20 },
      panel: { minHeight: 118, paddingVertical: 10, gap: 5 },
    };
  }, [categoryCount]);
  const firstCategory = categories[0] ?? null;
  const eventDate = formatDate(event.scheduledAt);
  const eventTime = formatTime(event.scheduledAt);
  const location = getLocation(event);
  const timestamp = timeAgo(event.publishedAt ?? event.createdAt);
  const likedByContext = useMemo(() => formatLikedByContext(event), [event]);
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
  const eventEndedByPersistedTime = isEventEndedByTime(eventEndAt, statusNowMs);
  const eventBadgeStatus = useMemo(
    () => getEventBadgeStatus({
      status: eventStatus,
      scheduledAt: eventScheduledAt,
      endAt: eventEndAt,
    }, statusNowMs),
    [eventEndAt, eventScheduledAt, eventStatus, statusNowMs],
  );
  const eventBadgeLabel = EVENT_STATUS_LABELS[eventBadgeStatus];
  const isLiveBadge = eventBadgeStatus === "live";
  const livePulseProgress = useSharedValue(0);
  const animatedLiveStatusBadgeStyle = useAnimatedStyle(() => {
    if (!isLiveBadge) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }],
      };
    }

    return {
      opacity: interpolate(livePulseProgress.value, [0, 1], [0.82, 1]),
      transform: [{ scale: interpolate(livePulseProgress.value, [0, 1], [1, 1.03]) }],
    };
  }, [isLiveBadge]);
  const animatedLiveStatusDotPulseStyle = useAnimatedStyle(() => {
    if (!isLiveBadge) {
      return { opacity: 0 };
    }

    return {
      opacity: interpolate(livePulseProgress.value, [0, 1], [0.85, 0]),
      transform: [{ scale: interpolate(livePulseProgress.value, [0, 1], [1, 2]) }],
    };
  }, [isLiveBadge]);

  const [isFollowing, setIsFollowing] = useState(Boolean(event.host?.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const mountedRef = useRef(true);
  const moreBtnRef = useRef<View>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const isReportSubmittingRef = useRef(false);
  const [hasReported, setHasReported] = useState(Boolean(event.hasReported));
  const [reportOutcome, setReportOutcome] = useState<ReportedContentOutcome | null>(null);
  const [reportedOwnerId, setReportedOwnerId] = useState<string | null>(null);
  const [isReportedContentRevealed, setIsReportedContentRevealed] = useState(false);
  const [isBlockRetrying, setIsBlockRetrying] = useState(false);
  const isBlockRetryingRef = useRef(false);
  const [menuTop, setMenuTop] = useState(0);
  const [isSaved, setIsSaved] = useState(Boolean(event.isSaved));
  const [isSavePending, setIsSavePending] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (event.hasReported) {
      setHasReported(true);
    }
  }, [event.hasReported]);
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

    // `statusNowMs` is already seeded with the current wall clock by
    // `useState(() => Date.now())` above, so the first render's badge status is
    // correct without any mount-time state update. Re-sampling the clock here
    // only differed from that seed by a few milliseconds yet forced a
    // guaranteed second full render of this (heavy) card on every mount —
    // multiplied by FlatList mount/unmount churn during scroll. Real
    // Upcoming→Live→Ended transitions stay driven by the boundary timer below,
    // which updates `statusNowMs` when an actual scheduledAt/endAt boundary is
    // reached.
    scheduleNextBoundary();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [eventEndAt, eventScheduledAt, eventStatus]);

  useEffect(() => {
    if (!isLiveBadge) {
      cancelAnimation(livePulseProgress);
      livePulseProgress.value = 0;
      return;
    }

    livePulseProgress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: MAP_MARKER_GLOW_CONFIG.livePulseBrightenDurationMs,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: MAP_MARKER_GLOW_CONFIG.livePulseDimDurationMs,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(livePulseProgress);
    };
  }, [isLiveBadge, livePulseProgress]);

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
    onHostFollowChange?.(hostId, !wasFollowing);
    setIsFollowPending(true);

    try {
      const result = wasFollowing ? await unfollowUser(hostId) : await followUser(hostId);
      if (mountedRef.current) setIsFollowing(result.isFollowing);
      onHostFollowChange?.(hostId, result.isFollowing);
    } catch (error) {
      if (mountedRef.current) setIsFollowing(wasFollowing);
      onHostFollowChange?.(hostId, wasFollowing);
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

  // Reuses the exact same guard + loadFromEvent(event) + navigate sequence as
  // event-screen/event.tsx's own handleEdit — no new Event edit backend/UI is
  // introduced here, only this Feed entry point into the existing flow.
  // Skipping loadFromEvent() before navigating risks stale Zustand draft
  // state causing a duplicate draft to be created instead of editing this
  // Event (see eventDraftStore's isEditingPublishedEvent/draftId).
  const handleEditEvent = () => {
    setShowMoreMenu(false);

    if (eventStatus === "completed" || eventStatus === "cancelled" || eventEndedByPersistedTime) {
      return;
    }

    requireBusinessAccountForEvent({
      user: currentUser,
      completedProfileTypes,
      updateProfile,
      router,
      onReady: () => {
        loadEventForEdit(event);
        router.push("/create-event");
      },
    });
  };

  const submitEventCancellation = async (payload: Parameters<typeof cancelEvent>[1]) => {
    if (isCancellingEvent) return;

    setIsCancellingEvent(true);
    try {
      await cancelEvent(event.id, payload);
      await refreshHostedEventEligibility();
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
      if (result.isSaved) notifySuccess("Saved");
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
              // Same cleanup the Report+Block flow performs: drop every
              // already-loaded card from this host, not just this one.
              onHostBlocked?.(targetId);
            } catch {
              if (mountedRef.current) setIsHidden(false);
            }
          },
        },
      ],
    );
  };

  const handleOpenReport = () => {
    if (hasReported) {
      return;
    }

    if (!event.id || !event.userId || !MONGO_OBJECT_ID_PATTERN.test(event.id) || !MONGO_OBJECT_ID_PATTERN.test(event.userId)) {
      Alert.alert('Unable to report event', 'This event can’t be reported right now.');
      return;
    }

    setShowReportModal(true);
  };

  const handleReportReasonSelected = (reason: string) => {
    setReportReason(reason);
    setShowReportModal(false);
    setTimeout(() => setShowReportDetailsModal(true), 300);
  };

  const handleReportDetailsClose = () => {
    if (isReportSubmitting) {
      return;
    }

    setShowReportDetailsModal(false);
    setReportReason(null);
  };

  const handleSubmitReport = async (details: string, alsoBlock: boolean) => {
    if (isReportSubmittingRef.current || !reportReason || !event.userId) {
      return;
    }

    isReportSubmittingRef.current = true;
    setIsReportSubmitting(true);

    try {
      const outcome = await submitReportWithOptionalBlock({
        payload: {
          reportedUserId: event.userId,
          targetType: 'event',
          targetId: event.id,
          reason: reportReason,
          details: details.trim() || null,
        },
        alsoBlock,
        submitReportFn: submitReport,
        blockUserFn: blockUser,
      });

      setShowReportDetailsModal(false);
      setReportReason(null);
      setHasReported(true);

      if (outcome.kind === 'already_reported') {
        Alert.alert('Already reported', 'You have already reported this event.');
        return;
      }

      setReportedOwnerId(event.userId);
      setIsReportedContentRevealed(false);
      setReportOutcome(outcome.kind);

      if (outcome.kind === 'report_block_success') {
        onHostBlocked?.(event.userId);
      }
    } catch (error) {
      Alert.alert('Unable to submit report', getAuthErrorMessage(error, 'Please try again.'));
      throw error;
    } finally {
      isReportSubmittingRef.current = false;
      setIsReportSubmitting(false);
    }
  };

  const handleShowReportedContent = () => {
    setIsReportedContentRevealed(true);
  };

  const handleRetryBlockOwner = async () => {
    if (isBlockRetryingRef.current || !reportedOwnerId) {
      return;
    }

    isBlockRetryingRef.current = true;
    setIsBlockRetrying(true);

    try {
      const result = await retryBlockOnly({ ownerId: reportedOwnerId, blockUserFn: blockUser });

      if (result === 'blocked') {
        setReportOutcome('report_block_success');
        setIsReportedContentRevealed(false);
        onHostBlocked?.(reportedOwnerId);
      }
    } finally {
      isBlockRetryingRef.current = false;
      setIsBlockRetrying(false);
    }
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

  if (reportOutcome && !isReportedContentRevealed) {
    return (
      <ReportedContentCard
        contentLabel="event"
        outcome={reportOutcome}
        onShow={handleShowReportedContent}
        onRetryBlock={handleRetryBlockOwner}
        isRetryingBlock={isBlockRetrying}
      />
    );
  }

  if (isHidden) {
    return null;
  }

  return (
    <View
      key={isDark ? 'dark' : 'light'}
      style={[
        styles.card,
        // Dark mode keeps its exact pre-existing pixel values (approved,
        // frozen) — this component previously had no theme branch at all,
        // so it always rendered dark-styled regardless of the theme
        // setting. Light mode gets a real light card + border instead of a
        // near-black chip sitting on a white page.
        isDark ? styles.cardDark : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
        embedded && (isDark ? styles.embeddedCardDark : { borderWidth: 1, borderColor: colors.border }),
      ]}
    >
      {headerLabel ? (
        <View style={styles.repostContext}>
          <Text style={[styles.repostLabel, { color: isDark ? "#AFAFB8" : colors.textSecondary }]}>{headerLabel}</Text>
          {repostCaption ? <Text style={[styles.repostCaption, { color: isDark ? "#FFFFFF" : colors.text }]}>{repostCaption}</Text> : null}
          {taggedFriendNames.length > 0 ? <Text style={[styles.repostTags, { color: isDark ? "#AFAFB8" : colors.textSecondary }]}>with {taggedFriendNames.join(", ")}</Text> : null}
        </View>
      ) : null}
      {likedByContext ? (
        <Text style={[styles.socialContextText, { color: isDark ? "#FFFFFF" : colors.text }]}>
          <Text style={[styles.socialContextMuted, { color: isDark ? "#AFAFB8" : colors.textSecondary }]}>liked by </Text>
          {likedByContext}
        </Text>
      ) : null}
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.hostRow} activeOpacity={0.7} onPress={goToHostProfile}>
          <UserAvatar uri={hostAvatarUri} name={hostName} size={40} style={styles.avatar} />
          <View style={styles.hostMeta}>
            <Text style={[styles.hostName, { color: isDark ? "#FFFFFF" : colors.text }]} numberOfLines={1}>{hostName}</Text>
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
            <Ionicons name="ellipsis-horizontal" size={18} color={isDark ? "#B3B3B3" : colors.textSecondary} />
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

        <View style={styles.statusBadgeGroup} pointerEvents="none">
          <Animated.View
            style={[
              styles.statusBadge,
              eventBadgeStatus === "live" && styles.liveStatusBadge,
              eventBadgeStatus === "upcoming" && styles.upcomingStatusBadge,
              eventBadgeStatus === "ended" && styles.endedStatusBadge,
              isLiveBadge && animatedLiveStatusBadgeStyle,
            ]}
          >
            <View style={styles.statusDotShell}>
              {isLiveBadge ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.liveStatusDotPulse,
                    { borderColor: colors.danger },
                    animatedLiveStatusDotPulseStyle,
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.statusDot,
                  eventBadgeStatus === "live" && { backgroundColor: colors.danger },
                  eventBadgeStatus === "upcoming" && styles.upcomingStatusDot,
                  eventBadgeStatus === "ended" && styles.endedStatusDot,
                ]}
              />
            </View>
            <Text
              style={[
                styles.statusText,
                eventBadgeStatus === "live" && { color: colors.danger },
                eventBadgeStatus === "upcoming" && styles.upcomingStatusText,
                eventBadgeStatus === "ended" && styles.endedStatusText,
              ]}
            >
              {eventBadgeLabel}
            </Text>
          </Animated.View>
          <CrowdStatusBadge eventStatus={event.status} crowdStatus={event.crowdStatus} />
        </View>

        {/* info section pinned to image bottom */}
        <View style={[styles.infoOverlay, overlayLayout.overlay]}>
          {/* left: accent bar + gradient panel */}
          <View style={styles.infoLeft}>
            <View style={styles.accentBar} />
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
        />
        {canViewEventStats && (
          <>
            <View style={styles.actionBarSpacer} />
            <TouchableOpacity
              style={[styles.viewStatBtn, !isDark && { backgroundColor: colors.backgroundSecondary }]}
              activeOpacity={0.8}
              onPress={goToEventStats}
            >
              <Text style={[styles.viewStatText, { color: isDark ? "#FFFFFF" : colors.text }]}>View Stat</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {commentsVisible && (
        <CommentsModal
          visible={commentsVisible}
          onClose={() => setCommentsVisible(false)}
          momentId={event.interactionMomentId}
          likesCount={likesCount}
          sharesCount={sharesCount}
          onInteractionChange={applyInteractionSummary}
        />
      )}

      {shareVisible && (
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
            categoryLabels: displayCategories,
            dateTimeLabel: [eventDate, eventTime].filter(Boolean).join(" · "),
            locationLabel: location,
          }}
        />
      )}

      {showMoreMenu && (
        <MoreMenuModal
          visible={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          showDelete={isOwnEvent}
          deleteLabel="Cancel Event"
          showEdit={isOwnEvent && eventStatus !== "completed" && eventStatus !== "cancelled" && !eventEndedByPersistedTime}
          onEdit={isOwnEvent ? handleEditEvent : undefined}
          onReport={!isOwnEvent ? handleOpenReport : undefined}
          reported={hasReported}
          onSave={!isOwnEvent ? handleSave : undefined}
          isSaved={!isOwnEvent ? isSaved : undefined}
          onBlock={!isOwnEvent && Boolean(hostId) ? handleBlock : undefined}
          onDelete={isOwnEvent ? handleCancelEvent : undefined}
          top={menuTop}
        />
      )}

      {cancelReasonVisible && (
        <EventCancellationReasonModal
          visible={cancelReasonVisible}
          pending={isCancellingEvent}
          onClose={() => {
            if (!isCancellingEvent) setCancelReasonVisible(false);
          }}
          onSubmit={submitEventCancellation}
        />
      )}

      {showReportModal && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          onReport={handleReportReasonSelected}
        />
      )}

      {showReportDetailsModal && (
        <ReportDetailsModal
          visible={showReportDetailsModal}
          onClose={handleReportDetailsClose}
          onDone={handleSubmitReport}
          isSubmitting={isReportSubmitting}
          showBlockToggle
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  // Dark mode: exact pre-existing pixel values (approved, frozen).
  cardDark: {
    backgroundColor: "rgba(17, 17, 17, 0.95)",
  },
  embeddedCard: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  embeddedCardDark: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  repostContext: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2, gap: 4 },
  repostLabel: { color: "#AFAFB8", fontSize: 12, fontWeight: "700" },
  repostCaption: { color: "#FFFFFF", fontSize: 14, lineHeight: 19 },
  repostTags: { color: "#AFAFB8", fontSize: 12 },
  socialContextText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 2,
  },
  socialContextMuted: {
    color: "#AFAFB8",
    fontWeight: "400",
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
  statusBadgeGroup: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 3,
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    minHeight: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveStatusBadge: {
    backgroundColor: "rgba(72, 11, 10, 0.82)",
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
  statusDotShell: {
    width: 6,
    height: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  liveStatusDotPulse: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 2,
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
    // "stretch" (not "center") so accentBar always spans the panel's real,
    // content-driven height — it no longer relies on a hardcoded number
    // matching the panel's own hardcoded height.
    alignItems: "stretch",
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

export default React.memo(EventFeedCard);

