import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Platform, ScrollView, StatusBar,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFriendUsers, type FriendUserResponse } from '@/lib/users';

/* ─── Fake Event Dropdown Data ─── */
const EVENTS = ['Rooftop Session Vol 4', 'Summer Fest 2026', 'Underground Beats', 'Jazz Night'];

const firstParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const getInitialDate = (dateIso?: string) => {
  if (!dateIso) {
    return new Date();
  }

  const parsedDate = new Date(dateIso);
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

export default function CreatePlanScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    planName?: string;
    planDate?: string;
    planDateIso?: string;
    planTime?: string;
    planEvent?: string;
    planFriends?: string;
    planLocation?: string;
    planLatitude?: string;
    planLongitude?: string;
    eventId?: string;
    eventTitle?: string;
    eventLocation?: string;
    eventLatitude?: string;
    eventLongitude?: string;
    eventScheduledAt?: string;
    lockLocation?: string;
  }>();

  const eventTitle = firstParam(params.eventTitle);
  const eventLocation = firstParam(params.eventLocation);
  const eventScheduledAt = firstParam(params.eventScheduledAt);
  const eventLatitude = firstParam(params.eventLatitude);
  const eventLongitude = firstParam(params.eventLongitude);
  const planDateIso = firstParam(params.planDateIso);
  const isEdit = firstParam(params.mode) === 'edit';
  const isEventLocationLocked = firstParam(params.lockLocation) === 'true' || Boolean(eventLocation);
  const isEventLocked = Boolean(eventTitle) || firstParam(params.lockLocation) === 'true';

  const [name, setName] = useState(firstParam(params.planName) || '');
  const [selectedDate, setSelectedDate] = useState(() => getInitialDate(eventScheduledAt || planDateIso));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(firstParam(params.planEvent) || eventTitle || '');
  const [selectedLocation, setSelectedLocation] = useState(firstParam(params.planLocation) || eventLocation || '123, Main Street NYC');
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);

  const [availableFriends, setAvailableFriends] = useState<FriendUserResponse[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  const selectedFriendsDisplay = availableFriends
    .filter((f) => selectedFriendIds.has(f.id))
    .map((f) => f.name)
    .join(', ');

  useEffect(() => {
    setIsFriendsLoading(true);
    getFriendUsers()
      .then(setAvailableFriends)
      .catch(() => {})
      .finally(() => setIsFriendsLoading(false));
  }, []);

  const toggleFriend = (friend: FriendUserResponse) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friend.id)) {
        next.delete(friend.id);
      } else {
        next.add(friend.id);
      }
      return next;
    });
  };

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear());
      newDate.setMonth(date.getMonth());
      newDate.setDate(date.getDate());
      setSelectedDate(newDate);
    }
  };

  const onTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours());
      newDate.setMinutes(time.getMinutes());
      setSelectedDate(newDate);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleDone = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }
    // Navigate to Map Selection screen
    router.push({
      pathname: '/plan-screen/map-selection' as any,
      params: {
        planName: name,
        planDate: formatDate(selectedDate),
        planDateIso: selectedDate.toISOString(),
        planTime: formatTime(selectedDate),
        planEvent: selectedEvent,
        planEventId: firstParam(params.eventId) || '',
        planFriends: selectedFriendsDisplay,
        planFriendIds: [...selectedFriendIds].join(','),
        planLocation: selectedLocation,
        planLatitude: eventLatitude || firstParam(params.planLatitude) || '',
        planLongitude: eventLongitude || firstParam(params.planLongitude) || '',
      },
    });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <Feather name="x" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Plan' : 'Create Plan'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── Plan Name ── */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>PLAN NAME</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* ── Date & Time Row ── */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateCol}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DATE</Text>
            <TouchableOpacity
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={isEventLocked ? 1 : 0.8}
              disabled={isEventLocked}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text, fontSize: 14 }}>
                {formatDate(selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timeCol}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>TIME</Text>
            <TouchableOpacity
              style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={isEventLocked ? 1 : 0.8}
              disabled={isEventLocked}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.text, fontSize: 14 }}>
                {formatTime(selectedDate)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isEventLocked && showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {!isEventLocked && showTimePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onTimeChange}
          />
        )}

        {/* ── Event Selector ── */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>EVENT</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, isEventLocked && styles.readOnlyDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={isEventLocked ? 1 : 0.8}
          disabled={isEventLocked}
          accessibilityRole={isEventLocked ? 'text' : 'button'}
          accessibilityLabel={isEventLocked ? `Event: ${selectedEvent}` : 'Select event'}
          onPress={() => { setShowEventDropdown(!showEventDropdown); setShowFriendsDropdown(false); }}
        >
          <Text style={[styles.dropdownText, { color: colors.text }, !selectedEvent && { color: colors.textSecondary }]}>
            {selectedEvent || 'Select Event'}
          </Text>
          <Feather name={isEventLocked ? 'lock' : (showEventDropdown ? 'chevron-up' : 'chevron-down')} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {!isEventLocked && showEventDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {EVENTS.map((ev) => (
              <TouchableOpacity
                key={ev}
                style={[styles.dropdownItem, { borderBottomColor: colors.border }, selectedEvent === ev && styles.dropdownItemActive]}
                onPress={() => { setSelectedEvent(ev); setShowEventDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, { color: colors.textSecondary }, selectedEvent === ev && styles.dropdownItemTextActive]}>{ev}</Text>
                {selectedEvent === ev && <Feather name="check" size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Location Selector ── */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>LOCATION</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, isEventLocationLocked && styles.readOnlyDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isEventLocationLocked ? `View event location: ${selectedLocation}` : 'Select location'}
          onPress={isEventLocationLocked
            ? () => router.push({
                pathname: '/plan-screen/view-location' as any,
                params: {
                  eventName: selectedEvent,
                  locationName: selectedLocation,
                  latitude: eventLatitude || firstParam(params.planLatitude) || '',
                  longitude: eventLongitude || firstParam(params.planLongitude) || '',
                },
              })
            : () => { setShowLocationDropdown(!showLocationDropdown); setShowEventDropdown(false); setShowFriendsDropdown(false); }
          }
        >
          <View style={styles.dropdownTextRow}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownText, styles.locationText, { color: colors.text }, !selectedLocation && { color: colors.textSecondary }]} numberOfLines={1}>
              {selectedLocation || 'Select Location'}
            </Text>
          </View>
          <Feather name={isEventLocationLocked ? 'lock' : 'chevron-right'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {!isEventLocationLocked && showLocationDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {['123, Main Street NYC', 'Los Angeles, CA', 'Central Park'].map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.dropdownItem, { borderBottomColor: colors.border }, selectedLocation === loc && styles.dropdownItemActive]}
                onPress={() => { setSelectedLocation(loc); setShowLocationDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, { color: colors.textSecondary }, selectedLocation === loc && styles.dropdownItemTextActive]}>{loc}</Text>
                {selectedLocation === loc && <Feather name="check" size={14} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Friends Selector ── */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>ADD FRIENDS</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => { setShowFriendsDropdown(!showFriendsDropdown); setShowEventDropdown(false); setShowLocationDropdown(false); }}
        >
          <Text style={[styles.dropdownText, { color: colors.text }, !selectedFriendsDisplay && { color: colors.textSecondary }]}>
            {selectedFriendsDisplay || 'Select Friends'}
          </Text>
          <Feather name={showFriendsDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {showFriendsDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isFriendsLoading ? (
              <View style={styles.dropdownLoading}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : availableFriends.length === 0 ? (
              <View style={styles.dropdownLoading}>
                <Text style={[styles.dropdownItemText, { color: colors.textSecondary }]}>No friends found</Text>
              </View>
            ) : availableFriends.map((fr) => {
              const isSelected = selectedFriendIds.has(fr.id);
              return (
                <TouchableOpacity
                  key={fr.id}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }, isSelected && styles.dropdownItemActive]}
                  onPress={() => toggleFriend(fr)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.textSecondary }, isSelected && styles.dropdownItemTextActive]}>{fr.name}</Text>
                  {isSelected && <Feather name="check" size={14} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Buttons ── */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} activeOpacity={0.8} onPress={handleCancel}>
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8} onPress={handleDone}>
          <Text style={[styles.doneText, { color: colors.background }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitle: { flex: 1, fontWeight: '700', fontSize: 17, textAlign: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  /* Labels */
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },

  /* Text Inputs */
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14, height: 48,
  },
  textInput: { fontSize: 14, flex: 1, padding: 0 },

  /* Date/Time Row */
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1.2 },
  timeCol: { flex: 1 },

  /* Dropdown */
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14, height: 48,
  },
  dropdownText: { fontSize: 14 },
  dropdownTextRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  locationText: { flex: 1 },
  readOnlyDropdown: { opacity: 1 },
  dropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4, overflow: 'hidden',
  },
  dropdownLoading: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1,
  },
  dropdownItemActive: { backgroundColor: 'rgba(178, 171, 186, 0.1)' },
  dropdownItemText: { fontSize: 14 },
  dropdownItemTextActive: { fontWeight: 'bold' },

  /* Bottom Buttons */
  bottomBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
  doneBtn: {
    flex: 1, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  doneText: { fontSize: 15, fontWeight: '700' },
});
