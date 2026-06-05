import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(true); // Red heart in mockup
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]} activeOpacity={0.8}>
            <Feather name="chevron-left" size={20} color={colors.text} />
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
            <Ionicons name="heart" size={28} color={isLiked ? "#F2245C" : colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
            <Feather name="message-circle" size={26} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>{MOCK_POST.comments}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
            <Feather name="share" size={26} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>{MOCK_POST.likes}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Overlay */}
        <View style={styles.bottomOverlay}>
          <View style={styles.authorRow}>
            <Image source={{ uri: MOCK_POST.authorAvatar }} style={[styles.avatar, { borderColor: colors.border }]} />
            <View style={styles.authorTextCol}>
              <Text style={[styles.authorName, { color: colors.text }]}>{MOCK_POST.authorName}</Text>
              <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{MOCK_POST.timeAgo}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.followBtn, { borderColor: colors.primary }, isFollowing && [styles.followingBtn, { backgroundColor: colors.card, borderColor: 'transparent' }]]} 
              activeOpacity={0.8}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              <Text style={[styles.followBtnText, { color: colors.primary }, isFollowing && { color: colors.text }]}>
                {isFollowing ? 'Following' : '+ Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather name="more-horizontal" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.caption, { color: colors.text }]}>{MOCK_POST.caption}</Text>

          {/* Progress Bar Mock */}
          <View style={styles.progressRow}>
            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]}>
              <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: '40%' }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>0:41/1:21:12</Text>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  authorTextCol: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeAgo: {
    fontSize: 11,
  },
  followBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  followingBtn: {
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  moreBtn: {
    padding: 4,
  },
  caption: {
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
    borderRadius: 1,
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1,
  },
  progressText: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
});
