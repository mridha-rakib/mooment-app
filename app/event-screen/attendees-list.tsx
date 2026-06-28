import {
  Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React,
  { useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import UserAvatar from '@/components/ui/UserAvatar';


const INITIAL_ATTENDEES = [
  { id: '1', name: 'Dj Koko', handle: '@sdfd_d', avatar: null, isFollowing: false },
  { id: '2', name: 'Dj Koko', handle: '@sdfd_d', avatar: null, isFollowing: false },
  { id: '3', name: 'Anonymous', handle: null, avatar: null, isFollowing: false },
  { id: '4', name: 'Dj Koko', handle: '@sdfd_d', avatar: null, isFollowing: true },
];

export default function AttendeesListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [users, setUsers] = useState(INITIAL_ATTENDEES);


  const toggleFollow = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isFollowing: !u.isFollowing } : u));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Attendee List</Text>
          <View style={styles.placeholder} />
        </View>

        {/* List */}
        <ScrollView style={styles.listContainer}>
          {users.map((user, index) => (
            <View key={user.id}>
              <View style={styles.listItem}>
                <UserAvatar uri={user.avatar} name={user.name} size={48} style={styles.avatar} iconSize={20} />
                <View style={styles.textContainer}>
                  <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
                  {user.handle && <Text style={[styles.handle, { color: colors.textSecondary }]}>{user.handle}</Text>}
                </View>
                
                {user.name !== 'Anonymous' && (
                  <TouchableOpacity 
                    style={[styles.followBtn, { borderColor: colors.border }, user.isFollowing && [styles.followingBtn, { backgroundColor: colors.card }]]} 
                    activeOpacity={0.8}
                    onPress={() => toggleFollow(user.id)}
                  >
                    {user.isFollowing && <Feather name="check" size={12} color={colors.textSecondary} style={styles.checkIcon} />}
                    <Text style={[styles.followBtnText, { color: colors.textSecondary }, user.isFollowing && { color: colors.textSecondary }]}>
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {index < users.length - 1 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
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
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
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
  anonymousAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  handle: {
    fontSize: 12,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followingBtn: {
    borderColor: 'transparent',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkIcon: {
    marginRight: 4,
  },
  separator: {
    height: 1,
  },
});

