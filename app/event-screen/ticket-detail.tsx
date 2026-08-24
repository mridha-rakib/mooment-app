import BackButton from "@/components/ui/BackButton";
import CrowdStatusBadge, { LiveLifecycleBadge } from "@/components/events/CrowdStatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { safeBack } from "@/lib/navigation";
import { getEventTicket, type EventResponse, type EventTicketPayload } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  cancelTicketPass,
  cancelTicketShare,
  emitTicketWalletChanged,
  getEventTicketStats,
  shareTicketWithFriend,
  type TicketCancellation,
  type TicketShare,
  type TicketStatEntry,
  type TicketWalletPass,
} from "@/lib/payments";
import { getFriendUsers, type FriendUserResponse } from "@/lib/users";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop";
const { width } = Dimensions.get("window");
const WALLET_CONTENT_WIDTH = Math.min(width - 32, 360);

function resolveStorageUrl(key?: string | null): string;
function resolveStorageUrl(key: string | null | undefined, fallback: string): string;
function resolveStorageUrl(key: string | null | undefined, fallback: null): string | null;
function resolveStorageUrl(key?: string | null, fallback: string | null = DEFAULT_BANNER) {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
}

const resolveAvatarUri = (key?: string | null, url?: string | null) => {
  if (url?.trim()) {
    return url.trim();
  }

  return resolveStorageUrl(key, null);
};

