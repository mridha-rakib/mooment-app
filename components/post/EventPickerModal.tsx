import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getMyPostTagEvents, type PostTagEvent, type PostTagEventStatus } from '@/lib/events';

type SelectedEvent = {
  id: string;
  title: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (event: SelectedEvent) => void;
};

const STATUS_CONFIG: Record<PostTagEventStatus, { label: string; color: string; bg: string; dot: boolean }> = {
  live:     { label: 'Live',     color: '#16D869', bg: 'rgba(22,216,105,0.12)', dot: true },
  active:   { label: 'Active',   color: '#16D869', bg: 'transparent',           dot: false },
  upcoming: { label: 'Upcoming', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  dot: false },
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop';
const ANDROID_NAV_FALLBACK = 48;

function formatEventMeta(event: PostTagEvent): string {
  const parts: string[] = [];

  if (event.location?.venue) {
    parts.push(event.location.venue);
  } else if (event.location?.address) {
    parts.push(event.location.address);
  }

  if (event.scheduledAt) {
    const date = new Date(event.scheduledAt);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayLabel = isToday ? 'Tonight' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    parts.push(`${dayLabel} • ${timeLabel}`);
  }

  return parts.join(' • ');
}

export default function EventPickerModal({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<PostTagEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, ANDROID_NAV_FALLBACK)
    : insets.bottom;

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);

    getMyPostTagEvents()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filtered = events.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.location?.venue ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (event: PostTagEvent) => {
    setSelectedId(event.id);
    onSelect({ id: event.id, title: event.name });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: bottomInset + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Events</Text>

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

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#8E54E9" size="small" />
            </View>
          ) : filtered.length > 0 ? (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.eventList}
              contentContainerStyle={styles.eventListContent}
              renderItem={({ item }) => {
                const cfg = STATUS_CONFIG[item.postTagStatus];
                const isSelected = selectedId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.eventRow, isSelected && styles.eventRowSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.bannerImageUrl ?? FALLBACK_IMAGE }}
                      style={styles.eventImage}
                    />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.eventMeta} numberOfLines={1}>{formatEventMeta(item)}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { borderColor: cfg.color + (item.postTagStatus === 'live' ? '00' : '55') },
                      item.postTagStatus !== 'live' && { borderWidth: 1 },
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                You have no active or upcoming events to tag. Create an event first.
              </Text>
              <TouchableOpacity style={styles.browseBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.browseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
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

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#454555',
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  eventList: {
    maxHeight: 400,
  },
  eventListContent: {
    paddingBottom: 8,
  },

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
