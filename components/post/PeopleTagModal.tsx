import { Feather } from '@expo/vector-icons';
import { getFriendUsers } from '@/lib/users';
import React, { useState } from 'react';
import {
  FlatList, Modal, Platform, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import UserAvatar from '../ui/UserAvatar';

type Friend = {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (names: string[]) => void;
  selected: string[];
};

export default function PeopleTagModal({ visible, onClose, onSelect, selected }: Props) {
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<string[]>(selected);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Sync if parent resets
  React.useEffect(() => {
    setLocalSelected(selected);
  }, [visible, selected]);

  React.useEffect(() => {
    let isMounted = true;

    if (!visible) {
      return () => {
        isMounted = false;
      };
    }

    getFriendUsers(undefined, 100)
      .then((users) => {
        if (!isMounted) {
          return;
        }

        setFriends(users.map((user) => ({
          id: user.id,
          name: user.name,
          handle: user.username ? `@${user.username}` : '@xenog',
          avatar: user.avatarUrl ?? null,
        })));
      })
      .catch(() => {
        if (isMounted) {
          setFriends([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const normalizedSearch = search.trim().toLowerCase().replace(/^@/, '');
  const filtered = friends.filter(p =>
    p.name.toLowerCase().includes(normalizedSearch) ||
    p.handle.toLowerCase().replace(/^@/, '').includes(normalizedSearch)
  );

  // Fire immediately so author row updates in real-time
  const toggle = (name: string) => {
    const next = localSelected.includes(name)
      ? localSelected.filter(n => n !== name)
      : [...localSelected, name];
    setLocalSelected(next);
    onSelect(next); // ← instant update to parent
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
              placeholderTextColor="#B3B3B3"
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
            renderItem={({ item }) => {
              const isAdded = localSelected.includes(item.name);
              return (
                <View style={styles.personRow}>
                  {/* Avatar */}
                  <UserAvatar uri={item.avatar} name={item.name} size={52} style={styles.avatar} />

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

  /* Title */
  title: {
    color: '#FFFFFF', fontWeight: 'bold',
    fontSize: 18, textAlign: 'center', marginBottom: 16,
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

});
