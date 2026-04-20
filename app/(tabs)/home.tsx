import React from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, SafeAreaView, Dimensions, Platform } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function HomeFeed() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Navigation */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.feedBtn} activeOpacity={0.8}>
            <View style={styles.greenDot} />
            <Text style={styles.feedText}>Feed</Text>
            <Feather name="chevron-down" size={14} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.logoText}>Mooment</Text>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
              <Feather name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
              <Feather name="sliders" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* Stories Row */}
          <View style={styles.storiesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
              
              {/* Add Story */}
              <TouchableOpacity style={styles.addStoryBtn} activeOpacity={0.8}>
                <Feather name="plus" size={24} color="#8E8E9B" />
              </TouchableOpacity>

              {/* Live Story */}
              <TouchableOpacity style={styles.storyItem} activeOpacity={0.8}>
                <View style={[styles.storyRing, styles.storyRingLive]}>
                  <Image source={{ uri: "https://images.unsplash.com/photo-1540039155732-68420e6e72ca?q=80&w=200&auto=format&fit=crop" }} style={styles.storyImage} />
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Standard Story 1 */}
              <TouchableOpacity style={styles.storyItem} activeOpacity={0.8}>
                <View style={[styles.storyRing, styles.storyRingStandard]}>
                  <Image source={{ uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=200&auto=format&fit=crop" }} style={styles.storyImage} />
                  <View style={styles.storyOverlayTextContainer}>
                    <Text style={styles.storyOverlayText} numberOfLines={2}>Enjoying{"\n"}summer</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Standard Story 2 */}
              <TouchableOpacity style={styles.storyItem} activeOpacity={0.8}>
                <View style={[styles.storyRing, styles.storyRingStandard]}>
                  <Image source={{ uri: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=200&auto=format&fit=crop" }} style={styles.storyImage} />
                  <View style={styles.storyOverlayTextContainer}>
                     <Text style={styles.storyOverlayText} numberOfLines={2}>First{"\n"}day @office</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Standard Story 3 */}
              <TouchableOpacity style={styles.storyItem} activeOpacity={0.8}>
                <View style={[styles.storyRing, styles.storyRingMuted]}>
                  <Image source={{ uri: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&auto=format&fit=crop" }} style={styles.storyImage} />
                </View>
              </TouchableOpacity>

            </ScrollView>
          </View>

          {/* Feed Post */}
          <View style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <View style={styles.postAuthorInfo}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop" }} style={styles.postAvatar} />
                <View>
                  <Text style={styles.postAuthor}>Dj Koko</Text>
                  <Text style={styles.postTime}>2 min ago</Text>
                </View>
              </View>
              
              <View style={styles.postHeaderActions}>
                <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
                  <Feather name="plus" size={12} color="#D4B0EB" />
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreBtn}>
                  <Feather name="more-horizontal" size={20} color="#8E8E9B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Post Text */}
            <Text style={styles.postCaption}>
              Setting up for tonight. The view from up here is unreal
            </Text>

            {/* Post Media */}
            <View style={styles.postMediaContainer}>
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop" }} 
                style={styles.postImage} 
              />
              
              {/* Media Counters & Badges */}
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>1/3</Text>
              </View>

              <TouchableOpacity style={styles.ticketFab} activeOpacity={0.9}>
                <Ionicons name="ticket-outline" size={24} color="#FFFFFF" />
                <View style={styles.ticketBadge}>
                  <Text style={styles.ticketBadgeText}>5</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 60,
  },
  feedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2DB46D",
    marginRight: 6,
  },
  feedText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginRight: 4,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "serif",
    fontStyle: "italic",
    position: 'absolute',
    left: width / 2 - 45,
  },
  headerIcons: {
    flexDirection: "row",
  },
  iconBtn: {
    marginLeft: 20,
  },
  storiesContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  storiesScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  addStoryBtn: {
    width: 68,
    height: 86,
    borderRadius: 34,
    backgroundColor: "#2B2B36",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  storyItem: {
    marginRight: 16,
  },
  storyRing: {
    width: 74,
    height: 92,
    borderRadius: 37,
    justifyContent: "center",
    alignItems: "center",
    padding: 2, 
  },
  storyRingLive: {
    backgroundColor: "#F2245C", 
  },
  storyRingStandard: {
    backgroundColor: "#42B0D5",
  },
  storyRingMuted: {
    backgroundColor: "transparent",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#0e0d12", 
  },
  liveBadge: {
    position: "absolute",
    top: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#16D869",
    marginRight: 4,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  storyOverlayTextContainer: {
    position: "absolute",
    top: 10,
    width: "100%",
    alignItems: "center",
  },
  storyOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  postCard: {
    backgroundColor: "#13131A", 
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  postAuthorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  postAuthor: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  postTime: {
    color: "#8E8E9B",
    fontSize: 11,
    marginTop: 2,
  },
  postHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4B0EB", 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  followBtnText: {
    color: "#D4B0EB",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  moreBtn: {
    padding: 4,
  },
  postCaption: {
    color: "#D0D0D8", 
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  postMediaContainer: {
    width: "100%",
    height: 340,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  imageCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  ticketFab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(14, 13, 18, 0.7)", 
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ticketBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F2245C", 
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
});
