import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function HomeHeader() {
  const router = useRouter();
  
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.feedBtn} activeOpacity={0.8}>
        <View style={styles.greenDot} />
        <Text style={styles.feedText}>Feed</Text>
        <Feather name="chevron-down" size={14} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.logoText}>Mooment</Text>

      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => router.push('/search')}>
          <Feather name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
          <Feather name="sliders" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    left: width / 2 - 45, // approximate center
  },
  headerIcons: {
    flexDirection: "row",
  },
  iconBtn: {
    marginLeft: 20,
  },
});
