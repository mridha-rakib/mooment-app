import {
  ArrowLeft01Icon,
  Mic01Icon,
  MoreHorizontalIcon,
  SentIcon,
  SmileIcon,
  UserGroupIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
import { safeBack } from "@/lib/navigation";
const MOCK_CHAT = [
  {
    id: "1",
    name: "Dj Koko",
    role: "Host",
    time: "9:02pm",
    message: "Welcome everyone! Goint lie in a few mins",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "2",
    name: "Tuval",
    role: null,
    time: "9:02pm",
    message: "Cant wait, already at the venue",
    avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "3",
    name: "Nosel",
    role: null,
    time: "9:02pm",
    message: "What track are you opening wiwth tonigt?",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
  }
];

export default function LiveRoomScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => safeBack(router, '/(tabs)/home')}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pre-show with DJ Nova</Text>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7}>
            <HugeiconsIcon icon={MoreHorizontalIcon} size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Live Info Bar */}
        <View style={styles.liveBar}>
          <View style={[styles.liveBadgeContainer, { backgroundColor: isDark ? "rgba(0, 200, 83, 0.15)" : "rgba(0, 200, 83, 0.1)" }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <View style={styles.listenerContainer}>
            <HugeiconsIcon icon={UserGroupIcon} size={16} color={colors.textSecondary} />
            <Text style={[styles.listenerText, { color: colors.textSecondary }]}>412 listening</Text>
          </View>
          <TouchableOpacity
            style={[styles.leaveBtn, { borderColor: "#F2545B" }]}
            activeOpacity={0.7}
            onPress={() => safeBack(router, '/(tabs)/home')}
          >
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Host Profile Section */}
          <View style={styles.hostSection}>
            <View style={styles.glowContainer}>
              <LinearGradient
                colors={[colors.primary + "4D", "transparent"]}
                style={styles.radialGlow}
              />
              <View style={[styles.avatarWrapper, { borderColor: colors.primary + "99", backgroundColor: colors.background }]}>
                <Image
                  source={{ uri: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=300&auto=format&fit=crop" }}
                  style={styles.hostAvatar}
                />
                <View style={styles.speakingBadge}>
                  <HugeiconsIcon icon={Mic01Icon} size={10} color="#FFF" />
                  <Text style={styles.speakingText}>Speaking</Text>
                </View>
              </View>
            </View>
            <View style={styles.hostInfo}>
              <Text style={[styles.hostName, { color: colors.text }]}>DJ Nova</Text>
              <View style={[styles.hostTag, { backgroundColor: colors.card }]}>
                <Text style={[styles.hostTagText, { color: colors.textSecondary }]}>Host</Text>
              </View>
            </View>

            {/* Equalizer Mockup */}
            <View style={styles.equalizer}>
              {[0.4, 0.7, 0.9, 0.5, 0.8, 0.4, 0.6, 1.0, 0.7, 0.4].map((h, i) => (
                <View key={i} style={[styles.eqBar, { backgroundColor: colors.primary, height: 20 * h }]} />
              ))}
            </View>
          </View>

          {/* Live Chat Section */}
          <View style={[styles.chatSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.chatHeading, { color: colors.text }]}>Live Chat</Text>
            {MOCK_CHAT.map((msg) => (
              <View key={msg.id} style={styles.chatItem}>
                <Image source={{ uri: msg.avatar }} style={styles.chatAvatar} />
                <View style={styles.chatContent}>
                  <View style={styles.chatMeta}>
                    <Text style={[styles.chatName, { color: colors.text }]}>{msg.name}</Text>
                    {msg.role && (
                      <View style={[styles.roleTag, { backgroundColor: colors.card }]}>
                        <Text style={[styles.roleTagText, { color: colors.textSecondary }]}>{msg.role}</Text>
                      </View>
                    )}
                    <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                    <Text style={[styles.chatTime, { color: colors.textSecondary }]}>{msg.time}</Text>
                  </View>
                  <Text style={[styles.chatMessage, { color: colors.text + "CC" }]}>{msg.message}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Interaction Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
            <TouchableOpacity style={[styles.micBtn, { backgroundColor: colors.card }]} activeOpacity={0.8}>
              <HugeiconsIcon icon={Mic01Icon} size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.emojiBtn}>
                <HugeiconsIcon icon={SmileIcon} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Add Comment"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: buttonBackground(colors) }]} activeOpacity={0.8}>
              <HugeiconsIcon icon={SentIcon} size={20} color={buttonForeground(colors)} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  liveBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  liveBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 16,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00C853",
    marginRight: 6,
  },
  liveText: {
    color: "#00C853",
    fontSize: 12,
    fontWeight: "bold",
  },
  listenerContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listenerText: {
    fontSize: 12,
  },
  leaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  leaveText: {
    color: "#F2545B",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  hostSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  glowContainer: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  radialGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 125,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    padding: 4,
  },
  hostAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },
  speakingBadge: {
    position: "absolute",
    bottom: -5,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00C853",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  speakingText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  hostInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  hostName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  hostTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hostTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  equalizer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 30,
    gap: 4,
    marginTop: 20,
  },
  eqBar: {
    width: 3,
    borderRadius: 2,
  },
  chatSection: {
    paddingHorizontal: 20,
    borderTopWidth: 1,
    paddingTop: 24,
  },
  chatHeading: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 20,
  },
  chatItem: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 12,
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatContent: {
    flex: 1,
  },
  chatMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
  },
  chatMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  emojiBtn: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
