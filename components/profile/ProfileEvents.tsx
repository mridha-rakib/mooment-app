import { BlurView } from "expo-blur";
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

type ProfileEventsProps = {
  onCommentPress: () => void;
  onSharePress: () => void;
};

export default function ProfileEvents({ onCommentPress, onSharePress }: ProfileEventsProps) {
  const [filter, setFilter] = useState<'active' | 'past'>('active');

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleWrapper}>
        <BlurView intensity={20} tint="dark" style={styles.toggleContainer}>
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
        </BlurView>
      </View>

      {/* Events List */}
      <View style={styles.list}>
        {MOCK_EVENTS.map((event) => (
          <FeedPost 
            key={event.id} 
            post={event} 
            onCommentPress={onCommentPress} 
            onSharePress={onSharePress} 
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
  toggleWrapper: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(104, 104, 104, 0.1)', // #686868 at 10%
    padding: 4,
    height: 40,
    alignItems: 'center',
    gap: 12, // Gap from Figma
  },
  toggleBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(104, 104, 104, 0.4)', // #686868 at 40%
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.6)',
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
