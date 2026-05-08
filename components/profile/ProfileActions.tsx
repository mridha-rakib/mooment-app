import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfileActionsProps = {
  isOwnProfile?: boolean;
  onlyButtons?: boolean;
};

export default function ProfileActions({ isOwnProfile = true, onlyButtons = false }: ProfileActionsProps) {
  if (isOwnProfile) return null;

  const buttons = (
    <>
      <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8}>
        <BlurView intensity={20} tint="dark" style={styles.chatBtnGlass}>
          <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#FFFFFF" />
        </BlurView>
      </TouchableOpacity>

      <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
        <Text style={styles.followBtnText}>Follow</Text>
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
  followBtnText: {
    color: '#13131A',
    fontWeight: '700',
    fontSize: 14,
  },
});
