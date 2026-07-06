import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { EventPrivacy, EventRewardPayload, EventTicketPayload, JoinRequest, JoinRequestStatus } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import SegmentedControl from "../ui/SegmentedControl";
import { Spinner } from "@/components/ui/spinner";
import UserAvatar from "../ui/UserAvatar";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
type TicketStat = { sold: number; available: number; capacity: number };

const resolveAvatarUri = (avatarKey?: string | null, avatarUrl?: string | null) => {
  if (avatarUrl?.trim()) {
    return avatarUrl.trim();
  }

  if (!avatarKey) {
    return null;
  }

  try {
    return getStorageFileUrl(avatarKey);
  } catch {
    return null;
  }
};

type AccessTabProps = {
  tickets?: EventTicketPayload[];
  rewards?: EventRewardPayload[];
  scheduledAt?: string | null;
  privacy?: EventPrivacy;
  isMember?: boolean;
  purchasedTicketCounts?: Record<string, number>;
  ticketStats?: Record<string, TicketStat>;
  isHostMode?: boolean;
  selectedTicketKey?: string | null;
  selectedTicketQuantity?: number;
  currentTimeMs?: number;
  deletingTicketId?: string | null;
  deletingRewardId?: string | null;
  claimingRewardId?: string | null;
  claimedRewardIds?: string[];
  selectedAccessSubTab?: string;
  joinRequests?: JoinRequest[];
  myJoinRequestStatus?: JoinRequestStatus | null;
  submittingJoinRequest?: boolean;
  acceptingJoinRequestId?: string | null;
  decliningJoinRequestId?: string | null;
  onSelectAccessSubTab?: (subTab: string) => void;
  onSelectTicket?: (ticket: EventTicketPayload, ticketKey: string) => void;
  onExpiredTicketPress?: (ticket: EventTicketPayload) => void;
  onTicketQuantityChange?: (ticket: EventTicketPayload, ticketKey: string, quantity: number) => void;
  onSubmitJoinRequest?: () => void;
  onAcceptJoinRequest?: (userId: string) => void;
  onDeclineJoinRequest?: (userId: string) => void;
  onCreateTicket?: () => void;
  onViewTicket?: (ticket: EventTicketPayload) => void;
  onEditTicket?: (ticket: EventTicketPayload) => void;
  onDeleteTicket?: (ticket: EventTicketPayload) => void;
  onCreateReward?: () => void;
  onViewReward?: (reward: EventRewardPayload) => void;
  onEditReward?: (reward: EventRewardPayload) => void;
  onDeleteReward?: (reward: EventRewardPayload) => void;
  onClaimReward?: (reward: EventRewardPayload) => void;
};

