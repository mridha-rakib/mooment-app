import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import UserAvatar from '@/components/ui/UserAvatar';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { getStorageFileUrl } from '@/lib/storage';
import { followUser, getSuggestedUsers, unfollowUser } from '@/lib/users';
import Svg, { Path } from 'react-native-svg';

const CheckIcon = () => (
  <Svg width="13" height="11" viewBox="0 0 13 11" fill="none" style={{ marginRight: 6 }}>
    <Path 
      d="M0.625 6.87518C0.625 6.87518 1.875 6.87518 3.54167 9.79185C3.54167 9.79185 8.174 2.15296 12.2917 0.625183" 
      stroke="white" 
      strokeWidth="1.25" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

type PeopleToFollowUser = {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  isFollowing: boolean;
};

export default function PeopleToFollowScreen() {
  const [users, setUsers] = useState<PeopleToFollowUser[]>([]);
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const suggestedUsers = await getSuggestedUsers(50);

        if (!isMounted) {
          return;
        }

        setUsers(suggestedUsers.map((user) => ({
          id: user.id,
          name: user.name,
          handle: user.username ? `@${user.username}` : '@xenog',
          avatar: user.avatarUrl?.trim() || (user.avatarKey ? getStorageFileUrl(user.avatarKey) : null),
          isFollowing: user.isFollowing,
        })));
      } catch {
        if (isMounted) {
          setUsers([]);
        }
      }
    };

    void loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleFollow = async (id: string) => {
    if (pendingUserIds.includes(id)) {
      return;
    }

    const user = users.find((item) => item.id === id);

    if (!user) {
      return;
    }

    const wasFollowing = user.isFollowing;

    setUsers((current) => current.map((item) => (
      item.id === id ? { ...item, isFollowing: !wasFollowing } : item
    )));

    if (!MONGO_OBJECT_ID_PATTERN.test(id)) {
      return;
    }

    setPendingUserIds((current) => [...current, id]);

    try {
      const follow = wasFollowing ? await unfollowUser(id) : await followUser(id);

      setUsers((current) => current.map((item) => (
        item.id === id ? { ...item, isFollowing: follow.isFollowing } : item
      )));
    } catch (error) {
      setUsers((current) => current.map((item) => (
        item.id === id ? { ...item, isFollowing: wasFollowing } : item
      )));
      Alert.alert(
        wasFollowing ? 'Unable to unfollow' : 'Unable to follow',
        getAuthErrorMessage(error, 'Please try again.'),
      );
    } finally {
      setPendingUserIds((current) => current.filter((userId) => userId !== id));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <Text style={styles.headerTitle}>People to Follow</Text>
          <View style={styles.placeholder} />
        </View>

        {/* List */}
        <ScrollView style={styles.listContainer}>
          {users.map((user, index) => (
            <View key={user.id}>
              <View style={styles.listItem}>
                <UserAvatar uri={user.avatar} name={user.name} size={48} style={styles.avatar} iconSize={18} />
                <View style={styles.textContainer}>
                  <Text style={styles.name}>{user.name}</Text>
                  <Text style={styles.handle}>{user.handle}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.followBtn, user.isFollowing && styles.followingBtn]}
                  activeOpacity={0.8}
                  disabled={pendingUserIds.includes(user.id)}
                  onPress={() => toggleFollow(user.id)}
                >
                  {user.isFollowing && <CheckIcon />}
                  <Text style={[styles.followBtnText, user.isFollowing && styles.followingBtnText]}>
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </View>
              {index < users.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: '#2B2B36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  handle: {
    color: '#8E8E9B',
    fontSize: 12,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D0D8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'transparent',
  },
  followBtnText: {
    color: '#D0D0D8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  followingBtnText: {
    color: '#8E8E9B',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
