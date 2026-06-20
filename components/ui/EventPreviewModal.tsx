import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type EventPreviewModalProps = {
  visible: boolean;
  onClose: () => void;
  themeColor?: string;
  eventTitle?: string;
  hostName?: string;
  distance?: string;
  isLive?: boolean;
  eventDate?: string;
  eventTime?: string;
  location?: string;
  attendeesCount?: number;
  ageLimit?: string;
  price?: string;
  ticketsAvailable?: string;
  ticketSalesEndDate?: string;
  onAddToCalendar?: () => void;
  onViewEvent?: () => void;
  isAddedToCalendar?: boolean;
  onViewInCalendar?: () => void;
};

export default function EventPreviewModal({
  visible,
  onClose,
  themeColor = '#F2245C',
  eventTitle = "Event",
  hostName = "host",
  distance = "nearby",
  isLive = false,
  eventDate = "Date TBA",
  eventTime = "Time TBA",
  location = "Location TBA",
  attendeesCount = 0,
  ageLimit = "All Ages",
  price = "Free",
  ticketsAvailable = "Tickets TBA",
  ticketSalesEndDate = "Sales end TBA",
  onAddToCalendar,
  onViewEvent,
  isAddedToCalendar = false,
  onViewInCalendar,
}: EventPreviewModalProps) {
  const { colors, isDark } = useTheme();
  const distanceLabel = distance === "nearby" ? "nearby" : `${distance} away`;
  const showCalendarAction = false;

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
          {/* Header */} 
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <MaterialCommunityIcons name="map-marker-radius" size={24} color={themeColor} />
            </View>
            
            <View style={styles.headerInfo}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{eventTitle}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                @{hostName} • {distanceLabel}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status Badge */}
          {isLive && (
            <View style={styles.statusRow}>
              <View style={[styles.liveBadge, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <View style={[styles.liveDot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Feather name="calendar" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>{eventDate}</Text>
              <Text style={[styles.dot, { color: colors.textSecondary }]}>•</Text>
              <Feather name="clock" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>{eventTime}</Text>
            </View>

            <View style={styles.detailItem}>
              <Feather name="map-pin" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>{location}</Text>
            </View>
          </View>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="people" size={14} color={colors.textSecondary} />
              <Text style={[styles.badgeText, { color: colors.text }]}>{attendeesCount} attending</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>{ageLimit}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>{price}</Text>
            </View>
          </View>

          <View style={styles.ticketInfoRow}>
            <View style={styles.ticketInfoItem}>
              <Feather name="tag" size={15} color={colors.textSecondary} />
              <Text style={[styles.ticketInfoText, { color: colors.text }]}>{ticketsAvailable}</Text>
            </View>
            <View style={styles.ticketInfoItem}>
              <Feather name="calendar" size={15} color={colors.textSecondary} />
              <Text style={[styles.ticketInfoText, { color: colors.text }]}>{ticketSalesEndDate}</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {showCalendarAction && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: isAddedToCalendar ? 'rgba(142,84,233,0.2)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') }]}
                onPress={isAddedToCalendar ? onViewInCalendar : onAddToCalendar}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryBtnText, { color: isAddedToCalendar ? '#8E54E9' : colors.text }]}>
                  {isAddedToCalendar ? 'View in Calendar' : 'Add To Calendar'}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: themeColor }]}
              onPress={onViewEvent}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>View Event</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
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
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    color: '#22C55E',
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
