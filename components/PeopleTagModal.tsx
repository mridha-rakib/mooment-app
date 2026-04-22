import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList, Image, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

const MOCK_PEOPLE = [
  { id: '1', name: 'Brooklyn Simmons', handle: '@brooklyn_s', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Ketty Perera', handle: '@kettyp', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Dj Koko', handle: '@djkoko', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop' },
  { id: '4', name: 'Tuval Mor', handle: '@tuvalm', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop' },
  { id: '5', name: 'Giden Xenog', handle: '@gidenx', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
  { id: '6', name: 'Mavrick Rick', handle: '@mavrick_r', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
  { id: '7', name: 'Luna Park', handle: '@lunapark', avatar: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=150&auto=format&fit=crop' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (names: string[]) => void;
  selected: string[];
};

export default function PeopleTagModal({ visible, onClose, onSelect, selected }: Props) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  const filtered = MOCK_PEOPLE.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.handle.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (name: string) => {
    setLocalSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleDone = () => {
    onSelect(localSelected);
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
          <Text style={styles.title}>Friend List</Text>

          {/* Search bar */}
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color="#454555" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search with @username or just name"
              placeholderTextColor="#454555"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.8}>
                <Feather name="x" size={16} color="#454555" />
              </TouchableOpacity>
            )}
          </View>

          {/* People list */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 340 }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const isAdded = localSelected.includes(item.name);
              return (
                <View style={styles.personRow}>
                  {/* Avatar */}
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />

                  {/* Info */}
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personHandle}>{item.handle}</Text>
                  </View>

                  {/* Add / Added button */}
                  <TouchableOpacity
                    style={[styles.addBtn, isAdded && styles.addBtnActive]}
                    onPress={() => toggle(item.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.addBtnText, isAdded && styles.addBtnTextActive]}>
                      {isAdded ? 'Added' : 'Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          {/* Done button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.doneBtn, localSelected.length === 0 && styles.doneBtnDisabled]}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>
                {localSelected.length > 0 ? `Done  (${localSelected.length})` : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A3A',
    alignSelf: 'center', marginBottom: 16,
  },

  /* Title */
  title: {
    color: '#FFFFFF', fontWeight: 'bold',
    fontSize: 18, textAlign: 'center', marginBottom: 16,
  },

  /* Search */
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1A1A2E', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  /* List */
  separator: { height: 1, backgroundColor: '#1A1A2E' },
  personRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, marginRight: 12,
  },
  personInfo: { flex: 1 },
  personName: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  personHandle: { color: '#8E8E9B', fontSize: 13 },

  /* Add button — outlined pill, matches screenshot */
  addBtn: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnActive: {
    borderColor: '#D4B0EB',
    backgroundColor: 'rgba(212,176,235,0.12)',
  },
  addBtnText: {
    color: '#FFFFFF', fontWeight: '600', fontSize: 13,
  },
  addBtnTextActive: {
    color: '#D4B0EB',
  },

  /* Footer */
  footer: { paddingTop: 14 },
  doneBtn: {
    backgroundColor: '#D4B0EB',
    paddingVertical: 14, borderRadius: 16, alignItems: 'center',
  },
  doneBtnDisabled: { opacity: 0.4 },
  doneBtnText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 15 },
});
