import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CinematicButton from '@/components/ui/CinematicButton';
import UserAvatar from '@/components/ui/UserAvatar';
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { createGroup, getDirectMessageConversations } from '@/lib/chat';
import type { DirectMessageConversationResponse } from '@/lib/chat';
import { uploadFileToStorage } from '@/lib/storage';

export default function CreateGroupScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<DirectMessageConversationResponse[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);
  const [pendingAvatarKey, setPendingAvatarKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadFriends = async () => {
      setIsFriendsLoading(true);
      setFriendsError(null);

      try {
        const dms = await getDirectMessageConversations();

        if (isMounted) {
          setFriends(dms);
        }
      } catch {
        if (isMounted) {
          setFriendsError('Unable to load friends. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsFriendsLoading(false);
        }
      }
    };

    void loadFriends();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      friend.name.toLowerCase().includes(q) ||
      (friend.username ?? '').toLowerCase().includes(q)
    );
  });

  const toggleUser = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  }, []);

  const handleContinue = () => {
    if (selectedIds.length === 0) {
      Alert.alert('No Members Selected', 'Please select at least one friend to add to the group.');
      return;
    }
    setIsModalVisible(true);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to set a group image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const extension = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
    const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
    const key = `groups/avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    setPendingAvatarUri(asset.uri);
    setIsUploadingImage(true);

    try {
      const uploadedKey = await uploadFileToStorage({ uri: asset.uri, key, contentType });
      setPendingAvatarKey(uploadedKey);
    } catch {
      Alert.alert('Upload Failed', 'Unable to upload the group image. You can still create the group without one.');
      setPendingAvatarUri(null);
      setPendingAvatarKey(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      Alert.alert('Group Name Required', 'Please enter a name for your group.');
      return;
    }

    setIsCreating(true);

    try {
      await createGroup({
        name: trimmedName,
        memberIds: selectedIds,
        avatarKey: pendingAvatarKey ?? null,
      });

      setIsModalVisible(false);
      router.back();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Unable to create the group. Please try again.';
      Alert.alert('Creation Failed', message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDismissModal = () => {
    if (isCreating || isUploadingImage) return;
    setIsModalVisible(false);
  };

  const renderFriend = ({ item }: { item: DirectMessageConversationResponse }) => {
    const isSelected = selectedIds.includes(item.friendId);

    return (
      <View style={styles.contactRow}>
        <UserAvatar uri={item.avatarUrl} name={item.name} size={48} style={[styles.avatar, isSelected && styles.avatarSelected]} />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.username ? (
            <Text style={styles.contactHandle}>@{item.username}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, isSelected && styles.addBtnSelected]}
          onPress={() => toggleUser(item.friendId)}
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

      {/* Header */}
      <View style={styles.header}>
        <CinematicButton onPress={() => router.back()} icon={ArrowLeft01Icon} size={20} />
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Bar */}
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

      {/* Selected count hint */}
      {selectedIds.length > 0 && (
        <Text style={styles.selectionHint}>
          {selectedIds.length} {selectedIds.length === 1 ? 'friend' : 'friends'} selected
        </Text>
      )}

      {/* Friend List */}
      {isFriendsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#D4B0EB" />
        </View>
      ) : friendsError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{friendsError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setFriendsError(null);
              setIsFriendsLoading(true);
              getDirectMessageConversations()
                .then(setFriends)
                .catch(() => setFriendsError('Unable to load friends. Please try again.'))
                .finally(() => setIsFriendsLoading(false));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredFriends.length === 0 ? (
        <View style={styles.centered}>
          <Feather name="users" size={40} color="#333" />
          <Text style={styles.emptyText}>
            {searchQuery.trim() ? 'No friends match your search' : 'No mutual friends found'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.friendId}
          renderItem={renderFriend}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomCancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.bottomCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomContinueBtn, selectedIds.length === 0 && styles.bottomContinueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.8}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.bottomContinueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Create Group Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleDismissModal}
          />

          <View style={styles.modalSheet}>
            <View style={styles.dragHandleWrap}>
              <View style={styles.dragHandle} />
            </View>

            <Text style={styles.modalTitle}>Group Name</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Name your group"
              placeholderTextColor="#454555"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              returnKeyType="done"
            />

            {/* Image preview or upload button */}
            {pendingAvatarUri ? (
              <TouchableOpacity
                style={styles.avatarPreviewWrap}
                onPress={isUploadingImage ? undefined : handlePickImage}
                activeOpacity={0.8}
              >
                <Image source={{ uri: pendingAvatarUri }} style={styles.avatarPreview} />
                {isUploadingImage ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#FFF" />
                  </View>
                ) : (
                  <View style={styles.avatarOverlay}>
                    <Feather name="edit-2" size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={isUploadingImage ? undefined : handlePickImage}
                activeOpacity={0.8}
              >
                {isUploadingImage ? (
                  <ActivityIndicator color="#0e0d12" style={{ marginRight: 8 }} />
                ) : (
                  <Feather name="arrow-up-circle" size={18} color="#0e0d12" style={styles.uploadIcon} />
                )}
                <Text style={styles.uploadBtnText}>
                  {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleDismissModal}
                activeOpacity={0.8}
                disabled={isCreating}
              >
                <Text style={[styles.modalCancelText, isCreating && { opacity: 0.4 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateBtn, isCreating && { opacity: 0.7 }]}
                onPress={handleCreate}
                activeOpacity={0.8}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#0e0d12" size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 20,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

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
    marginBottom: 12,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14 },

  selectionHint: {
    color: '#D4B0EB',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  emptyText: { color: '#8E8E9B', fontSize: 14, textAlign: 'center' },

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

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: '#0e0d12',
    gap: 12,
  },
  bottomCancelBtn: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomCancelText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  bottomContinueBtn: {
    flex: 1,
    backgroundColor: '#B2ABBA',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  bottomContinueBtnDisabled: { opacity: 0.4 },
  bottomContinueText: { color: '#0e0d12', fontSize: 15, fontWeight: 'bold' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#2A2A3A',
  },
  dragHandleWrap: { alignItems: 'center', marginBottom: 20 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A3A' },

  modalTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 16,
  },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C2B5CD',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 32,
  },
  uploadIcon: { marginRight: 8 },
  uploadBtnText: { color: '#0e0d12', fontSize: 14, fontWeight: '600' },

  avatarPreviewWrap: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 32,
    overflow: 'hidden',
  },
  avatarPreview: { width: 80, height: 80, borderRadius: 40 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalCreateBtn: {
    flex: 1,
    backgroundColor: '#C2B5CD',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCreateText: { color: '#0e0d12', fontSize: 14, fontWeight: 'bold' },
});
