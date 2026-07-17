import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { followUser, unfollowUser } from '@/lib/users';
import UserAvatar from '../ui/UserAvatar';

export type SuggestedUser = {
  id: string;
  name: string;
  avatarUri: string | null;
  isFollowing?: boolean;
};

type PeopleToFollowProps = {
  users: SuggestedUser[];
};

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export default function PeopleToFollow({ users }: PeopleToFollowProps) {
  const router = useRouter();
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);

  useEffect(() => {
    setFollowedUserIds(users.filter((user) => user.isFollowing).map((user) => user.id));
  }, [users]);

  const handleFollowPress = async (user: SuggestedUser) => {
    if (pendingUserIds.includes(user.id)) {
      return;
    }

    const wasFollowing = followedUserIds.includes(user.id);
    const nextFollowedUserIds = wasFollowing
      ? followedUserIds.filter((id) => id !== user.id)
      : [...followedUserIds, user.id];

    setFollowedUserIds(nextFollowedUserIds);

    if (!MONGO_OBJECT_ID_PATTERN.test(user.id)) {
      return;
    }

    setPendingUserIds((current) => [...current, user.id]);

    try {
      const follow = wasFollowing ? await unfollowUser(user.id) : await followUser(user.id);

      setFollowedUserIds((current) => (
        follow.isFollowing
          ? Array.from(new Set([...current, user.id]))
          : current.filter((id) => id !== user.id)
      ));
    } catch (error) {
      setFollowedUserIds((current) => (
        wasFollowing
          ? Array.from(new Set([...current, user.id]))
          : current.filter((id) => id !== user.id)
      ));
      Alert.alert(
        wasFollowing ? 'Unable to unfollow' : 'Unable to follow',
        getAuthErrorMessage(error, 'Please try again.'),
      );
    } finally {
      setPendingUserIds((current) => current.filter((id) => id !== user.id));
    }
  };

  if (users.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>People to follow</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/discover-screen/people-to-follow')}
        >
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push({
                pathname: '/profile-screen/user-profile',
                params: { 
                  userId: user.id,
                  name: user.name,
                  isFollowing: String(user.isFollowing ?? followedUserIds.includes(user.id)),
                  ...(user.avatarUri ? { avatar: user.avatarUri } : {}),
                }
              } as any)}
              style={styles.avatarContainer}
            >
              <UserAvatar uri={user.avatarUri} name={user.name} size={70} style={styles.avatar} iconSize={28} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/profile-screen/user-profile',
                params: { 
                  userId: user.id,
                  name: user.name,
                  isFollowing: String(user.isFollowing ?? followedUserIds.includes(user.id)),
                  ...(user.avatarUri ? { avatar: user.avatarUri } : {}),
                }
              } as any)}
            >
              <Text style={styles.userName} numberOfLines={2}>
                {user.name.split(' ').join('\n')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.followBtn,
                followedUserIds.includes(user.id) && styles.followingBtn,
              ]}
              activeOpacity={0.8}
              disabled={pendingUserIds.includes(user.id)}
              onPress={() => handleFollowPress(user)}
            >
              <Text
                style={[
                  styles.followBtnText,
                  followedUserIds.includes(user.id) && styles.followingBtnText,
                ]}
              >
                {followedUserIds.includes(user.id) ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  userCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    backgroundColor: '#13131A',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
    height: 32,
  },
  followBtn: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#AC86D4',
    borderRadius: 8,
    height: 20,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  followingBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 0,
  },
  followBtnText: {
    color: '#AC86D4',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  followingBtnText: {
    color: '#8E8E9B',
    fontSize: 11,
    fontWeight: '600',
  },
});
