import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ProfileActions() {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.chatBtn} activeOpacity={0.8}>
        <BlurView intensity={20} tint="dark" style={styles.chatBtnGlass}>
          <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#FFFFFF" />
        </BlurView>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.followBtn} activeOpacity={0.8}>
        <Text style={styles.followBtnText}>Follow</Text>
      </TouchableOpacity>
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
    width: 48,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chatBtnGlass: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#B2ABBA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followBtnText: {
    color: '#0e0d12',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
