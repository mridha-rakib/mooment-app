import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, Image, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const MOCK_POST = {
  authorAvatar: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=150&auto=format&fit=crop',
  authorName: 'Jane Cooper',
  timeAgo: '2 min ago',
  caption: 'Explore the vibrant cit... see more',
  imageUri: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop',
  likes: 25,
  comments: 25,
};

export default function ViewPostScreen() {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(true); // Red heart in mockup
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Centered Media */}
        <View style={styles.mediaContainer}>
          <Image source={{ uri: MOCK_POST.imageUri }} style={styles.mediaImage} resizeMode="cover" />
        </View>

        {/* Right Side Actions */}
        <View style={styles.actionsCol}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            activeOpacity={0.8}
            onPress={() => setIsLiked(!isLiked)}
          >
            <Ionicons name="heart" size={28} color={isLiked ? "#F2245C" : "#FFFFFF"} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
            <Feather name="message-circle" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>{MOCK_POST.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
            <Feather name="share" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>{MOCK_POST.likes}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Overlay */}
        <View style={styles.bottomOverlay}>
          <View style={styles.authorRow}>
            <Image source={{ uri: MOCK_POST.authorAvatar }} style={styles.avatar} />
            <View style={styles.authorTextCol}>
              <Text style={styles.authorName}>{MOCK_POST.authorName}</Text>
              <Text style={styles.timeAgo}>{MOCK_POST.timeAgo}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.followBtn, isFollowing && styles.followingBtn]} 
              activeOpacity={0.8}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather name="more-horizontal" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.caption}>{MOCK_POST.caption}</Text>

          {/* Progress Bar Mock */}
          <View style={styles.progressRow}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '40%' }]} />
            </View>
            <Text style={styles.progressText}>0:41/1:21:12</Text>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  header: {
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
  },
  mediaContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: width,
    height: height * 0.4, // Roughly 40% of screen height, centered
  },
  actionsCol: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  authorTextCol: {
    flex: 1,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeAgo: {
    color: '#8E8E9B',
    fontSize: 11,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: '#D4B0EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'transparent',
  },
  followBtnText: {
    color: '#D4B0EB',
    fontSize: 11,
    fontWeight: 'bold',
  },
  followingBtnText: {
    color: '#FFFFFF',
  },
  moreBtn: {
    padding: 4,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  progressText: {
    color: '#8E8E9B',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
});
