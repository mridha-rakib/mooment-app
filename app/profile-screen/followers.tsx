import ProfileFollowList from "@/components/profile/ProfileFollowList";
import BackButton from "@/components/ui/BackButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FollowersScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ userId?: string }>();
  const authUser = useAuthStore((state) => state.user);
  const userId = params.userId ?? authUser?.id;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={18} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Followers</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProfileFollowList userId={userId} type="followers" />
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
});
