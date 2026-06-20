import AboutTab from "@/components/eventTabs/AboutTab";
import AccessTab from "@/components/eventTabs/AccessTab";
import ChatTab from "@/components/eventTabs/ChatTab";
// ProductTab hidden — preserved for future restoration
// import ProductTab from "@/components/eventTabs/ProductTab";
import VibeTab from "@/components/eventTabs/VibeTab";
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
    claimEventReward,
    deleteEvent,
    deleteEventReward,
    deleteEventTicket,
    getEventById,
    getMyEventRewardClaims,
    updateEvent,
    type EventResponse,
    type EventRewardPayload,
    type EventRewardType,
    type EventTicketPayload,
} from "@/lib/events";
import { getMyTicketPurchaseCounts } from "@/lib/payments";
import { getStorageFileUrl } from "@/lib/storage";
import { followUser, unfollowUser } from "@/lib/users";
import { requireBusinessAccountForEvent } from "@/lib/eventGuard";
import { useAuthStore } from "@/stores/authStore";
import { useEventDraftStore } from "@/stores/eventDraftStore";
import { Feather } from "@expo/vector-icons";
import {
    Bookmark01Icon,
    Comment02Icon,
    Delete02Icon,
    FavouriteIcon,
    Flag01Icon,
    MoreHorizontalIcon,
    Share01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const DEFAULT_BANNER =
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400";

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

const resolveStorageUrl = (key?: string | null, fallback = DEFAULT_AVATAR) => {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};

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
  tickets.reduce((total, ticket) => total + Math.max(0, ticket.capacity), 0);

const getTicketKey = (ticket: EventTicketPayload, index: number) =>
  ticket.id ?? `${ticket.name}-${index}`;

const clampTicketQuantity = (quantity: number, ticket: EventTicketPayload) =>
  Math.min(Math.max(1, quantity), Math.min(2, Math.max(1, ticket.capacity)));

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

    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()}mi`;
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

const getHostAvatarUri = (event?: EventResponse | null) =>
  resolveStorageUrl(event?.host?.avatarUrl ?? event?.host?.avatarKey, DEFAULT_AVATAR);

const getHostHandle = (event?: EventResponse | null) => {
  const handle = event?.host?.username?.trim().replace(/^@+/, "");

  return handle ? `@${handle}` : "";
};

const getHeroCategoryTags = (event?: EventResponse | null) => {
  if (!event) {
    return [];
  }

  const tags: string[] = [];

  if (event.category) {
    tags.push(event.category);
  }

  return tags.slice(0, 2);
};

const getPrivacyLabel = (privacy?: EventResponse["privacy"]) => {
  if (privacy === "private") return "Private Event";
  if (privacy === "locked") return "Locked Event";
  return "Public Event";
};

const isSameId = (left?: string | null, right?: string | null) =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const goBackOrHome = (router: ReturnType<typeof useRouter>) => {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace("/(tabs)/home");
};

const EventScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; id?: string; mode?: string }>();
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
  const [selectedTicketKey, setSelectedTicketKey] = useState<string | null>(null);
  const [selectedTicketQuantity, setSelectedTicketQuantity] = useState(1);
  const [accessSubTab, setAccessSubTab] = useState("Tickets");
  const [isEventStarted, setIsEventStarted] = useState(false);

  const eventId = useMemo(() => {
    const explicitId = typeof params.eventId === "string" ? params.eventId : typeof params.id === "string" ? params.id : null;

    return explicitId ?? draftId;
  }, [draftId, params.eventId, params.id]);

  const isHostMode =
    params.mode === "host" ||
    Boolean(event && (isSameId(currentUser?.id, event.userId) || isSameId(currentUser?.id, event.host?.id)));

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
  }, [eventId, router]);

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
  const footerPriceLabel = selectedTicket
    ? `${selectedTicketQuantity} ${selectedTicketQuantity === 1 ? "ticket" : "tickets"}`
    : "From";
  const hostName = event?.host?.name ?? "Host";
  const hostHandle = getHostHandle(event);
  const hostAvatarUri = getHostAvatarUri(event);
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
      })
    | null;
  const likesCount = eventStats?.likesCount ?? 0;
  const commentsCount = eventStats?.commentsCount ?? 0;
  const sharesCount = eventStats?.sharesCount ?? 0;

  useEffect(() => {
    if (!selectedTicketKey) {
      setSelectedTicketQuantity(1);
      return;
    }

    const currentTicket = (event?.tickets ?? []).find((ticket, index) => getTicketKey(ticket, index) === selectedTicketKey);

    if (!currentTicket || currentTicket.capacity <= 0) {
      setSelectedTicketKey(null);
      setSelectedTicketQuantity(1);
      return;
    }

    setSelectedTicketQuantity((quantity) => clampTicketQuantity(quantity, currentTicket));
  }, [event?.tickets, selectedTicketKey]);

  const handleEdit = () => {
    setMenuVisible(false);

    if (!event || !isHostMode) {
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
                  router.back();
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
              onPress: () => {
                // TODO: wire up cancel-event API call
                console.log("Event cancelled");
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
              onPress: () => {
                setIsEventStarted(true);
                router.push("/profile-screen/event-dashboard");
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
              onPress: () => {
                setIsEventStarted(false);
                // TODO: wire up end-event API call
                console.log("Event ended successfully");
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

    loadEventForEdit(event);
    router.push("/create-event/ticket-details");
  };

  const handleEditTicket = (ticket: EventTicketPayload) => {
    if (!event || !isHostMode) {
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
    if (ticket.capacity <= 0) {
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

  const handleTicketQuantityChange = (
    ticket: EventTicketPayload,
    ticketKey: string,
    quantity: number,
  ) => {
    if (ticket.capacity <= 0) {
      return;
    }

    setSelectedTicketKey(ticketKey);
    setSelectedTicketQuantity(clampTicketQuantity(quantity, ticket));
  };

  const handleBuySelectedTicket = () => {
    if (!event || !selectedTicket || !selectedTicketKey) {
      return;
    }

    const ticketId = selectedTicket.id ?? selectedTicket.name;
    const alreadyPurchased = purchasedTicketCounts[ticketId] ?? 0;
    const maxAllowed = Math.max(0, 2 - alreadyPurchased);

    if (maxAllowed <= 0) {
      return;
    }

    const quantity = Math.min(clampTicketQuantity(selectedTicketQuantity, selectedTicket), maxAllowed);

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

    Alert.alert(
      "Create Reward",
      "Choose the reward type.",
      [
        { text: "Product reward", onPress: () => openRewardForm("product") },
        { text: "Ticket reward", onPress: () => openRewardForm("ticket") },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handleEditReward = (reward: EventRewardPayload) => {
    openRewardForm(reward.rewardType, reward);
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
    if (!event) return;
    router.push({
      pathname: "/event-screen/members",
      params: { eventId: event.id },
    });
  };

  const handlePrivacyChange = async (newPrivacy: "public" | "locked") => {
    setPrivacyDropdownVisible(false);

    if (!event || !isHostMode || isUpdatingPrivacy || event.privacy === newPrivacy) {
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
      <BackButton color={colors.text} onPress={() => router.back()} />
      {isHostMode && event?.privacy !== "private" && (
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
              {isHostMode && event?.privacy === "private" && (
                <TouchableOpacity
                  style={styles.addMembersBtn}
                  activeOpacity={0.85}
                  onPress={handleAddMembers}
                >
                  <Feather name="plus" size={15} color="#111111" />
                  <Text style={styles.addMembersText}>Add Members</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.hostRow}>
              <Image
                source={{ uri: hostAvatarUri }}
                style={[
                  styles.hostAvatar,
                  { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" },
                ]}
              />
              <View style={styles.hostInfo}>
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
              </View>
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

            <View style={styles.actionStatsRow}>
              <View style={styles.actionStat}>
                <HugeiconsIcon icon={FavouriteIcon} size={18} color="#F2245C" />
                <Text style={[styles.actionStatText, { color: colors.text }]}>{likesCount}</Text>
              </View>
              <View style={styles.actionStat}>
                <HugeiconsIcon icon={Comment02Icon} size={18} color={colors.textSecondary} />
                <Text style={[styles.actionStatText, { color: colors.text }]}>{commentsCount}</Text>
              </View>
              <View style={styles.actionStat}>
                <HugeiconsIcon icon={Share01Icon} size={18} color={colors.textSecondary} />
                <Text style={[styles.actionStatText, { color: colors.text }]}>{sharesCount}</Text>
              </View>
            </View>
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
              category={event?.category ?? null}
              onHostFollowChange={updateHostFollowState}
            />
          )}
          {activeTab === "Access" && (
            <AccessTab
              tickets={event?.tickets ?? []}
              rewards={event?.rewards ?? []}
              scheduledAt={event?.scheduledAt ?? null}
              purchasedTicketCounts={purchasedTicketCounts}
              isHostMode={isHostMode}
              deletingTicketId={deletingTicketId}
              deletingRewardId={deletingRewardId}
              claimingRewardId={claimingRewardId}
              claimedRewardIds={claimedRewardIds}
              selectedTicketKey={selectedTicketKey}
              selectedTicketQuantity={selectedTicketQuantity}
              selectedAccessSubTab={accessSubTab}
              onSelectAccessSubTab={setAccessSubTab}
              onSelectTicket={handleSelectTicket}
              onTicketQuantityChange={handleTicketQuantityChange}
              onCreateTicket={handleCreateTicket}
              onViewTicket={handleViewTicket}
              onEditTicket={handleEditTicket}
              onDeleteTicket={handleDeleteTicket}
              onCreateReward={handleCreateReward}
              onEditReward={handleEditReward}
              onDeleteReward={handleDeleteReward}
              onClaimReward={handleClaimReward}
            />
          )}
          {activeTab === "Mooments" && eventId && (
            <VibeTab
              eventId={eventId}
              eventName={event?.name ?? "Event"}
              isHostMode={isHostMode}
              isParticipant={Object.values(purchasedTicketCounts).some((count) => count > 0)}
              scheduledAt={event?.scheduledAt}
            />
          )}
          {activeTab === "Chat" && eventId && (
            <ChatTab
              eventId={eventId}
              eventName={event?.name ?? "Event"}
              scheduledAt={event?.scheduledAt ?? null}
              isHostMode={isHostMode}
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

        <View style={{ height: 220 }} />
      </ScrollView>

      <View
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
                  backgroundColor: selectedTicket ? colors.primary : colors.card,
                  opacity: 1,
                },
              ]}
              activeOpacity={0.8}
              onPress={handleTicketCtaPress}
            >
              <Text style={[styles.buyBtnText, { color: selectedTicket ? colors.background : colors.textSecondary }]}>
                {selectedTicket ? "Buy Now" : "Select Ticket"}
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
                <TouchableOpacity style={styles.menuItem} onPress={handleEdit} activeOpacity={0.7}>
                  <Feather name="edit-3" size={20} color="#FFF" />
                  <Text style={[styles.menuItemText, { color: "#FFF" }]}>Edit</Text>
                </TouchableOpacity>

                <View style={styles.menuSeparator} />

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
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    console.log("Reported");
                  }}
                  activeOpacity={0.7}
                >
                  <HugeiconsIcon icon={Flag01Icon} size={20} color="#FFF" />
                  <Text style={[styles.menuItemText, { color: "#FFF" }]}>Report</Text>
                </TouchableOpacity>

                <View style={styles.menuSeparator} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    console.log("Saved");
                  }}
                  activeOpacity={0.7}
                >
                  <HugeiconsIcon icon={Bookmark01Icon} size={20} color="#FFF" />
                  <Text style={[styles.menuItemText, { color: "#FFF" }]}>Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  actionStatsRow: {
    flexDirection: "row",
    gap: 20,
  },
  actionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionStatText: {
    fontSize: 13,
    fontWeight: "600",
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
  hostFooterBtns: {
    flex: 1,
    flexDirection: "column",
    gap: 10,
  },
  startEventBtn: {
    alignItems: "center",
    backgroundColor: "#B2ABBA",
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
});
