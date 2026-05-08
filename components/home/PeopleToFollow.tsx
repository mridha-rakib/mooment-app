import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';

export type SuggestedUser = {
  id: string;
  name: string;
  avatarUri: string;
};

type PeopleToFollowProps = {
  users: SuggestedUser[];
};

export default function PeopleToFollow({ users }: PeopleToFollowProps) {
  const router = useRouter();

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
                  avatar: user.avatarUri
                }
              } as any)}
              style={styles.avatarContainer}
            >
              <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/profile-screen/user-profile',
                params: { 
                  userId: user.id,
                  name: user.name,
                  avatar: user.avatarUri
                }
              } as any)}
            >
              <Text style={styles.userName} numberOfLines={2}>
                {user.name.split(' ').join('\n')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
              <Text style={styles.followBtnText}>Follow</Text>
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
  userName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: '#D4B0EB',
    backgroundColor: 'rgba(212, 176, 235, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  followBtnText: {
    color: '#D4B0EB',
    fontSize: 10,
    fontWeight: '600',
  },
});
