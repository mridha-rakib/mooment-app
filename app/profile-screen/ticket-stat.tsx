import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackButton from "@/components/ui/BackButton";
import UserAvatar from "@/components/ui/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  getEventTicketStatItems,
  type EventTicketStatItem,
  type EventTicketStatItemStatus,
} from "@/lib/payments";
import { getStorageFileUrl } from "@/lib/storage";

type TicketStatItem = {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  status: 'success' | 'failed' | 'pending';
  ticketType: string;
  amount: string;
};

const toStatusIconState = (status?: EventTicketStatItemStatus | string | null): TicketStatItem['status'] => {
  const normalized = status?.trim().toLowerCase();

  if (normalized === "checked_in" || normalized === "valid" || normalized === "paid" || normalized === "success") {
    return "success";
  }

  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "refunded" ||
    normalized === "failed"
  ) {
    return "failed";
  }

  return "pending";
};

const getAvatarUri = (avatarKey?: string | null) => {
  if (!avatarKey) return null;

  try {
    return getStorageFileUrl(avatarKey);
  } catch {
    return null;
  }
};

const formatAmount = (amount: number, currency: string) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeCurrency = currency?.trim().toUpperCase() || "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `$${safeAmount.toFixed(2)}`;
  }
};

const toTicketStatItem = (item: EventTicketStatItem): TicketStatItem => {
  const attendee = item.attendee ?? null;
  const username = attendee?.username?.trim();

  return {
    id: item.id,
    name: attendee?.name?.trim() || "Attendee",
    handle: username ? `@${username.replace(/^@+/, "")}` : "",
    avatar: getAvatarUri(attendee?.avatarKey ?? null),
    status: toStatusIconState(item.status),
    ticketType: item.ticketName?.trim() || "Ticket",
    amount: formatAmount(item.amount, item.currency),
  };
};

export default function TicketStatScreen() {
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const eventId = typeof params.eventId === "string" ? params.eventId.trim() : "";
  const [items, setItems] = useState<TicketStatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStats = useCallback(async (refreshing = false) => {
    if (!eventId) {
      setItems([]);
      setErrorMessage("Ticket stats are unavailable for this event.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    try {
      const result = await getEventTicketStatItems(eventId);
      setItems(result.tickets.map(toTicketStatItem));
    } catch (error) {
      setItems([]);
      setErrorMessage(getAuthErrorMessage(error, "Unable to load ticket stats."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(() => {
    void loadStats(true);
  }, [loadStats]);

  const getStatusIcon = (status: TicketStatItem['status']) => {
    switch (status) {
      case 'success':
        return (
          <View style={[styles.statusCircle, { backgroundColor: '#2DB46D' }]}>
            <Feather name="check" size={14} color="#FFFFFF" />
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusCircle, { backgroundColor: '#D64646' }]}>
            <Feather name="x" size={14} color="#FFFFFF" />
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusCircle, { backgroundColor: colors.textSecondary }]}>
            <Feather name="minus" size={14} color={colors.background} />
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: TicketStatItem }) => (
    <View style={styles.statRow}>
      <View style={styles.userInfo}>
        <View style={[styles.avatarContainer, { borderColor: colors.primary }]}>
          <UserAvatar uri={item.avatar} name={item.name} size={48} style={styles.avatar} />
        </View>
        <View>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.userHandle, { color: colors.textSecondary }]}>{item.handle}</Text>
        </View>
      </View>
      
      <View style={styles.ticketInfo}>
        {getStatusIcon(item.status)}
        <Text style={[styles.ticketType, { color: colors.text }]}>{item.ticketType}</Text>
      </View>

      <Text style={[styles.amount, { color: colors.text }]}>{item.amount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ticket Stat</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, items.length === 0 ? styles.emptyListContent : null]}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={(
          <View style={styles.stateContainer}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                  {errorMessage ?? "No ticket stats yet."}
                </Text>
                {errorMessage && eventId ? (
                  <TouchableOpacity
                    style={[styles.retryBtn, { borderColor: colors.border }]}
                    onPress={() => void loadStats()}
                  >
                    <Text style={[styles.retryText, { color: colors.text }]}>Retry</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%', // Adjust width allocation
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 12,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
  },
  statusCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '600',
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
    width: '20%',
    textAlign: 'right',
  },
  separator: {
    height: 1,
  },
});
