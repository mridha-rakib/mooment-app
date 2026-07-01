import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { getDirectMessageConversations, sendDirectMessage, type DirectMessageConversationResponse } from '@/lib/chat';
import type { RepostPayload } from '@/lib/moments';
import UserAvatar from '../ui/UserAvatar';

export type ShareItem = {
  type: 'post' | 'event';
  id: string;
  preview?: string | null;
  imageUrl?: string | null;
  authorName?: string | null;
  canShareToChat?: boolean;
  categoryLabels?: string[];
  dateTimeLabel?: string | null;
  locationLabel?: string | null;
};

type ShareAction = 'repost' | 'copy' | 'whatsapp' | 'facebook' | 'instagram' | 'messenger' | 'more';

const feedback = (message: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert('', message);
};

export default function ShareModal({ visible, onClose, onRepost, shareUrl, item }: {
  visible: boolean;
  onClose: () => void;
  onRepost?: (payload: RepostPayload) => Promise<void> | void;
  shareUrl?: string;
  item?: ShareItem;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<DirectMessageConversationResponse[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState(false);
  const [pendingFriendId, setPendingFriendId] = useState<string | null>(null);
  const [sentFriendIds, setSentFriendIds] = useState<Set<string>>(new Set());
  const [isReposting, setIsReposting] = useState(false);
  const [showRepostComposer, setShowRepostComposer] = useState(false);
  const [repostCaption, setRepostCaption] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [taggedFriendIds, setTaggedFriendIds] = useState<Set<string>>(new Set());
  const shareRequestIds = useRef(new Map<string, string>());
  const repostRequestId = useRef<string | null>(null);
  const repostSubmittingRef = useRef(false);
  const itemId = item?.id;
  const itemType = item?.type;

  const loadFriends = useCallback(() => {
    setIsLoadingFriends(true);
    setFriendsError(false);
    getDirectMessageConversations({ includeHidden: true })
      .then(setConversations)
      .catch(() => {
        setConversations([]);
        setFriendsError(true);
      })
      .finally(() => setIsLoadingFriends(false));
  }, []);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setTagQuery('');
    setRepostCaption('');
    setTaggedFriendIds(new Set());
    setShowRepostComposer(false);
    setSentFriendIds(new Set());
    repostRequestId.current = itemId && itemType ? `repost:${itemType}:${itemId}:${Date.now()}` : null;
    loadFriends();
  }, [itemId, itemType, loadFriends, visible]);

  const filteredFriends = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return conversations.filter((conversation) => !normalized
      || conversation.name.toLowerCase().includes(normalized)
      || conversation.username?.toLowerCase().includes(normalized));
  }, [conversations, query]);

  const filteredTagFriends = useMemo(() => {
    const normalized = tagQuery.trim().toLowerCase();
    return conversations.filter((conversation) => !conversation.isBlocked && (!normalized
      || conversation.name.toLowerCase().includes(normalized)
      || conversation.username?.toLowerCase().includes(normalized)));
  }, [conversations, tagQuery]);

  const nativeShare = async () => {
    await Share.share({ message: shareUrl ?? 'https://mooment.app', url: shareUrl });
  };

  const copyLink = async () => {
    const link = shareUrl ?? 'https://mooment.app';
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(link);
      feedback('Link copied');
    } catch {
      try {
        await Share.share({ message: link, url: link });
      } catch {
        feedback('Unable to copy link');
      }
    }
  };

  const handleAction = async (action: ShareAction) => {
    if (action === 'repost') {
      if (!onRepost || isReposting) return;
      setShowRepostComposer(true);
      return;
    }

    if (action === 'copy') {
      await copyLink();
      return;
    }

    const encodedUrl = encodeURIComponent(shareUrl ?? 'https://mooment.app');
    const targets: Partial<Record<ShareAction, string>> = {
      whatsapp: `whatsapp://send?text=${encodedUrl}`,
      facebook: `fb://facewebmodal/f?href=${encodedUrl}`,
      messenger: `fb-messenger://share?link=${encodedUrl}`,
    };

    try {
      const target = targets[action];
      if (target && await Linking.canOpenURL(target)) {
        await Linking.openURL(target);
        return;
      }
      await nativeShare();
    } catch {
      try { await nativeShare(); } catch { feedback('Unable to share'); }
    }
  };

  const submitRepost = async () => {
    if (!onRepost || repostSubmittingRef.current) return;
    repostSubmittingRef.current = true;
    setIsReposting(true);
    try {
      await onRepost({
        caption: repostCaption.trim() || null,
        taggedFriendIds: [...taggedFriendIds],
        clientRequestId: repostRequestId.current,
      });
      feedback('Reposted successfully');
      setShowRepostComposer(false);
    } catch (error) {
      feedback(getAuthErrorMessage(error, 'Unable to repost'));
    } finally {
      repostSubmittingRef.current = false;
      setIsReposting(false);
    }
  };

  const toggleTaggedFriend = (friendId: string) => {
    setTaggedFriendIds((current) => {
      const next = new Set(current);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleFriendPress = async (friend: DirectMessageConversationResponse) => {
    if (!item || pendingFriendId || sentFriendIds.has(friend.friendId)) return;
    if (item.canShareToChat === false) {
      feedback(`This private ${item.type} cannot be shared to chat`);
      return;
    }
    if (friend.isBlocked) {
      feedback('You cannot share to this conversation');
      return;
    }

    const key = `${item.type}:${item.id}:${friend.friendId}`;
    const clientMessageId = shareRequestIds.current.get(key)
      ?? `share:${item.type}:${item.id}:${friend.friendId}:${Date.now()}`;
    shareRequestIds.current.set(key, clientMessageId);
    setPendingFriendId(friend.friendId);

    try {
      await sendDirectMessage(friend.friendId, {
        type: item.type,
        text: item.preview?.trim().slice(0, 2000) || undefined,
        attachment: item.type === 'event'
          ? { type: 'event', eventId: item.id }
          : { type: 'post', postId: item.id },
        clientMessageId,
      });
      setSentFriendIds((current) => new Set(current).add(friend.friendId));
      feedback(`Shared to ${friend.name}`);
    } catch (error) {
      feedback(getAuthErrorMessage(error, 'Unable to share to this conversation'));
    } finally {
      setPendingFriendId(null);
    }
  };

  const actions: { id: ShareAction; name: string; icon: React.ReactNode }[] = [
    { id: 'repost', name: isReposting ? 'Posting...' : 'Repost', icon: <Feather name="repeat" size={24} color={colors.text} /> },
    { id: 'copy', name: 'Copy Link', icon: <Feather name="link" size={24} color={colors.text} /> },
    { id: 'whatsapp', name: 'WhatsApp', icon: <Ionicons name="logo-whatsapp" size={27} color="#25D366" /> },
    { id: 'facebook', name: 'Facebook', icon: <Ionicons name="logo-facebook" size={27} color="#1877F2" /> },
    { id: 'instagram', name: 'Instagram', icon: <Ionicons name="logo-instagram" size={27} color="#E1306C" /> },
    { id: 'messenger', name: 'Messenger', icon: <Ionicons name="chatbubble-ellipses" size={25} color="#00B2FF" /> },
    { id: 'more', name: 'More', icon: <Feather name="more-horizontal" size={25} color={colors.text} /> },
  ];
  const sheetBottomPadding = Math.max(insets.bottom + 18, Platform.OS === 'ios' ? 34 : 44);
  const composerBottomPadding = sheetBottomPadding + 8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: sheetBottomPadding }]}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>{showRepostComposer ? 'Repost' : 'Share to...'}</Text>
          {showRepostComposer ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.composer, { paddingBottom: composerBottomPadding }]}>
              <TextInput
                value={repostCaption}
                onChangeText={setRepostCaption}
                placeholder="Say something about this..."
                placeholderTextColor={colors.textSecondary}
                maxLength={2000}
                multiline
                style={[styles.captionInput, { color: colors.text, borderColor: colors.border }]}
              />
              <View style={[styles.preview, { borderColor: colors.border }]}>
                {item?.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.previewImage} resizeMode="cover" /> : (
                  <View style={[styles.previewImage, styles.previewFallback]}><Feather name={item?.type === 'event' ? 'calendar' : 'image'} size={26} color={colors.textSecondary} /></View>
                )}
                <View style={styles.previewText}>
                  <Text style={[styles.previewType, { color: colors.primary }]}>{item?.type === 'event' ? 'EVENT' : 'POST'}</Text>
                  <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={2}>{item?.preview || 'Original item'}</Text>
                  <Text style={[styles.previewMeta, { color: colors.textSecondary }]} numberOfLines={2}>
                    {[item?.authorName, item?.dateTimeLabel, item?.locationLabel].filter(Boolean).join(' · ')}
                  </Text>
                  {!!item?.categoryLabels?.length && <Text style={[styles.previewMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.categoryLabels.join(' · ')}</Text>}
                </View>
              </View>
              <Text style={[styles.tagTitle, { color: colors.text }]}>Tag friends</Text>
              <View style={[styles.search, styles.tagSearch, { borderColor: colors.border }]}>
                <Feather name="search" size={18} color={colors.textSecondary} />
                <TextInput value={tagQuery} onChangeText={setTagQuery} style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search friends" placeholderTextColor={colors.textSecondary} />
              </View>
              {isLoadingFriends ? <ActivityIndicator color={colors.primary} /> : friendsError ? (
                <TouchableOpacity onPress={loadFriends}><Text style={[styles.empty, { color: colors.primary }]}>Unable to load friends. Tap to retry.</Text></TouchableOpacity>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
                  {filteredTagFriends.map((friend) => {
                    const selected = taggedFriendIds.has(friend.friendId);
                    return (
                      <TouchableOpacity key={friend.friendId} style={[styles.tagChip, { borderColor: selected ? colors.primary : colors.border }]} onPress={() => toggleTaggedFriend(friend.friendId)}>
                        <UserAvatar uri={friend.avatarUrl} name={friend.name} size={26} />
                        <Text style={[styles.tagChipText, { color: colors.text }]} numberOfLines={1}>{friend.username || friend.name}</Text>
                        {selected && <Feather name="check" size={14} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.composerActions}>
                <TouchableOpacity style={[styles.composerButton, { borderColor: colors.border }]} disabled={isReposting} onPress={() => setShowRepostComposer(false)}>
                  <Text style={{ color: colors.text }}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.composerButton, styles.postButton, { backgroundColor: colors.primary }]} disabled={isReposting} onPress={submitRepost}>
                  {isReposting ? <ActivityIndicator color="#111" /> : <Text style={styles.postButtonText}>Repost</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : <>
          <View style={[styles.search, { borderColor: colors.border }]}>
            <Feather name="search" size={19} color={colors.textSecondary} />
            <TextInput value={query} onChangeText={setQuery} style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search" placeholderTextColor={colors.textSecondary} returnKeyType="search" />
          </View>

          <View style={styles.friendsArea}>
            {isLoadingFriends ? <ActivityIndicator color={colors.primary} /> : filteredFriends.length ? (
              <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {filteredFriends.map((friend) => {
                  const pending = pendingFriendId === friend.friendId;
                  const sent = sentFriendIds.has(friend.friendId);
                  return (
                    <TouchableOpacity key={friend.friendId} style={styles.item} disabled={Boolean(pendingFriendId) || sent}
                      onPress={() => handleFriendPress(friend)} activeOpacity={0.75}>
                      <View style={[styles.avatarRing, { borderColor: sent ? '#25D366' : colors.primary }]}>
                        <UserAvatar uri={friend.avatarUrl} name={friend.name} size={52} />
                        {(pending || sent) && <View style={styles.statusBadge}>
                          {pending ? <ActivityIndicator size="small" color="#111" /> : <Feather name="check" size={13} color="#111" />}
                        </View>}
                      </View>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{friend.username || friend.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : friendsError ? (
              <TouchableOpacity onPress={loadFriends}><Text style={[styles.empty, { color: colors.primary }]}>Unable to load friends. Tap to retry.</Text></TouchableOpacity>
            ) : <Text style={[styles.empty, { color: colors.textSecondary }]}>{query ? 'No conversations found' : 'No friends available'}</Text>}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, styles.actionsRow]}>
            {actions.map((action) => (
              <TouchableOpacity key={action.id} style={[styles.item, action.id === 'repost' && (!onRepost || isReposting) && styles.disabled]}
                disabled={action.id === 'repost' && (!onRepost || isReposting)} onPress={() => handleAction(action.id)} activeOpacity={0.75}>
                <View style={[styles.actionIcon, { borderColor: colors.border }]}>{action.icon}</View>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          </>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.68)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 11, maxHeight: '84%' },
  grabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  search: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, borderRadius: 12, marginHorizontal: 24, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  friendsArea: { minHeight: 126, justifyContent: 'center', marginTop: 22 },
  row: { paddingHorizontal: 18, alignItems: 'flex-start' },
  actionsRow: { paddingTop: 14 },
  item: { width: 84, alignItems: 'center' },
  avatarRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statusBadge: { position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  itemName: { width: 80, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  actionIcon: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  disabled: { opacity: 0.45 },
  empty: { textAlign: 'center', fontSize: 13 },
  composer: { paddingHorizontal: 20, gap: 14 },
  captionInput: { minHeight: 90, maxHeight: 150, borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, textAlignVertical: 'top' },
  preview: { minHeight: 96, borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', gap: 12 },
  previewImage: { width: 72, height: 72, borderRadius: 6 },
  previewFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181D' },
  previewText: { flex: 1, justifyContent: 'center', gap: 3 },
  previewType: { fontSize: 10, fontWeight: '800' },
  previewTitle: { fontSize: 14, fontWeight: '700' },
  previewMeta: { fontSize: 11, lineHeight: 15 },
  tagTitle: { fontSize: 14, fontWeight: '700' },
  tagSearch: { marginHorizontal: 0, marginBottom: 0, height: 44 },
  tagRow: { gap: 8, paddingRight: 8 },
  tagChip: { height: 40, maxWidth: 150, borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagChipText: { maxWidth: 82, fontSize: 12 },
  composerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  composerButton: { flex: 1, height: 46, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  postButton: { borderWidth: 0 },
  postButtonText: { color: '#111', fontSize: 14, fontWeight: '800' },
});
