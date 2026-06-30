import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { cancelTicketShare, shareTicketWithFriend, type TicketWalletPass } from '@/lib/payments';
import { getFriendUsers, type FriendUserResponse } from '@/lib/users';
import { getStorageFileUrl } from '@/lib/storage';
import UserAvatar from '@/components/ui/UserAvatar';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width - 40, 401);
const QR_SIZE = CONTENT_WIDTH - 32;

const getParam = (value: string | string[] | undefined, fallback: string) => {
  const source = Array.isArray(value) ? value[0] : value;
  return source?.trim() || fallback;
};

const parsePositiveInteger = (value: string | string[] | undefined, fallback = 0) => {
  const parsed = Number.parseInt(getParam(value, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveAvatarUri = (key?: string | null, url?: string | null) => {
  if (url?.trim()) {
    return url.trim();
  }

  if (!key) {
    return null;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return null;
  }
};

const formatDisplayAmount = (amount?: string, currency?: string): string => {
  const parsed = Number.parseFloat(amount ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency?.trim().toUpperCase()) || "USD",
      minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
    }).format(parsed);
  } catch {
    return `$${parsed.toFixed(2)}`;
  }
};

export default function QRCodeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{
    type?: string;
    // Event ticket params
    ticketNo?: string;
    orderId?: string;
    eventId?: string;
    ticketId?: string;
    walletSource?: string;
    eventName?: string;
    hostName?: string;
    venue?: string;
    address?: string;
    dateTime?: string;
    ticketName?: string;
    quantity?: string;
    paidQuantity?: string;
    freeQuantity?: string;
    totalQuantity?: string;
    amount?: string;
    currency?: string;
    ticketPasses?: string;
  }>();

  const type = getParam(params.type, 'event');
  const ticketNo = getParam(params.ticketNo, '');
  const orderId = getParam(params.orderId, '');
  const eventId = getParam(params.eventId, '');
  const ticketId = getParam(params.ticketId, '');
  const walletSource = getParam(params.walletSource, 'owned');
  const eventName = getParam(params.eventName, 'Event');
  const hostName = getParam(params.hostName, '');
  const venue = getParam(params.venue, '');
  const address = getParam(params.address, '');
  const dateTime = getParam(params.dateTime, '');
  const ticketName = getParam(params.ticketName, 'Ticket');
  const paidQuantity = parsePositiveInteger(params.paidQuantity, parsePositiveInteger(params.quantity, 1));
  const freeQuantity = parsePositiveInteger(params.freeQuantity, 0);
  const totalQuantity = parsePositiveInteger(params.totalQuantity, paidQuantity + freeQuantity);
  const quantity = String(totalQuantity);
  const displayAmount = formatDisplayAmount(params.amount, params.currency);
  const initialTicketPasses = useMemo<TicketWalletPass[]>(() => {
    const rawPasses = getParam(params.ticketPasses, '');

    if (rawPasses) {
      try {
        const parsed = JSON.parse(rawPasses) as TicketWalletPass[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fall through to deterministic local pass generation.
      }
    }

    return Array.from({ length: totalQuantity }, (_, index) => {
      const ticketIndex = index + 1;

      return {
        orderId,
        ticketNo: ticketNo ? `${ticketNo}-${String(ticketIndex).padStart(2, '0')}` : `TICKET-${ticketIndex}`,
        ticketIndex,
        qrCode: JSON.stringify({
          type: 'event-ticket',
          eventId,
          ticketId,
          orderId,
          ticketIndex,
        }),
        status: 'active',
        usedAt: null,
        currentShare: null,
      };
    });
  }, [eventId, orderId, params.ticketPasses, ticketId, ticketNo, totalQuantity]);
  const [ticketPasses, setTicketPasses] = useState<TicketWalletPass[]>(initialTicketPasses);
  const [selectedPassIndex, setSelectedPassIndex] = useState(0);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [friends, setFriends] = useState<FriendUserResponse[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [isShareSubmitting, setIsShareSubmitting] = useState(false);
  const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);
  const visibleTicketPasses = useMemo(
    () => (walletSource === 'owned' ? ticketPasses.filter((pass) => !pass.currentShare) : ticketPasses),
    [ticketPasses, walletSource],
  );
  const selectedPass = visibleTicketPasses[Math.min(selectedPassIndex, Math.max(0, visibleTicketPasses.length - 1))];
  const selectedTicketNo = selectedPass?.ticketNo ?? ticketNo;
  const selectedQrValue = selectedPass?.qrCode || ticketNo || 'INVALID';
  const selectedCurrentShare = selectedPass?.currentShare ?? null;
  const shareablePassCount = visibleTicketPasses.filter((pass) => pass.status !== 'used').length;
  const canShareSelectedPass = (
    type === 'event' &&
    walletSource === 'owned' &&
    shareablePassCount >= 2 &&
    selectedPass?.status !== 'used' &&
    Boolean(eventId && ticketId && selectedPass?.orderId)
  );

  const handleCopy = () => {
    Alert.alert('Copied', 'Ticket number copied to clipboard');
  };

  const loadFriends = async (search = friendSearch) => {
    setIsFriendsLoading(true);
    setShareErrorMessage(null);

    try {
      const friendUsers = await getFriendUsers(search, 100);
      setFriends(friendUsers);
    } catch (error) {
      setShareErrorMessage(getAuthErrorMessage(error, 'Unable to load friends.'));
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const handleOpenShareModal = async () => {
    if (!canShareSelectedPass) {
      Alert.alert('Share unavailable', 'This ticket QR cannot be shared.');
      return;
    }

    setIsShareModalVisible(true);
    setFriendSearch('');
    await loadFriends('');
  };

  const handleShareWithFriend = async (friend: FriendUserResponse) => {
    if (!selectedPass) {
      setShareErrorMessage('Ticket QR details are unavailable.');
      return;
    }

    if (selectedCurrentShare) {
      setShareErrorMessage('Cancel the current share before choosing another friend.');
      return;
    }

    setIsShareSubmitting(true);
    setShareErrorMessage(null);

    try {
      const share = await shareTicketWithFriend({
        eventId,
        ticketId,
        orderId: selectedPass.orderId,
        ticketIndex: selectedPass.ticketIndex,
        friendId: friend.id,
      });

      setTicketPasses((passes) =>
        passes.map((pass) =>
          pass.orderId === selectedPass.orderId && pass.ticketIndex === selectedPass.ticketIndex
            ? { ...pass, currentShare: share }
            : pass,
        ),
      );
    } catch (error) {
      setShareErrorMessage(getAuthErrorMessage(error, 'Unable to share ticket QR.'));
    } finally {
      setIsShareSubmitting(false);
    }
  };

  const handleCancelShare = async () => {
    if (!selectedCurrentShare || !selectedPass) {
      return;
    }

    setIsShareSubmitting(true);
    setShareErrorMessage(null);

    try {
      await cancelTicketShare(selectedCurrentShare.id);
      setTicketPasses((passes) =>
        passes.map((pass) =>
          pass.orderId === selectedPass.orderId && pass.ticketIndex === selectedPass.ticketIndex
            ? { ...pass, currentShare: null }
            : pass,
        ),
      );
      await loadFriends(friendSearch);
    } catch (error) {
      setShareErrorMessage(getAuthErrorMessage(error, 'Unable to cancel ticket QR share.'));
    } finally {
      setIsShareSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>QR Code</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {type === 'product' ? (
          <>
            <View style={[styles.productCard, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1631390164305-9c6a5e4c3f5f?q=80&w=120&auto=format&fit=crop' }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]}>Medusa Skin Whitening Cream</Text>
                <Text style={[styles.productMeta, { color: colors.textSecondary }]}>@djLoko  •  QTY: 1</Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>$26</Text>
              </View>
            </View>

            <View style={[styles.infoSection, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={15} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.infoLabel, { color: colors.text }]}>New York City</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={[styles.infoDetailLabel, { color: colors.textSecondary }]}>Venue:</Text>
                <Text style={[styles.infoDetailValue, { color: colors.text }]}>The Rooftop Lounge</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={[styles.infoDetailLabel, { color: colors.textSecondary }]}>Address:</Text>
                <Text style={[styles.infoDetailValue, { color: colors.text }]}>123 Main Street, New York, NY 1001</Text>
              </View>
              <View style={styles.infoDetail}>
                <Text style={[styles.infoDetailLabel, { color: colors.textSecondary }]}>Time:</Text>
                <Text style={[styles.infoDetailValue, { color: colors.text }]}>Tonight • 9pm</Text>
              </View>
            </View>

            {!!ticketNo && (
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, { color: colors.textSecondary }]}>Order No:</Text>
                <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>{ticketNo}</Text>
                <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ marginLeft: 8 }}>
                  <Feather name="copy" size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.qrWrapper}>
              <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                <QRCode
                  value={ticketNo || 'INVALID'}
                  size={QR_SIZE}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>

            <View style={styles.instructionBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#E75737" />
              <Text style={styles.instructionText}>
                Show this QR code to the host at the event to collect your item. Keep screen brightness high.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.walletButton}
              activeOpacity={0.85}
              onPress={() => router.push("/event-screen/wallet")}
            >
              <Ionicons name="ticket-outline" size={16} color="#111111" />
              <Text style={styles.walletButtonText}>Ticket Wallet</Text>
              <Feather name="arrow-right" size={15} color="#111111" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.ticketSummaryCard, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
              <View style={[styles.ticketIconBox, { backgroundColor: colors.primary + "1A" }]}>
                <Ionicons name="ticket-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.ticketSummaryInfo}>
                <Text style={[styles.ticketSummaryTitle, { color: colors.text }]} numberOfLines={2}>
                  {eventName}
                </Text>
                {!!hostName && (
                  <Text style={[styles.ticketSummaryMeta, { color: colors.textSecondary }]}>
                    {hostName}  •  {ticketName} total: {quantity}
                  </Text>
                )}
                {freeQuantity > 0 && (
                  <Text style={[styles.ticketSummaryMeta, { color: colors.textSecondary }]}>
                    Paid {paidQuantity} • Rewarded {freeQuantity}
                  </Text>
                )}
                {displayAmount !== "Free" && (
                  <Text style={[styles.ticketSummaryPrice, { color: colors.primary }]}>
                    Paid {displayAmount}
                  </Text>
                )}
              </View>
              <View style={styles.confirmedBadge}>
                <Text style={styles.confirmedText}>Confirmed</Text>
              </View>
            </View>

            {(venue || address || dateTime) && (
              <View style={[styles.eventInfoCard, { backgroundColor: isDark ? "rgba(17, 17, 17, 0.8)" : colors.card }]}>
                {!!venue && (
                  <View style={styles.eventInfoTitleRow}>
                    <Feather name="map-pin" size={18} color={colors.textSecondary} />
                    <Text style={[styles.eventInfoTitle, { color: colors.text }]}>{venue}</Text>
                  </View>
                )}
                <View style={styles.eventInfoDetails}>
                  {!!address && (
                    <View style={styles.infoDetail}>
                      <Text style={[styles.infoDetailLabel, { color: colors.text }]}>Address:</Text>
                      <Text style={[styles.infoDetailValue, { color: colors.textSecondary }]} numberOfLines={2}>
                        {address}
                      </Text>
                    </View>
                  )}
                  {!!dateTime && (
                    <View style={styles.infoDetail}>
                      <Text style={[styles.infoDetailLabel, { color: colors.text }]}>Time:</Text>
                      <Text style={[styles.infoDetailValue, { color: colors.textSecondary }]}>{dateTime}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {!!selectedTicketNo && (
              <View style={styles.ticketIdRow}>
                <Text style={[styles.ticketIdLabel, { color: colors.textSecondary }]}>Ticket No:</Text>
                <Text style={[styles.ticketIdText, { color: colors.textSecondary }]}>{selectedTicketNo}</Text>
                <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={{ marginLeft: 4 }}>
                  <Feather name="copy" size={13} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {visibleTicketPasses.length > 1 && (
              <View style={styles.ticketPassSelector}>
                {visibleTicketPasses.map((pass, index) => {
                  const isSelected = index === selectedPassIndex;
                  const isUsed = pass.status === 'used';

                  return (
                    <TouchableOpacity
                      key={`${pass.orderId}-${pass.ticketIndex}`}
                      style={[
                        styles.ticketPassChip,
                        isUsed && styles.ticketPassChipUsed,
                        {
                          backgroundColor: isSelected ? colors.primary : isDark ? '#17151A' : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedPassIndex(index)}
                      activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.ticketPassChipText,
                            { color: isSelected ? colors.background : colors.text },
                          ]}
                        >
                          {pass.ticketIndex}
                        </Text>
                        {isUsed && (
                          <View style={styles.ticketPassCheck}>
                            <Feather name="check" size={10} color="#101014" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                })}
              </View>
            )}

            <Text style={[styles.ticketPassCaption, { color: colors.textSecondary }]}>
              Ticket {selectedPass?.ticketIndex ?? 1} of {visibleTicketPasses.length || 1}
            </Text>

            {selectedPass?.status === 'used' && (
              <View style={styles.usedTicketBadge}>
                <Feather name="check" size={14} color="#101014" />
                <Text style={styles.usedTicketBadgeText}>Used</Text>
              </View>
            )}

            <View style={styles.qrWrapper}>
              <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF' }]}>
                {selectedPass ? (
                  <QRCode
                    value={selectedQrValue}
                    size={QR_SIZE}
                    backgroundColor="white"
                    color="black"
                  />
                ) : (
                  <View style={styles.unavailableQrState}>
                    <Feather name="users" size={28} color="#6E6677" />
                    <Text style={styles.unavailableQrText}>This ticket is currently shared from another account view.</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.instructionBanner}>
              <Ionicons name="information-circle-outline" size={20} color="#E75737" />
              <Text style={styles.instructionText}>
                {selectedPass?.status === 'used'
                  ? 'This ticket has already been scanned and cannot be used again.'
                  : 'Show this QR code to the host at the event to verify your ticket. Keep screen brightness high.'}
              </Text>
            </View>

            {canShareSelectedPass && (
              <TouchableOpacity
                style={[
                  styles.shareQrButton,
                  selectedCurrentShare && styles.shareQrButtonActive,
                ]}
                activeOpacity={0.85}
                onPress={() => void handleOpenShareModal()}
              >
                <Feather name="share-2" size={15} color="#111111" />
                <Text style={styles.shareQrButtonText}>
                  {selectedCurrentShare ? `Shared with ${selectedCurrentShare.friend?.name ?? 'friend'}` : 'Share this QR'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.walletButton}
              activeOpacity={0.85}
              onPress={() => router.push("/event-screen/wallet")}
            >
              <Ionicons name="ticket-outline" size={16} color="#111111" />
              <Text style={styles.walletButtonText}>Ticket Wallet</Text>
              <Feather name="arrow-right" size={15} color="#111111" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={isShareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalSheet}>
            <View style={styles.shareModalHeader}>
              <View>
                <Text style={styles.shareModalTitle}>Share QR</Text>
                <Text style={styles.shareModalSubtitle}>
                  Ticket {selectedPass?.ticketIndex ?? 1} • {ticketName}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.shareModalClose}
                onPress={() => setIsShareModalVisible(false)}
                activeOpacity={0.85}
              >
                <Feather name="x" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedCurrentShare && (
              <View style={styles.currentShareCard}>
                <View>
                  <Text style={styles.currentShareLabel}>Currently shared with</Text>
                  <Text style={styles.currentShareName}>{selectedCurrentShare.friend?.name ?? 'Friend'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelShareButton}
                  onPress={() => void handleCancelShare()}
                  disabled={isShareSubmitting}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cancelShareButtonText}>Cancel</Text>
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
              <FlatList
                data={friends.filter((friend) => friend.id !== selectedCurrentShare?.friend?.id)}
                keyExtractor={(item) => item.id}
                style={styles.friendList}
                contentContainerStyle={friends.length === 0 ? styles.friendState : undefined}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Text style={styles.friendEmptyText}>No mutual friends found.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.friendRow}
                    onPress={() => void handleShareWithFriend(item)}
                    disabled={isShareSubmitting || Boolean(selectedCurrentShare)}
                    activeOpacity={0.85}
                  >
                    <UserAvatar uri={resolveAvatarUri(item.avatarKey, item.avatarUrl)} name={item.name} size={42} style={styles.friendAvatar} />
                    <View style={styles.friendCopy}>
                      <Text style={styles.friendName}>{item.name}</Text>
                      {!!item.username && <Text style={styles.friendHandle}>@{item.username}</Text>}
                    </View>
                    <Text style={[styles.friendAction, selectedCurrentShare && styles.friendActionDisabled]}>
                      {selectedCurrentShare ? 'Cancel first' : 'Share'}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(104, 104, 104, 0.16)',
  },
  headerTitle: {
    fontWeight: '600', fontSize: 16, textAlign: 'center',
    letterSpacing: -0.08,
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  productCard: {
    flexDirection: 'row', alignItems: 'center',
    width: CONTENT_WIDTH,
    minHeight: 86,
    borderRadius: 12, padding: 12, gap: 12,
  },
  productImage: { width: 64, height: 64, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  productMeta: { fontSize: 12, marginBottom: 6 },
  productPrice: { fontWeight: '700', fontSize: 18 },

  infoSection: { width: CONTENT_WIDTH, borderRadius: 12, padding: 12, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoLabel: { fontWeight: '700', fontSize: 16 },
  infoDetail: { flexDirection: 'row', gap: 4, alignItems: 'flex-start', flex: 1 },
  infoDetailLabel: { fontSize: 13, fontWeight: '600', flexShrink: 0 },
  infoDetailValue: { fontSize: 13, flex: 1, fontWeight: '600' },

  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  orderLabel: { fontSize: 14 },
  orderNumber: { fontSize: 14, fontWeight: '600' },

  qrWrapper: {
    alignItems: 'center',
  },
  qrContainer: {
    borderRadius: 24,
    padding: 16,
    width: QR_SIZE + 32,
    height: QR_SIZE + 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unavailableQrState: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  unavailableQrText: {
    color: '#6E6677',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },

  instructionBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#1C1718',
    borderRadius: 12,
    gap: 8,
    minHeight: 68,
    padding: 12,
    width: CONTENT_WIDTH,
  },
  instructionText: {
    color: '#B3B3B3',
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  walletButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 16,
    shadowColor: '#B2ABBA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  walletButtonText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  ticketSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 86,
    padding: 12,
    borderRadius: 12,
    width: CONTENT_WIDTH,
  },
  ticketIconBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketSummaryInfo: {
    flex: 1,
  },
  ticketSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  ticketSummaryMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  ticketSummaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 8,
  },
  confirmedBadge: {
    backgroundColor: 'rgba(29, 158, 117, 0.1)',
    borderColor: 'rgba(29, 158, 117, 0.35)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmedText: {
    color: '#1D9E75',
    fontSize: 12,
    fontWeight: '700',
  },
  eventInfoCard: {
    borderRadius: 12,
    gap: 12,
    padding: 12,
    width: CONTENT_WIDTH,
  },
  eventInfoTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  eventInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    flex: 1,
  },
  eventInfoDetails: {
    gap: 8,
  },
  ticketIdRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  ticketIdLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  ticketIdText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  ticketPassSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: CONTENT_WIDTH,
  },
  ticketPassChip: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    minWidth: 44,
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  ticketPassChipUsed: {
    borderColor: '#B2ABBA',
  },
  ticketPassChipText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  ticketPassCheck: {
    alignItems: 'center',
    backgroundColor: '#B2ABBA',
    borderRadius: 999,
    height: 14,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 14,
  },
  ticketPassCaption: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  usedTicketBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#B2ABBA',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  usedTicketBadgeText: {
    color: '#101014',
    fontSize: 12,
    fontWeight: '800',
  },
  shareQrButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 16,
  },
  shareQrButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  shareQrButtonText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  shareModalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  shareModalSheet: {
    backgroundColor: '#121116',
    borderColor: '#2A2730',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '78%',
    padding: 16,
    paddingBottom: 28,
  },
  shareModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  shareModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  shareModalSubtitle: {
    color: '#A6A0AA',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  shareModalClose: {
    alignItems: 'center',
    backgroundColor: '#242229',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  currentShareCard: {
    alignItems: 'center',
    backgroundColor: '#1B1821',
    borderColor: '#36313D',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
  },
  currentShareLabel: {
    color: '#A6A0AA',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  currentShareName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 2,
  },
  cancelShareButton: {
    backgroundColor: '#2B100F',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelShareButtonText: {
    color: '#FF4D4D',
    fontSize: 12,
    fontWeight: '800',
  },
  friendSearchInput: {
    backgroundColor: '#1B1821',
    borderColor: '#36313D',
    borderRadius: 10,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  shareErrorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 10,
  },
  friendList: {
    marginTop: 10,
  },
  friendState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  friendEmptyText: {
    color: '#A6A0AA',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendRow: {
    alignItems: 'center',
    borderBottomColor: '#28242E',
    borderBottomWidth: 1,
    flexDirection: 'row',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  friendHandle: {
    color: '#A6A0AA',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  friendAction: {
    color: '#C2B9CB',
    fontSize: 12,
    fontWeight: '800',
  },
  friendActionDisabled: {
    color: '#77717D',
  },
});
