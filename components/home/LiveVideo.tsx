import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Dimensions, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CommentsModal from "@/components/post/CommentsModal";
import ShareModal from "@/components/post/ShareModal";

const { width, height } = Dimensions.get('window');

const VIDEOS = {
  Discover: require('../../assets/videos/live_bg.mp4'),
  Friends: require('../../assets/videos/live_bg.mp4'),
};

export default function LiveVideo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Discover' | 'Friends'>('Discover');
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  const player = useVideoPlayer(VIDEOS[activeTab], (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Ensure playback starts/resumes on tab change
  useEffect(() => {
    player.play();
    setIsPlaying(true);
  }, [activeTab, player]);

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      {/* Background Media */}
      <VideoView
        style={styles.backgroundImage}
        player={player}
        contentFit="cover"
      />


      {/* Full screen tap to toggle */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={togglePlay}
      />

      <View style={styles.safeArea} pointerEvents="box-none">
        {/* Top Navigation Bar */}
        <View style={[styles.topNav, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/home')}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'Discover' && styles.activeTabBtn]}
              onPress={() => setActiveTab('Discover')}
            >
              <Text style={[styles.tabText, activeTab === 'Discover' && styles.activeTabText]}>Discover</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'Friends' && styles.activeTabBtn]}
              onPress={() => setActiveTab('Friends')}
            >
              <Text style={[styles.tabText, activeTab === 'Friends' && styles.activeTabText]}>Friends</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/discover-screen/search')}>
            <Feather name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Center Play Button (only shown when paused) */}
        {!isPlaying && (
          <View style={styles.centerContainer} pointerEvents="none">
            <View style={styles.playBtn}>
              <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </View>
        )}

        {/* Right Action Column */}
        <View style={styles.rightActionsCol}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="heart" size={32} color="#F2245C" />
            <Text style={styles.actionText}>25</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentModalVisible(true)}>
            <Feather name="message-circle" size={30} color="#FFFFFF" />
            <Text style={styles.actionText}>25</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShareModalVisible(true)}>
            <Feather name="share" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>25</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Info Section */}
        <View style={styles.bottomInfoContainer}>
          <View style={styles.authorRow}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop' }}
              style={styles.authorAvatar}
            />
            <View style={styles.authorTextCol}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>Jane Cooper</Text>
                <TouchableOpacity style={styles.followingBtn}>
                  <Text style={styles.followingText}>Following</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.timeText}>2 min ago</Text>
            </View>
          </View>

          <Text style={styles.captionText}>
            Explore the vibrant cit... <Text style={styles.seeMoreText}>see more</Text>
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressBarTrack}>
              <View style={styles.progressBarFill} />
            </View>
            <Text style={styles.progressText}>15s</Text>
          </View>
        </View>
      </View>

      <CommentsModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
      />

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 4,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeTabBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabText: {
    color: '#D0D0D8',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  centerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -35 }, { translateY: -35 }],
    zIndex: 10,
  },
  playBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionsCol: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  bottomInfoContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginRight: 10,
  },
  authorTextCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  followingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  timeText: {
    color: '#D0D0D8',
    fontSize: 12,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  seeMoreText: {
    color: '#D0D0D8',
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    marginRight: 12,
  },
  progressBarFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
