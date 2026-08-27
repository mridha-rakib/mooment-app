import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { buttonBackground, buttonForeground } from '@/lib/buttonTheme';
import CrowdStatusBadge from '@/components/events/CrowdStatusBadge';
import type { CrowdStatus } from '@/lib/events';

export type EventPreviewModalItem = {
  id: string;
  themeColor?: string;
  eventTitle?: string;
  hostName?: string;
  distance?: string;
  isLive?: boolean;
  eventStatus?: string | null;
  crowdStatus?: CrowdStatus | null;
  eventDate?: string;
  eventTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
  location?: string;
  attendeesCount?: number;
  ageLimit?: string;
  price?: string;
  ticketsAvailable?: string;
  ticketSalesEndDate?: string;
  ticketTypeCount?: string;
};

type EventPreviewModalProps = {
  visible: boolean;
  onClose: () => void;
  eventItems?: EventPreviewModalItem[];
  selectedEventId?: string | null;
  onVisibleEventChange?: (eventId: string) => void;
  themeColor?: string;
  eventTitle?: string;
  hostName?: string;
  distance?: string;
  isLive?: boolean;
  eventStatus?: string | null;
  crowdStatus?: CrowdStatus | null;
  eventDate?: string;
  eventTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
  location?: string;
  attendeesCount?: number;
  ageLimit?: string;
  price?: string;
  ticketsAvailable?: string;
  ticketSalesEndDate?: string;
  ticketTypeCount?: string;
  onAddToCalendar?: () => void;
  onViewEvent?: () => void;
  isAddedToCalendar?: boolean;
  onViewInCalendar?: () => void;
  livePulseProgress?: SharedValue<number>;
};

const clampIndex = (index: number, length: number) => {
  if (length <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.round(index), 0), length - 1);
};

