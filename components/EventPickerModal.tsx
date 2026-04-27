import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList, Image, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

type EventStatus = 'live' | 'active' | 'upcoming';

const MOCK_EVENTS = [
  {
    id: '1',
    title: 'Rooftop Session Vol 4',
    organizer: 'DJ Kojo',
    time: 'Tonight • 9pm',
    distance: '0.3mi',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop',
    status: 'live' as EventStatus,
  },
  {
    id: '2',
    title: 'Rooftop Session Vol 4',
    organizer: 'DJ Kojo',
    time: 'Tonight • 9pm',
    distance: '0.3mi',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=200&auto=format&fit=crop',
    status: 'active' as EventStatus,
  },
  {
    id: '3',
    title: 'Rooftop Session Vol 4',
    organizer: 'DJ Kojo',
    time: 'Tonight • 9pm',
    distance: '0.3mi',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=200&auto=format&fit=crop',
    status: 'upcoming' as EventStatus,
  },
  {
    id: '4',
    title: 'Jazz Night at the Loft',
    organizer: 'Blue Note',
    time: 'Tomorrow • 8pm',
    distance: '1.1mi',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=200&auto=format&fit=crop',
    status: 'upcoming' as EventStatus,
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (eventTitle: string) => void;
};

// Status badge configs
const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; dot: boolean }> = {
  live:     { label: 'Live',     color: '#16D869', bg: 'rgba(22,216,105,0.12)', dot: true },
  active:   { label: 'Active',   color: '#16D869', bg: 'transparent',           dot: false },
  upcoming: { label: 'Upcoming', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  dot: false },
};

export default function EventPickerModal({ visible, onClose, onSelect }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = MOCK_EVENTS.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.organizer.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string, title: string) => {
    setSelectedId(id);
    onSelect(title);  // immediately update parent
    onClose();        // close modal
    router.push({ pathname: '/event-details', params: { id, title } });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        {/* Tap outside to close */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Title */}
          <Text style={styles.title}>Events</Text>

          {/* Search */}
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color="#454555" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events"
              placeholderTextColor="#B3B3B3"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.8}>
                <Feather name="x" size={15} color="#454555" />
              </TouchableOpacity>
            )}
          </View>

          {/* Event list OR empty state */}
          {filtered.length > 0 ? (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const cfg = STATUS_CONFIG[item.status];
                const isSelected = selectedId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.eventRow, isSelected && styles.eventRowSelected]}
                    onPress={() => handleSelect(item.id, item.title)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: item.image }} style={styles.eventImage} />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.eventMeta}>
                        {item.organizer} • {item.time} • {item.distance}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { borderColor: cfg.color + (item.status === 'live' ? '00' : '55') },
                      item.status !== 'live' && { borderWidth: 1 },
                      { backgroundColor: cfg.bg },
                    ]}>
                      {cfg.dot && <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />}
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            /* ── Empty State ── */
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Currently you did not buy any ticket, browse events to book
              </Text>
              <TouchableOpacity style={styles.browseBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.browseBtnText}>Browse Event</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    width: 80, height: 3, borderRadius: 2,
    backgroundColor: '#ffff',
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    color: '#FFFFFF', fontWeight: 'bold',
    fontSize: 18, textAlign: 'center', marginBottom: 14,
  },

  /* Search */
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#454555',
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  /* List */
  separator: { height: 1, backgroundColor: '#1A1A2E' },
  eventRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 2,
  },
  eventRowSelected: {
    backgroundColor: 'rgba(212,176,235,0.06)',
    borderRadius: 10,
  },
  eventImage: {
    width: 52, height: 52, borderRadius: 10, marginRight: 12,
    borderWidth: 1.5, borderColor: '#8E54E9',
  },
  eventInfo: { flex: 1 },
  eventTitle: {
    color: '#FFFFFF', fontWeight: '700',
    fontSize: 14, marginBottom: 4,
  },
  eventMeta: { color: '#8E8E9B', fontSize: 12 },

  /* Status badge */
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, gap: 5,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  statusText: {
    fontSize: 12, fontWeight: '700',
  },

  /* Empty state */
  emptyState: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 18,
  },
  emptyText: {
    color: '#8E8E9B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  browseBtn: {
    backgroundColor: '#2A2A3A',
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 20,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
