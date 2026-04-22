import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, Image, TextInput, Platform,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const MOCK_EVENTS = [
  { id: '1', title: 'Rooftop Session Vol.4', date: 'Sat, Sep 9 • 9:00 PM', location: '0.3mi away', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop', tag: 'Music Party', isLive: true },
  { id: '2', title: 'Jazz Night at the Loft', date: 'Sun, Sep 10 • 8:00 PM', location: '1.1mi away', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=200&auto=format&fit=crop', tag: 'Jazz', isLive: false },
  { id: '3', title: 'City Vibes Block Party', date: 'Fri, Sep 15 • 6:00 PM', location: '2.0mi away', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=200&auto=format&fit=crop', tag: 'Street', isLive: false },
  { id: '4', title: 'Deep House Underground', date: 'Sat, Sep 16 • 10:00 PM', location: '0.8mi away', image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=200&auto=format&fit=crop', tag: 'Club', isLive: false },
];

type Event = typeof MOCK_EVENTS[0];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (eventTitle: string) => void;
};

export default function EventPickerModal({ visible, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = MOCK_EVENTS.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Events</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color="#454555" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              placeholderTextColor="#454555"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.eventRow, selected === item.id && styles.eventRowSelected]}
                onPress={() => setSelected(item.id)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image }} style={styles.eventImage} />
                <View style={styles.eventInfo}>
                  <View style={styles.eventTopRow}>
                    <View style={styles.eventTagPill}>
                      <Text style={styles.eventTagText}>{item.tag}</Text>
                    </View>
                    {item.isLive && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.eventMeta}>{item.date}</Text>
                  <Text style={styles.eventMeta}>{item.location}</Text>
                </View>
                <View style={[styles.radioOuter, selected === item.id && styles.radioOuterActive]}>
                  {selected === item.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Confirm */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
              onPress={() => {
                const ev = MOCK_EVENTS.find(e => e.id === selected);
                if (ev) onSelect(ev.title);
              }}
              activeOpacity={0.8}
              disabled={!selected}
            >
              <Text style={styles.confirmText}>Link Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#13131A', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A3A', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  separator: { height: 1, backgroundColor: '#1A1A2E' },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  eventRowSelected: { backgroundColor: 'rgba(212,176,235,0.06)' },
  eventImage: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  eventTagPill: { backgroundColor: 'rgba(212,176,235,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  eventTagText: { color: '#D4B0EB', fontSize: 10, fontWeight: '600' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,216,105,0.12)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, gap: 4 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#16D869' },
  liveText: { color: '#16D869', fontSize: 10, fontWeight: '700' },
  eventTitle: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  eventMeta: { color: '#8E8E9B', fontSize: 11 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#454555', justifyContent: 'center', alignItems: 'center' },
  radioOuterActive: { borderColor: '#D4B0EB' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D4B0EB' },
  footer: { paddingHorizontal: 16, paddingTop: 16 },
  confirmBtn: { backgroundColor: '#D4B0EB', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 15 },
});
