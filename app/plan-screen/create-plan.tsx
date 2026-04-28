import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert, Platform, SafeAreaView, ScrollView, StatusBar,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

/* ─── Fake Event / Friends Dropdown Data ─── */
const EVENTS = ['Rooftop Session Vol 4', 'Summer Fest 2026', 'Underground Beats', 'Jazz Night'];
const FRIENDS = ['Dj Koko', 'Tuval', 'Nosel', 'Alex', 'Maya', 'Jordan'];

export default function CreatePlanScreen() {
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeBtn} activeOpacity={0.8}>
          <Feather name="x" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Plan' : 'Create Plan'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── Plan Name ── */}
        <Text style={styles.label}>PLAN NAME</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.textInput}
            placeholder="Name"
            placeholderTextColor="#555"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* ── Date & Time Row ── */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateCol}>
            <Text style={styles.label}>DATE</Text>
            <TouchableOpacity style={styles.inputWrap} activeOpacity={0.8}>
              <Feather name="calendar" size={14} color="#8E8E9B" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={date}
                onChangeText={setDate}
                placeholderTextColor="#555"
                placeholder="Date"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.label}>TIME</Text>
            <TouchableOpacity style={styles.inputWrap} activeOpacity={0.8}>
              <Feather name="clock" size={14} color="#8E8E9B" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                value={time}
                onChangeText={setTime}
                placeholderTextColor="#555"
                placeholder="Time"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Event Selector ── */}
        <Text style={styles.label}>EVENT</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          activeOpacity={0.8}
          onPress={() => { setShowEventDropdown(!showEventDropdown); setShowFriendsDropdown(false); }}
        >
          <Text style={[styles.dropdownText, !selectedEvent && styles.dropdownPlaceholder]}>
            {selectedEvent || 'Select Event'}
          </Text>
          <Feather name={showEventDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E9B" />
        </TouchableOpacity>
        {showEventDropdown && (
          <View style={styles.dropdownList}>
            {EVENTS.map((ev) => (
              <TouchableOpacity
                key={ev}
                style={[styles.dropdownItem, selectedEvent === ev && styles.dropdownItemActive]}
                onPress={() => { setSelectedEvent(ev); setShowEventDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, selectedEvent === ev && styles.dropdownItemTextActive]}>{ev}</Text>
                {selectedEvent === ev && <Feather name="check" size={14} color="#16D869" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Location Selector ── */}
        <Text style={styles.label}>LOCATION</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          activeOpacity={0.8}
          onPress={() => { setShowLocationDropdown(!showLocationDropdown); setShowEventDropdown(false); setShowFriendsDropdown(false); }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={14} color="#8E8E9B" style={{ marginRight: 8 }} />
            <Text style={[styles.dropdownText, !selectedLocation && styles.dropdownPlaceholder]}>
              {selectedLocation || 'Select Location'}
            </Text>
          </View>
          <Feather name={showLocationDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E9B" />
        </TouchableOpacity>
        {showLocationDropdown && (
          <View style={styles.dropdownList}>
            {['123, Main Street NYC', 'Los Angeles, CA', 'Central Park'].map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.dropdownItem, selectedLocation === loc && styles.dropdownItemActive]}
                onPress={() => { setSelectedLocation(loc); setShowLocationDropdown(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, selectedLocation === loc && styles.dropdownItemTextActive]}>{loc}</Text>
                {selectedLocation === loc && <Feather name="check" size={14} color="#16D869" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Friends Selector ── */}
        <Text style={styles.label}>ADD FRIENDS</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          activeOpacity={0.8}
          onPress={() => { setShowFriendsDropdown(!showFriendsDropdown); setShowEventDropdown(false); setShowLocationDropdown(false); }}
        >
          <Text style={[styles.dropdownText, !selectedFriends && styles.dropdownPlaceholder]}>
            {selectedFriends || 'Select Friends'}
          </Text>
          <Feather name={showFriendsDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E9B" />
        </TouchableOpacity>
        {showFriendsDropdown && (
          <View style={styles.dropdownList}>
            {FRIENDS.map((fr) => {
              const isSelected = selectedFriends.split(', ').includes(fr);
              return (
                <TouchableOpacity
                  key={fr}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedFriends(selectedFriends.split(', ').filter((f) => f !== fr).join(', '));
                    } else {
                      setSelectedFriends(selectedFriends ? `${selectedFriends}, ${fr}` : fr);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>{fr}</Text>
                  {isSelected && <Feather name="check" size={14} color="#16D869" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Buttons ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={handleCancel}>
          <Text style={styles.cancelText}>Canel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} activeOpacity={0.8} onPress={handleDone}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, color: '#FFFFFF', fontWeight: '700', fontSize: 17, textAlign: 'center' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  /* Labels */
  label: { color: '#8E8E9B', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },

  /* Text Inputs */
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A3A',
    paddingHorizontal: 14, height: 48,
  },
  textInput: { color: '#FFFFFF', fontSize: 14, flex: 1, padding: 0 },

  /* Date/Time Row */
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1.2 },
  timeCol: { flex: 1 },

  /* Dropdown */
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1A1A2E', borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A3A',
    paddingHorizontal: 14, height: 48,
  },
  dropdownText: { color: '#FFFFFF', fontSize: 14 },
  dropdownPlaceholder: { color: '#555' },
  dropdownList: {
    backgroundColor: '#1A1A2E', borderRadius: 12,
    borderWidth: 1, borderColor: '#2A2A3A',
    marginTop: 4, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#13131A',
  },
  dropdownItemActive: { backgroundColor: 'rgba(22,216,105,0.08)' },
  dropdownItemText: { color: '#CCCCCC', fontSize: 14 },
  dropdownItemTextActive: { color: '#16D869' },

  /* Bottom Buttons */
  bottomBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center',
  },
  cancelText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  doneBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: '#C2B5CD', justifyContent: 'center', alignItems: 'center',
  },
  doneText: { color: '#0e0d12', fontSize: 15, fontWeight: '700' },
});
