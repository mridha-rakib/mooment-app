import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type ProfileActionsProps = {
  isOwnProfile?: boolean;
  onlyButtons?: boolean;
  initialIsFollowing?: boolean;
};

export default function ProfileActions({ isOwnProfile = true, onlyButtons = false, initialIsFollowing = false }: ProfileActionsProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  
  if (isOwnProfile) return null;

  const buttons = (
    <>
      <TouchableOpacity 
        style={[styles.chatBtn, { backgroundColor: colors.card, borderColor: colors.border }]} 
        activeOpacity={0.8}
        onPress={() => router.push('/chat-screen/chat-detail')}
      >
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.chatBtnGlass}>
          <MaterialCommunityIcons name="chat-processing-outline" size={20} color={colors.text} />
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.followBtn, 
          { backgroundColor: colors.primary },
          isFollowing && [styles.followingBtn, { backgroundColor: colors.card, borderColor: colors.border }]
        ]} 
        activeOpacity={0.8}
        onPress={() => setIsFollowing(!isFollowing)}
      >
        <View style={styles.followBtnContent}>
          {isFollowing && (
            <MaterialCommunityIcons name="check" size={16} color={colors.text} style={{ marginRight: 6 }} />
          )}
          <Text style={[
            styles.followBtnText, 
            { color: colors.background },
            isFollowing && [styles.followingBtnText, { color: colors.text }]
          ]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );

  if (onlyButtons) return buttons;

  return (
    <View style={styles.container}>
      {buttons}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  chatBtn: {
    width: 52,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  chatBtnGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBtn: {
    borderWidth: 1,
  },
  followBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  followingBtnText: {},
});
