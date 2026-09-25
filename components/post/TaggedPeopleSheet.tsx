import { Feather } from '@expo/vector-icons';
import React, { useMemo, useRef } from 'react';
import { Animated, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomSheetDragDismiss } from '@/components/ui/useBottomSheetDragDismiss';
import { useTheme } from '@/hooks/useTheme';
import type { MomentAuthor } from '@/lib/moments';
import { dedupeTaggedPeople, getTaggedFriendName } from '@/lib/taggedPeople';
import UserAvatar from '../ui/UserAvatar';

const ANDROID_NAV_FALLBACK = 48;

type Props = {
  visible: boolean;
  // Already-loaded tagged users (e.g. share.taggedFriends). The sheet never
  // fetches — it renders exactly what it is given, in the order given.
  people: MomentAuthor[];
  onClose: () => void;
  // Row tap delegate. RepostFeedCard passes its existing `openTaggedProfile`
  // so navigation reuses the shared `navigateToProfile` helper unchanged.
  onPressPerson: (person: MomentAuthor) => void;
  title?: string;
};

// Read-only bottom sheet listing every person tagged on a share/repost.
// - zero network requests (consumes the passed `people` array as-is)
// - preserves the authoritative order; defensively dedupes by id
// - each row delegates to the caller's profile navigation
export default function TaggedPeopleSheet({ visible, people, onClose, onPressPerson, title = 'Tagged People' }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const listOffsetYRef = useRef(0);

  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, ANDROID_NAV_FALLBACK)
    : insets.bottom;

  const { sheetTranslateY, dragPanHandlers, contentPanHandlers } = useBottomSheetDragDismiss({
    visible,
    onClose,
    canStartContentDrag: () => listOffsetYRef.current <= 0,
  });

  // Defensive dedupe by id, first occurrence wins, original array untouched.
  const uniquePeople = useMemo(() => dedupeTaggedPeople(people), [people]);

  const heading = uniquePeople.length > 0 ? `${title} (${uniquePeople.length})` : title;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Close tagged people" />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: bottomInset + 16,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View {...dragPanHandlers}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>{heading}</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View {...contentPanHandlers}>
            <FlatList
              data={uniquePeople}
              keyExtractor={(item, index) => item.id || `${getTaggedFriendName(item)}-${index}`}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              scrollEventThrottle={16}
              onScroll={(event) => {
                listOffsetYRef.current = event.nativeEvent.contentOffset.y;
              }}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.textSecondary }]}>No tagged people</Text>
              }
              renderItem={({ item }) => {
                const name = getTaggedFriendName(item);
                return (
                  <TouchableOpacity
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => {
                      onPressPerson(item);
                      onClose();
                    }}
                    disabled={!item.id}
                    accessibilityRole="button"
                    accessibilityLabel={name}
                  >
                    <UserAvatar uri={item.avatarUrl} name={name} size={44} style={styles.avatar} />
                    <View style={styles.rowText}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                      {item.username ? (
                        <Text style={[styles.handleText, { color: colors.textSecondary }]} numberOfLines={1}>
                          @{item.username}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '80%',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  list: {
    marginTop: 4,
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
  },
  handleText: {
    fontSize: 13,
    marginTop: 2,
  },
});
