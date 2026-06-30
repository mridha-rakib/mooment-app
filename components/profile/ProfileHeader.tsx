import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";

import MoreMenuModal from "../post/MoreMenuModal";
import BackButton from "../ui/BackButton";
import ChevronRightIcon from "../ui/ChevronRightIcon";
import CinematicButton from "../ui/CinematicButton";
import UserAvatar from "../ui/UserAvatar";

export type ProfileStats = {
  posts: number;
  reviews: number;
  followers: number;
  following: number;
};

const BUSINESS_RING_COLOR = '#FFD700';

type ProfileHeaderProps = {
  userId: string;
  name?: string | null;
  avatar?: string | null;
  stats: ProfileStats;
  accountType?: 'personal' | 'business';
  isOwnProfile?: boolean;
  onMenuPress?: () => void;
  onReport?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
};

export default function ProfileHeader({
  userId,
  name,
  avatar,
  stats,
  accountType,
  isOwnProfile = true,
  onMenuPress,
  onReport,
  onSave,
  isSaved = false,
}: ProfileHeaderProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [showMore, setShowMore] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  return (
    <View style={styles.container}>
      {isOwnProfile ? (
        <View style={styles.brandedHeader}>
          {!isSearching && (
            <>
              <CinematicButton
                icon={Menu01Icon}
                onPress={onMenuPress}
                size={24}
              />

              <View pointerEvents="none" style={styles.logoSlot}>
                <Image
                  source={require('@/assets/images/image.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </>
          )}

          <CinematicButton
            icon={Search01Icon}
            onPress={() => router.push('/discover-screen/search')}
            size={24}
          />
        </View>
      ) : (
        <View style={styles.topRow}>
          <BackButton size={20} style={styles.backBtnWithShadow} />

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
        onReport={onReport}
        onSave={onSave}
        isSaved={isSaved}
        top={110} // Positioned under the header button
      />

      <View style={styles.infoRow}>
        <View
        style={[styles.avatarBorder, { borderColor: accountType === 'business' ? BUSINESS_RING_COLOR : colors.primary }]}
        accessibilityLabel={accountType === 'business' ? 'Business account avatar' : 'Personal account avatar'}
      >
          <UserAvatar uri={avatar} name={name} size={80} style={styles.avatar} iconSize={36} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.posts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity onPress={() => router.push({
            pathname: '/profile-screen/reviews',
            params: { userId },
          })}>
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
          <TouchableOpacity onPress={() => router.push({
            pathname: '/profile-screen/followers',
            params: { userId },
          })}>
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
          <TouchableOpacity onPress={() => router.push({
            pathname: '/profile-screen/following',
            params: { userId },
          })}>
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
    paddingTop: 12,
  },
  brandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 5,
    position: 'relative',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    padding: 0,
  },
  logoImage: {
    width: 120,
    height: 28,
  },
  logoSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
  backBtnWithShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
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
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
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
