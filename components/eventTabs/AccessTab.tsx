import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { EventRewardPayload, EventTicketPayload } from "@/lib/events";
import { getStorageFileUrl } from "@/lib/storage";
import { Image } from "expo-image";
import SegmentedControl from "../ui/SegmentedControl";
import { Spinner } from "@/components/ui/spinner";

type AccessTabProps = {
  tickets?: EventTicketPayload[];
  rewards?: EventRewardPayload[];
  scheduledAt?: string | null;
  purchasedTicketCounts?: Record<string, number>;
  isHostMode?: boolean;
  selectedTicketKey?: string | null;
  selectedTicketQuantity?: number;
  deletingTicketId?: string | null;
  deletingRewardId?: string | null;
  claimingRewardId?: string | null;
  claimedRewardIds?: string[];
  selectedAccessSubTab?: string;
  onSelectAccessSubTab?: (subTab: string) => void;
  onSelectTicket?: (ticket: EventTicketPayload, ticketKey: string) => void;
  onTicketQuantityChange?: (ticket: EventTicketPayload, ticketKey: string, quantity: number) => void;
  onCreateTicket?: () => void;
  onViewTicket?: (ticket: EventTicketPayload) => void;
  onEditTicket?: (ticket: EventTicketPayload) => void;
  onDeleteTicket?: (ticket: EventTicketPayload) => void;
  onCreateReward?: () => void;
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
  purchasedTicketCounts = {},
  isHostMode = false,
  selectedTicketKey = null,
  selectedTicketQuantity = 1,
  deletingTicketId = null,
  deletingRewardId = null,
  claimingRewardId = null,
  claimedRewardIds = [],
  selectedAccessSubTab,
  onSelectAccessSubTab,
  onSelectTicket,
  onTicketQuantityChange,
  onCreateTicket,
  onViewTicket,
  onEditTicket,
  onDeleteTicket,
  onCreateReward,
  onEditReward,
  onDeleteReward,
  onClaimReward,
}: AccessTabProps) => {
  const { colors, isDark } = useTheme();
  const [localAccessSubTab, setLocalAccessSubTab] = useState("Tickets");
  const accessSubTab = selectedAccessSubTab ?? localAccessSubTab;
  const handleSelectAccessSubTab = (subTab: string) => {
    if (selectedAccessSubTab === undefined) {
      setLocalAccessSubTab(subTab);
    }

    onSelectAccessSubTab?.(subTab);
  };

  const totalTicketsLeft = useMemo(
    () => tickets.reduce((total, ticket) => total + Math.max(0, ticket.capacity), 0),
    [tickets],
  );

  const renderTickets = () => (
    <View style={{ marginTop: 20 }}>
      <View style={styles.alertBanner}>
        <Feather name="info" size={16} color="#FF6B3D" />
        <Text style={styles.alertText}>Maximum 2 tickets of each type per person</Text>
      </View>

      <View style={styles.availabilityRow}>
        <View style={styles.availabilityLabel}>
          <View style={[styles.greenDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.availabilityText, { color: colors.success }]}>Tickets available</Text>
        </View>
        <Text style={[styles.availabilityCount, { color: colors.success }]}>
          {totalTicketsLeft} left
        </Text>
      </View>

      {tickets.length > 0 ? (
        tickets.map((ticket, index) => {
          const ticketKey = getTicketKey(ticket, index);
          const ticketId = ticket.id ?? ticketKey;
          const isSelected = selectedTicketKey === ticketKey;
          const isFreeTicket = ticket.type === "free" || ticket.price <= 0;
          const isSoldOut = ticket.capacity <= 0;
          const alreadyPurchased = purchasedTicketCounts[ticketId] ?? 0;
          const remainingAllowed = Math.max(0, 2 - alreadyPurchased);
          const isLimitReached = !isSoldOut && alreadyPurchased >= 2;
          const maxQuantity = Math.min(remainingAllowed, Math.max(0, ticket.capacity));
          const isUnavailable = isSoldOut || isLimitReached;
          const quantity = isSelected ? Math.min(Math.max(1, selectedTicketQuantity), maxQuantity || 1) : 0;

          return (
            <TouchableOpacity
              key={ticketKey}
              style={[
                styles.ticketCard,
                {
                  backgroundColor: isDark ? "#161521" : colors.backgroundSecondary,
                  borderColor: isSelected ? colors.primary : colors.border,
                  opacity: isUnavailable ? 0.55 : 1,
                },
              ]}
              activeOpacity={0.86}
              onPress={() => {
                if (!isUnavailable) {
                  onSelectTicket?.(ticket, ticketKey);
                }
              }}
            >
              <View style={[styles.ticketInnerCard, { backgroundColor: isDark ? "#0F0E13" : colors.card }]}>
                <View style={styles.ticketHeader}>
                  <Text style={[styles.ticketType, { color: colors.text }]}>{ticket.name}</Text>
                  <View style={styles.ticketBadges}>
                    {isSelected && !isLimitReached && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={12} color={colors.background} />
                      </View>
                    )}
                    {isLimitReached ? (
                      <View style={[styles.limitBadge]}>
                        <Feather name="slash" size={11} color="#FF6B3D" />
                        <Text style={styles.limitBadgeText}>Limit reached</Text>
                      </View>
                    ) : (
                      <View style={[styles.countBadge, { backgroundColor: isDark ? "#313036" : colors.backgroundSecondary }]}>
                        <Text style={[styles.countBadgeText, { color: colors.text }]}>
                          {isSoldOut ? "Sold out" : `${ticket.capacity} left`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {isLimitReached && (
                  <Text style={styles.limitReachedText}>
                    You've purchased the maximum of 2 tickets of this type.
                  </Text>
                )}

                <Text style={[styles.ticketDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {getTicketDescriptionPreview(ticket.description)}
                </Text>
                <View style={styles.ticketMetaRow}>
                  <Text style={[styles.expiryText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {formatExpiry(ticket.salesEndAt, scheduledAt)}
                  </Text>
                  {!!onViewTicket && (
                    <TouchableOpacity
                      style={styles.viewDetailsButton}
                      activeOpacity={0.75}
                      onPress={(event) => {
                        event.stopPropagation();
                        onViewTicket(ticket);
                      }}
                    >
                      <Feather name="info" size={13} color={colors.primary} />
                      <Text style={[styles.viewDetailsText, { color: colors.primary }]}>Details</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.ticketFooter}>
                  <View>
                    <Text style={[styles.ticketPrice, { color: colors.text }]}>{formatPrice(ticket)}</Text>
                    {!isFreeTicket && (
                      alreadyPurchased > 0 && !isLimitReached ? (
                        <Text style={[styles.perTicketText, { color: colors.textSecondary }]}>
                          {alreadyPurchased} purchased • {remainingAllowed} left
                        </Text>
                      ) : (
                        <Text style={[styles.perTicketText, { color: colors.textSecondary }]}>per ticket</Text>
                      )
                    )}
                  </View>
                  <View style={[styles.counter, { backgroundColor: isDark ? "#222129" : colors.backgroundSecondary }]}>
                    <TouchableOpacity
                      style={[
                        styles.counterBtn,
                        { backgroundColor: isDark ? "#313036" : colors.border },
                        (!isSelected || quantity <= 1 || isUnavailable) && styles.counterBtnDisabled,
                      ]}
                      disabled={!isSelected || quantity <= 1 || isUnavailable}
                      onPress={(event) => {
                        event.stopPropagation();
                        onTicketQuantityChange?.(ticket, ticketKey, quantity - 1);
                      }}
                    >
                      <Feather name="minus" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.counterValue, { color: colors.text }]}>{quantity}</Text>
                    <TouchableOpacity
                      style={[
                        styles.counterBtn,
                        { backgroundColor: isDark ? "#313036" : colors.border },
                        (isUnavailable || (isSelected && quantity >= maxQuantity)) && styles.counterBtnDisabled,
                      ]}
                      disabled={isUnavailable || (isSelected && quantity >= maxQuantity)}
                      onPress={(event) => {
                        event.stopPropagation();
                        onTicketQuantityChange?.(ticket, ticketKey, isSelected ? quantity + 1 : 1);
                      }}
                    >
                      <Feather name="plus" size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={[styles.ticketCard, { backgroundColor: isDark ? "#161521" : colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={[styles.ticketInnerCard, { backgroundColor: isDark ? "#0F0E13" : colors.card }]}>
            <Text style={[styles.ticketType, { color: colors.text }]}>Tickets not available</Text>
            <Text style={[styles.ticketDesc, { color: colors.textSecondary }]}>
              Ticket data has not been added for this event yet.
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.secureBadge, { backgroundColor: isDark ? "rgba(22, 216, 105, 0.05)" : "rgba(22, 216, 105, 0.02)" }]}>
        <Feather name="shield" size={14} color={colors.success} />
        <Text style={[styles.secureText, { color: colors.success }]}>Payment held securely until event completes</Text>
      </View>
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
                    <View style={styles.creatorTicketTitleRow}>
                      <Text style={styles.creatorTicketTitle} numberOfLines={1}>
                        {ticket.name || "General Ticket"}
                      </Text>
                      <View style={styles.creatorTicketCountBadge}>
                        <Text style={styles.creatorTicketCountText}>{ticket.capacity} left</Text>
                      </View>
                    </View>
                    <Text style={styles.creatorTicketDescription} numberOfLines={1}>
                      {ticket.description || "Entry from 9pm. Standing only."}
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
                            <Spinner size="small" color={colors.background} />
                            <Text style={[styles.claimRewardBtnText, { color: colors.background }]}>Claiming...</Text>
                          </View>
                        ) : (
                          <Text style={[styles.claimRewardBtnText, { color: colors.background }]}>
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
            <View
              key={rewardKey}
              style={[
                styles.creatorRewardCard,
                hasImage ? styles.creatorRewardCardWithImage : styles.creatorRewardCardCompact,
              ]}
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
            </View>
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
        options={["Tickets", "Rewards"]}
        selectedOption={accessSubTab}
        onSelect={handleSelectAccessSubTab}
        containerStyle={{ marginTop: 10, marginBottom: 10 }}
      />

      {accessSubTab === "Tickets"
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
  creatorTicketTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  creatorTicketTitle: {
    color: "#B3B3B3",
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  creatorTicketCountBadge: {
    alignItems: "center",
    backgroundColor: "#666666",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creatorTicketCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
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
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  availabilityCount: {
    fontSize: 14,
    fontWeight: "bold",
  },
  ticketCard: {
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  ticketInnerCard: {
    borderRadius: 16,
    margin: 4,
    padding: 14,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  ticketType: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    lineHeight: 23,
  },
  ticketBadges: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  selectedBadge: {
    alignItems: "center",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  countBadge: {
    backgroundColor: "#313036",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  limitBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 61, 0.12)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  limitBadgeText: {
    color: "#FF6B3D",
    fontSize: 12,
    fontWeight: "600",
  },
  limitReachedText: {
    color: "#FF6B3D",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    marginBottom: 6,
  },
  ticketDesc: {
    color: "#8E8E9B",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  expiryText: {
    color: "#8E8E9B",
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  viewDetailsButton: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 6,
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
  ticketPrice: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 30,
  },
  perTicketText: {
    color: "#8E8E9B",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222129",
    borderRadius: 13,
    padding: 5,
    gap: 10,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#313036",
    justifyContent: "center",
    alignItems: "center",
  },
  counterBtnDisabled: {
    opacity: 0.35,
  },
  counterValue: {
    fontSize: 20,
    fontWeight: "600",
    minWidth: 18,
    textAlign: "center",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(22, 216, 105, 0.05)",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 10,
  },
  secureText: {
    fontSize: 12,
    fontWeight: "600",
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
});
