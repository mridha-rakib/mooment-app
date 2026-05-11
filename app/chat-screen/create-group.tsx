import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList, Image, KeyboardAvoidingView,
  Modal,
  Platform, SafeAreaView,
  StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import CinematicButton from '@/components/ui/CinematicButton';
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

const MOCK_CONTACTS = [
  { id: '1', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' },
  { id: '2', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
  { id: '3', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['1']); // Pre-select first one to match screenshot
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');

  const toggleUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(prev => prev.filter(u => u !== id));
    } else {
      setSelectedUsers(prev => [...prev, id]);
    }
  };

  const handleContinue = () => {
    if (selectedUsers.length > 0) {
      setIsModalVisible(true);
    }
  };

  const handleCreate = () => {
    setIsModalVisible(false);
    router.back();
  };

  const renderContact = ({ item }: { item: typeof MOCK_CONTACTS[0] }) => {
    const isSelected = selectedUsers.includes(item.id);
    return (
      <View style={styles.contactRow}>
        <Image
          source={{ uri: item.avatar }}
          style={[styles.avatar, isSelected && styles.avatarSelected]}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactHandle}>{item.handle}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, isSelected && styles.addBtnSelected]}
          onPress={() => toggleUser(item.id)}
          activeOpacity={0.8}
        >
          <Text style={[styles.addBtnText, isSelected && styles.addBtnTextSelected]}>
            {isSelected ? 'Added' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <CinematicButton
          onPress={() => router.back()}
          icon={ArrowLeft01Icon}
          size={20}
        />
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={{ width: 36 }} /> {/* placeholder for centering */}
      </View>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color="#8E8E9B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#8E8E9B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── Contact List ── */}
      <FlatList
        data={MOCK_CONTACTS}
        keyExtractor={item => item.id}
        renderItem={renderContact}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* ── Bottom Action Bar ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomCancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.bottomCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomContinueBtn} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.bottomContinueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* ── Create Group Modal ── */}
      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsModalVisible(false)} />

          <View style={styles.modalSheet}>
            <View style={styles.dragHandleWrap}>
              <View style={styles.dragHandle} />
            </View>

            <Text style={styles.modalTitle}>Group Name</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              placeholderTextColor="#454555"
              value={groupName}
              onChangeText={setGroupName}
            />

            <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.8}>
              <Feather name="arrow-up-circle" size={18} color="#0e0d12" style={styles.uploadIcon} />
              <Text style={styles.uploadBtnText}>Upload Image</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsModalVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCreateBtn} onPress={handleCreate} activeOpacity={0.8}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12', paddingTop: Platform.OS === 'android' ? 32 : 0 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  /* Search */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 20
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  /* List */
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1A1A2E', marginRight: 14 },
  avatarSelected: { borderWidth: 2, borderColor: '#D4B0EB' },
  contactInfo: { flex: 1 },
  contactName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  contactHandle: { color: '#8E8E9B', fontSize: 12 },
  addBtn: { backgroundColor: '#222222', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  addBtnSelected: { backgroundColor: '#111111' },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  addBtnTextSelected: { color: '#8E8E9B' },
  separator: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', marginLeft: 64 },

  /* Bottom Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: '#0e0d12',
    gap: 12
  },
  bottomCancelBtn: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14
  },
  bottomCancelText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  bottomContinueBtn: {
    flex: 1,
    backgroundColor: '#B2ABBA',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14
  },
  bottomContinueText: { color: '#0e0d12', fontSize: 15, fontWeight: 'bold' },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { backgroundColor: '#13131A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, borderWidth: 1, borderColor: '#2A2A3A' },
  dragHandleWrap: { alignItems: 'center', marginBottom: 20 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A3A' },

  modalTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },

  modalInput: { backgroundColor: '#1A1A2E', borderRadius: 12, color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, marginBottom: 16 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#C2B5CD', borderRadius: 12, paddingVertical: 14, marginBottom: 32 },
  uploadIcon: { marginRight: 8 },
  uploadBtnText: { color: '#0e0d12', fontSize: 14, fontWeight: '600' },

  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalCreateBtn: { flex: 1, backgroundColor: '#C2B5CD', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  modalCreateText: { color: '#0e0d12', fontSize: 14, fontWeight: 'bold' },
});