const formatExpiry = (value?: string | null, fallbackDate?: string | null) => {
  const source = value ?? fallbackDate;

  if (!source) {
    return "Expires in • Date TBA";
  }

  const date = new Date(source);

  if (Number.isNaN(date.getTime())) {
    return "Expires in • Date TBA";
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

  return `Expires in • ${dateLabel} • ${timeLabel}`;
};

const formatPrice = (ticket: EventTicketPayload) => {
  if (ticket.type === "free" || ticket.price <= 0) {
    return "Free";
  }

  return `$${ticket.price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(ticket.price) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(ticket.price) ? 0 : 2,
  })}`;
};

const getTicketDescriptionPreview = (value?: string | null) => {
  const description = value?.trim() || "Ticket details provided by the event organizer.";

  return description.length > 96 ? `${description.slice(0, 93).trim()}...` : description;
};

const getTicketKey = (ticket: EventTicketPayload, index: number) =>
  ticket.id ?? `${ticket.name}-${index}`;

const getTicketAvailability = (ticket: EventTicketPayload) =>
  Math.max(0, ticket.availableCount ?? ticket.capacity);

const getTicketSalesEndDate = (ticket: EventTicketPayload) => {
  if (!ticket.salesEndAt) {
    return null;
  }

  const salesEndAt = new Date(ticket.salesEndAt);

  return Number.isNaN(salesEndAt.getTime()) ? null : salesEndAt;
};

const isTicketSalesEnded = (ticket: EventTicketPayload, nowMs = Date.now()) => {
  const salesEndAt = getTicketSalesEndDate(ticket);

  return Boolean(salesEndAt && salesEndAt.getTime() <= nowMs);
};

const getRewardKey = (reward: EventRewardPayload, index: number) =>
  reward.id ?? `${reward.rewardType}-${reward.name}-${index}`;

const getRewardImageUri = (reward: EventRewardPayload) => {
  const imageKey = reward.imageKeys?.[0];

  if (!imageKey) {
    return null;
  }

  try {
    return getStorageFileUrl(imageKey);
  } catch {
    return null;
  }
};

const getRewardDescription = (reward: EventRewardPayload) => {
  const target = reward.targetName?.trim();
  const base = reward.description?.trim() || reward.name;
  const buyFree = `Buy ${reward.buyQuantity} get ${reward.freeQuantity} free`;
  const discount = reward.discountPercent > 0 ? `${reward.discountPercent}% off` : null;

  return [base, target ? `for ${target}` : null, discount ?? buyFree].filter(Boolean).join(" ");
};

const AccessTab = ({
  tickets = [],
  rewards = [],
  scheduledAt,
  privacy,
  isMember = false,
  purchasedTicketCounts = {},
  ticketStats,
  isHostMode = false,
  selectedTicketKey = null,
  selectedTicketQuantity = 1,
  currentTimeMs = Date.now(),
  deletingTicketId = null,
  deletingRewardId = null,
  claimingRewardId = null,
  claimedRewardIds = [],
  selectedAccessSubTab,
  joinRequests = [],
  myJoinRequestStatus = null,
  submittingJoinRequest = false,
  acceptingJoinRequestId = null,
  decliningJoinRequestId = null,
  onSelectAccessSubTab,
  onSelectTicket,
  onExpiredTicketPress,
  onTicketQuantityChange,
  onSubmitJoinRequest,
  onAcceptJoinRequest,
  onDeclineJoinRequest,
  onCreateTicket,
  onViewTicket,
  onEditTicket,
  onDeleteTicket,
  onCreateReward,
  onViewReward,
  onEditReward,
  onDeleteReward,
  onClaimReward,
}: AccessTabProps) => {
  const { colors, isDark } = useTheme();
  const isLocked = privacy === "locked";
  const isPrivate = privacy === "private";
  const showRequestTab = isLocked && isHostMode;
  const [localAccessSubTab, setLocalAccessSubTab] = useState("Tickets");
  const rawSubTab = selectedAccessSubTab ?? localAccessSubTab;
  const accessSubTab = rawSubTab === "Requests" && !showRequestTab ? "Tickets" : rawSubTab;
  const handleSelectAccessSubTab = (subTab: string) => {
    if (selectedAccessSubTab === undefined) {
      setLocalAccessSubTab(subTab);
    }

    onSelectAccessSubTab?.(subTab);
  };

  const totalTicketsLeft = useMemo(
    () => tickets.reduce((total, ticket) => total + getTicketAvailability(ticket), 0),
    [tickets],
  );

  const renderRequestButton = () => {
    if (myJoinRequestStatus === "pending") {
      return (
        <View style={[styles.requestBtn, styles.requestBtnPending]}>
          <Feather name="clock" size={13} color="#888" />
          <Text style={[styles.requestBtnText, { color: "#888" }]}>Requested</Text>
        </View>
      );
    }

    if (myJoinRequestStatus === "declined") {
      return (
        <View style={[styles.requestBtn, styles.requestBtnPending]}>
          <Text style={[styles.requestBtnText, { color: "#888" }]}>Declined</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.requestBtn, { backgroundColor: buttonBackground(colors), opacity: submittingJoinRequest ? 0.7 : 1 }]}
        disabled={submittingJoinRequest}
        onPress={onSubmitJoinRequest}
        activeOpacity={0.8}
      >
        {submittingJoinRequest ? (
          <ActivityIndicator size="small" color={buttonForeground(colors)} />
        ) : (
          <Text style={[styles.requestBtnText, { color: buttonForeground(colors) }]}>Request</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTicketInner = (
    ticket: EventTicketPayload,
    ticketKey: string,
    quantity: number,
    maxQuantity: number,
    isSelected: boolean,
    isFreeTicket: boolean,
    isSoldOut: boolean,
    isLimitReached: boolean,
    isSalesEnded: boolean,
    isUnavailable: boolean,
    alreadyPurchased: number,
    remainingAllowed: number,
    hasAcceptedRequest: boolean,
  ) => {
    return (
      <>
        <View style={styles.ticketHeader}>
          <Text style={[styles.ticketType, { color: isSoldOut ? "#B3B3B3" : "#FFFFFF" }]}>
            {ticket.name}
          </Text>
          <View style={[
            styles.countBadge,
            isSalesEnded
              ? { backgroundColor: "rgba(255, 107, 61, 0.15)" }
              : isLimitReached
              ? { backgroundColor: "rgba(255, 107, 61, 0.15)" }
              : isSoldOut
                ? { backgroundColor: "#2D1B1B" }
                : { backgroundColor: "#666666" }
          ]}>
            <Text style={[
              styles.countBadgeText,
              isSalesEnded
                ? { color: "#FF6B3D" }
                : isLimitReached
                ? { color: "#FF6B3D" }
                : isSoldOut
                  ? { color: "#E83030" }
                  : { color: "#FFFFFF" }
            ]}>
              {isSalesEnded ? "Sales ended" : isLimitReached ? "Limit reached" : isSoldOut ? "Sold Out" : `${getTicketAvailability(ticket)} left`}
            </Text>
          </View>
        </View>

        {isLimitReached && (
          <Text style={styles.limitReachedText}>
            You have purchased the maximum of 2 tickets of this type.
          </Text>
        )}

        <Text style={styles.ticketDesc} numberOfLines={2}>
          {getTicketDescriptionPreview(ticket.description)}
        </Text>

        <View style={styles.ticketMetaRow}>
          {(() => {
            const source = ticket.salesEndAt ?? scheduledAt;
            if (!source) {
              return <Text style={styles.expiryText}>Expires in • Date TBA</Text>;
            }
            const dateVal = new Date(source);
            if (Number.isNaN(dateVal.getTime())) {
              return <Text style={styles.expiryText}>Expires in • Date TBA</Text>;
            }
            const dateLabel = dateVal.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              weekday: "short",
            });
            const timeLabel = dateVal.toLocaleTimeString("en-US", {
              hour: "numeric",
              hour12: true,
              minute: "2-digit",
            });
            return (
              <View style={styles.expiryRow}>
                <Text style={styles.expiryText}>Expires in</Text>
                <View style={styles.expiryDot} />
                <Text style={styles.expiryText}>{dateLabel}</Text>
                <View style={styles.expiryDot} />
                <Text style={styles.expiryText}>{timeLabel}</Text>
              </View>
            );
          })()}
          {!!onViewTicket && (
            <TouchableOpacity
              style={styles.viewDetailsButton}
              activeOpacity={0.75}
              onPress={(event) => {
                event.stopPropagation();
                onViewTicket(ticket);
              }}
            >
              <Feather name="info" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.viewDetailsText, { color: colors.primary }]}>Details</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.ticketFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.ticketPrice}>{formatPrice(ticket)}</Text>
            {!isFreeTicket && (
              alreadyPurchased > 0 && !isLimitReached ? (
                <Text style={styles.perTicketText}>
                  {alreadyPurchased} purchased • {remainingAllowed} left
                </Text>
              ) : (
                <Text style={styles.perTicketText}>per ticket</Text>
              )
            )}
          </View>

          {isLocked && !hasAcceptedRequest ? (
            renderRequestButton()
          ) : (
            <View style={styles.counter}>
              <TouchableOpacity
                style={[
                  styles.counterBtn,
                  (!isSelected || quantity <= 1 || isUnavailable || isSalesEnded) && styles.counterBtnDisabled,
                ]}
                disabled={!isSelected || quantity <= 1 || isUnavailable || isSalesEnded}
                onPress={(event) => {
                  event.stopPropagation();
                  onTicketQuantityChange?.(ticket, ticketKey, quantity - 1);
                }}
              >
                <Feather name="minus" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.counterBtn,
                  (isUnavailable || isSalesEnded || (isSelected && quantity >= maxQuantity)) && styles.counterBtnDisabled,
                ]}
                disabled={isUnavailable || isSalesEnded || (isSelected && quantity >= maxQuantity)}
                onPress={(event) => {
                  event.stopPropagation();
                  onTicketQuantityChange?.(ticket, ticketKey, isSelected ? quantity + 1 : 1);
                }}
              >
                <Feather name="plus" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </>
    );
  };

  const renderTickets = () => {
    const hasAcceptedRequest = myJoinRequestStatus === "accepted";
    const hasPurchasedTickets = Object.values(purchasedTicketCounts).some((count) => count > 0);

    return (
      <View style={{ marginTop: 20 }}>
        {isPrivate && isMember && !isHostMode && (
          <View style={[styles.alertBanner, { backgroundColor: "rgba(22, 216, 105, 0.1)", marginBottom: 8 }]}>
            <Feather name="user-check" size={24} color="#1D9E75" />
            <Text style={[styles.alertText, { color: "#1D9E75" }]}>
              You&apos;ve been invited to this private event and can purchase tickets.
            </Text>
          </View>
        )}

        {((!isLocked && !isPrivate) || hasAcceptedRequest || (isPrivate && (isHostMode || isMember))) && (
          <View style={styles.alertBanner}>
            <Feather name="info" size={24} color="#BB5E30" />
            <Text style={styles.alertText}>You can only buy maximum of 2 tickets</Text>
          </View>
        )}

        {isLocked && !hasAcceptedRequest && (
          <View style={[styles.alertBanner, { backgroundColor: "rgba(130, 100, 255, 0.1)" }]}>
            <Feather name="lock" size={24} color="#8264FF" />
            <Text style={[styles.alertText, { color: "#8264FF" }]}>
              {myJoinRequestStatus === "pending"
                ? "Your request is pending approval from the host."
                : myJoinRequestStatus === "declined"
                  ? "Your request was declined by the host."
                  : "Request access to join this locked event."}
            </Text>
          </View>
        )}

        {((!isLocked && !isPrivate) || hasAcceptedRequest || (isPrivate && (isHostMode || isMember))) && (
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityLabel}>
              <View style={styles.greenDot} />
              <Text style={styles.availabilityText}>Tickets available</Text>
            </View>
            <Text style={styles.availabilityCount}>
              {totalTicketsLeft} left
            </Text>
          </View>
        )}

        {isLocked && hasAcceptedRequest && (
          <View style={[styles.alertBanner, { backgroundColor: "rgba(22, 216, 105, 0.1)" }]}>
            <Feather name="check-circle" size={24} color="#1D9E75" />
            <Text style={[styles.alertText, { color: "#1D9E75" }]}>Your request was accepted. You can now purchase tickets.</Text>
          </View>
        )}

        {tickets.length > 0 ? (
          tickets.map((ticket, index) => {
            const ticketKey = getTicketKey(ticket, index);
            const ticketId = ticket.id ?? ticketKey;
            const isSelected = selectedTicketKey === ticketKey;
            const isFreeTicket = ticket.type === "free" || ticket.price <= 0;
            const availableCount = getTicketAvailability(ticket);
            const isSoldOut = availableCount <= 0;
            const isSalesEnded = isTicketSalesEnded(ticket, currentTimeMs);
            const alreadyPurchased = purchasedTicketCounts[ticketId] ?? 0;
            const remainingAllowed = Math.max(0, 2 - alreadyPurchased);
            const isLimitReached = !isSoldOut && alreadyPurchased >= 2;
            const maxQuantity = Math.min(remainingAllowed, availableCount);
            const isUnavailable = isSoldOut || isLimitReached;
            const quantity = isSelected ? Math.min(Math.max(1, selectedTicketQuantity), maxQuantity || 1) : 0;

            const linkedReward = rewards.find(
              (r) => r.rewardType === "ticket" && r.ticketId === ticket.id,
            );

            const isRewardClaimed = linkedReward?.id ? claimedRewardIds.includes(linkedReward.id) : false;

            return (
              <View key={ticketKey}>
                {linkedReward ? (
                  <View style={[styles.gradientCardWrapper, isSelected && { borderColor: colors.primary }]}>
                    <LinearGradient
                      colors={["rgba(97, 44, 243, 0.1)", "rgba(51, 51, 51, 0.1)"]}
                      start={{ x: 0.1182, y: 0.0014 }}
                      end={{ x: 0.9883, y: 0.9883 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.rewardRow}>
                      <View style={styles.rewardRowLeft}>
                        <Text style={styles.rewardAppliedText}>Reward applied</Text>
                        <Text style={styles.bogoDescText}>
                          {`Buy ${linkedReward.buyQuantity} get ${linkedReward.freeQuantity} Free`}
                        </Text>
                      </View>
                      {!isHostMode && !isLocked && (
                        isRewardClaimed ? (
                          <View style={styles.claimedRewardBannerBadge}>
                            <Feather name="check" size={12} color="#26C08F" />
                            <Text style={styles.claimedRewardBannerText}>Claimed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.claimRewardBannerBtn}
                            onPress={() => onClaimReward?.(linkedReward)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.claimRewardBannerText}>Claim Reward</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.ticketCardNested,
                        {
                          opacity: isUnavailable ? 0.55 : 1,
                        },
                      ]}
                      activeOpacity={isLocked && !hasAcceptedRequest ? 1 : 0.86}
                      onPress={() => {
                        if (isSalesEnded && !isUnavailable && (!isLocked || hasAcceptedRequest)) {
                          onSelectTicket?.(ticket, ticketKey);
                          onExpiredTicketPress?.(ticket);
                        } else if (!isUnavailable && (!isLocked || hasAcceptedRequest)) {
                          onSelectTicket?.(ticket, ticketKey);
                        }
                      }}
                    >
                      {renderTicketInner(
                        ticket,
                        ticketKey,
                        quantity,
                        maxQuantity,
                        isSelected,
                        isFreeTicket,
                        isSoldOut,
                        isLimitReached,
                        isSalesEnded,
                        isUnavailable,
                        alreadyPurchased,
                        remainingAllowed,
                        hasAcceptedRequest,
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.ticketCardStandalone,
                      {
                        borderColor: isSelected && !isLocked ? colors.primary : "transparent",
                        opacity: isUnavailable ? 0.55 : 1,
                      },
                    ]}
                    activeOpacity={isLocked && !hasAcceptedRequest ? 1 : 0.86}
                    onPress={() => {
                      if (isSalesEnded && !isUnavailable && (!isLocked || hasAcceptedRequest)) {
                        onSelectTicket?.(ticket, ticketKey);
                        onExpiredTicketPress?.(ticket);
                      } else if (!isUnavailable && (!isLocked || hasAcceptedRequest)) {
                        onSelectTicket?.(ticket, ticketKey);
                      }
                    }}
                  >
                    {renderTicketInner(
                      ticket,
                      ticketKey,
                      quantity,
                      maxQuantity,
                      isSelected,
                      isFreeTicket,
                      isSoldOut,
                      isLimitReached,
                      isSalesEnded,
                      isUnavailable,
                      alreadyPurchased,
                      remainingAllowed,
                      hasAcceptedRequest,
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={[styles.ticketCardStandalone, { borderColor: colors.border }]}>
            <Text style={[styles.ticketType, { color: colors.text, marginBottom: 8 }]}>Tickets not available</Text>
            <Text style={styles.ticketDesc}>
              Ticket data has not been added for this event yet.
            </Text>
          </View>
        )}

        {!hasPurchasedTickets && (
          <View style={styles.secureBadge}>
            <Feather name="shield" size={24} color="#1D9E75" />
            <Text style={styles.secureText}>Payment held securely until event completes</Text>
          </View>
        )}
      </View>
    );
  };

  const renderRequests = () => (
    <View style={{ marginTop: 16 }}>
      {joinRequests.length > 0 ? (
        joinRequests.map((request) => {
          const isAccepting = acceptingJoinRequestId === request.userId;
          const isDeclining = decliningJoinRequestId === request.userId;
          const isBusy = isAccepting || isDeclining;
          const avatarUri = resolveAvatarUri(request.avatarKey, request.avatarUrl);

          return (
            <View
              key={request.userId}
              style={[styles.requestRow, { backgroundColor: isDark ? "#161521" : colors.backgroundSecondary, borderColor: colors.border }]}
            >
              <View style={styles.requestRowLeft}>
                <UserAvatar uri={avatarUri} name={request.name} size={42} style={styles.requestAvatar} iconSize={18} />
                <View style={styles.requestUserInfo}>
                  <Text style={[styles.requestUserName, { color: colors.text }]} numberOfLines={1}>
                    {request.name}
                  </Text>
                  {request.username ? (
                    <Text style={[styles.requestUserHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                      @{request.username}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.requestActions}>
                {request.status === "accepted" ? (
                  <View style={[styles.requestStatusBadge, { backgroundColor: "rgba(22, 216, 105, 0.12)" }]}>
                    <Feather name="check" size={12} color={colors.success} />
                    <Text style={[styles.requestStatusText, { color: colors.success }]}>Accepted</Text>
                  </View>
                ) : request.status === "declined" ? (
                  <View style={[styles.requestStatusBadge, { backgroundColor: "rgba(255, 107, 61, 0.12)" }]}>
                    <Text style={[styles.requestStatusText, { color: "#FF6B3D" }]}>Declined</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.requestActionBtn, styles.requestAcceptBtn, { opacity: isBusy ? 0.6 : 1 }]}
                      disabled={isBusy}
                      activeOpacity={0.8}
                      onPress={() => onAcceptJoinRequest?.(request.userId)}
                    >
                      {isAccepting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.requestAcceptText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.requestActionBtn, styles.requestDeclineBtn, { opacity: isBusy ? 0.6 : 1 }]}
                      disabled={isBusy}
                      activeOpacity={0.8}
                      onPress={() => onDeclineJoinRequest?.(request.userId)}
                    >
                      {isDeclining ? (
                        <ActivityIndicator size="small" color="#FF6B3D" />
                      ) : (
                        <Text style={styles.requestDeclineText}>Decline</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })
      ) : (
        <View style={[styles.requestRow, { backgroundColor: isDark ? "#161521" : colors.backgroundSecondary, borderColor: colors.border }]}>
          <Text style={[styles.requestUserName, { color: colors.textSecondary }]}>No join requests yet.</Text>
        </View>
      )}
    </View>
  );

  const renderCreatorTickets = () => (
    <View style={styles.creatorTicketsContainer}>
      <TouchableOpacity
        style={styles.createTicketButton}
        onPress={onCreateTicket}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={20} color="#111111" />
        <Text style={styles.createTicketText}>Create ticket</Text>
      </TouchableOpacity>

      <View style={styles.creatorTicketList}>
        {tickets.length > 0 ? (
          tickets.map((ticket, index) => {
            const ticketKey = getTicketKey(ticket, index);
            const isDeleting = deletingTicketId === ticketKey || deletingTicketId === ticket.id;
            const isFreeTicket = ticket.type === "free" || ticket.price <= 0;
            const stat = ticket.id ? ticketStats?.[ticket.id] : undefined;
            const statsLoaded = ticketStats !== undefined;

            return (
              <TouchableOpacity
                key={ticketKey}
                style={styles.creatorTicketCard}
                onPress={() => onViewTicket?.(ticket)}
                activeOpacity={0.82}
                disabled={!onViewTicket}
              >
                <View style={styles.creatorTicketTopRow}>
                  <View style={styles.creatorTicketInfo}>
                    <Text style={styles.creatorTicketTitle} numberOfLines={1}>
                      {ticket.name || "General Ticket"}
                    </Text>
                    <Text style={styles.creatorTicketDescription} numberOfLines={1}>
                      {ticket.description || ""}
                    </Text>
                    <Text style={styles.creatorTicketExpiry} numberOfLines={1}>
                      {formatExpiry(ticket.salesEndAt, scheduledAt)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.creatorIconButton}
                    onPress={() => onEditTicket?.(ticket)}
                    activeOpacity={0.75}
                    disabled={!onEditTicket}
                  >
                    <Feather name="edit-2" size={20} color="#B3B3B3" />
                  </TouchableOpacity>
                </View>

                <View style={styles.creatorTicketStatsRow}>
                  <View style={styles.creatorTicketStatSold}>
                    <Feather name="tag" size={12} color="#999999" />
                    <Text style={styles.creatorTicketStatSoldValue}>
                      {statsLoaded ? (stat?.sold ?? 0) : "—"}
                    </Text>
                    <Text style={styles.creatorTicketStatSoldLabel}>sold</Text>
                  </View>
                  <View style={styles.creatorTicketStatDivider} />
                  <View style={styles.creatorTicketStatAvailable}>
                    <Feather name="check-circle" size={12} color="#1D9E75" />
                    <Text style={styles.creatorTicketStatAvailableValue}>
                      {statsLoaded ? (stat?.available ?? getTicketAvailability(ticket)) : "—"}
                    </Text>
                    <Text style={styles.creatorTicketStatAvailableLabel}>available</Text>
                  </View>
                </View>

                <View style={styles.creatorTicketFooter}>
                  <View style={styles.creatorTicketPriceBlock}>
                    <Text style={styles.creatorTicketPrice}>{formatPrice(ticket)}</Text>
                    {!isFreeTicket && <Text style={styles.creatorTicketPriceCaption}>per ticket</Text>}
                  </View>

                  <TouchableOpacity
                    style={styles.creatorIconButton}
                    onPress={() => onDeleteTicket?.(ticket)}
                    activeOpacity={0.75}
                    disabled={!onDeleteTicket || isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#B3B3B3" />
                    ) : (
                      <Feather name="trash-2" size={20} color="#B3B3B3" />
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.creatorTicketCard}>
            <Text style={styles.creatorTicketTitle}>No tickets yet</Text>
            <Text style={styles.creatorTicketDescription}>
              Create a ticket to make access available for this event.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.creatorSecureBadge}>
        <Feather name="shield" size={18} color="#1D9E75" />
        <Text style={styles.creatorSecureText}>Payment held securely until event completes</Text>
      </View>
    </View>
  );

  const renderRewards = () => (
    <View style={{ marginTop: 20 }}>
      {rewards.length > 0 ? (
        rewards.map((item, index) => {
          const rewardKey = getRewardKey(item, index);
          const isClaimed = Boolean(item.id && claimedRewardIds.includes(item.id));
          const isClaiming = claimingRewardId === item.id || claimingRewardId === rewardKey;
          const isExpired = Boolean(item.expiresAt && new Date() > new Date(item.expiresAt));
          const isFullyClaimed = item.capacity === 0;

          return (
            <View key={rewardKey} style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rewardMain}>
                <View style={styles.rewardInfo}>
                  <View style={styles.rewardHeader}>
                    <Text style={[styles.rewardTitleText, { color: colors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: isDark ? "#313036" : colors.backgroundSecondary }]}>
                      <Text style={[styles.countBadgeText, { color: colors.text }]}>{item.capacity} left</Text>
                    </View>
                  </View>

                  <Text style={[styles.rewardDescText, { color: colors.textSecondary }]}>{getRewardDescription(item)}</Text>

                  <Text style={[styles.rewardExpiryText, { color: colors.textSecondary }]}>
                    {formatExpiry(item.expiresAt, scheduledAt)}
                  </Text>

                  <View style={styles.rewardFooterRow}>
                    {isClaimed ? (
                      <View style={styles.claimedBadge}>
                        <Feather name="check-circle" size={13} color={colors.success} />
                        <Text style={[styles.claimedText, { color: colors.success }]}>Claimed</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.claimRewardBtn,
                          {
                            backgroundColor: isExpired || isFullyClaimed ? colors.textSecondary : colors.text,
                            opacity: isClaiming ? 0.7 : 1,
                          },
                        ]}
                        disabled={isClaiming || isExpired || isFullyClaimed}
                        onPress={() => onClaimReward?.(item)}
                        activeOpacity={0.8}
                      >
                        {isClaiming ? (
                          <View style={styles.claimBtnContent}>
                            <Spinner size="small" color={buttonForeground(colors)} />
                            <Text style={[styles.claimRewardBtnText, { color: buttonForeground(colors) }]}>Claiming...</Text>
                          </View>
                        ) : (
                          <Text style={[styles.claimRewardBtnText, { color: buttonForeground(colors) }]}>
                            {isExpired ? "Expired" : isFullyClaimed ? "Sold Out" : "Claim Reward"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.rewardTitleText, { color: colors.text }]}>Rewards not available</Text>
          <Text style={[styles.rewardDescText, { color: colors.textSecondary }]}>
            Reward offers have not been added for this event yet.
          </Text>
        </View>
      )}
    </View>
  );

  const renderCreatorRewards = () => (
    <View style={styles.creatorRewardsContainer}>
      <TouchableOpacity style={styles.createTicketButton} activeOpacity={0.85} onPress={onCreateReward}>
        <Feather name="plus" size={20} color="#111111" />
        <Text style={styles.createTicketText}>Create Rewards</Text>
      </TouchableOpacity>

      <View style={styles.creatorRewardList}>
        {rewards.length > 0 ? (
          rewards.map((item, index) => {
          const imageUri = getRewardImageUri(item);
          const hasImage = Boolean(imageUri);
          const rewardKey = getRewardKey(item, index);
          const isDeleting = deletingRewardId === rewardKey || deletingRewardId === item.id;

          return (
            <TouchableOpacity
              key={rewardKey}
              style={[
                styles.creatorRewardCard,
                hasImage ? styles.creatorRewardCardWithImage : styles.creatorRewardCardCompact,
              ]}
              activeOpacity={0.82}
              onPress={() => onViewReward?.(item)}
            >
              <View style={hasImage ? styles.creatorRewardImageRow : styles.creatorRewardTopBlock}>
                {hasImage && (
                  <Image
                    source={{ uri: imageUri ?? undefined }}
                    style={styles.creatorRewardImage}
                    contentFit="cover"
                  />
                )}

                <View style={hasImage ? styles.creatorRewardImageInfo : styles.creatorRewardInfo}>
                  <View style={hasImage ? styles.creatorRewardTextBlock : styles.creatorRewardHeader}>
                    <View style={styles.creatorRewardTitleBlock}>
                      <Text style={styles.creatorRewardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {!hasImage && (
                        <Text style={styles.creatorRewardDescription} numberOfLines={1}>
                          {getRewardDescription(item)}
                        </Text>
                      )}
                    </View>

                    {!hasImage && (
                      <View style={styles.creatorRewardCountBadge}>
                        <Text style={styles.creatorRewardCountText}>{item.capacity} left</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.creatorRewardExpiry} numberOfLines={1}>
                    {formatExpiry(item.expiresAt, scheduledAt)}
                  </Text>

                  {hasImage && (
                    <View style={styles.creatorRewardCountBadge}>
                      <Text style={styles.creatorRewardCountText}>{item.capacity} left</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.creatorRewardActions}>
                <TouchableOpacity
                  style={styles.creatorRewardIconButton}
                  activeOpacity={0.75}
                  disabled={!onDeleteReward || isDeleting}
                  onPress={() => onDeleteReward?.(item)}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#B3B3B3" />
                  ) : (
                    <Feather name="trash-2" size={20} color="#B3B3B3" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.creatorRewardIconButton}
                  activeOpacity={0.75}
                  disabled={!onEditReward}
                  onPress={() => onEditReward?.(item)}
                >
                  <Feather name="edit-2" size={20} color="#B3B3B3" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })
        ) : (
          <View style={styles.creatorRewardCard}>
            <Text style={styles.creatorRewardTitle}>No rewards yet</Text>
            <Text style={styles.creatorRewardDescription}>
              Create product or ticket rewards for people attending this event.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View>
      <SegmentedControl
        options={showRequestTab ? ["Requests", "Tickets", "Rewards"] : ["Tickets", "Rewards"]}
        selectedOption={accessSubTab}
        onSelect={handleSelectAccessSubTab}
        flat={true}
        containerStyle={{ marginTop: 10, marginBottom: 16 }}
        renderOption={(option, isSelected) => (
          <Ionicons
            name={
              option === "Requests"
                ? isSelected
                  ? "person-add"
                  : "person-add-outline"
                : option === "Tickets"
                  ? isSelected
                    ? "ticket"
                    : "ticket-outline"
                  : isSelected
                    ? "gift"
                    : "gift-outline"
            }
            size={20}
            color={isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)"}
          />
        )}
      />

      {accessSubTab === "Requests"
        ? renderRequests()
        : accessSubTab === "Tickets"
          ? isHostMode
            ? renderCreatorTickets()
            : renderTickets()
          : isHostMode
            ? renderCreatorRewards()
            : renderRewards()}
    </View>
  );
};

export default AccessTab;

const styles = StyleSheet.create({
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 61, 0.1)",
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  alertText: {
    color: "#FF6B3D",
    fontSize: 13,
    fontWeight: "600",
  },
  creatorTicketsContainer: {
    gap: 16,
    marginTop: 6,
  },
  createTicketButton: {
    alignItems: "center",
    backgroundColor: "#B3B3B3",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  createTicketText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "400",
  },
  creatorTicketList: {
    gap: 16,
  },
  creatorTicketCard: {
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    borderRadius: 12,
    gap: 12,
    minHeight: 162,
    padding: 12,
  },
  creatorTicketTopRow: {
    flexDirection: "row",
    gap: 8,
  },
  creatorTicketInfo: {
    flex: 1,
    gap: 8,
  },
  creatorTicketTitle: {
    color: "#B3B3B3",
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  creatorTicketStatsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  creatorTicketStatSold: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  creatorTicketStatSoldValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  creatorTicketStatSoldLabel: {
    color: "#999999",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  creatorTicketStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 8,
  },
  creatorTicketStatAvailable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(29, 158, 117, 0.1)",
  },
  creatorTicketStatAvailableValue: {
    color: "#1D9E75",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  creatorTicketStatAvailableLabel: {
    color: "#1D9E75",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    opacity: 0.75,
  },
  creatorTicketDescription: {
    color: "#B3B3B3",
    fontSize: 14,
    lineHeight: 20,
  },
  creatorTicketExpiry: {
    color: "#B3B3B3",
    fontSize: 12,
    lineHeight: 16,
  },
  creatorIconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  creatorTicketFooter: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
  },
  creatorTicketPriceBlock: {
    gap: 4,
  },
  creatorTicketPrice: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 30,
  },
  creatorTicketPriceCaption: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  creatorSecureBadge: {
    alignItems: "center",
    backgroundColor: "rgba(14, 198, 23, 0.1)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    padding: 12,
  },
  creatorSecureText: {
    color: "#1D9E75",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
  },
  creatorRewardsContainer: {
    gap: 16,
    marginTop: 6,
  },
  creatorRewardList: {
    gap: 16,
  },
  creatorRewardCard: {
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    borderRadius: 12,
    padding: 12,
  },
  creatorRewardCardCompact: {
    gap: 16,
    minHeight: 124,
  },
  creatorRewardCardWithImage: {
    gap: 16,
    minHeight: 140,
  },
  creatorRewardTopBlock: {
    gap: 8,
  },
  creatorRewardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  creatorRewardTitleBlock: {
    flex: 1,
    gap: 4,
  },
  creatorRewardInfo: {
    flex: 1,
    gap: 8,
  },
  creatorRewardTitle: {
    color: "#B3B3B3",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  creatorRewardDescription: {
    color: "#B3B3B3",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
  },
  creatorRewardCountBadge: {
    alignItems: "center",
    backgroundColor: "#666666",
    borderRadius: 8,
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  creatorRewardCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  creatorRewardExpiry: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  creatorRewardActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 24,
    justifyContent: "flex-end",
    minHeight: 20,
  },
  creatorRewardIconButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  creatorRewardImageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    minHeight: 88,
  },
  creatorRewardImage: {
    backgroundColor: "#D9D9D9",
    borderRadius: 8,
    height: 88,
    width: 88,
  },
  creatorRewardImageInfo: {
    flex: 1,
    gap: 16,
    minHeight: 88,
  },
  creatorRewardTextBlock: {
    gap: 8,
  },
  availabilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  availabilityLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1D9E75",
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D9E75",
    lineHeight: 22,
  },
  availabilityCount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D9E75",
    lineHeight: 22,
  },
  gradientCardWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(102, 102, 102, 0.2)",
    marginBottom: 24,
    overflow: "hidden",
  },
  rewardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 46,
  },
  rewardRowLeft: {
    flex: 1,
    justifyContent: "center",
  },
  rewardAppliedText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 18,
  },
  bogoDescText: {
    color: "#B3B3B3",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    marginTop: 2,
  },
  ticketCardNested: {
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    borderRadius: 12,
    padding: 12,
  },
  ticketCardStandalone: {
    backgroundColor: "rgba(17, 17, 17, 0.8)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 12,
    marginBottom: 24,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  ticketType: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    lineHeight: 24,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 24,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  limitReachedText: {
    color: "#FF6B3D",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    marginBottom: 6,
  },
  ticketDesc: {
    color: "#B3B3B3",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    width: "100%",
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expiryText: {
    color: "#B3B3B3",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  expiryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#B3B3B3",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ticketFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    justifyContent: "center",
  },
  ticketPrice: {
    fontSize: 24,
    fontWeight: "500",
    lineHeight: 30,
    color: "#FFFFFF",
  },
  perTicketText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    marginTop: 4,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 40,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(102, 102, 102, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnDisabled: {
    opacity: 0.2,
  },
  counterValue: {
    fontSize: 24,
    fontWeight: "500",
    color: "#FFFFFF",
    minWidth: 16,
    textAlign: "center",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(14, 198, 23, 0.1)",
    padding: 12,
    borderRadius: 12,
    height: 46,
    marginTop: 10,
    justifyContent: "center",
  },
  secureText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1D9E75",
    lineHeight: 22,
  },
  rewardCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  rewardMain: {
    flexDirection: "row",
    gap: 12,
  },
  rewardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  rewardTitleText: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  rewardDescText: {
    fontSize: 12,
    marginBottom: 4,
  },
  rewardExpiryText: {
    fontSize: 11,
    marginBottom: 8,
  },
  rewardFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    minHeight: 24,
  },
  claimRewardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  claimRewardBtnText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  claimBtnContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  claimedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22, 216, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  claimedText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  requestBtn: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  requestBtnPending: {
    backgroundColor: "rgba(140, 140, 140, 0.15)",
  },
  requestBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  rewardBanner: {
    alignItems: "center",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rewardBannerLeft: {
    flex: 1,
    gap: 4,
  },
  rewardBannerBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rewardBannerLabel: {
    color: "#8264FF",
    fontSize: 11,
    fontWeight: "700",
  },
  rewardBannerDesc: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
  },
  claimRewardBannerBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  claimRewardBannerText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "600",
  },
  claimedRewardBannerBadge: {
    backgroundColor: "#142922",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  claimedRewardBannerText: {
    color: "#26C08F",
    fontSize: 12,
    fontWeight: "600",
  },
  requestRow: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 12,
  },
  requestRowLeft: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 12,
    marginRight: 8,
  },
  requestAvatar: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  requestAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  requestUserInfo: {
    flex: 1,
    gap: 2,
  },
  requestUserName: {
    fontSize: 15,
    fontWeight: "600",
  },
  requestUserHandle: {
    fontSize: 12,
  },
  requestActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  requestActionBtn: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 32,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestAcceptBtn: {
    backgroundColor: "#5C5CE0",
  },
  requestAcceptText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  requestDeclineBtn: {
    backgroundColor: "rgba(255, 107, 61, 0.1)",
  },
  requestDeclineText: {
    color: "#FF6B3D",
    fontSize: 13,
    fontWeight: "700",
  },
  requestStatusBadge: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
