import { useTheme } from "@/hooks/useTheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { checkDirectMessageAccess } from "@/lib/chat";
import { followUser, unfollowUser } from "@/lib/users";

type ProfileActionsProps = {
  userId?: string;
  userName?: string | null;
  userAvatar?: string | null;
  isOwnProfile?: boolean;
  onlyButtons?: boolean;
  initialIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
};

const isObjectId = (value?: string) => /^[a-f\d]{24}$/i.test(value ?? '');

export default function ProfileActions({
  userId,
  userName,
  userAvatar,
  isOwnProfile = true,
  onlyButtons = false,
  initialIsFollowing,
  onFollowChange,
}: ProfileActionsProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(Boolean(initialIsFollowing));
  const [hasLoadedFollowStatus, setHasLoadedFollowStatus] = useState(initialIsFollowing !== undefined);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const isChatLoadingRef = useRef(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (initialIsFollowing !== undefined) {
      setIsFollowing(initialIsFollowing);
      setHasLoadedFollowStatus(true);
    } else {
      setHasLoadedFollowStatus(false);
    }
  }, [initialIsFollowing, userId]);

  const handleToggleFollow = async () => {
    if (!userId || isFollowLoading || !hasLoadedFollowStatus) return;

    const previous = isFollowing;
    const next = !previous;
    setIsFollowing(next);
    onFollowChange?.(next);
    setIsFollowLoading(true);

    try {
      const follow = previous ? await unfollowUser(userId) : await followUser(userId);
      setIsFollowing(follow.isFollowing);
      onFollowChange?.(follow.isFollowing);
    } catch (error) {
      setIsFollowing(previous);
      onFollowChange?.(previous);
      Alert.alert(
        previous ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isOwnProfile) return null;

  const canOpenChat = isObjectId(userId);

  const handleOpenChat = async () => {
    if (!canOpenChat || !userId || isChatLoadingRef.current) return;
    isChatLoadingRef.current = true;
    setIsChatLoading(true);

    try {
      await checkDirectMessageAccess(userId);
      router.push({
        pathname: '/chat-screen/chat-detail',
        params: {
          id: userId,
          name: userName ?? 'Chat',
          ...(userAvatar ? { avatar: userAvatar } : {}),
        },
      });
    } catch (error) {
      Alert.alert(
        'Cannot send message',
        getAuthErrorMessage(error, 'Unable to start chat right now. Please try again later.'),
      );
    } finally {
      isChatLoadingRef.current = false;
      setIsChatLoading(false);
    }
  };

  const buttons = (
    <>
      <TouchableOpacity
        style={[styles.chatBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.8}
        disabled={!canOpenChat || isChatLoading}
        onPress={() => void handleOpenChat()}
      >
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.chatBtnGlass}>
          {isChatLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <HugeiconsIcon icon={BubbleChatIcon} size={20} color={colors.text} />
          )}
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.followBtn,
          { backgroundColor: colors.primary },
          isFollowing && [styles.followingBtn, { backgroundColor: colors.card, borderColor: colors.border }]
        ]}
        activeOpacity={0.8}
        disabled={!userId || isFollowLoading || !hasLoadedFollowStatus}
        onPress={handleToggleFollow}
      >
        <View style={styles.followBtnContent}>
          {isFollowLoading || !hasLoadedFollowStatus ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.text : colors.background} />
          ) : isFollowing && (
            <MaterialCommunityIcons name="check" size={16} color={colors.text} style={{ marginRight: 6 }} />
          )}
          {!isFollowLoading && hasLoadedFollowStatus && (
            <Text style={[
              styles.followBtnText,
              { color: colors.background },
              isFollowing && [styles.followingBtnText, { color: colors.text }]
            ]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </>
  );

  if (onlyButtons) return buttons;

  return (
    <View style={styles.container}>
      {buttons}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  chatBtn: {
    width: 52,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  chatBtnGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBtn: {
    borderWidth: 1,
  },
  followBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  followingBtnText: {},
});
