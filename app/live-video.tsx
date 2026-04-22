import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, SafeAreaView, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import CommentsModal from '../components/CommentsModal';
import ShareModal from '../components/ShareModal';

const { width, height } = Dimensions.get('window');

export default function LiveVideoScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Discover' | 'Friends'>('Discover');
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Background Media */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.backgroundImage} 
      />

      {/* Top Gradient Overlay */}
      <View style={styles.topOverlay} />
      {/* Bottom Gradient Overlay */}
      <View style={styles.bottomOverlay} />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
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

          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search')}>
            <Feather name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Center Play Button */}
        <View style={styles.centerContainer}>
          <TouchableOpacity style={styles.playBtn} activeOpacity={0.8}>
             <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

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

      </SafeAreaView>

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
    opacity: 0.9,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
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
    width: '60%', // 60% progress representation
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
