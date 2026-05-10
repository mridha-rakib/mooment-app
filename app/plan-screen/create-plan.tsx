import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert, Platform, SafeAreaView, ScrollView, StatusBar,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

/* ─── Fake Event / Friends Dropdown Data ─── */
const EVENTS = ['Rooftop Session Vol 4', 'Summer Fest 2026', 'Underground Beats', 'Jazz Night'];
const FRIENDS = ['Dj Koko', 'Tuval', 'Nosel', 'Alex', 'Maya', 'Jordan'];

export default function CreatePlanScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; planName?: string; planDate?: string; planTime?: string; planEvent?: string; planFriends?: string }>();

  const isEdit = params.mode === 'edit';

  const [name, setName] = useState(params.planName || '');
  const [date, setDate] = useState(params.planDate || 'Sep 9, 2026');
  const [time, setTime] = useState(params.planTime || '10:00 AM');
  const [selectedEvent, setSelectedEvent] = useState(params.planEvent || '');
  const [selectedLocation, setSelectedLocation] = useState('123, Main Street NYC');
  const [selectedFriends, setSelectedFriends] = useState(params.planFriends || '');
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);

  const handleDone = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }
    // Navigate to Map Selection screen
    router.push({
      pathname: '/plan-screen/map-selection' as any,
      params: { planName: name, planDate: date, planTime: time, planEvent: selectedEvent, planFriends: selectedFriends, planLocation: selectedLocation },
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
            <TouchableOpacity style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
              <Feather name="calendar" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text, flex: 1 }]}
                value={date}
                onChangeText={setDate}
                placeholderTextColor={colors.textSecondary}
                placeholder="Date"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.timeCol}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>TIME</Text>
            <TouchableOpacity style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
              <Feather name="clock" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: colors.text, flex: 1 }]}
                value={time}
                onChangeText={setTime}
                placeholderTextColor={colors.textSecondary}
                placeholder="Time"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Event Selector ── */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>EVENT</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => { setShowEventDropdown(!showEventDropdown); setShowFriendsDropdown(false); }}
        >
          <Text style={[styles.dropdownText, { color: colors.text }, !selectedEvent && { color: colors.textSecondary }]}>
            {selectedEvent || 'Select Event'}
          </Text>
          <Feather name={showEventDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {showEventDropdown && (
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
          style={[styles.dropdownBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => router.push("/plan-screen/map-selection")}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownText, { color: colors.text }, !selectedLocation && { color: colors.textSecondary }]}>
              {selectedLocation || 'Select Location'}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {showLocationDropdown && (
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
          <Text style={[styles.dropdownText, { color: colors.text }, !selectedFriends && { color: colors.textSecondary }]}>
            {selectedFriends || 'Select Friends'}
          </Text>
          <Feather name={showFriendsDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        {showFriendsDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {FRIENDS.map((fr) => {
              const isSelected = selectedFriends.split(', ').includes(fr);
              return (
                <TouchableOpacity
                  key={fr}
                  style={[styles.dropdownItem, { borderBottomColor: colors.border }, isSelected && styles.dropdownItemActive]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedFriends(selectedFriends.split(', ').filter((f) => f !== fr).join(', '));
                    } else {
                      setSelectedFriends(selectedFriends ? `${selectedFriends}, ${fr}` : fr);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.textSecondary }, isSelected && styles.dropdownItemTextActive]}>{fr}</Text>
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
          <Text style={[styles.cancelText, { color: colors.text }]}>Canel</Text>
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
  dropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4, overflow: 'hidden',
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
