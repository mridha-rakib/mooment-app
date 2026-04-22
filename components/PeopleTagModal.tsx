import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, Image, TextInput, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const MOCK_PEOPLE = [
  { id: '1', name: 'Brooklyn Simmons', handle: '@brooklyn_s', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Ketty Perera', handle: '@kettyp', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Tuval Mor', handle: '@tuvalm', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop' },
  { id: '4', name: 'Giden Xenog', handle: '@gidenx', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop' },
  { id: '5', name: 'Dj Koko', handle: '@djkoko', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop' },
  { id: '6', name: 'Mavrick Rick', handle: '@mavrick_r', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
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

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tag People</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Feather name="x" size={22} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          {/* Selected Pills */}
          {localSelected.length > 0 && (
            <View style={styles.pillsRow}>
              {localSelected.map(name => (
                <TouchableOpacity
                  key={name}
                  style={styles.pill}
                  onPress={() => toggle(name)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pillText}>{name}</Text>
                  <Feather name="x" size={11} color="#D4B0EB" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search */}
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color="#454555" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor="#454555"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* People List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const isSelected = localSelected.includes(item.name);
              return (
                <TouchableOpacity
                  style={[styles.personRow, isSelected && styles.personRowSelected]}
                  onPress={() => toggle(item.name)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                  <View style={styles.personInfo}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.personHandle}>{item.handle}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Feather name="check" size={13} color="#0e0d12" />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Confirm */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, localSelected.length === 0 && styles.confirmBtnDisabled]}
              onPress={() => onSelect(localSelected)}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>
                {localSelected.length > 0 ? `Tag ${localSelected.length} People` : 'Tag People'}
              </Text>
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
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(212,176,235,0.15)', borderWidth: 1, borderColor: 'rgba(212,176,235,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  pillText: { color: '#D4B0EB', fontSize: 12, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },
  separator: { height: 1, backgroundColor: '#1A1A2E' },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  personRowSelected: { backgroundColor: 'rgba(212,176,235,0.06)' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  personInfo: { flex: 1 },
  personName: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  personHandle: { color: '#8E8E9B', fontSize: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#454555', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#D4B0EB', borderColor: '#D4B0EB' },
  footer: { paddingHorizontal: 16, paddingTop: 16 },
  confirmBtn: { backgroundColor: '#D4B0EB', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#0e0d12', fontWeight: 'bold', fontSize: 15 },
});
