import ProfileFollowList from "@/components/profile/ProfileFollowList";
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FriendsTab = "followers" | "following";

export default function FriendsScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ userId?: string }>();
  const authUser = useAuthStore((state) => state.user);
  const userId = params.userId ?? authUser?.id;
  const [activeTab, setActiveTab] = useState<FriendsTab>("followers");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={18} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && [styles.activeTab, { borderBottomColor: colors.text }]]}
          activeOpacity={0.8}
          onPress={() => setActiveTab("followers")}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === "followers" ? colors.text : colors.textSecondary },
          ]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && [styles.activeTab, { borderBottomColor: colors.text }]]}
          activeOpacity={0.8}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === "following" ? colors.text : colors.textSecondary },
          ]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      <ProfileFollowList userId={userId} type={activeTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