export default function EventPreviewModal({
  visible,
  onClose,
  eventItems,
  selectedEventId,
  onVisibleEventChange,
  themeColor = '#F2245C',
  eventTitle = "Event",
  hostName = "host",
  distance = "nearby",
  isLive = false,
  eventStatus = null,
  crowdStatus = null,
  eventDate = "Date TBA",
  eventTime = "Time TBA",
  eventEndDate = "Date TBA",
  eventEndTime = "Time TBA",
  location = "Location TBA",
  attendeesCount = 0,
  ageLimit = "All Ages",
  price = "Free",
  ticketsAvailable = "Tickets TBA",
  ticketSalesEndDate = "Sales end TBA",
  ticketTypeCount,
  onAddToCalendar,
  onViewEvent,
  isAddedToCalendar = false,
  onViewInCalendar,
  livePulseProgress,
}: EventPreviewModalProps) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<EventPreviewModalItem>>(null);
  const showCalendarAction = false;
  const liveBadgePulseStyle = useAnimatedStyle(() => {
    if (!livePulseProgress) {
      return { opacity: 1 };
    }

    return {
      opacity: interpolate(livePulseProgress.value, [0, 1], [0.76, 1]),
    };
  }, [livePulseProgress]);
  const liveDotPulseStyle = useAnimatedStyle(() => {
    if (!livePulseProgress) {
      return {
        opacity: 1,
        transform: [{ scale: 1 }],
      };
    }

    return {
      opacity: interpolate(livePulseProgress.value, [0, 1], [0.55, 1]),
      transform: [{ scale: interpolate(livePulseProgress.value, [0, 1], [1, 1.35]) }],
    };
  }, [livePulseProgress]);
  const fallbackItem = useMemo<EventPreviewModalItem>(() => ({
    id: "single-event-preview",
    themeColor,
    eventTitle,
    hostName,
    distance,
    isLive,
    eventStatus,
    crowdStatus,
    eventDate,
    eventTime,
    eventEndDate,
    eventEndTime,
    location,
    attendeesCount,
    ageLimit,
    price,
    ticketsAvailable,
    ticketSalesEndDate,
    ticketTypeCount,
  }), [
    ageLimit,
    attendeesCount,
    distance,
    eventDate,
    eventEndDate,
    eventEndTime,
    eventTime,
    eventTitle,
    hostName,
    isLive,
    eventStatus,
    crowdStatus,
    location,
    price,
    themeColor,
    ticketSalesEndDate,
    ticketsAvailable,
    ticketTypeCount,
  ]);
  const previewItems = useMemo(
    () => eventItems?.length ? eventItems : [fallbackItem],
    [eventItems, fallbackItem],
  );
  const selectedIndex = previewItems.findIndex((item) => item.id === selectedEventId);
  const requestedIndex = clampIndex(selectedIndex, previewItems.length);
  const itemWidth = Math.max(width - 72, 1);
  const [currentIndex, setCurrentIndex] = useState(requestedIndex);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setCurrentIndex(requestedIndex);
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: requestedIndex * itemWidth,
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [itemWidth, requestedIndex, visible]);

  const commitVisibleIndex = (index: number) => {
    const nextIndex = clampIndex(index, previewItems.length);
    const nextItem = previewItems[nextIndex];

    setCurrentIndex(nextIndex);

    if (nextItem?.id && nextItem.id !== selectedEventId) {
      onVisibleEventChange?.(nextItem.id);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitVisibleIndex(event.nativeEvent.contentOffset.x / itemWidth);
  };

  const renderPreviewItem = ({ item }: { item: EventPreviewModalItem }) => {
    const itemThemeColor = item.themeColor ?? themeColor;
    const itemDistance = item.distance ?? "nearby";
    const distanceLabel = itemDistance === "nearby" ? "nearby" : `${itemDistance} away`;
    const itemIsLive = item.isLive || item.eventStatus === "live";

    return (
      <View style={[styles.previewSlide, { width: itemWidth }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <MaterialCommunityIcons name="map-marker-radius" size={24} color={itemThemeColor} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.eventTitle ?? "Event"}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              @{item.hostName ?? "host"} • {distanceLabel}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        {itemIsLive && (
          <View style={styles.statusRow}>
            <Animated.View style={[styles.liveBadge, styles.liveBadgeActive, liveBadgePulseStyle]}>
              <Animated.View style={[styles.liveDot, { backgroundColor: colors.danger }, liveDotPulseStyle]} />
              <Text style={[styles.liveText, { color: colors.danger }]}>Live</Text>
            </Animated.View>
            <CrowdStatusBadge eventStatus={item.eventStatus} crowdStatus={item.crowdStatus} />
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start</Text>
            <Feather name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>{item.eventDate ?? "Date TBA"}</Text>
            <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
            <Feather name="clock" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>{item.eventTime ?? "Time TBA"}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>End</Text>
            <Feather name="calendar" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>{item.eventEndDate ?? "Date TBA"}</Text>
            <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
            <Feather name="clock" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>{item.eventEndTime ?? "Time TBA"}</Text>
          </View>

          <View style={styles.detailItem}>
            <Feather name="map-pin" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>{item.location ?? "Location TBA"}</Text>
          </View>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name="people" size={14} color={colors.textSecondary} />
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.attendeesCount ?? 0} attending</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.ageLimit ?? "All Ages"}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.price ?? "Free"}</Text>
          </View>
        </View>

        <View style={styles.ticketInfoRow}>
          {item.ticketTypeCount ? (
            <View style={styles.ticketInfoItem}>
              <MaterialCommunityIcons name="ticket-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.ticketInfoText, { color: colors.text }]}>{item.ticketTypeCount}</Text>
            </View>
          ) : null}
          <View style={styles.ticketInfoItem}>
            <Feather name="tag" size={15} color={colors.textSecondary} />
            <Text style={[styles.ticketInfoText, { color: colors.text }]}>{item.ticketsAvailable ?? "Tickets TBA"}</Text>
          </View>
          <View style={styles.ticketInfoItem}>
            <Feather name="calendar" size={15} color={colors.textSecondary} />
            <Text style={[styles.ticketInfoText, { color: colors.text }]}>{item.ticketSalesEndDate ?? "Sales end TBA"}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {showCalendarAction && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: buttonBackground(colors) }]}
              onPress={isAddedToCalendar ? onViewInCalendar : onAddToCalendar}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryBtnText, { color: buttonForeground(colors) }]}>
                {isAddedToCalendar ? 'View in Calendar' : 'Add To Calendar'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: buttonBackground(colors) }]}
            onPress={onViewEvent}
            activeOpacity={0.8}
          >
            <Text style={[styles.primaryBtnText, { color: buttonForeground(colors) }]}>View Event</Text>
            <Feather name="arrow-right" size={18} color={buttonForeground(colors)} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />

        <BlurView
          intensity={500}
          tint={isDark ? "dark" : "light"}
          style={[styles.container, { borderColor: 'rgba(255, 255, 255, 0.511)',backgroundColor:"#333333f5" }]}
        >
          <FlatList
            ref={listRef}
            data={previewItems}
            keyExtractor={(item) => item.id}
            renderItem={renderPreviewItem}
            horizontal
            pagingEnabled
            bounces={false}
            nestedScrollEnabled
            scrollEnabled={previewItems.length > 1}
            initialScrollIndex={previewItems.length > 0 ? requestedIndex : undefined}
            getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            onScrollToIndexFailed={({ index }) => {
              listRef.current?.scrollToOffset({ offset: index * itemWidth, animated: false });
            }}
            showsHorizontalScrollIndicator={false}
            extraData={currentIndex}
          />
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 100, // Above bottom tabs
  },
  dismissArea: {
    flex: 1,
  },
  container: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewSlide: {
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  liveBadgeActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.16)',
    borderColor: 'rgba(255, 59, 48, 0.28)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
    opacity: 0.5,
  },
  detailsContainer: {
    marginBottom: 16,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  detailLabel: {
    width: 34,
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    marginHorizontal: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ticketInfoRow: {
    gap: 8,
    marginBottom: 18,
  },
  ticketInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketInfoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1.2,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  }
});
