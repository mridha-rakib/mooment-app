import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfileActionsProps = {
  isOwnProfile?: boolean;
  onlyButtons?: boolean;
  initialIsFollowing?: boolean;
};

export default function ProfileActions({ isOwnProfile = true, onlyButtons = false, initialIsFollowing = false }: ProfileActionsProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  
  if (isOwnProfile) return null;

  const buttons = (
    <>
      <TouchableOpacity 
        style={styles.chatBtn} 
        activeOpacity={0.8}
        onPress={() => router.push('/chat-screen/chat-detail')}
      >
        <BlurView intensity={20} tint="dark" style={styles.chatBtnGlass}>
          <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#FFFFFF" />
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.followBtn, isFollowing && styles.followingBtn]} 
        activeOpacity={0.8}
        onPress={() => setIsFollowing(!isFollowing)}
      >
        <View style={styles.followBtnContent}>
          {isFollowing && (
            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chatBtnGlass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    paddingHorizontal: 24,
    height: 44,
    backgroundColor: '#D0D0D8',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  followBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followBtnText: {
    color: '#13131A',
    fontWeight: '700',
    fontSize: 14,
  },
  followingBtnText: {
    color: '#FFFFFF',
  },
});