const formatPrice = (ticket?: EventTicketPayload | null) => {
  if (!ticket || ticket.type === "free" || ticket.price <= 0) {
    return "Free";
  }

  return `$${ticket.price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(ticket.price) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(ticket.price) ? 0 : 2,
  })}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Date TBA";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });

  return `${dateLabel} • ${timeLabel}`;
};

const getHostHandle = (event?: EventResponse | null) => {
  const handle = event?.host?.username?.trim().replace(/^@+/, "");

  return handle ? `@${handle}` : "";
};

const parsePositiveInteger = (value: string | string[] | undefined, fallback = 1) => {
  const source = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(source ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getParamValue = (value: string | string[] | undefined, fallback: string) => {
  const source = Array.isArray(value) ? value[0] : value;

  return source?.trim() || fallback;
};

const getValidEventIdParam = (value: string | string[] | undefined) => {
  const eventId = getParamValue(value, "");

  return eventId && eventId !== "undefined" && eventId !== "null" ? eventId : null;
};

const formatWalletAmount = (amount: string | string[] | undefined, currency: string | string[] | undefined) => {
  const amountSource = Array.isArray(amount) ? amount[0] : amount;
  const currencySource = Array.isArray(currency) ? currency[0] : currency;
  const parsedAmount = Number.parseFloat(amountSource ?? "");

  if (!Number.isFinite(parsedAmount)) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencySource?.trim().toUpperCase() || "USD",
    minimumFractionDigits: Number.isInteger(parsedAmount) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(parsedAmount) ? 0 : 2,
  }).format(parsedAmount);
};

const formatWalletMinorAmount = (amountMinor: string | string[] | undefined, currency: string | string[] | undefined) => {
  const source = Array.isArray(amountMinor) ? amountMinor[0] : amountMinor;
  const parsed = Number.parseInt(source ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: getParamValue(currency, "usd").toUpperCase(),
  }).format(parsed / 100);
};

const formatWalletRefundDate = (value: string | string[] | undefined) => {
  const source = getParamValue(value, "");
  if (!source) return "";

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getWalletRefundStatusLabel = (status: string) => {
  if (status === "succeeded") return "Refund completed";
  if (status === "failed_terminal" || status === "reconciliation_required") return "Refund needs attention";
  return status ? "Refund processing" : "";
};

const getTicketCancellationRefundLabel = (cancellation?: TicketCancellation | null) => {
  if (!cancellation || cancellation.refundStatus === "not_required") return "";
  if (cancellation.refundStatus === "succeeded") return "Refunded";
  if (cancellation.status === "needs_attention" || cancellation.refundStatus === "failed_terminal") {
    return "Refund needs attention";
  }
  return "Refund processing";
};

const getTicketCancellationStatusLabel = (cancellation?: TicketCancellation | null) => {
  if (!cancellation) return "";
  return cancellation.status === "needs_attention" ? "Refund needs attention" : "Cancelled";
};

const findWalletPassIndex = (
  passes: TicketWalletPass[],
  orderId?: string | null,
  ticketIndex?: number | null,
) => passes.findIndex((pass) =>
  Boolean(orderId) &&
  pass.orderId === orderId &&
  pass.ticketIndex === ticketIndex
);

const getWalletShareContextPasses = (passes: TicketWalletPass[], walletSource: string) =>
  walletSource === "owned"
    ? passes.filter((pass) =>
        !pass.currentShare &&
        pass.status === "active" &&
        !pass.cancellation &&
        Boolean(pass.qrCode)
      )
    : passes;

const getWalletRevokeContextPasses = (passes: TicketWalletPass[], walletSource: string) =>
  walletSource === "owned"
    ? passes.filter((pass) =>
        Boolean(pass.currentShare) &&
        pass.status === "active" &&
        !pass.cancellation
      )
    : [];

const TicketDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventId?: string;
    ticketId?: string;
    mode?: string;
    source?: string;
    purchaseCount?: string;
    paidQuantity?: string;
    freeQuantity?: string;
    totalQuantity?: string;
    ticketNo?: string;
    orderId?: string;
    eventStatus?: string;
    crowdStatus?: string;
    eventTitle?: string;
    ticketName?: string;
    hostName?: string;
    hostHandle?: string;
    bannerImageKey?: string;
    location?: string;
    address?: string;
    dateTime?: string;
    eventStartDateTime?: string;
    eventEndDateTime?: string;
    amount?: string;
    currency?: string;
    offerClaimed?: string;
    offerDetails?: string;
    walletStatus?: string;
    cancellationReason?: string;
    refundStatus?: string;
    refundRequestedAmountMinor?: string;
    refundCompletedAmountMinor?: string;
    refundUpdatedAt?: string;
    refundCompletedAt?: string;
    refundError?: string;
    walletSource?: string;
    currentShareId?: string;
    currentShareFriendName?: string;
    currentShareFriendId?: string;
    ticketPasses?: string;
    walletContextPasses?: string;
    selectedOrderId?: string;
    selectedTicketIndex?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const shareModalOverlayHeightRef = useRef(Dimensions.get("screen").height);
  const shareModalTranslateY = useRef(new Animated.Value(0)).current;
  const currentUser = useAuthStore((state) => state.user);
  const loadEventForEdit = useEventDraftStore((state) => state.loadFromEvent);
  const isWalletTicket = params.source === "wallet" || (!params.eventId && !params.ticketId);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(!isWalletTicket);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [friends, setFriends] = useState<FriendUserResponse[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [isShareSubmitting, setIsShareSubmitting] = useState(false);
  const [isCancellingTicket, setIsCancellingTicket] = useState(false);
  const [walletServerNowTick, setWalletServerNowTick] = useState(() => Date.now());
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);

  const eventId = getValidEventIdParam(params.eventId);
  const ticketId = typeof params.ticketId === "string" ? params.ticketId : null;
  const isHostMode = params.mode === "host" || Boolean(event && currentUser?.id === event.userId);

  const ticket = useMemo(() => {
    if (!event) {
      return null;
    }

    return event.tickets.find((item) => item.id === ticketId) ?? null;
  }, [event, ticketId]);
  const eventStatus = event?.status;

  const [ticketStat, setTicketStat] = useState<TicketStatEntry | null>(null);

  const bannerImageUri = resolveStorageUrl(event?.bannerOriginalImageKey ?? event?.bannerImageKey, DEFAULT_BANNER);
  const hostAvatarUri = resolveAvatarUri(event?.host?.avatarKey, event?.host?.avatarUrl);
  const hostHandle = getHostHandle(event);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadTicket = async () => {
        if (isWalletTicket) {
          setEvent(null);
          setErrorMessage(null);
          setIsLoading(false);
          return;
        }

        if (!eventId || !ticketId) {
          setErrorMessage("Ticket details are unavailable.");
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
          const loadedEvent = await getEventTicket(eventId, ticketId);

          if (!isActive) {
            return;
          }

          setEvent(loadedEvent);
        } catch (error) {
          if (!isActive) {
            return;
          }

          setErrorMessage(getAuthErrorMessage(error, "Unable to load ticket details."));
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadTicket();

      return () => {
        isActive = false;
      };
    }, [eventId, isWalletTicket, ticketId]),
  );

  useEffect(() => {
    if (!eventStatus || !isHostMode || eventStatus === "draft" || !eventId || !ticketId) return;
    let cancelled = false;

    getEventTicketStats(eventId)
      .then((stats) => {
        if (!cancelled) setTicketStat(stats[ticketId] ?? null);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [eventStatus, isHostMode, eventId, ticketId]);

  const handleEditTicket = () => {
    if (!event || !ticket || !isHostMode) {
      return;
    }

    loadEventForEdit(event);

    const draftTicket = useEventDraftStore
      .getState()
      .tickets.find((item) => item.id === ticket.id);

    if (!draftTicket) {
      Alert.alert("Unable to edit ticket", "Please try again.");
      return;
    }

    router.push({
      pathname: "/create-event/ticket-details",
      params: { localId: draftTicket.localId },
    });
  };

  const handleViewEventDetails = () => {
    if (!eventId) {
      return;
    }

    router.push({
      pathname: "/event-screen/event",
      params: { eventId },
    });
  };

  const availableLabel = isHostMode && ticketStat
    ? `${ticketStat.available} left`
    : `${Math.max(0, ticket?.availableCount ?? ticket?.capacity ?? 0)} left`;

  const details = [
    { label: "Ticket", value: ticket?.name ?? "Ticket unavailable" },
    { label: "Type", value: ticket?.type === "pay" ? "Paid" : "Free" },
    ...(isHostMode && ticketStat
      ? [{ label: "Sold", value: `${ticketStat.sold} tickets`, highlight: true }]
      : []),
    { label: "Available", value: availableLabel },
    { label: "Price", value: formatPrice(ticket) },
    { label: "Sales end", value: formatDateTime(ticket?.salesEndAt) },
    { label: "Event", value: event?.name ?? "Event unavailable" },
    { label: "Event start", value: formatDateTime(event?.scheduledAt) },
    { label: "Event end", value: formatDateTime(event?.endAt) },
    { label: "Venue", value: event?.location?.venue ?? "Venue TBA" },
    { label: "Address", value: event?.location?.address ?? event?.location?.searchLabel ?? "Address TBA" },
  ];

  const walletPaidQuantity = parsePositiveInteger(params.paidQuantity, parsePositiveInteger(params.purchaseCount));
  const walletFreeQuantity = parsePositiveInteger(params.freeQuantity, 0);
  const walletPurchaseCount = parsePositiveInteger(params.totalQuantity, walletPaidQuantity + walletFreeQuantity);
  const walletHasShareQr = walletPurchaseCount >= 2;
  const walletTicketNo = getParamValue(params.ticketNo, "MOM-2024-8575");
  const walletEventTitle = getParamValue(params.eventTitle, "Ticket");
  const walletTicketName = getParamValue(params.ticketName, "Ticket");
  const walletHostName = getParamValue(params.hostName, "Host");
  const walletHostHandle = getParamValue(params.hostHandle, "");
  const walletBannerImage = resolveStorageUrl(getParamValue(params.bannerImageKey, ""), DEFAULT_BANNER);
  const walletLocation = getParamValue(params.location, "Location TBA");
  const walletAddress = getParamValue(params.address, "Address TBA");
  const walletDateTime = getParamValue(params.dateTime, "Date TBA");
  const walletEventStartDateTime = getParamValue(params.eventStartDateTime, walletDateTime);
  const walletEventEndDateTime = getParamValue(params.eventEndDateTime, "Date TBA");
  const walletAmount = formatWalletAmount(params.amount, params.currency);
  const walletOfferClaimed = getParamValue(params.offerClaimed, "") === "true";
  const walletOfferDetails = getParamValue(params.offerDetails, "");
  const walletSource = getParamValue(params.walletSource, "owned");
  const walletEventStatus = getParamValue(params.eventStatus, "");
  const walletCrowdStatus = getParamValue(params.crowdStatus, "");
  const walletStatusParam = getParamValue(params.walletStatus, "");
  const walletCancellationReason = getParamValue(params.cancellationReason, "");
  const walletRefundStatus = getWalletRefundStatusLabel(getParamValue(params.refundStatus, ""));
  const walletRefundRequestedAmount = formatWalletMinorAmount(params.refundRequestedAmountMinor, params.currency);
  const walletRefundCompletedAmount = formatWalletMinorAmount(params.refundCompletedAmountMinor, params.currency);
  const walletRefundUpdatedAt = formatWalletRefundDate(params.refundUpdatedAt);
  const walletRefundCompletedAt = formatWalletRefundDate(params.refundCompletedAt);
  const walletRefundError = getParamValue(params.refundError, "");
  const initialWalletTicketPasses = useMemo<TicketWalletPass[]>(() => {
    const rawPasses = getParamValue(params.ticketPasses, "");
    const currentShareId = getParamValue(params.currentShareId, "");
    const fallbackCurrentShare: TicketShare | null = currentShareId
      ? {
          id: currentShareId,
          ownerUserId: "",
          recipientUserId: getParamValue(params.currentShareFriendId, ""),
          orderId: getParamValue(params.orderId, ""),
          eventId: getParamValue(params.eventId, ""),
          ticketId: getParamValue(params.ticketId, ""),
          ticketIndex: 1,
          qrCode: "",
          status: "active",
          sharedAt: "",
          cancelledAt: null,
          friend: {
            id: getParamValue(params.currentShareFriendId, ""),
            name: getParamValue(params.currentShareFriendName, "Friend"),
          },
        }
      : null;

    if (rawPasses) {
      try {
        const parsed = JSON.parse(rawPasses) as TicketWalletPass[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          if (fallbackCurrentShare && !parsed.some((pass) => pass.currentShare)) {
            return parsed.map((pass) => (
              pass.ticketIndex === fallbackCurrentShare.ticketIndex
                ? { ...pass, currentShare: fallbackCurrentShare }
                : pass
            ));
          }

          return parsed;
        }
      } catch {
        // Fall through to deterministic local pass generation for older wallet payloads.
      }
    }

    return walletTicketNo
      ? [{
          orderId: getParamValue(params.orderId, ""),
          ticketNo: walletTicketNo,
          ticketIndex: 1,
          qrCode: walletTicketNo,
          status: "active" as const,
          usedAt: null,
          currentShare: fallbackCurrentShare,
        }]
      : [];
  }, [
    params.currentShareFriendId,
    params.currentShareFriendName,
    params.currentShareId,
    params.eventId,
    params.orderId,
    params.ticketId,
    params.ticketPasses,
    walletTicketNo,
  ]);
  const initialWalletContextPasses = useMemo<TicketWalletPass[]>(() => {
    const rawPasses = getParamValue(params.walletContextPasses, "");

    if (rawPasses) {
      try {
        const parsed = JSON.parse(rawPasses) as TicketWalletPass[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fall through to the selected-pass payload for older wallet links.
      }
    }

    return initialWalletTicketPasses;
  }, [initialWalletTicketPasses, params.walletContextPasses]);
  const [walletTicketPasses, setWalletTicketPasses] = useState<TicketWalletPass[]>(initialWalletTicketPasses);
  const [walletContextPasses, setWalletContextPasses] = useState<TicketWalletPass[]>(initialWalletContextPasses);
  const [selectedSharePassIndex, setSelectedSharePassIndex] = useState(() => {
    const selectedOrderId = getParamValue(params.selectedOrderId, initialWalletTicketPasses[0]?.orderId ?? "");
    const selectedTicketIndex = parsePositiveInteger(params.selectedTicketIndex, initialWalletTicketPasses[0]?.ticketIndex ?? 1);
    const initialShareContextPasses = getWalletShareContextPasses(initialWalletContextPasses, walletSource);
    const selectedIndex = findWalletPassIndex(initialShareContextPasses, selectedOrderId, selectedTicketIndex);

    if (selectedIndex >= 0) {
      return selectedIndex;
    }

    return 0;
  });
  const walletVisibleTicketPasses = useMemo(
    () => (walletSource === "owned" ? walletTicketPasses.filter((pass) => !pass.currentShare) : walletTicketPasses),
    [walletSource, walletTicketPasses],
  );
  const walletShareContextPasses = useMemo(
    () => getWalletShareContextPasses(walletContextPasses, walletSource),
    [walletContextPasses, walletSource],
  );
  const walletRevokeContextPasses = useMemo(
    () => getWalletRevokeContextPasses(walletContextPasses, walletSource),
    [walletContextPasses, walletSource],
  );
  const selectedWalletPass = walletVisibleTicketPasses[0] ?? null;
  const selectedCancellation = selectedWalletPass?.cancellation ?? null;
  const selectedEligibility = selectedWalletPass?.cancellationEligibility ?? null;
  const walletPassRefundStatus = getTicketCancellationRefundLabel(selectedCancellation);
  const walletPassCancellationStatus = getTicketCancellationStatusLabel(selectedCancellation);
  const serverOffsetMs = useMemo(() => {
    const serverNowSource = selectedEligibility?.serverNow;
    if (!serverNowSource) return 0;

    const parsedServerNow = new Date(serverNowSource).getTime();
    return Number.isFinite(parsedServerNow) ? parsedServerNow - Date.now() : 0;
  }, [selectedEligibility?.serverNow]);
  const cancellationCutoffAtMs = useMemo(() => {
    const cutoffSource = selectedEligibility?.cancellationCutoffAt;
    if (!cutoffSource) return null;

    const parsedCutoff = new Date(cutoffSource).getTime();
    return Number.isFinite(parsedCutoff) ? parsedCutoff : null;
  }, [selectedEligibility?.cancellationCutoffAt]);
  const clientCutoffReached = Boolean(
    selectedEligibility?.canCancel &&
    cancellationCutoffAtMs !== null &&
    walletServerNowTick + serverOffsetMs >= cancellationCutoffAtMs,
  );
  const walletIsCancelled =
    walletStatusParam === "cancelled" ||
    selectedWalletPass?.status === "cancelled" ||
    Boolean(selectedCancellation) ||
    Boolean(walletRefundStatus);
  const walletActiveVisiblePassCount = walletShareContextPasses.length;
  const walletCanShare = !walletIsCancelled && walletSource === "owned" && walletActiveVisiblePassCount >= 2;
  const walletCanManageShares = !walletIsCancelled && walletSource === "owned" && walletRevokeContextPasses.length > 0;
  const walletCanOpenShareModal = walletCanShare || walletCanManageShares;
  const walletCanShowQr = !walletIsCancelled && Boolean(selectedWalletPass?.qrCode) && selectedWalletPass?.status === "active";
  const selectedSharePass = walletShareContextPasses[Math.min(selectedSharePassIndex, Math.max(0, walletShareContextPasses.length - 1))] ?? null;
  const selectedRevokeSharePass =
    walletRevokeContextPasses.find((pass) =>
      pass.orderId === (selectedWalletPass?.orderId ?? walletTicketPasses[0]?.orderId) &&
      pass.ticketIndex === (selectedWalletPass?.ticketIndex ?? walletTicketPasses[0]?.ticketIndex)
    ) ?? walletRevokeContextPasses[0] ?? null;
  const selectedShare = selectedRevokeSharePass?.currentShare ?? null;
  const shareModalTicketIndex = selectedSharePass?.ticketIndex ?? selectedRevokeSharePass?.ticketIndex ?? 1;
  const shareModalTicketCount = walletShareContextPasses.length || walletRevokeContextPasses.length || 1;
  const hasAnySharedPass = walletContextPasses.some((pass) => Boolean(pass.currentShare));
  const hasAnyUsedPass = walletTicketPasses.some((pass) => pass.status === "used");
  const walletStatusLabel = walletIsCancelled
    ? "Cancelled"
    : hasAnyUsedPass && walletActiveVisiblePassCount === 0
      ? "Used"
      : hasAnySharedPass && !walletCanShowQr
        ? "Shared"
        : "Active";
  const walletCancellationDisabledMessage = clientCutoffReached
    ? "Ticket cancellation is unavailable within 3 hours of the event start time."
    : selectedEligibility?.disabledMessage ?? "";
  const walletCanCancelTicket = Boolean(
    walletSource === "owned" &&
    selectedWalletPass &&
    !selectedCancellation &&
    selectedWalletPass.status === "active" &&
    selectedEligibility?.canCancel &&
    !clientCutoffReached &&
    !isCancellingTicket,
  );
  const filteredFriends = useMemo(
    () => friends.filter((friend) => friend.id !== selectedShare?.friend?.id),
    [friends, selectedShare?.friend?.id],
  );
  const shareSheetMaxHeight = Math.max(320, Math.round(windowHeight * 0.78));
  const shareSheetBottomPadding = Math.max(insets.bottom, 12) + 16;
  const shareSheetTranslateY = useMemo(
    () =>
      shareModalTranslateY.interpolate({
        inputRange: [-72, 0],
        outputRange: [-72, 0],
        extrapolateLeft: "clamp",
        extrapolateRight: "extend",
      }),
    [shareModalTranslateY],
  );
  const closeShareModal = useCallback(() => {
    setIsShareModalVisible(false);
  }, []);
  const closeShareModalFromDrag = useCallback(() => {
    Animated.timing(shareModalTranslateY, {
      toValue: shareModalOverlayHeightRef.current,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      closeShareModal();
    });
  }, [closeShareModal, shareModalTranslateY]);
  const shareModalPanResponderMove = useMemo(
    () =>
      Animated.event([null, { dy: shareModalTranslateY }], {
        useNativeDriver: false,
      }),
    [shareModalTranslateY],
  );
  const shareModalDragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          shareModalTranslateY.stopAnimation(() => {
            shareModalTranslateY.setValue(0);
          });
        },
        onPanResponderMove: shareModalPanResponderMove,
        onPanResponderRelease: (_event, gesture) => {
          const shouldClose = gesture.dy > 120 || gesture.vy > 0.9;

          if (shouldClose) {
            closeShareModalFromDrag();
            return;
          }

          Animated.spring(shareModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(shareModalTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
      }),
    [closeShareModalFromDrag, shareModalPanResponderMove, shareModalTranslateY],
  );
  const handleShareModalOverlayLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      shareModalOverlayHeightRef.current = event.nativeEvent.layout.height;
    },
    [],
  );
  useEffect(() => {
    if (!isWalletTicket) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setWalletServerNowTick(Date.now());
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isWalletTicket]);

  const walletDetails = [
    { label: "Ticket No", value: selectedWalletPass?.ticketNo || walletTicketNo },
    { label: "Host", value: walletHostName },
    { label: "Event", value: walletEventTitle },
    { label: "Venue", value: walletLocation },
    { label: "Address", value: walletAddress },
    { label: "Paid Tickets", value: `${walletTicketName} x ${walletPaidQuantity}` },
    ...(walletFreeQuantity > 0
      ? [{ label: "Rewarded Tickets", value: `${walletTicketName} x ${walletFreeQuantity}` }]
      : []),
    ...(walletOfferClaimed
      ? [
          { label: "Offer", value: "Offer claimed" },
          ...(walletOfferDetails ? [{ label: "Offer details", value: walletOfferDetails }] : []),
        ]
      : []),
    { label: "Total Tickets", value: `${walletTicketName} x ${walletPurchaseCount}` },
    { label: "Event start", value: walletEventStartDateTime },
    { label: "Event end", value: walletEventEndDateTime },
    ...(walletSource === "owned"
      ? [{
          label: walletHasShareQr ? "Amount paid" : "Amount Pending",
          value: walletAmount,
          isPrice: true,
        }]
      : []),
    ...(walletPassCancellationStatus ? [{ label: "Status", value: walletPassCancellationStatus }] : []),
    ...(walletPassRefundStatus
      ? [
          { label: "Refund status", value: walletPassRefundStatus },
          ...(selectedCancellation?.requestedAmountMinor
            ? [{
                label: "Refund requested",
                value: formatWalletMinorAmount(String(selectedCancellation.requestedAmountMinor), selectedCancellation.currency),
                isPrice: true,
              }]
            : []),
          ...(selectedCancellation?.completedAmountMinor
            ? [{
                label: "Refund completed",
                value: formatWalletMinorAmount(String(selectedCancellation.completedAmountMinor), selectedCancellation.currency),
                isPrice: true,
              }]
            : []),
        ]
      : walletRefundStatus
        ? [
            { label: "Refund status", value: walletRefundStatus },
            ...(walletCancellationReason ? [{ label: "Cancellation reason", value: walletCancellationReason }] : []),
            ...(walletRefundRequestedAmount ? [{ label: "Refund requested", value: walletRefundRequestedAmount, isPrice: true }] : []),
            ...(walletRefundCompletedAmount ? [{ label: "Refund completed", value: walletRefundCompletedAmount, isPrice: true }] : []),
            ...(walletRefundUpdatedAt ? [{ label: "Refund updated", value: walletRefundUpdatedAt }] : []),
            ...(walletRefundCompletedAt ? [{ label: "Refund completed on", value: walletRefundCompletedAt }] : []),
            ...(walletRefundError ? [{ label: "Refund note", value: walletRefundError }] : []),
        ]
      : []),
  ];

  const loadFriends = async (search = friendSearch) => {
    setIsFriendsLoading(true);
    setShareErrorMessage(null);

    try {
      const friendUsers = await getFriendUsers(search, 100);
      setFriends(friendUsers);
    } catch (error) {
      setShareErrorMessage(getAuthErrorMessage(error, "Unable to load friends."));
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const handleOpenShareModal = async () => {
    const selectedPassIndex = findWalletPassIndex(
      walletShareContextPasses,
      selectedWalletPass?.orderId,
      selectedWalletPass?.ticketIndex,
    );

    if (selectedPassIndex >= 0) {
      setSelectedSharePassIndex(selectedPassIndex);
    } else if (walletShareContextPasses.length > 0) {
      setSelectedSharePassIndex(0);
    }

    shareModalTranslateY.setValue(0);
    setIsShareModalVisible(true);
    setFriendSearch("");
    await loadFriends("");
  };

  const handleShareWithFriend = async (friend: FriendUserResponse) => {
    if (selectedSharePass?.status === "used") {
      setShareErrorMessage("Used tickets cannot be shared.");
      return;
    }

    const shareEventId = getParamValue(params.eventId, "");
    const shareTicketId = getParamValue(params.ticketId, "");
    const sharePass = selectedSharePass;

    if (!shareEventId || !shareTicketId || !sharePass?.orderId) {
      setShareErrorMessage("Ticket share details are unavailable.");
      return;
    }

    setIsShareSubmitting(true);
    setShareErrorMessage(null);

    try {
      const share = await shareTicketWithFriend({
        eventId: shareEventId,
        ticketId: shareTicketId,
        orderId: sharePass.orderId,
        ticketIndex: sharePass.ticketIndex,
        friendId: friend.id,
      });

      setWalletTicketPasses((passes) =>
        passes.map((pass) => (
          pass.orderId === sharePass.orderId && pass.ticketIndex === sharePass.ticketIndex
            ? { ...pass, currentShare: share }
            : pass
        )),
      );
      setWalletContextPasses((passes) =>
        passes.map((pass) => (
          pass.orderId === sharePass.orderId && pass.ticketIndex === sharePass.ticketIndex
            ? { ...pass, currentShare: share }
            : pass
        )),
      );
    } catch (error) {
      setShareErrorMessage(getAuthErrorMessage(error, "Unable to share ticket."));
    } finally {
      setIsShareSubmitting(false);
    }
  };

  const handleCancelShare = async () => {
    if (!selectedShare || !selectedRevokeSharePass) {
      return;
    }

    setIsShareSubmitting(true);
    setShareErrorMessage(null);

    try {
      const cancelledShare = await cancelTicketShare(selectedShare.id);
      setWalletTicketPasses((passes) =>
        passes.map((pass) => (
          pass.orderId === selectedRevokeSharePass.orderId && pass.ticketIndex === selectedRevokeSharePass.ticketIndex
            ? {
                ...pass,
                status: "active",
                ticketNo: cancelledShare.qrCode,
                qrCode: cancelledShare.qrCode,
                currentShare: null,
              }
            : pass
        )),
      );
      setWalletContextPasses((passes) =>
        passes.map((pass) => (
          pass.orderId === selectedRevokeSharePass.orderId && pass.ticketIndex === selectedRevokeSharePass.ticketIndex
            ? {
                ...pass,
                status: "active",
                ticketNo: cancelledShare.qrCode,
                qrCode: cancelledShare.qrCode,
                currentShare: null,
              }
            : pass
        )),
      );
      await loadFriends(friendSearch);
    } catch (error) {
      setShareErrorMessage(getAuthErrorMessage(error, "Unable to cancel ticket share."));
    } finally {
      setIsShareSubmitting(false);
    }
  };

  const handleCancelTicket = () => {
    if (!selectedWalletPass || !walletCanCancelTicket) {
      return;
    }

    const cancellationEventId = getParamValue(params.eventId, "");
    const cancellationTicketId = getParamValue(params.ticketId, "");
    const cancellationOrderId = selectedWalletPass.orderId || getParamValue(params.orderId, "");

    if (!cancellationEventId || !cancellationTicketId || !cancellationOrderId) {
      Alert.alert("Cancel ticket", "Ticket details are unavailable.");
      return;
    }

    const parsedAmount = Number.parseFloat(getParamValue(params.amount, "0"));
    const isMonetaryTicket = Number.isFinite(parsedAmount) && parsedAmount > 0 && selectedWalletPass.ticketIndex <= walletPaidQuantity;

    Alert.alert(
      "Cancel this ticket?",
      isMonetaryTicket
        ? "Your ticket will be cancelled, the QR code will stop working, and the eligible amount will be refunded to your original payment method."
        : "Your ticket will be cancelled, the QR code will stop working, and the ticket will be returned to availability.",
      [
        { text: "Keep Ticket", style: "cancel" },
        {
          text: "Cancel Ticket",
          style: "destructive",
          onPress: async () => {
            setIsCancellingTicket(true);

            try {
              const cancellation = await cancelTicketPass({
                eventId: cancellationEventId,
                ticketId: cancellationTicketId,
                orderId: cancellationOrderId,
                ticketIndex: selectedWalletPass.ticketIndex,
              });

              setWalletTicketPasses((passes) =>
                passes.map((pass) =>
                  pass.orderId === cancellation.orderId &&
                  pass.ticketIndex === cancellation.ticketIndex
                    ? {
                        ...pass,
                        ticketNo: "",
                        qrCode: "",
                        status: "cancelled",
                        currentShare: null,
                        cancellation,
                        cancellationEligibility: {
                          canCancel: false,
                          cancellationCutoffAt: cancellation.cancellationCutoffAt,
                          serverNow: new Date().toISOString(),
                          disabledReason: cancellation.refundStatus === "not_required" ? "already_cancelled" : "refund_processing",
                          disabledMessage:
                            cancellation.refundStatus === "not_required"
                              ? "This ticket has already been cancelled."
                              : "Your refund is currently being processed.",
                          cancellationStatus: cancellation.status,
                          refundStatus: cancellation.refundStatus,
                          qrAvailable: false,
                          isOriginalBuyer: true,
                          isShared: Boolean(cancellation.sharedRecipientUserId),
                          isRecipientOnly: false,
                        },
                      }
                    : pass,
                ),
              );
              emitTicketWalletChanged();
            } catch (error) {
              Alert.alert("Cancel ticket", getAuthErrorMessage(error, "Unable to cancel this ticket."));
            } finally {
              setIsCancellingTicket(false);
            }
          },
        },
      ],
    );
  };

  if (isWalletTicket) {
    return (
      <View style={styles.walletContainer}>
        <StatusBar barStyle="light-content" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.walletScrollContent,
            { paddingBottom: insets.bottom + 28 },
          ]}
        >
          <View style={styles.walletHero}>
            <Image source={{ uri: walletBannerImage }} style={styles.walletHeroImage} contentFit="cover" />
            <LinearGradient
              colors={["rgba(12,7,28,0.18)", "rgba(12,7,28,0.62)", "#101014"]}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={[styles.walletHeader, { paddingTop: insets.top + 10 }]}>
              <BackButton color="#FFFFFF" onPress={() => safeBack(router, '/(tabs)/home')} />
              <Text style={styles.walletHeaderTitle}>Ticket Detail</Text>
              <View style={styles.walletHeaderSpacer} />
            </View>

            <View style={styles.walletHeroContent}>
              <View style={styles.walletHeroStatusStack}>
                <LiveLifecycleBadge eventStatus={walletEventStatus} />
                <CrowdStatusBadge eventStatus={walletEventStatus} crowdStatus={walletCrowdStatus} />
              </View>
              <View style={styles.walletCategoryPill}>
                <Text style={styles.walletCategoryText}>Music Party</Text>
              </View>
              <View style={styles.walletHostRow}>
                <UserAvatar uri={null} name={walletHostName} size={34} style={styles.walletHostAvatar} />
                <View style={styles.walletHostCopy}>
                  <Text style={styles.walletHostName}>{walletHostName}</Text>
                  {!!walletHostHandle && <Text style={styles.walletHostHandle}>{walletHostHandle}</Text>}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.walletContent}>
            <View style={styles.walletInfoCard}>
              <View style={styles.walletCardHeader}>
                <View style={styles.walletCardTitleBlock}>
                  <Text style={styles.walletEventTitle}>{walletEventTitle}</Text>
                  <Text style={styles.walletEventCity}>{walletLocation}</Text>
                </View>
                <View style={styles.walletStatusBadge}>
                  {walletStatusLabel === "Used" && <Feather name="check" size={12} color="#16D869" />}
                  <Text style={styles.walletStatusText}>{walletStatusLabel}</Text>
                </View>
              </View>

              <View style={styles.walletDetailsList}>
                {walletDetails.map((item, index) => (
                  <View key={item.label}>
                    <View style={styles.walletDetailRow}>
                      <Text style={styles.walletDetailLabel}>{item.label}</Text>
                      <Text
                        style={[
                          styles.walletDetailValue,
                          item.isPrice && styles.walletPriceValue,
                        ]}
                        numberOfLines={2}
                      >
                        {item.value}
                      </Text>
                    </View>
                    {index < walletDetails.length - 1 && <View style={styles.walletDivider} />}
                  </View>
                ))}
              </View>
            </View>

            {!!eventId && (
              <TouchableOpacity
                style={styles.walletEventDetailsButton}
                activeOpacity={0.85}
                onPress={handleViewEventDetails}
              >
                <Text style={styles.walletEventDetailsButtonText}>View Event Details</Text>
                <Feather name="arrow-right" size={14} color="#C9C1CF" />
              </TouchableOpacity>
            )}

            <View style={walletCanOpenShareModal ? styles.walletDualActions : styles.walletSingleActions}>
              {walletCanOpenShareModal && (
                <TouchableOpacity
                  style={[
                    styles.walletShareButton,
                    hasAnySharedPass ? styles.walletShareButtonActive : undefined,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => void handleOpenShareModal()}
                >
                  <Text style={styles.walletShareButtonText}>Share QR</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.walletShowButton,
                  walletCanOpenShareModal ? styles.walletActionFlex : styles.walletShowButtonFull,
                  !walletCanShowQr && styles.walletActionDisabled,
                ]}
                activeOpacity={0.85}
                disabled={!walletCanShowQr}
                onPress={() =>
                  router.push({
                    pathname: "/event-screen/qr-code",
                    params: {
                      type: "event",
                      ticketNo: walletTicketNo,
                      orderId: getParamValue(params.orderId, ""),
                      eventId: getParamValue(params.eventId, ""),
                      ticketId: getParamValue(params.ticketId, ""),
                      walletSource,
                      eventName: walletEventTitle,
                      hostName: walletHostName,
                      venue: walletLocation,
                      address: walletAddress,
                      dateTime: walletDateTime,
                      ticketName: walletTicketName,
                      quantity: String(walletPurchaseCount),
                      paidQuantity: String(walletPaidQuantity),
                      freeQuantity: String(walletFreeQuantity),
                      totalQuantity: String(walletPurchaseCount),
                      amount: getParamValue(params.amount, "0"),
                      currency: getParamValue(params.currency, "usd"),
                      ticketPasses: JSON.stringify(walletShareContextPasses),
                      selectedOrderId: selectedWalletPass?.orderId ?? getParamValue(params.orderId, ""),
                      selectedTicketIndex: String(selectedWalletPass?.ticketIndex ?? 1),
                    },
                  })
                }
              >
                <Text style={styles.walletShowButtonText}>{walletCanShowQr ? "Show QR" : "No QR available"}</Text>
              </TouchableOpacity>
            </View>

            {selectedCancellation ? (
              <View style={styles.walletCancellationState}>
                <Text style={styles.walletCancellationStateText}>Cancelled</Text>
                {!!walletPassRefundStatus && (
                  <Text style={styles.walletCancellationSubText}>{walletPassRefundStatus}</Text>
                )}
              </View>
            ) : walletSource === "owned" ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.walletCancelButton,
                    !walletCanCancelTicket && styles.walletActionDisabled,
                  ]}
                  activeOpacity={0.85}
                  disabled={!walletCanCancelTicket}
                  onPress={handleCancelTicket}
                >
                  <Text style={styles.walletCancelButtonText}>
                    {isCancellingTicket ? "Cancelling..." : "Cancel ticket"}
                  </Text>
                </TouchableOpacity>
                {!!walletCancellationDisabledMessage && !walletCanCancelTicket && (
                  <Text style={styles.walletCancelDisabledText}>{walletCancellationDisabledMessage}</Text>
                )}
              </>
            ) : null}
          </View>
        </ScrollView>

        <Modal
          visible={isShareModalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeShareModal}
          statusBarTranslucent
        >
          <View style={styles.shareModalOverlay} onLayout={handleShareModalOverlayLayout}>
            <TouchableOpacity
              style={styles.shareModalBackgroundDismiss}
              onPress={closeShareModal}
              activeOpacity={1}
            />
            <Animated.View
              style={[
                styles.shareModalSheet,
                {
                  maxHeight: shareSheetMaxHeight,
                  paddingBottom: shareSheetBottomPadding,
                  transform: [{ translateY: shareSheetTranslateY }],
                },
              ]}
            >
              <View style={styles.shareModalHeader}>
                <View {...shareModalDragResponder.panHandlers}>
                  <Text style={styles.shareModalTitle}>Share QR</Text>
                  <Text style={styles.shareModalSubtitle}>
                    {walletTicketName} • Ticket {shareModalTicketIndex} of {shareModalTicketCount}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.shareModalClose}
                  onPress={closeShareModal}
                  activeOpacity={0.85}
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {walletShareContextPasses.length > 1 && (
                <View style={styles.sharePassSelector}>
                  {walletShareContextPasses.map((pass, index) => {
                    const isSelected = index === selectedSharePassIndex;
                    const isShared = Boolean(pass.currentShare);
                    const isUsed = pass.status === "used";

                    return (
                      <TouchableOpacity
                        key={`${pass.orderId}-${pass.ticketIndex}`}
                        style={[
                          styles.sharePassChip,
                          isSelected && styles.sharePassChipSelected,
                          isShared && styles.sharePassChipShared,
                          isUsed && styles.sharePassChipUsed,
                        ]}
                        onPress={() => setSelectedSharePassIndex(index)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.sharePassChipText,
                            isSelected && styles.sharePassChipTextSelected,
                          ]}
                        >
                          {pass.ticketIndex}
                        </Text>
                        {isUsed && (
                          <View style={styles.sharePassCheck}>
                            <Feather name="check" size={10} color="#101014" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.sharePassHint}>
                {selectedSharePass?.status === "used"
                  ? "Selected ticket is already used and cannot be shared again."
                  : selectedShare
                  ? "An active shared QR can be cancelled below. Owner-held tickets remain selectable for new shares."
                  : !selectedSharePass
                  ? "No owner-held ticket QR is currently available to share."
                  : "Select a ticket QR, then choose one friend to share that ticket with."}
              </Text>

              {selectedShare && (
                <View style={styles.currentShareCard}>
                  <View>
                    <Text style={styles.currentShareLabel}>Currently shared with</Text>
                    <Text style={styles.currentShareName}>{selectedShare.friend?.name ?? "Friend"}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelShareButton}
                    onPress={() => void handleCancelShare()}
                    disabled={isShareSubmitting || selectedRevokeSharePass?.status === "used"}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelShareButtonText}>{selectedRevokeSharePass?.status === "used" ? "Used" : "Cancel"}</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                value={friendSearch}
                onChangeText={(value) => {
                  setFriendSearch(value);
                  void loadFriends(value);
                }}
                placeholder="Search friends"
                placeholderTextColor="#77717D"
                style={styles.friendSearchInput}
              />

              {!!shareErrorMessage && <Text style={styles.shareErrorText}>{shareErrorMessage}</Text>}

              {isFriendsLoading ? (
                <View style={styles.friendState}>
                  <ActivityIndicator color="#C2B9CB" />
                </View>
              ) : (
                <View style={styles.friendListContainer}>
                  <FlatList
                    data={filteredFriends}
                    keyExtractor={(item) => item.id}
                    style={styles.friendList}
                    contentContainerStyle={[
                      filteredFriends.length === 0 ? styles.friendState : undefined,
                      { paddingBottom: Math.max(insets.bottom, 12) },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={styles.friendEmptyText}>No mutual friends found.</Text>}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.friendRow}
                        onPress={() => void handleShareWithFriend(item)}
                        disabled={isShareSubmitting || !selectedSharePass || selectedSharePass?.status === "used"}
                        activeOpacity={0.85}
                      >
                        <UserAvatar uri={resolveAvatarUri(item.avatarKey, item.avatarUrl)} name={item.name} size={42} style={styles.friendAvatar} />
                        <View style={styles.friendCopy}>
                          <Text style={styles.friendName}>{item.name}</Text>
                          {!!item.username && <Text style={styles.friendHandle}>@{item.username}</Text>}
                        </View>
                        <Text
                          style={[
                            styles.friendAction,
                            (!selectedSharePass || selectedSharePass?.status === "used") && styles.friendActionDisabled,
                          ]}
                        >
                          {!selectedSharePass ? "Unavailable" : selectedSharePass?.status === "used" ? "Used" : "Share"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorMessage || !event || !ticket) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <BackButton color={colors.text} onPress={() => safeBack(router, '/(tabs)/home')} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Ticket not found</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {errorMessage ?? "This ticket is no longer available."}
        </Text>
      </View>
    );
  }

  const eventCategories = event.categories?.length ? event.categories : event.category ? [event.category] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
      >
        <View style={styles.hero}>
          <Image source={{ uri: bannerImageUri }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.72)", colors.background]}
            locations={[0, 0.58, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.headerTop, { paddingTop: insets.top + 10 }]}>
            <BackButton color="#FFFFFF" onPress={() => safeBack(router, '/(tabs)/home')} />
            <Text style={styles.headerTitle}>Ticket Detail</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroContent}>
            {eventCategories.length > 0 ? (
              <View style={styles.tagsRow}>
                {eventCategories.map((category) => (
                  <View key={category} style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.hostRow}>
              <UserAvatar uri={hostAvatarUri} name={event.host?.name} size={52} style={styles.hostAvatar} />
              <View style={styles.hostTextBlock}>
                <Text style={styles.hostName} numberOfLines={1}>
                  {event.host?.name ?? "Host"}
                </Text>
                {!!hostHandle && <Text style={styles.hostHandle}>{hostHandle}</Text>}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={2}>
                  {ticket.name}
                </Text>
                <Text style={[styles.eventLocation, { color: colors.textSecondary }]}>
                  {ticket.description || "Ticket details provided by the event organizer."}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.success + "1A" }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.priceValue, { color: colors.text }]}>{formatPrice(ticket)}</Text>
              {ticket.type !== "free" && ticket.price > 0 && (
                <Text style={[styles.priceCaption, { color: colors.textSecondary }]}>per ticket</Text>
              )}
            </View>

            <View style={styles.detailsList}>
              {details.map((item, index) => (
                <View key={item.label}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: item.highlight ? "#1D9E75" : colors.text },
                      ]}
                      numberOfLines={2}
                    >
                      {item.value}
                    </Text>
                  </View>
                  {index < details.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              ))}
            </View>
          </View>

          {!!eventId && (
            <TouchableOpacity
              style={[styles.eventDetailsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={handleViewEventDetails}
            >
              <Text style={[styles.eventDetailsButtonText, { color: colors.text }]}>View Event Details</Text>
              <Feather name="arrow-right" size={16} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10, backgroundColor: colors.background + "F2" }]}>
        {isHostMode ? (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: buttonBackground(colors) }]} onPress={handleEditTicket}>
            <Feather name="edit-2" size={18} color={buttonForeground(colors)} />
            <Text style={[styles.primaryBtnText, { color: buttonForeground(colors) }]}>Edit Ticket</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: buttonBackground(colors) }]} onPress={() => safeBack(router, '/(tabs)/home')}>
            <Text style={[styles.primaryBtnText, { color: buttonForeground(colors) }]}>Back to Tickets</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default TicketDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  hero: {
    height: 340,
    width: "100%",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  heroContent: {
    bottom: 22,
    left: 16,
    position: "absolute",
    right: 16,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  hostRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  hostAvatar: {
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    width: 44,
  },
  hostTextBlock: {
    flex: 1,
  },
  hostName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  hostHandle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    marginTop: -24,
    paddingHorizontal: 16,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 18,
  },
  cardTitleBlock: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  eventLocation: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priceRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  priceValue: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 36,
  },
  priceCaption: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 5,
  },
  detailsList: {
    gap: 10,
  },
  detailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 20,
    width: 104,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  footer: {
    bottom: 0,
    gap: 12,
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0,
  },
  primaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    height: 56,
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  eventDetailsButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 52,
    justifyContent: "center",
    marginTop: 12,
  },
  eventDetailsButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  walletContainer: {
    backgroundColor: "#101014",
    flex: 1,
  },
  walletScrollContent: {
    alignItems: "center",
  },
  walletHero: {
    height: 208,
    width: "100%",
  },
  walletHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  walletHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  walletHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  walletHeaderSpacer: {
    width: 44,
  },
  walletHeroContent: {
    bottom: 12,
    left: 20,
    position: "absolute",
    right: 20,
  },
  walletHeroStatusStack: {
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 10,
  },
  walletCategoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.26)",
    borderRadius: 5,
    marginBottom: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  walletCategoryText: {
    color: "#D9D2DD",
    fontSize: 8,
    fontWeight: "700",
  },
  walletHostRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  walletHostAvatar: {
    borderColor: "#EBD8C8",
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    width: 34,
  },
  walletHostCopy: {
    flex: 1,
  },
  walletHostName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  walletHostHandle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    lineHeight: 13,
  },
  walletSharedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 6,
  },
  walletSharedAvatar: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  walletSharedText: {
    color: "#A6A0AA",
    fontSize: 9,
    fontWeight: "500",
  },
  walletSharedName: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  walletContent: {
    marginTop: 4,
    width: WALLET_CONTENT_WIDTH,
  },
  walletInfoCard: {
    backgroundColor: "#17151A",
    borderColor: "#2A2730",
    borderRadius: 7,
    borderWidth: 1,
    overflow: "hidden",
  },
  walletCardHeader: {
    alignItems: "flex-start",
    backgroundColor: "#181420",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  walletCardTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  walletEventTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  walletEventCity: {
    color: "#A6A0AA",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  walletStatusBadge: {
    alignItems: "center",
    backgroundColor: "rgba(22,216,105,0.12)",
    borderColor: "rgba(22,216,105,0.42)",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  walletStatusText: {
    color: "#16D869",
    fontSize: 10,
    fontWeight: "800",
  },
  walletDetailsList: {
    paddingHorizontal: 12,
  },
  walletDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 29,
    paddingVertical: 5,
  },
  walletDetailLabel: {
    color: "#A6A0AA",
    fontSize: 10,
    lineHeight: 14,
    width: 92,
  },
  walletDetailValue: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
    textAlign: "right",
  },
  walletPriceValue: {
    color: "#DFFF00",
  },
  walletDivider: {
    backgroundColor: "#3B3740",
    height: 1,
  },
  walletSingleActions: {
    marginTop: 16,
  },
  walletDualActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  walletEventDetailsButton: {
    alignItems: "center",
    backgroundColor: "#1B1821",
    borderColor: "#36313D",
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 40,
    justifyContent: "center",
    marginTop: 12,
  },
  walletEventDetailsButtonText: {
    color: "#C9C1CF",
    fontSize: 12,
    fontWeight: "800",
  },
  walletShareButton: {
    alignItems: "center",
    backgroundColor: "#3B3B3D",
    borderRadius: 7,
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  walletShareButtonActive: {
    backgroundColor: "#1B2B1F",
    borderColor: "rgba(22,216,105,0.28)",
    borderWidth: 1,
  },
  walletShareButtonText: {
    color: "#C9C1CF",
    fontSize: 12,
    fontWeight: "800",
  },
  walletShowButton: {
    alignItems: "center",
    backgroundColor: "#C2B9CB",
    borderRadius: 7,
    height: 40,
    justifyContent: "center",
  },
  walletActionFlex: {
    flex: 1,
  },
  walletShowButtonFull: {
    width: "100%",
  },
  walletActionDisabled: {
    opacity: 0.45,
  },
  walletShowButtonText: {
    color: "#17151A",
    fontSize: 12,
    fontWeight: "800",
  },
  walletCancelButton: {
    alignItems: "center",
    backgroundColor: "#2B100F",
    borderRadius: 7,
    height: 39,
    justifyContent: "center",
    marginTop: 8,
  },
  walletCancelButtonText: {
    color: "#FF4D4D",
    fontSize: 12,
    fontWeight: "800",
  },
  walletCancelDisabledText: {
    color: "#A6A0AA",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    marginTop: 8,
    textAlign: "center",
  },
  walletCancellationState: {
    alignItems: "center",
    backgroundColor: "#1B1821",
    borderColor: "#36313D",
    borderRadius: 7,
    borderWidth: 1,
    gap: 2,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  walletCancellationStateText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  walletCancellationSubText: {
    color: "#C2B9CB",
    fontSize: 11,
    fontWeight: "700",
  },
  shareModalOverlay: {
    backgroundColor: "rgba(0,0,0,0.58)",
    flex: 1,
    justifyContent: "flex-end",
  },
  shareModalBackgroundDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  shareModalSheet: {
    backgroundColor: "#121116",
    borderColor: "#2A2730",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
    maxHeight: "78%",
    padding: 16,
    paddingBottom: 28,
    width: "100%",
  },
  shareModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  shareModalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
  shareModalSubtitle: {
    color: "#A6A0AA",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  shareModalClose: {
    alignItems: "center",
    backgroundColor: "#242229",
    borderRadius: 16,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sharePassSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  sharePassChip: {
    alignItems: "center",
    backgroundColor: "#1B1821",
    borderColor: "#36313D",
    borderRadius: 14,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    minWidth: 44,
    overflow: "hidden",
    paddingHorizontal: 12,
  },
  sharePassChipSelected: {
    backgroundColor: "#C2B9CB",
    borderColor: "#C2B9CB",
  },
  sharePassChipShared: {
    borderColor: "#16D869",
  },
  sharePassChipUsed: {
    borderColor: "#C2B9CB",
  },
  sharePassChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  sharePassChipTextSelected: {
    color: "#17151A",
  },
  sharePassCheck: {
    alignItems: "center",
    backgroundColor: "#C2B9CB",
    borderRadius: 999,
    height: 14,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 14,
  },
  sharePassHint: {
    color: "#A6A0AA",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  currentShareCard: {
    alignItems: "center",
    backgroundColor: "#1B1821",
    borderColor: "#36313D",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 12,
  },
  currentShareLabel: {
    color: "#A6A0AA",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  currentShareName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 2,
  },
  cancelShareButton: {
    backgroundColor: "#2B100F",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelShareButtonText: {
    color: "#FF4D4D",
    fontSize: 12,
    fontWeight: "800",
  },
  friendSearchInput: {
    backgroundColor: "#1B1821",
    borderColor: "#36313D",
    borderRadius: 10,
    borderWidth: 1,
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  shareErrorText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 10,
  },
  friendListContainer: {
    flexShrink: 1,
    marginTop: 10,
  },
  friendList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  friendState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
  },
  friendEmptyText: {
    color: "#A6A0AA",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  friendRow: {
    alignItems: "center",
    borderBottomColor: "#28242E",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingVertical: 10,
  },
  friendAvatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  friendCopy: {
    flex: 1,
  },
  friendName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  friendHandle: {
    color: "#A6A0AA",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  friendAction: {
    color: "#C2B9CB",
    fontSize: 12,
    fontWeight: "800",
  },
  friendActionDisabled: {
    color: "#77717D",
  },
});
