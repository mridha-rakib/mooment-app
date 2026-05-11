import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SegmentedControl from "../ui/SegmentedControl";
import CinematicButton from "../ui/CinematicButton";
const { width } = Dimensions.get("window");

// Removed hardcoded COLORS to use useTheme hook

const ROOMS_DATA = [
  {
    id: "1",
    title: "Pre-show chat with DJ Nova",
    host: "DJ Nova",
    hostAvatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    listeners: "412",
    isHost: true,
  },
  {
    id: "2",
    title: "Pre-show chat with DJ Nova",
    host: "DJ Nova",
    hostAvatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    listeners: "412",
    isHost: false,
  },
];

const MOOMENTS_DATA = [
  {
    id: "1",
    user: "Dj Koko",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    text: "Setting up for tonight. The view from up here is unreal",
    image:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop",
    likes: 25,
    comments: 25,
    shares: 25,
    isFollowing: false,
  },
  {
    id: "2",
    user: "Ronald Richards",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
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
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    time: "2 min ago",
    text: "Setting up for tonight. The view from up here is unreal",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop",
    likes: 25,
    comments: 25,
    shares: 0,
    isFollowing: false,
  },
];

const VibeTab = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [vibeSubTab, setVibeSubTab] = useState("Live");

  const renderLive = () => (
    <View style={{ marginTop: 20 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        2 Active Rooms
      </Text>
      <View style={styles.roomsRow}>
        {ROOMS_DATA.map((room) => (
          <View key={room.id} style={styles.roomContainer}>
            <View
              style={[
                styles.ovalCard,
                {
                  backgroundColor: isDark
                    ? "rgba(142, 84, 233, 0.05)"
                    : "rgba(142, 84, 233, 0.02)",
                  borderColor: isDark
                    ? "rgba(142, 84, 233, 0.3)"
                    : "rgba(142, 84, 233, 0.15)",
                },
              ]}
            >
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={() => router.push("/profile-screen/user-profile")}
              >
                <Image
                  source={{ uri: room.hostAvatar }}
                  style={[styles.roomAvatar, { borderColor: colors.primary }]}
                />
                <View
                  style={[
                    styles.onlineIndicator,
                    {
                      borderColor: colors.background,
                      backgroundColor: "#16D869",
                    },
                  ]}
                />
              </TouchableOpacity>

              {room.isHost && (
                <View
                  style={[
                    styles.hostBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.05)",
                    },
                  ]}
                >
                  <Text style={[styles.hostBadgeText, { color: colors.text }]}>
                    Host
                  </Text>
                </View>
              )}

              <CinematicButton
                text="Join"
                width="100%"
                height={32}
                borderRadius={12}
                onPress={() => router.push("/live-screen/live-room-screen")}
                style={{ marginTop: 10 }}
              />
            </View>

            <View style={styles.roomInfo}>
              <Text style={[styles.roomTitle, { color: colors.text }]}>
                {room.title}
              </Text>
              <Text
                style={[styles.speakingText, { color: colors.textSecondary }]}
              >
                <TouchableOpacity
                  onPress={() => router.push("/profile-screen/user-profile")}
                >
                  <Text
                    style={[styles.hostNameHighlight, { color: colors.text }]}
                  >
                    {room.host}
                  </Text>
                </TouchableOpacity>{" "}
                is speaking
              </Text>

              <View style={styles.listenerRow}>
                <View style={styles.avatarCluster}>
                  <TouchableOpacity
                    onPress={() => router.push("/profile-screen/user-profile")}
                  >
                    <Image
                      source={{
                        uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop",
                      }}
                      style={[
                        styles.avatarSmall,
                        { zIndex: 3, borderColor: colors.background },
                      ]}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/profile-screen/user-profile")}
                  >
                    <Image
                      source={{
                        uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop",
                      }}
                      style={[
                        styles.avatarSmall,
                        {
                          zIndex: 2,
                          marginLeft: -8,
                          borderColor: colors.background,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/profile-screen/user-profile")}
                  >
                    <Image
                      source={{
                        uri: "https://images.unsplash.com/photo-1599566150163-29194dcabd9c?q=80&w=100&auto=format&fit=crop",
                      }}
                      style={[
                        styles.avatarSmall,
                        {
                          zIndex: 1,
                          marginLeft: -8,
                          borderColor: colors.background,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[
                    styles.listenerCount,
                    { color: colors.textSecondary },
                  ]}
                >
                  {room.listeners} listening
                </Text>
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
      <TouchableOpacity
        style={[
          styles.postBtn,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.05)",
          },
        ]}
      >
        <Feather name="plus" size={20} color={colors.textSecondary} />
        <Text style={[styles.postBtnText, { color: colors.textSecondary }]}>
          Post Mooment
        </Text>
      </TouchableOpacity>

      {/* Timer Banner */}
      <View
        style={[
          styles.timerBanner,
          {
            backgroundColor: isDark
              ? "rgba(255, 107, 61, 0.1)"
              : "rgba(255, 107, 61, 0.05)",
          },
        ]}
      >
        <View style={styles.timerLeft}>
          <Feather name="info" size={16} color="#FF6B3D" />
          <Text style={[styles.timerText, { color: "#FF6B3D" }]}>
            Next mooment available in
          </Text>
        </View>
        <Text style={[styles.timerCountdown, { color: "#FF6B3D" }]}>
          10 min
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        24 Mooments
      </Text>

      {/* Feed */}
      {MOOMENTS_DATA.map((item) => (
        <View
          key={item.id}
          style={[styles.postCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.postHeader}>
            <Image source={{ uri: item.avatar }} style={styles.postAvatar} />
            <View style={styles.postUserInfo}>
              <Text style={[styles.postUserName, { color: colors.text }]}>
                {item.user}
              </Text>
              <Text style={[styles.postTime, { color: colors.textSecondary }]}>
                {item.time}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.followBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.05)",
                  borderColor: colors.border,
                },
                item.isFollowing && [
                  styles.followBtnActive,
                  {
                    backgroundColor: "transparent",
                    borderColor: colors.border,
                  },
                ],
              ]}
            >
              <Text
                style={[
                  styles.followBtnText,
                  { color: colors.text },
                  item.isFollowing && [
                    styles.followBtnTextActive,
                    { color: colors.textSecondary },
                  ],
                ]}
              >
                {item.isFollowing ? "Following" : "+ Follow"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <Feather
                name="more-horizontal"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.postText, { color: colors.text }]}>
            {item.text}
          </Text>

          {item.image && (
            <Image source={{ uri: item.image }} style={styles.postImage} />
          )}

          <View style={styles.postFooter}>
            <View style={styles.footerStat}>
              <Feather name="heart" size={16} color={colors.textSecondary} />
              <Text
                style={[styles.footerStatText, { color: colors.textSecondary }]}
              >
                {item.likes}
              </Text>
            </View>
            <View style={styles.footerStat}>
              <Feather
                name="message-circle"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.footerStatText, { color: colors.textSecondary }]}
              >
                {item.comments}
              </Text>
            </View>
            {item.shares > 0 && (
              <View style={styles.footerStat}>
                <Feather
                  name="share-2"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    styles.footerStatText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.shares}
                </Text>
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
      <SegmentedControl
        options={["Live", "Mooments"]}
        selectedOption={vibeSubTab}
        onSelect={setVibeSubTab}
        containerStyle={{ marginTop: 10, marginBottom: 10 }}
      />

      {vibeSubTab === "Live" ? renderLive() : renderMooments()}
    </View>
  );
};

export default VibeTab;

const styles = StyleSheet.create({
  tabWrapper: {
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
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
    width: "65%",
    aspectRatio: 0.55,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#AC86D4", 
    backgroundColor: "rgba(172, 134, 212, 0.08)",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  roomAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#16D869",
    borderWidth: 2,
  },
  hostBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  hostBadgeText: {
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
    fontSize: 14,
    fontWeight: "bold",
  },
  roomInfo: {
    width: "100%",
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 18,
  },
  speakingText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  hostNameHighlight: {
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
  },
  listenerCount: {
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
    color: "#FF6B3D",
    fontSize: 14,
    fontWeight: "600",
  },
  timerCountdown: {
    fontSize: 14,
    fontWeight: "bold",
  },
  postCard: {
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
    fontSize: 15,
    fontWeight: "bold",
  },
  postTime: {
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
    fontSize: 12,
    fontWeight: "600",
  },
  followBtnTextActive: {},
  moreBtn: {
    padding: 4,
  },
  postText: {
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
    fontSize: 13,
  },
});
