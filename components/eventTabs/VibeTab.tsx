import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const COLORS = {
  background: "#0e0d12",
  card: "#13131A",
  primary: "#D4B0EB",
  text: "#FFFFFF",
  textMuted: "#8E8E9B",
  accentPurple: "#8E54E9",
  accentOrange: "#FF6B3D",
  accentGreen: "#16D869",
  border: "rgba(255, 255, 255, 0.1)",
};

const ROOMS_DATA = [
  {
    id: "1",
    title: "Pre-show chat with DJ Nova",
    host: "DJ Nova",
    hostAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    listeners: "412",
    isHost: true,
  },
  {
    id: "2",
    title: "Pre-show chat with DJ Nova",
    host: "DJ Nova",
    hostAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    listeners: "412",
    isHost: false,
  },
];

const MOOMENTS_DATA = [
  {
    id: "1",
    user: "Dj Koko",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    text: "Setting up for tonight. The view from up here is unreal",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop",
    likes: 25,
    comments: 25,
    shares: 25,
    isFollowing: false,
  },
  {
    id: "2",
    user: "Ronald Richards",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    text: "Behind the scenes at Saturday market",
    likes: 25,
    comments: 25,
    shares: 25,
    isFollowing: true,
  },
  {
    id: "3",
    user: "Giden Jao",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    text: "Setting up for tonight. The view from up here is unreal",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
    likes: 25,
    comments: 25,
    shares: 0,
    isFollowing: false,
  },
];

