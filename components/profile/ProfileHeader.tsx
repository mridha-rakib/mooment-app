import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";

export type ProfileStats = {
  posts: number;
  reviews: number;
  followers: number;
  following: number;
};

type ProfileHeaderProps = {
  avatar: string;
  stats: ProfileStats;
  isOwnProfile?: boolean;
  onMenuPress?: () => void;
};

export default function ProfileHeader({ avatar, stats, isOwnProfile = true, onMenuPress }: ProfileHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {isOwnProfile ? (
        <View style={styles.brandedHeader}>
          <TouchableOpacity style={styles.iconBtn} onPress={onMenuPress}>
            <HugeiconsIcon icon={Menu01Icon} size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text style={styles.logoText}>Mooment</Text>
          
          <TouchableOpacity style={styles.iconBtn}>
            <HugeiconsIcon icon={Search01Icon} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={styles.glassCircle}>
              <Feather name="chevron-left" size={20} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.moreBtn} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={styles.glassCircle}>
              <Feather name="more-horizontal" size={20} color="#FFFFFF" />
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoRow}>
        <View style={styles.avatarBorder}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.posts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.reviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  brandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#13131A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A22',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    fontStyle: 'italic',
    letterSpacing: -1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  glassCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backBtn: {},
  moreBtn: {},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatarBorder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FF7D54',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#8E8E9B',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A3A',
  },
});
