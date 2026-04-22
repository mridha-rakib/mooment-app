import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const INITIAL_USERS = [
  { id: '1', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop', isFollowing: false },
  { id: '2', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=150&auto=format&fit=crop', isFollowing: false },
  { id: '3', name: 'Dj Koko', handle: '@sdfd_d', avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop', isFollowing: false },
];

export default function PeopleToFollowScreen() {
  const router = useRouter();
  const [users, setUsers] = useState(INITIAL_USERS);

  const toggleFollow = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, isFollowing: !u.isFollowing } : u));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#8E8E9B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>People to Follow</Text>
          <View style={styles.placeholder} />
        </View>

        {/* List */}
        <ScrollView style={styles.listContainer}>
          {users.map((user, index) => (
            <View key={user.id}>
              <View style={styles.listItem}>
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                <View style={styles.textContainer}>
                  <Text style={styles.name}>{user.name}</Text>
                  <Text style={styles.handle}>{user.handle}</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.followBtn, user.isFollowing && styles.followingBtn]} 
                  activeOpacity={0.8}
                  onPress={() => toggleFollow(user.id)}
                >
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
    borderWidth: 1,
    borderColor: '#D0D0D8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
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
