import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FeedPost, { PostData } from "../FeedPost";

const MOCK_EVENTS: PostData[] = [
  {
    id: 'e1',
    postType: 'event',
    authorName: 'Dj Koko',
    authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
    timeAgo: '2 min ago',
    isPublic: true,
    likesCount: 25,
    commentsCount: 25,
    sharesCount: 25,
    mediaUris: ['https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800'],
    eventDetails: {
      isLive: true,
      title: 'Rooftop Session Vol.4',
      datetime: 'Sat, Sep 9 • 9:00 - 4:00 PM',
      distance: '0.3mi',
      attendeesCount: 41,
      attendeesAvatars: [
        'https://i.pravatar.cc/100?img=11',
        'https://i.pravatar.cc/100?img=12',
        'https://i.pravatar.cc/100?img=13',
        'https://i.pravatar.cc/100?img=14',
      ],
      tags: [
        { label: 'Music Party', bg: '#FFFFFF', color: '#000000' },
        { label: 'Busy', bg: 'rgba(255, 125, 84, 0.2)', color: '#FF7D54' }
      ]
    }
  }
];

export default function ProfileEvents() {
  const [filter, setFilter] = useState<'active' | 'past'>('active');

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleBtn, filter === 'active' && styles.toggleBtnActive]} 
          onPress={() => setFilter('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, filter === 'active' && styles.toggleTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, filter === 'past' && styles.toggleBtnActive]} 
          onPress={() => setFilter('past')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, filter === 'past' && styles.toggleTextActive]}>Past</Text>
        </TouchableOpacity>
      </View>

      {/* Events List */}
      <View style={styles.list}>
        {MOCK_EVENTS.map((event) => (
          <FeedPost 
            key={event.id} 
            post={event} 
            onCommentPress={() => {}} 
            onSharePress={() => {}} 
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#13131A',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1A1A22',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#2A2A3A',
  },
  toggleText: {
    color: '#8E8E9B',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  
  list: {
    marginTop: 10,
  },
});
