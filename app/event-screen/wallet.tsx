import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/hooks/useTheme";
import SegmentedControl from "@/components/ui/SegmentedControl";
import CinematicButton from "@/components/ui/CinematicButton";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getMyTicketWallet, type TicketWalletItem } from "@/lib/payments";
import { getStorageFileUrl } from "@/lib/storage";

type WalletTab = "Shared" | "Active" | "Used" | "Canceled";

type WalletSection = {
  title: string;
  items: TicketWalletItem[];
};

const DEFAULT_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1514525253361-bee8a187499b?q=80&w=400&auto=format&fit=crop";
const WALLET_TABS: WalletTab[] = ["Shared", "Active", "Used", "Canceled"];

const resolveStorageUrl = (key?: string | null, fallback = DEFAULT_EVENT_IMAGE) => {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

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

const getLocationLabel = (item: TicketWalletItem) =>
  item.event.location?.venue ||
  item.event.location?.searchLabel ||
  item.event.location?.address ||
  "Location TBA";

const getAddressLabel = (item: TicketWalletItem) =>
  item.event.location?.address || item.event.location?.searchLabel || "Address TBA";

const getPassesForTab = (item: TicketWalletItem, tab: WalletTab) => {
  const passes = item.ticketPasses ?? [];

  switch (tab) {
    case "Shared":
      if (item.source === "shared") {
        return passes.filter((pass) => pass.status !== "used");
      }

      return passes.filter((pass) => Boolean(pass.currentShare) && pass.status !== "used");
    case "Active":
      if (item.source !== "owned" || item.walletStatus === "cancelled") {
        return [];
      }

      return passes.filter((pass) => !pass.currentShare && pass.status !== "used");
    case "Used":
      return passes.filter((pass) => pass.status === "used");
    case "Canceled":
      return item.walletStatus === "cancelled" ? passes : [];
    default:
      return [];
  }
};

const toTabWalletItem = (item: TicketWalletItem, tab: WalletTab): TicketWalletItem | null => {
  const passes = getPassesForTab(item, tab);

  if (passes.length === 0) {
    return null;
  }

  return {
    ...item,
    quantity: passes.length,
    ticketPasses: passes,
    currentShare: passes.find((pass) => pass.currentShare)?.currentShare ?? item.currentShare ?? null,
    walletStatus: tab === "Canceled" ? "cancelled" : tab === "Used" ? "used" : "active",
  };
};

const getTicketSections = (items: TicketWalletItem[]): WalletSection[] => {
  const now = new Date();
  const tonight: TicketWalletItem[] = [];
  const upcoming: TicketWalletItem[] = [];

  for (const item of items) {
    const scheduledAt = item.event.scheduledAt ? new Date(item.event.scheduledAt) : null;

    if (scheduledAt && !Number.isNaN(scheduledAt.getTime()) && isSameDay(scheduledAt, now)) {
      tonight.push(item);
    } else {
      upcoming.push(item);
    }
  }

  return [
    { title: "Tonight", items: tonight },
    { title: "Upcoming", items: upcoming },
  ].filter((section) => section.items.length > 0);
};

const TicketWalletScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<WalletTab>("Active");
  const [tickets, setTickets] = useState<TicketWalletItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTickets = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const walletTickets = await getMyTicketWallet();
      setTickets(walletTickets);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "Unable to load ticket wallet."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTickets();
    }, [loadTickets]),
  );

  const visibleTickets = useMemo(() => {
    return tickets
      .map((ticket) => toTabWalletItem(ticket, activeTab))
      .filter((ticket): ticket is TicketWalletItem => Boolean(ticket));
  }, [activeTab, tickets]);

  const sections = useMemo(() => getTicketSections(visibleTickets), [visibleTickets]);

  const emptyLabel =
    activeTab === "Shared"
      ? "No shared tickets yet."
      : `No ${activeTab.toLowerCase()} tickets yet.`;

  const handleSelectTab = (tab: string) => {
    if (WALLET_TABS.includes(tab as WalletTab)) {
      setActiveTab(tab as WalletTab);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <CinematicButton
          onPress={() => router.back()}
          icon={ArrowLeft01Icon}
          size={24}
        />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ticket Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          options={WALLET_TABS}
          selectedOption={activeTab}
          onSelect={handleSelectTab}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadTickets(true)}
            tintColor={colors.text}
          />
        }
      >
        {isLoading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.stateContainer}>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{errorMessage}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.border }]}
              onPress={() => void loadTickets()}
            >
              <Text style={[styles.retryText, { color: colors.text }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{emptyLabel}</Text>
          </View>
        ) : sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.cardContainer}>
                <View style={styles.sharedInfo}>
                  <Image
                    source={{
                      uri: resolveStorageUrl(
                        item.source === "shared"
                          ? item.sharedBy?.avatarKey
                          : item.currentShare?.friend?.avatarKey ?? item.event.host?.avatarKey,
                        "https://i.pravatar.cc/150?u=host",
                      ),
                    }}
                    style={styles.avatar}
                  />
                  <Text style={[styles.sharedText, { color: colors.textSecondary }]}>
                    {item.source === "shared" ? "Shared by " : item.currentShare ? "Shared with " : "Hosted by "}
                    <Text style={[styles.sharedName, { color: colors.text }]}>
                      {item.source === "shared"
                        ? item.sharedBy?.name ?? "Friend"
                        : item.currentShare
                          ? item.currentShare.friend?.name ?? "Friend"
                          : item.event.host?.name ?? "Host"}
                    </Text>
                  </Text>
                </View>

                <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.9}>
                  {/* Card Header */}
                  <LinearGradient
                    colors={[isDark ? "rgba(212, 176, 235, 0.12)" : "rgba(212, 176, 235, 0.05)", "transparent"]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.cardHeader}
                  >
                    <View>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{item.event.name ?? item.ticketName}</Text>
                      <Text style={[styles.hostText, { color: colors.textSecondary }]}>by {item.event.host?.name ?? "Host"}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? "rgba(22, 216, 105, 0.1)" : "rgba(22, 216, 105, 0.05)" }]}>
                      <Text style={[styles.statusText, { color: colors.success }]}>
                        {item.walletStatus === "cancelled" ? "Canceled" : item.walletStatus === "used" ? "Used" : "Active"}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <Image
                      source={{
                        uri: resolveStorageUrl(item.event.bannerOriginalImageKey ?? item.event.bannerImageKey),
                      }}
                      style={styles.ticketImage}
                    />
                    <View style={styles.ticketInfo}>
                      <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                        <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                          {getLocationLabel(item)}
                        </Text>
                      </View>
                      <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDateTime(item.event.scheduledAt)}</Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
                        {getAddressLabel(item)}
                      </Text>
                      
                      <TouchableOpacity 
                        style={[styles.viewTicketBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        onPress={() =>
                          router.push({
                            pathname: "/event-screen/ticket-detail",
                            params: {
                              source: "wallet",
                              walletSource: item.source,
                              purchaseCount: String(item.quantity),
                              paidQuantity: String(item.paidQuantity ?? item.quantity),
                              freeQuantity: String(item.freeQuantity ?? 0),
                              totalQuantity: String(item.totalQuantity ?? item.quantity),
                              ticketNo: item.ticketNo,
                              orderId: item.orderId,
                              eventId: item.event.id,
                              ticketId: item.ticketId,
                              eventTitle: item.event.name ?? item.ticketName,
                              ticketName: item.ticketName,
                              hostName: item.event.host?.name ?? "Host",
                              hostHandle: item.event.host?.username ? `@${item.event.host.username}` : "",
                              bannerImageKey: item.event.bannerOriginalImageKey ?? item.event.bannerImageKey ?? "",
                              location: getLocationLabel(item),
                              address: getAddressLabel(item),
                              dateTime: formatDateTime(item.event.scheduledAt),
                              eventStartDateTime: formatDateTime(item.event.scheduledAt),
                              eventEndDateTime: formatDateTime(item.event.endAt),
                              amount: String(item.totalAmount),
                              currency: item.currency,
                              currentShareId: item.currentShare?.id ?? "",
                              currentShareFriendName: item.currentShare?.friend?.name ?? "",
                              currentShareFriendId: item.currentShare?.friend?.id ?? "",
                              ticketPasses: JSON.stringify(item.ticketPasses ?? []),
                            },
                          })
                        }
                      >
                        <Text style={[styles.viewTicketText, { color: colors.textSecondary }]}>View Ticket</Text>
                        <Feather name="arrow-right" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default TicketWalletScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  tabWrapper: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  stateContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
    paddingHorizontal: 24,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  cardContainer: {
    marginBottom: 20,
  },
  sharedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingLeft: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sharedText: {
    fontSize: 12,
  },
  sharedName: {
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  hostText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  ticketImage: {
    width: 100,
    height: 110,
    borderRadius: 12,
  },
  ticketInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  viewTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  viewTicketText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
