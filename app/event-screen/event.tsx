import AboutTab from "@/components/eventTabs/AboutTab";
import AccessTab from "@/components/eventTabs/AccessTab";
import ChatTab from "@/components/eventTabs/ChatTab";
// ProductTab hidden — preserved for future restoration
// import ProductTab from "@/components/eventTabs/ProductTab";
import HostEventWindowsTab from "@/components/eventTabs/HostEventWindowsTab";
import AttendeeEventWindowsTab from "@/components/eventTabs/AttendeeEventWindowsTab";
import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
    acceptJoinRequest,
    cancelEvent,
    claimEventReward,
    completeEvent,
    declineJoinRequest,
    deleteEvent,
    deleteEventReward,
    deleteEventTicket,
    getEventById,
    getJoinRequests,
    getMyEventRewardClaims,
    startEvent,
    submitJoinRequest,
    submitEventHostReview,
    ticketAlreadyHasReward,
    updateEvent,
    type EventResponse,
    type EventRewardPayload,
    type EventRewardType,
    type EventTicketPayload,
    type JoinRequest,
    type JoinRequestStatus,
} from "@/lib/events";
import { getEventTicketStats, getMyTicketPurchaseCounts, type TicketStatEntry } from "@/lib/payments";
import { getStorageFileUrl } from "@/lib/storage";
import { navigateToProfile } from "@/lib/profileNavigation";
import { followUser, unfollowUser } from "@/lib/users";
import { toggleMomentReaction, toggleMomentSave, shareMoment, type MomentInteractionSummary, type RepostPayload } from "@/lib/moments";
import CommentsModal from "@/components/post/CommentsModal";
import ShareModal from "@/components/post/ShareModal";
import ReportModal from "@/components/modals/ReportModal";
import ReportDetailsModal from "@/components/modals/ReportDetailsModal";
import PostInteractionBar from "@/components/post/PostInteractionBar";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { createReport } from "@/lib/reports";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";
import type { EventCategory } from "@/constants/eventCategories";
import { getEventDetailsCategoryDestination } from "@/lib/eventCategoryNavigation";
import { Feather } from "@expo/vector-icons";
import {
    Bookmark01Icon,
    Delete02Icon,
    Flag01Icon,
    MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop";

const isDirectMediaUrl = (value?: string | null) =>
  Boolean(value && /^(https?:|data:|file:|content:)/i.test(value.trim()));

const getNonEmptyString = (...values: (string | null | undefined)[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

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

const formatEventDate = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return "Date TBA";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatEventTime = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return "Time TBA";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Time TBA";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

function resolveStorageUrl(key: string | null | undefined, fallback: string): string;
function resolveStorageUrl(key?: string | null, fallback?: string | null): string | null;
function resolveStorageUrl(key?: string | null, fallback: string | null = null) {
  if (!key) {
    return fallback;
  }

  if (isDirectMediaUrl(key)) {
    return key.trim();
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
}

const formatPrice = (tickets: EventResponse["tickets"]) => {
  const prices = tickets
    .map((ticket) => (ticket.type === "free" ? 0 : ticket.price))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0 || Math.min(...prices) <= 0) {
    return "Free";
  }

  const price = Math.min(...prices);

  return `From $${price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  })}`;
};

const getTicketsLeft = (tickets: EventResponse["tickets"]) =>
  tickets.reduce((total, ticket) => total + Math.max(0, ticket.availableCount ?? ticket.capacity), 0);

const getTicketKey = (ticket: EventTicketPayload, index: number) =>
  ticket.id ?? `${ticket.name}-${index}`;

const clampTicketQuantity = (quantity: number, ticket: EventTicketPayload) =>
  Math.min(Math.max(1, quantity), Math.min(2, Math.max(1, ticket.availableCount ?? ticket.capacity)));

const getTicketSalesEndDate = (ticket?: EventTicketPayload | null) => {
  if (!ticket?.salesEndAt) {
    return null;
  }

  const salesEndAt = new Date(ticket.salesEndAt);

  return Number.isNaN(salesEndAt.getTime()) ? null : salesEndAt;
};

const isTicketSalesEnded = (ticket?: EventTicketPayload | null, nowMs = Date.now()) => {
  const salesEndAt = getTicketSalesEndDate(ticket);

  return Boolean(salesEndAt && salesEndAt.getTime() <= nowMs);
};

const formatTicketPurchasePrice = (ticket: EventTicketPayload, quantity = 1) => {
  if (ticket.type === "free" || ticket.price <= 0) {
    return "Free";
  }

  const total = ticket.price * quantity;

  return `$${total.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(total) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(total) ? 0 : 2,
  })}`;
};

const getDistanceLabel = (
  event: EventResponse | null,
  userLocation: [number, number] | null,
): string => {
  const latitude = event?.location?.latitude;
  const longitude = event?.location?.longitude;

  if (
    userLocation &&
    isFiniteCoordinate(latitude) &&
    isFiniteCoordinate(longitude)
  ) {
    const miles = getDistanceMiles(userLocation, [longitude, latitude]);

    if (miles < 0.1) {
      return "nearby";
    }

    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()} mi`;
  }

    return "nearby";
};

const getBannerImageUri = (event?: EventResponse | null) =>
  resolveStorageUrl(event?.bannerOriginalImageKey ?? event?.bannerImageKey, DEFAULT_BANNER);

const getEventBannerImageUris = (event?: EventResponse | null) => {
  const urls = [
    event?.bannerImageKey ? resolveStorageUrl(event.bannerImageKey, DEFAULT_BANNER) : null,
    event?.bannerOriginalImageKey ? resolveStorageUrl(event.bannerOriginalImageKey, DEFAULT_BANNER) : null,
  ].filter((url): url is string => Boolean(url));

  return [...new Set(urls)];
};

const getHostAvatarUri = (event?: EventResponse | null) => {
  const avatarKey = getNonEmptyString(event?.host?.avatarKey);

  if (avatarKey) {
    return resolveStorageUrl(avatarKey, null);
  }

  const avatarUrl = getNonEmptyString(event?.host?.avatarUrl);

  if (avatarUrl) {
    return resolveStorageUrl(avatarUrl, null);
  }

  return null;
};

const getHostHandle = (event?: EventResponse | null) => {
  const handle = event?.host?.username?.trim().replace(/^@+/, "");

  return handle ? `@${handle}` : "";
};

const getHeroCategoryTags = (event?: EventResponse | null) => {
  if (!event) {
    return [];
  }

  const tags = event.categories?.length
    ? event.categories
    : event.category
      ? [event.category]
      : [];

  return tags.slice(0, 3);
};

const getPrivacyLabel = (privacy?: EventResponse["privacy"]) => {
  if (privacy === "private") return "Private Event";
  if (privacy === "locked") return "Locked Event";
  return "Public Event";
};

const isSameId = (left?: string | null, right?: string | null) =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const goBackOrHome = (router: ReturnType<typeof useRouter>) => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/home");
};

const EventScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; id?: string; mode?: string; source?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const draftId = useEventDraftStore((state) => state.draftId);
  const loadEventForEdit = useEventDraftStore((state) => state.loadFromEvent);
  const [activeTab, setActiveTab] = useState("About");
  const [menuVisible, setMenuVisible] = useState(false);
  const [privacyDropdownVisible, setPrivacyDropdownVisible] = useState(false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [deletingRewardId, setDeletingRewardId] = useState<string | null>(null);
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);
  const [claimedRewardIds, setClaimedRewardIds] = useState<string[]>([]);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasedTicketCounts, setPurchasedTicketCounts] = useState<Record<string, number>>({});
  const [ticketStats, setTicketStats] = useState<Record<string, TicketStatEntry> | undefined>(undefined);
  const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(null);
  const [selectedTicketQuantity, setSelectedTicketQuantity] = useState(1);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const [accessSubTab, setAccessSubTab] = useState("Tickets");
  const isEventStarted = event?.status === 'live';
  const isEventCompleted = event?.status === 'completed';
  const isEventCancelled = event?.status === 'cancelled';
  const [selectedReward, setSelectedReward] = useState<EventRewardPayload | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [submittingJoinRequest, setSubmittingJoinRequest] = useState(false);
  const [acceptingJoinRequestId, setAcceptingJoinRequestId] = useState<string | null>(null);
  const [decliningJoinRequestId, setDecliningJoinRequestId] = useState<string | null>(null);
  const [myJoinRequestStatus, setMyJoinRequestStatus] = useState<JoinRequestStatus | null>(null);
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const [localCommentsCount, setLocalCommentsCount] = useState(0);
  const [localSharesCount, setLocalSharesCount] = useState(0);
  const [localIsLiked, setLocalIsLiked] = useState(false);
  const [isLikePending, setIsLikePending] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportReasonVisible, setReportReasonVisible] = useState(false);
  const [reportDetailsVisible, setReportDetailsVisible] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const isReportSubmittingRef = useRef(false);
  const pendingCategoryNavigationRef = useRef<EventCategory | null>(null);
  const [localIsSaved, setLocalIsSaved] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewLiked, setReviewLiked] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const eventId = useMemo(() => {
    const explicitId = typeof params.eventId === "string" ? params.eventId : typeof params.id === "string" ? params.id : null;

    return explicitId ?? draftId;
  }, [draftId, params.eventId, params.id]);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTimeMs(Date.now()), 30000);

    return () => clearInterval(intervalId);
  }, []);

  const isEventOwner = Boolean(
    event && (isSameId(currentUser?.id, event.userId) || isSameId(currentUser?.id, event.host?.id)),
  );
  const isHostMode = params.mode === "host" || isEventOwner;

  const userLocation = useMemo(
    () =>
      typeof currentUser?.currentLocation?.longitude === "number" &&
      typeof currentUser.currentLocation.latitude === "number"
        ? ([currentUser.currentLocation.longitude, currentUser.currentLocation.latitude] as [number, number])
        : null,
    [currentUser?.currentLocation?.latitude, currentUser?.currentLocation?.longitude],
  );

  useEffect(() => {
    let isActive = true;

    const loadEvent = async () => {
      if (!eventId) {
        Alert.alert("Unable to load event", "Missing event id.");
        goBackOrHome(router);
        return;
      }

      setIsLoading(true);

      try {
        const [loadedEvent, loadedClaims, loadedCounts] = await Promise.all([
          getEventById(eventId),
          getMyEventRewardClaims(eventId).catch(() => []),
          getMyTicketPurchaseCounts(eventId).catch(() => ({})),
        ]);

        if (!isActive) {
          return;
        }

        setEvent(loadedEvent);
        setIsFollowing(Boolean(loadedEvent.host?.isFollowing));
        setClaimedRewardIds(loadedClaims.map((c) => c.rewardId));
        setPurchasedTicketCounts(loadedCounts);
        setMyJoinRequestStatus(loadedEvent.myJoinRequestStatus ?? null);

        const isEventOwner =
          currentUser?.id &&
          (loadedEvent.userId === currentUser.id || loadedEvent.host?.id === currentUser.id);

        if (loadedEvent.privacy === "locked" && isEventOwner) {
          getJoinRequests(eventId).then(setJoinRequests).catch(() => {});
        }
      } catch {
        if (!isActive) {
          return;
        }

        Alert.alert("Unable to load event", "Please try again.");
        goBackOrHome(router);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadEvent();

    return () => {
      isActive = false;
    };
  }, [currentUser?.id, eventId, router]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      if (!eventId || isLoading) {
        return () => {
          isActive = false;
        };
      }

      const refreshEvent = async () => {
        try {
          const [loadedEvent, loadedClaims, loadedCounts] = await Promise.all([
            getEventById(eventId),
            getMyEventRewardClaims(eventId).catch(() => []),
            getMyTicketPurchaseCounts(eventId).catch(() => ({})),
          ]);

          if (!isActive) {
            return;
          }

          setEvent(loadedEvent);
          setIsFollowing(Boolean(loadedEvent.host?.isFollowing));
          setClaimedRewardIds(loadedClaims.map((c) => c.rewardId));
          setPurchasedTicketCounts(loadedCounts);
        } catch {
          // Initial loading handles user-facing errors. Focus refreshes stay quiet.
        }
      };

      void refreshEvent();

      return () => {
        isActive = false;
      };
    }, [eventId, isLoading]),
  );

  useEffect(() => {
    if (!isHostMode || !eventId) return;
    let cancelled = false;

    getEventTicketStats(eventId)
      .then((stats) => {
        if (!cancelled) setTicketStats(stats);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isHostMode, eventId]);

  const updateHostFollowState = (nextIsFollowing: boolean) => {
    setIsFollowing(nextIsFollowing);
    setEvent((currentEvent) => {
      if (!currentEvent?.host) {
        return currentEvent;
      }

      const wasFollowing = Boolean(currentEvent.host.isFollowing);
      const followerDelta = nextIsFollowing === wasFollowing ? 0 : nextIsFollowing ? 1 : -1;
      const currentFollowers = currentEvent.host.followersCount ?? 0;

      return {
        ...currentEvent,
        host: {
          ...currentEvent.host,
          isFollowing: nextIsFollowing,
          followersCount: Math.max(0, currentFollowers + followerDelta),
        },
      };
    });
  };

  const toggleHostFollow = async () => {
    const hostId = event?.host?.id;

    if (!hostId || isHostMode || isFollowPending) {
      return;
    }

    const wasFollowing = isFollowing;
    updateHostFollowState(!wasFollowing);
    setIsFollowPending(true);

    try {
      const follow = wasFollowing ? await unfollowUser(hostId) : await followUser(hostId);
      updateHostFollowState(follow.isFollowing);
    } catch (error) {
      updateHostFollowState(wasFollowing);
      Alert.alert(
        wasFollowing ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsFollowPending(false);
    }
  };

  const handleHostProfilePress = () => {
    if (!event) return;

    const hostId = event.host?.id ?? event.userId;

    navigateToProfile(router, currentUser?.id, {
      userId: hostId,
      name: hostName,
      avatar: hostAvatarUri,
      isFollowing,
    });
  };

  const handleHeroCategoryPress = useCallback((category: string) => {
    const destination = getEventDetailsCategoryDestination(params.source, category);

    if (!destination) {
      return;
    }

    if (pendingCategoryNavigationRef.current === destination.params.category) {
      return;
    }

    pendingCategoryNavigationRef.current = destination.params.category;

    if (destination.pathname === "/(tabs)/home") {
      router.replace(destination as never);
      return;
    }

    router.push(destination as never);
  }, [params.source, router]);

  const ticketsLeft = getTicketsLeft(event?.tickets ?? []);
  const priceLabel = formatPrice(event?.tickets ?? []);
  const selectedTicket = useMemo(() => {
    if (!selectedTicketKey) {
      return null;
    }

    return (event?.tickets ?? []).find((ticket, index) => getTicketKey(ticket, index) === selectedTicketKey) ?? null;
  }, [event?.tickets, selectedTicketKey]);
  const selectedTicketPriceLabel = selectedTicket
    ? formatTicketPurchasePrice(selectedTicket, selectedTicketQuantity)
    : priceLabel;
  const selectedTicketSalesEnded = isTicketSalesEnded(selectedTicket, currentTimeMs);
  const footerPriceLabel = selectedTicket
    ? `${selectedTicketQuantity} ${selectedTicketQuantity === 1 ? "ticket" : "tickets"}`
    : "From";
  const hostName = event?.host?.name ?? "Host";
  const hostHandle = getHostHandle(event);
  const hostAvatarUri = getHostAvatarUri(event);
  const canReviewHost = Boolean(event?.hostReviewEligibility?.canReview);

  const bannerImageUri = getBannerImageUri(event);
  const eventImageUris = useMemo(() => {
    const bannerUris = getEventBannerImageUris(event);

    return bannerUris.length > 0 ? bannerUris : [bannerImageUri];
  }, [bannerImageUri, event]);
  const distanceLabel = getDistanceLabel(event, userLocation);
  const eventDate = formatEventDate(event?.scheduledAt);
  const eventTime = formatEventTime(event?.scheduledAt);
  const goingCount = (event as EventResponse & { attendeesCount?: number | null } | null)?.attendeesCount ?? 0;
  const eventStats = event as
    | (EventResponse & {
        attendeesCount?: number | null;
        likesCount?: number | null;
        commentsCount?: number | null;
        sharesCount?: number | null;
        isLiked?: boolean;
        isSaved?: boolean;
        interactionMomentId?: string | null;
        canReport?: boolean;
      })
    | null;
  const interactionMomentId = eventStats?.interactionMomentId ?? null;
  const canReportEvent = Boolean(eventStats?.canReport);

  useEffect(() => {
    setLocalLikesCount(eventStats?.likesCount ?? 0);
    setLocalCommentsCount(eventStats?.commentsCount ?? 0);
    setLocalSharesCount(eventStats?.sharesCount ?? 0);
    setLocalIsLiked(Boolean(eventStats?.isLiked));
    setLocalIsSaved(Boolean(eventStats?.isSaved));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  useEffect(() => {
    if (!selectedTicketKey) {
      setSelectedTicketQuantity(1);
      return;
    }

    const currentTicket = (event?.tickets ?? []).find((ticket, index) => getTicketKey(ticket, index) === selectedTicketKey);

    if (!currentTicket || (currentTicket.availableCount ?? currentTicket.capacity) <= 0) {
      setSelectedTicketKey(null);
      setSelectedTicketQuantity(1);
      return;
    }

    setSelectedTicketQuantity((quantity) => clampTicketQuantity(quantity, currentTicket));
  }, [event?.tickets, selectedTicketKey]);

  const handleLike = async () => {
    if (!interactionMomentId || isLikePending) return;

    const prevIsLiked = localIsLiked;
    const prevCount = localLikesCount;
    setLocalIsLiked(!prevIsLiked);
    setLocalLikesCount(prevIsLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setIsLikePending(true);

    try {
      const summary = await toggleMomentReaction(interactionMomentId);
      setLocalIsLiked(summary.isLiked);
      setLocalLikesCount(summary.likesCount);
    } catch {
      setLocalIsLiked(prevIsLiked);
      setLocalLikesCount(prevCount);
    } finally {
      setIsLikePending(false);
    }
  };

  const handleInteractionChange = (summary: MomentInteractionSummary) => {
    setLocalCommentsCount(summary.commentsCount);
    setLocalLikesCount(summary.likesCount);
  };

  const handleShare = () => {
    setShowShare(true);
  };

  const handleRepost = async (payload: RepostPayload) => {
    if (!interactionMomentId) return;
    try {
      const share = await shareMoment(interactionMomentId, payload);
      setLocalSharesCount(share.moment.sharesCount);
      setShowShare(false);
    } catch (error) {
      Alert.alert("Unable to repost", getAuthErrorMessage(error, "Please try again."));
      throw error;
    }
  };

  const handleReportPress = () => {
    setMenuVisible(false);

    if (!event || !canReportEvent) {
      return;
    }

    if (!MONGO_OBJECT_ID_PATTERN.test(event.id) || !MONGO_OBJECT_ID_PATTERN.test(event.userId)) {
      Alert.alert("Unable to report event", "This event cannot be reported right now.");
      return;
    }

    setReportReasonVisible(true);
  };

  const handleReportReason = (reason: string) => {
    setReportReason(reason);
    setReportReasonVisible(false);
    setTimeout(() => setReportDetailsVisible(true), 300);
  };

  const handleReportDetailsClose = () => {
    if (isReportSubmitting) return;
    setReportDetailsVisible(false);
    setReportReason(null);
  };

  const handleSubmitEventReport = async (details: string) => {
    if (isReportSubmittingRef.current || !reportReason || !event) {
      return;
    }

    isReportSubmittingRef.current = true;
    setIsReportSubmitting(true);

    try {
      await createReport({
        reportedUserId: event.userId,
        targetType: "event",
        targetId: event.id,
        reason: reportReason,
        details: details.trim() || null,
      });
      setReportDetailsVisible(false);
      setReportReason(null);
      Alert.alert(
        "Report submitted",
        "Thanks for letting us know. Our team will review this event.",
      );
    } catch (error) {
      Alert.alert("Unable to submit report", getAuthErrorMessage(error, "Please try again."));
      throw error;
    } finally {
      isReportSubmittingRef.current = false;
      setIsReportSubmitting(false);
    }
  };

  const handleSave = async () => {
    setMenuVisible(false);

    if (!interactionMomentId || isSavePending) {
      return;
    }

    const wasSaved = localIsSaved;
    setLocalIsSaved(!wasSaved);
    setIsSavePending(true);

    try {
      const summary = await toggleMomentSave(interactionMomentId);
      setLocalIsSaved(summary.isSaved);
      setEvent((currentEvent) => currentEvent ? { ...currentEvent, isSaved: summary.isSaved } : currentEvent);
    } catch (error) {
      setLocalIsSaved(wasSaved);
      Alert.alert("Unable to save event", getAuthErrorMessage(error, "Please try again."));
    } finally {
      setIsSavePending(false);
    }
  };

  const handleEdit = () => {
    setMenuVisible(false);

    if (!event || !isHostMode) {
      return;
    }

    if (isEventCompleted || isEventCancelled) {
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

  const handleDelete = () => {
    setMenuVisible(false);

    if (!event || !isHostMode || isDeletingEvent) {
      return;
    }

    requireBusinessAccountForEvent({
      user: currentUser,
      completedProfileTypes,
      updateProfile,
      router,
      onReady: () => {
        Alert.alert(
          "Delete Event",
          "Are you sure you want to delete this event?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                setIsDeletingEvent(true);

                try {
                  await deleteEvent(event.id);
                  goBackOrHome(router);
                } catch (error) {
                  Alert.alert("Unable to delete event", getAuthErrorMessage(error, "Please try again."));
                } finally {
                  setIsDeletingEvent(false);
                }
              },
            },
          ],
        );
      },
    });
  };

  const handleCancelEvent = () => {
    if (!event || !isHostMode) {
      return;
    }

    requireBusinessAccountForEvent({
      user: currentUser,
      completedProfileTypes,
      updateProfile,
      router,
      onReady: () => {
        Alert.alert(
          "Cancel Event",
          "Are you sure you want to cancel this event? This action cannot be undone.",
          [
            { text: "No, Go Back", style: "cancel" },
            {
              text: "Yes, Cancel Event",
              style: "destructive",
              onPress: async () => {
                try {
                  const updated = await cancelEvent(event.id);
                  mergeUpdatedEvent(updated);
                } catch (error) {
                  Alert.alert("Unable to cancel event", getAuthErrorMessage(error, "Please try again."));
                }
              },
            },
          ],
        );
      },
    });
  };

  const handleStartEvent = () => {
    if (!event || !isHostMode) {
      return;
    }

    requireBusinessAccountForEvent({
      user: currentUser,
      completedProfileTypes,
      updateProfile,
      router,
      onReady: () => {
        Alert.alert(
          "Start Event",
          "Are you ready to start this event? Attendees will be notified.",
          [
            { text: "Not Yet", style: "cancel" },
            {
              text: "Start Now",
              onPress: async () => {
                try {
                  const updated = await startEvent(event.id);
                  mergeUpdatedEvent(updated);
                  router.push({
                    pathname: "/profile-screen/event-dashboard",
                    params: { eventId: event.id, eventName: event.name ?? "Event" },
                  });
                } catch (error) {
                  Alert.alert("Unable to start event", getAuthErrorMessage(error, "Please try again."));
                }
              },
            },
          ],
        );
      },
    });
  };

  const handleEndEvent = () => {
    if (!event || !isHostMode) {
      return;
    }

    requireBusinessAccountForEvent({
      user: currentUser,
      completedProfileTypes,
      updateProfile,
      router,
      onReady: () => {
        Alert.alert(
          "End Event",
          "Mark this event as successfully completed? This action cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "End Event",
              style: "destructive",
              onPress: async () => {
                try {
                  const updated = await completeEvent(event.id);
                  mergeUpdatedEvent(updated);
                } catch (error) {
                  Alert.alert("Unable to end event", getAuthErrorMessage(error, "Please try again."));
                }
              },
            },
          ],
        );
      },
    });
  };

  const mergeUpdatedEvent = (updatedEvent: EventResponse) => {
    setEvent((currentEvent) =>
      currentEvent
        ? {
            ...currentEvent,
            ...updatedEvent,
            host: updatedEvent.host ?? currentEvent.host,
          }
        : updatedEvent,
    );
  };

  const handleCreateTicket = () => {
    if (!event || !isHostMode) {
      return;
    }

    if (isEventCompleted || isEventCancelled) {
      return;
    }

    loadEventForEdit(event);
    router.push("/create-event/ticket-details");
  };

  const handleEditTicket = (ticket: EventTicketPayload) => {
    if (!event || !isHostMode) {
      return;
    }

    if (isEventCompleted || isEventCancelled) {
      return;
    }

    loadEventForEdit(event);

    const draftTicket = useEventDraftStore
      .getState()
      .tickets.find((item) => (ticket.id ? item.id === ticket.id : item.name === ticket.name));

    if (!draftTicket) {
      Alert.alert("Unable to edit ticket", "Please try again.");
      return;
    }

    router.push({
      pathname: "/create-event/ticket-details",
      params: { localId: draftTicket.localId },
    });
  };

  const handleViewTicket = (ticket: EventTicketPayload) => {
    if (!event) {
      return;
    }

    router.push({
      pathname: "/event-screen/ticket-detail",
      params: {
        eventId: event.id,
        ticketId: ticket.id ?? ticket.name,
        mode: isHostMode ? "host" : "guest",
      },
    });
  };

  const handleSelectTicket = (ticket: EventTicketPayload, ticketKey: string) => {
    if ((ticket.availableCount ?? ticket.capacity) <= 0) {
      return;
    }

    const ticketId = ticket.id ?? ticket.name;
    const alreadyPurchased = purchasedTicketCounts[ticketId] ?? 0;

    if (alreadyPurchased >= 2) {
      return;
    }

    if (selectedTicketKey === ticketKey) {
      setSelectedTicketKey(null);
      setSelectedTicketQuantity(1);
      return;
    }

    setSelectedTicketKey(ticketKey);
    setSelectedTicketQuantity(1);
  };

  const handleExpiredTicketPress = () => {
    Alert.alert(
      "Ticket sales ended",
      "Sales for this ticket have ended. Please choose another available ticket.",
    );
  };

  const handleTicketQuantityChange = (
    ticket: EventTicketPayload,
    ticketKey: string,
    quantity: number,
  ) => {
    if ((ticket.availableCount ?? ticket.capacity) <= 0 || isTicketSalesEnded(ticket)) {
      return;
    }

    setSelectedTicketKey(ticketKey);
    setSelectedTicketQuantity(clampTicketQuantity(quantity, ticket));
  };

  const handleBuySelectedTicket = () => {
    if (!event || !selectedTicket || !selectedTicketKey) {
      return;
    }

    if (isTicketSalesEnded(selectedTicket)) {
      Alert.alert(
        "Ticket sales ended",
        "Sales for this ticket have ended. Please choose another available ticket.",
      );
      return;
    }

    const ticketId = selectedTicket.id ?? selectedTicket.name;
    const alreadyPurchased = purchasedTicketCounts[ticketId] ?? 0;
    const maxAllowed = Math.max(0, 2 - alreadyPurchased);

    if (maxAllowed <= 0) {
      return;
    }

    const quantity = Math.min(clampTicketQuantity(selectedTicketQuantity, selectedTicket), maxAllowed);

    const linkedReward = (event.rewards ?? []).find(
      (r) => r.rewardType === "ticket" && r.ticketId === ticketId && r.id,
    );

    router.push({
      pathname: "/event-screen/checkout",
      params: {
        eventId: event.id,
        eventName: event.name ?? "Event",
        eventDateTime: `${eventDate} • ${eventTime} • ${hostName}`,
        eventDateDisplay: `${eventDate} • ${eventTime}`,
        hostName,
        venue: event.location?.venue ?? event.location?.searchLabel ?? "",
        address: event.location?.address ?? event.location?.searchLabel ?? "",
        ticketId,
        ticketKey: selectedTicketKey,
        ticketName: selectedTicket.name,
        ticketType: selectedTicket.type,
        ticketPrice: String(selectedTicket.price),
        quantity: String(quantity),
        rewardId: linkedReward?.id ?? "",
        rewardBuyQuantity: linkedReward ? String(linkedReward.buyQuantity) : "",
        rewardFreeQuantity: linkedReward ? String(linkedReward.freeQuantity) : "",
      },
    });
  };

  const handleTicketCtaPress = () => {
    if (!selectedTicket || !selectedTicketKey) {
      setActiveTab("Access");
      setAccessSubTab("Tickets");
      return;
    }

    handleBuySelectedTicket();
  };

  const handleSubmitHostReview = async () => {
    if (!event || reviewLiked === null || isSubmittingReview) {
      return;
    }

    setIsSubmittingReview(true);

    try {
      await submitEventHostReview(event.id, {
        liked: reviewLiked,
        text: reviewText.trim() || null,
      });
      setReviewModalVisible(false);
      setReviewLiked(null);
      setReviewText("");
      setEvent((currentEvent) =>
        currentEvent
          ? {
              ...currentEvent,
              hostReviewEligibility: {
                canReview: false,
                hasReviewed: true,
              },
            }
          : currentEvent,
      );
      Alert.alert("Review submitted", "Thanks for reviewing the host.");
    } catch (error) {
      Alert.alert("Unable to submit review", getAuthErrorMessage(error, "Please try again."));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteTicket = (ticket: EventTicketPayload) => {
    if (!event || !isHostMode) {
      return;
    }

    const ticketId = ticket.id ?? ticket.name;

    Alert.alert(
      "Delete Ticket",
      "Are you sure you want to delete this ticket?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingTicketId(ticketId);

            try {
              const updatedEvent = await deleteEventTicket(event.id, ticketId);

              mergeUpdatedEvent(updatedEvent);
            } catch (error) {
              Alert.alert("Unable to delete ticket", getAuthErrorMessage(error, "Please try again."));
            } finally {
              setDeletingTicketId(null);
            }
          },
        },
      ],
    );
  };

  const openRewardForm = (rewardType: EventRewardType, reward?: EventRewardPayload) => {
    if (!event || !isHostMode) {
      return;
    }

    router.push({
      pathname: "/event-screen/reward-details",
      params: {
        eventId: event.id,
        rewardType,
        ...(reward?.id ? { rewardId: reward.id } : {}),
      },
    });
  };

  const handleCreateReward = () => {
    if (!event || !isHostMode) {
      return;
    }

    if (event.tickets.length === 0) {
      Alert.alert(
        "Create a ticket first",
        "A ticket reward must be linked to a ticket. Create a ticket before adding a reward.",
      );
      return;
    }

    const hasAvailableTicket = event.tickets.some(
      (ticket) => !ticketAlreadyHasReward(event.rewards, ticket.id ?? ticket.name),
    );

    if (!hasAvailableTicket) {
      Alert.alert(
        "All tickets already have rewards",
        "Each ticket can have only one reward. Edit or delete an existing reward, or create another ticket before adding a new reward.",
      );
      return;
    }

    Alert.alert(
      "Create Reward",
      "Choose the reward type.",
      [
        // { text: "Product reward", onPress: () => openRewardForm("product") },
        { text: "Ticket reward", onPress: () => openRewardForm("ticket") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handleEditReward = (reward: EventRewardPayload) => {
    openRewardForm(reward.rewardType, reward);
  };

  const handleViewReward = (reward: EventRewardPayload) => {
    setSelectedReward(reward);
  };

  const handleDeleteReward = (reward: EventRewardPayload) => {
    if (!event || !isHostMode) {
      return;
    }

    const rewardId = reward.id ?? reward.name;

    Alert.alert(
      "Delete Reward",
      "Are you sure you want to delete this reward?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingRewardId(rewardId);

            try {
              const updatedEvent = await deleteEventReward(event.id, rewardId);

              mergeUpdatedEvent(updatedEvent);
            } catch (error) {
              Alert.alert("Unable to delete reward", getAuthErrorMessage(error, "Please try again."));
            } finally {
              setDeletingRewardId(null);
            }
          },
        },
      ],
    );
  };

  const handleClaimReward = async (reward: EventRewardPayload) => {
    if (!event || isHostMode) {
      return;
    }

    const rewardId = reward.id;

    if (!rewardId) {
      Alert.alert("Unable to claim reward", "Reward information is incomplete.");
      return;
    }

    if (reward.rewardType === "ticket" && reward.ticketId) {
      const linkedTicket = (event.tickets ?? []).find((t) => t.id === reward.ticketId);

      if (linkedTicket && linkedTicket.type !== "free" && linkedTicket.price > 0) {
        const alreadyPurchased = purchasedTicketCounts[reward.ticketId] ?? 0;

        if (alreadyPurchased === 0) {
          Alert.alert(
            "Purchase required",
            "You need to purchase this ticket first before claiming the reward.",
          );
          return;
        }
      }
    }

    setClaimingRewardId(rewardId);

    try {
      await claimEventReward(event.id, rewardId);
      setClaimedRewardIds((prev) => [...prev, rewardId]);
    } catch (error) {
      const message = getAuthErrorMessage(error, "Please try again.");
      Alert.alert("Unable to claim reward", message);
    } finally {
      setClaimingRewardId(null);
    }
  };

  const handleAddMembers = () => {
    if (!event || isEventCompleted || isEventCancelled) return;
    router.push({
      pathname: "/event-screen/members",
      params: { eventId: event.id },
    });
  };

  const handleSubmitJoinRequest = async () => {
    if (!event || submittingJoinRequest) {
      return;
    }

    setSubmittingJoinRequest(true);

    try {
      const result = await submitJoinRequest(event.id);
      setMyJoinRequestStatus(result.status);
    } catch {
      Alert.alert("Unable to submit request", "Please try again.");
    } finally {
      setSubmittingJoinRequest(false);
    }
  };

  const handleAcceptJoinRequest = async (userId: string) => {
    if (!event || acceptingJoinRequestId) {
      return;
    }

    setAcceptingJoinRequestId(userId);

    try {
      await acceptJoinRequest(event.id, userId);
      setJoinRequests((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, status: "accepted" as JoinRequestStatus } : r)),
      );
    } catch {
      Alert.alert("Unable to accept request", "Please try again.");
    } finally {
      setAcceptingJoinRequestId(null);
    }
  };

  const handleDeclineJoinRequest = async (userId: string) => {
    if (!event || decliningJoinRequestId) {
      return;
    }

    setDecliningJoinRequestId(userId);

    try {
      await declineJoinRequest(event.id, userId);
      setJoinRequests((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, status: "declined" as JoinRequestStatus } : r)),
      );
    } catch {
      Alert.alert("Unable to decline request", "Please try again.");
    } finally {
      setDecliningJoinRequestId(null);
    }
  };

  const handlePrivacyChange = async (newPrivacy: "public" | "locked") => {
    setPrivacyDropdownVisible(false);

    if (!event || !isHostMode || isUpdatingPrivacy || event.privacy === newPrivacy) {
      return;
    }

    if (isEventCompleted || isEventCancelled) {
      return;
    }

    setIsUpdatingPrivacy(true);

    try {
      const updatedEvent = await updateEvent(event.id, { privacy: newPrivacy });
      mergeUpdatedEvent(updatedEvent);
    } catch (error) {
      Alert.alert("Unable to update privacy", getAuthErrorMessage(error, "Please try again."));
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.headerActions, { top: insets.top + 10 }]}>
      <BackButton color={colors.text} onPress={() => goBackOrHome(router)} />
      {isHostMode && event?.privacy !== "private" && !isEventCompleted && !isEventCancelled && (
        <TouchableOpacity
          style={styles.privacyPill}
          activeOpacity={0.8}
          onPress={() => setPrivacyDropdownVisible(true)}
          disabled={isUpdatingPrivacy}
        >
          <Feather
            name={event?.privacy === "locked" ? "lock" : "globe"}
            size={13}
            color="#FFFFFF"
          />
          <Text style={styles.privacyPillText}>
            {event?.privacy === "locked" ? "Locked" : "Public"}
          </Text>
          <Feather name="chevron-down" size={13} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      <BackButton
        iconName={MoreHorizontalIcon}
        onPress={() => setMenuVisible(true)}
        color={colors.text}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: footerHeight + 24 },
        ]}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: bannerImageUri }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0)"]}
            locations={[0, 1]}
            style={styles.topShade}
          />
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(92, 48, 187, 0.1)", "#000000"]}
            locations={[0, 1]}
            start={{ x: 0.95, y: 0 }}
            end={{ x: 0.18, y: 1 }}
            style={styles.gradient}
          />

          <View style={styles.overlaidMeta}>
            <View style={styles.metaTopRow}>
              <View style={styles.tagsRow}>
                {getHeroCategoryTags(event).map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tag}
                    activeOpacity={1}
                    onPress={() => handleHeroCategoryPress(tag)}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isHostMode && event?.privacy === "private" && !isEventCompleted && !isEventCancelled && (
                <TouchableOpacity
                  style={styles.addMembersBtn}
                  activeOpacity={0.85}
                  onPress={handleAddMembers}
                >
                  <Feather name="plus" size={15} color="#111111" />
                  <Text style={styles.addMembersText}>
                    {(event.memberCount ?? 0) > 0 ? `Members (${event.memberCount})` : "Add Members"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.hostRow}>
              <TouchableOpacity activeOpacity={0.7} onPress={handleHostProfilePress}>
                <UserAvatar
                  uri={hostAvatarUri}
                  name={event?.host?.name}
                  size={42}
                  style={[
                    styles.hostAvatar,
                    { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" },
                  ]}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hostInfo} activeOpacity={0.7} onPress={handleHostProfilePress}>
                <Text style={[styles.hostName, { color: colors.text }]}>{hostName}</Text>
                <View style={styles.hostSubRow}>
                  {!!hostHandle && <Text style={[styles.hostUser, { color: colors.textSecondary }]}>{hostHandle}</Text>}
                  {!!hostHandle && <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}> • </Text>}
                  <Feather
                    name={event?.privacy === "private" || event?.privacy === "locked" ? "lock" : "globe"}
                    size={10}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.privateText, { color: colors.textSecondary }]}> {getPrivacyLabel(event?.privacy)}</Text>
                </View>
              </TouchableOpacity>
              {!isHostMode && (
                <TouchableOpacity
                  style={[
                    styles.followBtnSmall,
                    {
                      backgroundColor: isFollowing
                        ? colors.primary
                        : isDark
                          ? "rgba(255, 255, 255, 0.15)"
                          : "rgba(0, 0, 0, 0.05)",
                    },
                  ]}
                  disabled={isFollowPending}
                  onPress={toggleHostFollow}
                >
                  <Text style={[styles.followBtnTextSmall, { color: isFollowing ? "#FFF" : colors.text }]}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.attendeesStatsRow}>
              <Text style={[styles.statsText, { color: colors.text }]}>
                {isHostMode ? `${ticketsLeft} tickets left` : `${goingCount} going • ${ticketsLeft} tickets left`}
              </Text>
            </View>

            <PostInteractionBar
              likesCount={localLikesCount}
              commentsCount={localCommentsCount}
              sharesCount={localSharesCount}
              isLiked={localIsLiked}
              onLikePress={handleLike}
              onCommentPress={() => setShowComments(true)}
              onSharePress={handleShare}
              likeDisabled={isLikePending}
            />
          </View>
        </View>

        <View style={styles.contentPadding}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>{event?.name ?? "Event"}</Text>
          <View style={styles.eventInfoRow}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{eventDate}</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="clock" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{eventTime}</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={14} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{distanceLabel}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {["About", "Access", "Mooments", "Chat"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && { borderBottomColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab ? colors.text : colors.textSecondary },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentPadding}>
          {activeTab === "About" && (
            <AboutTab
              description={event?.description ?? null}
              ageRestriction={event?.ageRestriction ?? null}
              location={event?.location ?? null}
              host={event?.host ?? null}
              eventImageUris={eventImageUris}
              isHostMode={isHostMode}
              category={event?.categories?.[0] ?? event?.category ?? null}
              onHostFollowChange={updateHostFollowState}
            />
          )}
          {activeTab === "Access" && (
            <AccessTab
              tickets={event?.tickets ?? []}
              rewards={event?.rewards ?? []}
              scheduledAt={event?.scheduledAt ?? null}
              privacy={event?.privacy}
              isMember={event?.isMember ?? false}
              purchasedTicketCounts={purchasedTicketCounts}
              ticketStats={isHostMode ? ticketStats : undefined}
              isHostMode={isHostMode}
              deletingTicketId={deletingTicketId}
              deletingRewardId={deletingRewardId}
              claimingRewardId={claimingRewardId}
              claimedRewardIds={claimedRewardIds}
              selectedTicketKey={selectedTicketKey}
              selectedTicketQuantity={selectedTicketQuantity}
              currentTimeMs={currentTimeMs}
              selectedAccessSubTab={accessSubTab}
              joinRequests={joinRequests}
              myJoinRequestStatus={myJoinRequestStatus}
              submittingJoinRequest={submittingJoinRequest}
              acceptingJoinRequestId={acceptingJoinRequestId}
              decliningJoinRequestId={decliningJoinRequestId}
              onSelectAccessSubTab={setAccessSubTab}
              onSelectTicket={handleSelectTicket}
              onExpiredTicketPress={handleExpiredTicketPress}
              onTicketQuantityChange={handleTicketQuantityChange}
              onSubmitJoinRequest={handleSubmitJoinRequest}
              onAcceptJoinRequest={handleAcceptJoinRequest}
              onDeclineJoinRequest={handleDeclineJoinRequest}
              onCreateTicket={isEventCompleted || isEventCancelled ? undefined : handleCreateTicket}
              onViewTicket={handleViewTicket}
              onEditTicket={isEventCompleted || isEventCancelled ? undefined : handleEditTicket}
              onDeleteTicket={handleDeleteTicket}
              onCreateReward={handleCreateReward}
              onViewReward={handleViewReward}
              onEditReward={handleEditReward}
              onDeleteReward={handleDeleteReward}
              onClaimReward={handleClaimReward}
            />
          )}
          {activeTab === "Mooments" && eventId && (
            isEventOwner ? (
              <HostEventWindowsTab
                eventId={eventId}
                eventStartsAt={event?.scheduledAt}
                eventEndsAt={event?.endAt}
                canManageWindows={event?.status === "live"}
              />
            ) : (
              <AttendeeEventWindowsTab eventId={eventId} eventStatus={event?.status} />
            )
          )}
          {activeTab === "Chat" && eventId && (
            <ChatTab
              eventId={eventId}
              eventName={event?.name ?? "Event"}
              scheduledAt={event?.scheduledAt ?? null}
              endAt={event?.endAt ?? null}
              eventStatus={event?.status}
            />
          )}
          {/* ProductTab hidden — preserved for future restoration
          {activeTab === "Product" && (
            <ProductTab
              creatorId={event?.userId ?? null}
              host={event?.host ?? null}
              isHostMode={isHostMode}
            />
          )}
          */}
        </View>

      </ScrollView>

      <View
        onLayout={(layoutEvent) => setFooterHeight(layoutEvent.nativeEvent.layout.height)}
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 10,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        {isHostMode ? (
          !isEventCompleted && !isEventCancelled ? (
            <View style={styles.hostFooterBtns}>
              <TouchableOpacity
                style={styles.cancelEventBtn}
                activeOpacity={0.8}
                onPress={handleCancelEvent}
              >
                <Feather name="x-circle" size={18} color="#D44343" />
                <Text style={styles.cancelEventBtnText}>Cancel Event</Text>
              </TouchableOpacity>
              {isEventStarted ? (
                <TouchableOpacity
                  style={styles.endEventBtn}
                  activeOpacity={0.85}
                  onPress={handleEndEvent}
                >
                  <Feather name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={[styles.buyBtnText, { color: "#FFFFFF" }]}>End Event</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.startEventBtn}
                  activeOpacity={0.85}
                  onPress={handleStartEvent}
                >
                  <Feather name="play-circle" size={18} color="#111111" />
                  <Text style={[styles.buyBtnText, { color: "#111111" }]}>Start The Event</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        ) : canReviewHost ? (
          <TouchableOpacity
            style={[styles.reviewHostBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() => setReviewModalVisible(true)}
          >
            <Text style={styles.reviewHostBtnText}>Review The Host</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.priceContainer}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{footerPriceLabel}</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>{selectedTicketPriceLabel}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.buyBtn,
                {
                  backgroundColor: selectedTicket && !selectedTicketSalesEnded ? colors.primary : colors.card,
                  opacity: selectedTicketSalesEnded ? 0.55 : 1,
                },
              ]}
              activeOpacity={0.8}
              disabled={selectedTicketSalesEnded}
              onPress={handleTicketCtaPress}
            >
              <Text
                style={[
                  styles.buyBtnText,
                  { color: selectedTicket && !selectedTicketSalesEnded ? colors.background : colors.textSecondary },
                ]}
              >
                {selectedTicketSalesEnded ? "Sales Ended" : selectedTicket ? "Buy Now" : "Select Ticket"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={privacyDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPrivacyDropdownVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setPrivacyDropdownVisible(false)}>
          <View
            style={[
              styles.privacyDropdown,
              {
                backgroundColor: isDark ? "#2A2A2A" : colors.card,
                top: insets.top + 55,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.privacyDropdownItem,
                event?.privacy === "public" && { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
              ]}
              onPress={() => handlePrivacyChange("public")}
              activeOpacity={0.7}
            >
              <Feather name="globe" size={16} color="#FFFFFF" />
              <Text style={styles.privacyDropdownText}>Public</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={[
                styles.privacyDropdownItem,
                event?.privacy === "locked" && { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
              ]}
              onPress={() => handlePrivacyChange("locked")}
              activeOpacity={0.7}
            >
              <Feather name="lock" size={16} color="#FFFFFF" />
              <Text style={styles.privacyDropdownText}>Locked</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.menuContent,
              {
                backgroundColor: isDark ? "#4A4A4A" : colors.card,
                top: insets.top + 60,
              },
            ]}
          >
            {isHostMode ? (
              <>
                {!isEventCompleted && !isEventCancelled && (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={handleEdit} activeOpacity={0.7}>
                      <Feather name="edit-3" size={20} color="#FFF" />
                      <Text style={[styles.menuItemText, { color: "#FFF" }]}>Edit</Text>
                    </TouchableOpacity>

                    <View style={styles.menuSeparator} />
                  </>
                )}

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                  disabled={isDeletingEvent}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={20} color="#FFF" />
                  <Text style={[styles.menuItemText, { color: "#FFF" }]}>
                    {isDeletingEvent ? "Deleting..." : "Delete"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {canReportEvent && (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={handleReportPress}
                      activeOpacity={0.7}
                    >
                      <HugeiconsIcon icon={Flag01Icon} size={20} color="#FFF" />
                      <Text style={[styles.menuItemText, { color: "#FFF" }]}>Report</Text>
                    </TouchableOpacity>

                    <View style={styles.menuSeparator} />
                  </>
                )}

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleSave}
                  activeOpacity={0.7}
                  disabled={isSavePending}
                >
                  <HugeiconsIcon icon={Bookmark01Icon} size={20} color={localIsSaved ? colors.primary : "#FFF"} />
                  <Text style={[styles.menuItemText, { color: localIsSaved ? colors.primary : "#FFF" }]}>
                    {localIsSaved ? "Saved" : "Save"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={selectedReward !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReward(null)}
      >
        <View style={styles.rewardDetailOverlay}>
          <TouchableOpacity
            style={styles.rewardDetailBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedReward(null)}
          />
          <View style={[styles.rewardDetailSheet, { backgroundColor: isDark ? "#1E1E1E" : colors.card }]}>
            <View style={styles.rewardDetailHandle} />

            <View style={styles.rewardDetailHeader}>
              <View style={styles.rewardDetailTitleBlock}>
                <Text style={[styles.rewardDetailName, { color: colors.text }]} numberOfLines={2}>
                  {selectedReward?.name}
                </Text>
                <View style={[styles.rewardDetailTypeBadge, { backgroundColor: `${colors.primary}22` }]}>
                  <Text style={[styles.rewardDetailTypeBadgeText, { color: colors.primary }]}>
                    {selectedReward?.rewardType === "ticket" ? "Ticket Offer" : "Product Offer"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.rewardDetailCloseBtn}
                activeOpacity={0.7}
                onPress={() => setSelectedReward(null)}
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedReward?.targetName ? (
              <View style={styles.rewardDetailRow}>
                <Feather name="tag" size={15} color={colors.textSecondary} style={styles.rewardDetailRowIcon} />
                <Text style={[styles.rewardDetailLabel, { color: colors.textSecondary }]}>Applies to</Text>
                <Text style={[styles.rewardDetailValue, { color: colors.text }]} numberOfLines={1}>
                  {selectedReward.targetName}
                </Text>
              </View>
            ) : null}

            <View style={[styles.rewardDetailDivider, { backgroundColor: colors.border }]} />

            {(selectedReward?.discountPercent ?? 0) > 0 && (
              <View style={styles.rewardDetailRow}>
                <Feather name="percent" size={15} color={colors.textSecondary} style={styles.rewardDetailRowIcon} />
                <Text style={[styles.rewardDetailLabel, { color: colors.textSecondary }]}>Discount</Text>
                <Text style={[styles.rewardDetailValue, { color: colors.text }]}>
                  {selectedReward?.discountPercent}% off
                </Text>
              </View>
            )}

            {(selectedReward?.freeQuantity ?? 0) > 0 && (
              <View style={styles.rewardDetailRow}>
                <Feather name="gift" size={15} color={colors.textSecondary} style={styles.rewardDetailRowIcon} />
                <Text style={[styles.rewardDetailLabel, { color: colors.textSecondary }]}>BOGO</Text>
                <Text style={[styles.rewardDetailValue, { color: colors.text }]}>
                  Buy {selectedReward?.buyQuantity}, get {selectedReward?.freeQuantity} free
                </Text>
              </View>
            )}

            <View style={styles.rewardDetailRow}>
              <Feather name="users" size={15} color={colors.textSecondary} style={styles.rewardDetailRowIcon} />
              <Text style={[styles.rewardDetailLabel, { color: colors.textSecondary }]}>Capacity</Text>
              <Text style={[styles.rewardDetailValue, { color: colors.text }]}>
                {(selectedReward?.capacity ?? 0) === 0 ? "Unlimited" : `${selectedReward?.capacity} available`}
              </Text>
            </View>

            <View style={styles.rewardDetailRow}>
              <Feather name="clock" size={15} color={colors.textSecondary} style={styles.rewardDetailRowIcon} />
              <Text style={[styles.rewardDetailLabel, { color: colors.textSecondary }]}>Expires</Text>
              <Text style={[styles.rewardDetailValue, { color: colors.text }]} numberOfLines={1}>
                {(() => {
                  const src = selectedReward?.expiresAt ?? event?.scheduledAt ?? null;
                  if (!src) return "Date TBA";
                  const d = new Date(src);
                  if (Number.isNaN(d.getTime())) return "Date TBA";
                  return (
                    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
                    " • " +
                    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                  );
                })()}
              </Text>
            </View>

            {selectedReward?.description?.trim() ? (
              <>
                <View style={[styles.rewardDetailDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.rewardDetailDescLabel, { color: colors.textSecondary }]}>Description</Text>
                <Text style={[styles.rewardDetailDesc, { color: colors.text }]}>
                  {selectedReward.description.trim()}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isSubmittingReview) {
            setReviewModalVisible(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.reviewModalOverlay}
        >
          <TouchableOpacity
            style={styles.reviewModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (!isSubmittingReview) {
                setReviewModalVisible(false);
              }
            }}
          />
          <View style={[styles.reviewModalSheet, { backgroundColor: isDark ? "#1E1E1E" : colors.card }]}>
            <View style={styles.rewardDetailHandle} />
            <View style={styles.reviewModalHeader}>
              <Text style={[styles.reviewModalTitle, { color: colors.text }]}>Review The Host</Text>
              <TouchableOpacity
                style={styles.rewardDetailCloseBtn}
                activeOpacity={0.7}
                disabled={isSubmittingReview}
                onPress={() => setReviewModalVisible(false)}
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.reviewChoiceRow}>
              <TouchableOpacity
                style={[
                  styles.reviewChoiceBtn,
                  {
                    borderColor: reviewLiked === true ? colors.primary : colors.border,
                    backgroundColor: reviewLiked === true ? `${colors.primary}22` : "transparent",
                  },
                ]}
                activeOpacity={0.8}
                disabled={isSubmittingReview}
                onPress={() => setReviewLiked(true)}
              >
                <Feather name="thumbs-up" size={18} color={reviewLiked === true ? colors.primary : colors.text} />
                <Text style={[styles.reviewChoiceText, { color: colors.text }]}>Like</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reviewChoiceBtn,
                  {
                    borderColor: reviewLiked === false ? colors.primary : colors.border,
                    backgroundColor: reviewLiked === false ? `${colors.primary}22` : "transparent",
                  },
                ]}
                activeOpacity={0.8}
                disabled={isSubmittingReview}
                onPress={() => setReviewLiked(false)}
              >
                <Feather name="thumbs-down" size={18} color={reviewLiked === false ? colors.primary : colors.text} />
                <Text style={[styles.reviewChoiceText, { color: colors.text }]}>Dislike</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.reviewInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: isDark ? "#111112" : colors.background,
                },
              ]}
              placeholder="Add an optional review"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={1000}
              value={reviewText}
              editable={!isSubmittingReview}
              onChangeText={setReviewText}
            />

            <TouchableOpacity
              style={[
                styles.reviewSubmitBtn,
                {
                  backgroundColor: reviewLiked === null ? colors.card : colors.primary,
                  opacity: isSubmittingReview ? 0.7 : 1,
                },
              ]}
              activeOpacity={0.85}
              disabled={reviewLiked === null || isSubmittingReview}
              onPress={handleSubmitHostReview}
            >
              {isSubmittingReview ? (
                <ActivityIndicator color="#111111" />
              ) : (
                <Text style={styles.reviewSubmitText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        momentId={interactionMomentId}
        likesCount={localLikesCount}
        sharesCount={localSharesCount}
        onInteractionChange={handleInteractionChange}
      />

      <ReportModal
        visible={reportReasonVisible}
        onClose={() => setReportReasonVisible(false)}
        onReport={handleReportReason}
      />

      <ReportDetailsModal
        visible={reportDetailsVisible}
        onClose={handleReportDetailsClose}
        onDone={handleSubmitEventReport}
        isSubmitting={isReportSubmitting}
      />

      <ShareModal
        visible={showShare}
        onClose={() => setShowShare(false)}
        shareUrl={event?.id ? `https://mooment.app/events/${event.id}` : undefined}
        onRepost={handleRepost}
        item={event ? {
          type: "event",
          id: event.id,
          preview: event.name,
          imageUrl: event.bannerImageKey ? getStorageFileUrl(event.bannerImageKey) : null,
          authorName: event.host?.name ?? null,
          canShareToChat: event.privacy === "public",
          categoryLabels: event.categories?.length ? event.categories : event.category ? [event.category] : [],
          dateTimeLabel: event.scheduledAt ? new Date(event.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null,
          locationLabel: event.location?.venue ?? event.location?.address ?? event.location?.searchLabel ?? null,
        } : undefined}
      />
    </View>
  );
};

export default EventScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerActions: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  imageContainer: {
    width,
    height: 302,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  topShade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 130,
  },
  gradient: {
    position: "absolute",
    left: 0,
    top: 62,
    width: 440,
    height: 240,
  },
  overlaidMeta: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  metaTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
    gap: 6,
    paddingRight: 10,
  },
  tag: {
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  addMembersBtn: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 11,
  },
  addMembersText: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "700",
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  hostAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
  },
  hostAvatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    overflow: "hidden",
  },
  hostAvatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  hostInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hostName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  hostSubRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 2,
  },
  hostUser: {
    fontSize: 12,
  },
  dotSeparator: {
    fontSize: 12,
  },
  privateText: {
    fontSize: 12,
  },
  followBtnSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  followBtnTextSmall: {
    fontSize: 12,
    fontWeight: "600",
  },
  attendeesStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statsText: {
    fontSize: 13,
  },
  contentPadding: {
    paddingHorizontal: 16,
  },
  eventTitle: {
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
  },
  eventInfoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    alignItems: "center",
    flex: 1,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    zIndex: 100,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  buyBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  reviewHostBtn: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    height: 52,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reviewHostBtnText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    textAlign: "center",
  },
  hostFooterBtns: {
    flex: 1,
    flexDirection: "column",
    gap: 10,
  },
  startEventBtn: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  endEventBtn: {
    alignItems: "center",
    backgroundColor: "#E65100",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  cancelEventBtn: {
    alignItems: "center",
    backgroundColor: "#150B0B",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  cancelEventBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D44343",
  },
  buyBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  privacyPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  privacyPillText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  privacyDropdown: {
    borderRadius: 14,
    elevation: 8,
    minWidth: 130,
    overflow: "hidden",
    paddingVertical: 4,
    position: "absolute",
    right: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    transform: [{ translateX: 65 }],
  },
  privacyDropdownItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  privacyDropdownText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContent: {
    position: "absolute",
    right: 16,
    width: 140,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuSeparator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 8,
  },
  rewardDetailOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  rewardDetailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  rewardDetailSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  rewardDetailHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.35)",
    alignSelf: "center",
    marginBottom: 20,
  },
  rewardDetailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  rewardDetailTitleBlock: {
    flex: 1,
    gap: 8,
  },
  rewardDetailName: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  rewardDetailTypeBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rewardDetailTypeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  rewardDetailCloseBtn: {
    padding: 4,
    marginTop: 2,
  },
  rewardDetailDivider: {
    height: 1,
    marginVertical: 12,
  },
  rewardDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  rewardDetailRowIcon: {
    width: 20,
    textAlign: "center",
  },
  rewardDetailLabel: {
    fontSize: 13,
    fontWeight: "600",
    width: 80,
    flexShrink: 0,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  rewardDetailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  rewardDetailDescLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  rewardDetailDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  reviewModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  reviewModalSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  reviewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  reviewChoiceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  reviewChoiceBtn: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 13,
  },
  reviewChoiceText: {
    fontSize: 15,
    fontWeight: "600",
  },
  reviewInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 110,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  reviewSubmitBtn: {
    alignItems: "center",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    marginTop: 16,
  },
  reviewSubmitText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "700",
  },
});