const VibeTab = () => {
  const router = useRouter();
  const [vibeSubTab, setVibeSubTab] = useState("Live");

  const renderLive = () => (
    <View style={{ marginTop: 20 }}>
      <Text style={styles.sectionTitle}>2 Active Rooms</Text>
      <View style={styles.roomsRow}>
        {ROOMS_DATA.map((room) => (
          <View key={room.id} style={styles.roomContainer}>
            <View style={styles.ovalCard}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: room.hostAvatar }} style={styles.roomAvatar} />
                <View style={styles.onlineIndicator} />
              </View>
              
              {room.isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>Host</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.joinBtn}
                onPress={() => router.push("/event-details")}
              >
                <Text style={styles.joinBtnText}>Join</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roomInfo}>
              <Text style={styles.roomTitle}>{room.title}</Text>
              <Text style={styles.speakingText}>
                <Text style={styles.hostNameHighlight}>{room.host}</Text> is speaking
              </Text>
              
              <View style={styles.listenerRow}>
                <View style={styles.avatarCluster}>
                  <Image
                    source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop" }}
                    style={[styles.avatarSmall, { zIndex: 3 }]}
                  />
                  <Image
                    source={{ uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" }}
                    style={[styles.avatarSmall, { zIndex: 2, marginLeft: -8 }]}
                  />
                  <Image
                    source={{ uri: "https://images.unsplash.com/photo-1599566150163-29194dcabd9c?q=80&w=100&auto=format&fit=crop" }}
                    style={[styles.avatarSmall, { zIndex: 1, marginLeft: -8 }]}
                  />
                </View>
                <Text style={styles.listenerCount}>{room.listeners} listening</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMooments = () => (
    <View style={{ marginTop: 20 }}>
      {/* Post Button */}
      <TouchableOpacity style={styles.postBtn}>
        <Feather name="plus" size={20} color={COLORS.textMuted} />
        <Text style={styles.postBtnText}>Post Mooment</Text>
      </TouchableOpacity>

      {/* Timer Banner */}
      <View style={styles.timerBanner}>
        <View style={styles.timerLeft}>
          <Feather name="info" size={16} color={COLORS.accentOrange} />
          <Text style={styles.timerText}>Next mooment available in</Text>
        </View>
        <Text style={styles.timerCountdown}>10 min</Text>
      </View>

      <Text style={styles.sectionTitle}>24 Mooments</Text>

      {/* Feed */}
      {MOOMENTS_DATA.map((item) => (
        <View key={item.id} style={styles.postCard}>
          <View style={styles.postHeader}>
            <Image source={{ uri: item.avatar }} style={styles.postAvatar} />
            <View style={styles.postUserInfo}>
              <Text style={styles.postUserName}>{item.user}</Text>
              <Text style={styles.postTime}>{item.time}</Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.followBtn,
                item.isFollowing && styles.followBtnActive
              ]}
            >
              <Text style={[
                styles.followBtnText,
                item.isFollowing && styles.followBtnTextActive
              ]}>
                {item.isFollowing ? "Following" : "+ Follow"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather name="more-horizontal" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.postText}>{item.text}</Text>
          
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.postImage} />
          )}

          <View style={styles.postFooter}>
            <View style={styles.footerStat}>
              <Feather name="heart" size={16} color={COLORS.textMuted} />
              <Text style={styles.footerStatText}>{item.likes}</Text>
            </View>
            <View style={styles.footerStat}>
              <Feather name="message-circle" size={16} color={COLORS.textMuted} />
              <Text style={styles.footerStatText}>{item.comments}</Text>
            </View>
            {item.shares > 0 && (
              <View style={styles.footerStat}>
                <Feather name="share-2" size={16} color={COLORS.textMuted} />
                <Text style={styles.footerStatText}>{item.shares}</Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View>
      {/* Sub-Tabs / Toggle */}
      <View style={styles.tabWrapper}>
        <LinearGradient
          colors={["#18181c", "#c1c0c5", "#18181c"]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 1 }}
          style={styles.subTabBorder}
        >
          <BlurView intensity={40} tint="dark" style={styles.subTabBg}>
            <TouchableOpacity
              onPress={() => setVibeSubTab("Live")}
              style={styles.subTabItem}
            >
              {vibeSubTab === "Live" ? (
                <LinearGradient
                  colors={["#18181c", "#c1c0c5", "#18181c"]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBtnBorder}
                >
                  <View style={styles.activeBtnInner}>
                    <Text style={[styles.subTabText, styles.subTabTextActive]}>
                      Live
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={styles.subTabText}>Live</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setVibeSubTab("Mooments")}
              style={styles.subTabItem}
            >
              {vibeSubTab === "Mooments" ? (
                <LinearGradient
                  colors={["#18181c", "#c1c0c5", "#18181c"]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.activeBtnBorder}
                >
                  <View style={styles.activeBtnInner}>
                    <Text style={[styles.subTabText, styles.subTabTextActive]}>
                      Mooments
                    </Text>
                  </View>
                </LinearGradient>
              ) : (
                <Text style={styles.subTabText}>Mooments</Text>
              )}
            </TouchableOpacity>
          </BlurView>
        </LinearGradient>
      </View>

      {vibeSubTab === "Live" ? renderLive() : renderMooments()}
    </View>
  );
};

export default VibeTab;

const styles = StyleSheet.create({
  tabWrapper: {
    borderRadius: 12,
  },
  subTabBorder: {
    borderRadius: 12,
    overflow: "hidden",
    padding: 0.5,
  },
  subTabBg: {
    flexDirection: "row",
    backgroundColor: "#1c1b20",
    borderRadius: 11,
    padding: 6,
    height: 50,
    overflow: "hidden",
    gap: 4,
  },
  subTabItem: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeBtnBorder: {
    flex: 1,
    borderRadius: 8,
    padding: 0.5,
  },
  activeBtnInner: {
    backgroundColor: "#38373a",
    borderRadius: 7,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  subTabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  subTabTextActive: {
    color: COLORS.text,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  roomsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roomContainer: {
    width: (width - 48) / 2,
    alignItems: "center",
  },
  ovalCard: {
    width: "80%",
    aspectRatio: 0.65,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(142, 84, 233, 0.3)", // Soft purple border
    backgroundColor: "rgba(142, 84, 233, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  roomAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.accentPurple,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accentGreen,
    borderWidth: 2,
    borderColor: "#0e0d12",
  },
  hostBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  hostBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  joinBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  joinBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
  },
  roomInfo: {
    width: "100%",
  },
  roomTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 18,
  },
  speakingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  hostNameHighlight: {
    color: COLORS.text,
    fontWeight: "bold",
  },
  listenerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  avatarCluster: {
    flexDirection: "row",
  },
  avatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  listenerCount: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  /* Mooments Styles */
  postBtn: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  postBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },
  timerBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 61, 0.1)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  timerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timerText: {
    color: COLORS.accentOrange,
    fontSize: 14,
    fontWeight: "600",
  },
  timerCountdown: {
    color: COLORS.accentOrange,
    fontSize: 14,
    fontWeight: "bold",
  },
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postUserInfo: {
    flex: 1,
  },
  postUserName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "bold",
  },
  postTime: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  followBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  followBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "600",
  },
  followBtnTextActive: {
    color: COLORS.textMuted,
  },
  moreBtn: {
    padding: 4,
  },
  postText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1.8,
    borderRadius: 12,
    marginBottom: 14,
  },
  postFooter: {
    flexDirection: "row",
    gap: 20,
  },
  footerStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerStatText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
