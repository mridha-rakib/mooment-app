import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';

export type SuggestedUser = {
  id: string;
  name: string;
  avatarUri: string;
};

type PeopleToFollowProps = {
  users: SuggestedUser[];
};

export default function PeopleToFollow({ users }: PeopleToFollowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>People to follow</Text>
        <TouchableOpacity>
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
            <Image source={{ uri: user.avatarUri }} style={styles.avatar} />
            <Text style={styles.userName} numberOfLines={2}>
              {user.name.split(' ').join('\n')}
            </Text>
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
    alignItems: 'center',
    width: 64, // Keep it narrow to force text wrap
    marginRight: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
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
