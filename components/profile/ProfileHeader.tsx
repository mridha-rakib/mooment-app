import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";

import MoreMenuModal from "../post/MoreMenuModal";
import BackButton from "../ui/BackButton";
import ChevronRightIcon from "../ui/ChevronRightIcon";

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
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [showMore, setShowMore] = React.useState(false);

  return (
    <View style={styles.container}>
      {isOwnProfile ? (
        <View style={styles.brandedHeader}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onMenuPress}>
            <HugeiconsIcon icon={Menu01Icon} size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.logoText, { color: colors.text }]}>Mooment</Text>

          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <HugeiconsIcon icon={Search01Icon} size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.topRow}>
          <BackButton size={20} />

          <TouchableOpacity
            style={styles.moreBtn}
            activeOpacity={0.8}
            onPress={() => setShowMore(true)}
          >
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.glassCircle}>
              <Feather name="more-horizontal" size={20} color={colors.text} />
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      <MoreMenuModal
        visible={showMore}
        onClose={() => setShowMore(false)}
        showDelete={false}
        onReport={() => console.log('Report profile')}
        onSave={() => console.log('Save profile')}
        top={110} // Positioned under the header button
      />

      <View style={styles.infoRow}>
        <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.posts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity onPress={() => router.push('/profile-screen/reviews')}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.reviews}</Text>
              <View style={styles.labelRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reviews</Text>
                <View style={styles.chevronWrapper}>
                  <ChevronRightIcon />
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity onPress={() => router.push('/profile-screen/followers')}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.followers}</Text>
              <View style={styles.labelRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
                <View style={styles.chevronWrapper}>
                  <ChevronRightIcon />
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity onPress={() => router.push('/profile-screen/following')}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.following}</Text>
              <View style={styles.labelRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
                <View style={styles.chevronWrapper}>
                  <ChevronRightIcon />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  logoText: {
    fontFamily: 'OleoScript-Regular',
    fontSize: 28,
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  chevronWrapper: {
    marginTop: 4,
    marginLeft: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
});
