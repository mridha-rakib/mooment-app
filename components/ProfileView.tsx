import React, { useState } from "react";
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { PostData } from "./FeedPost";
import ProfileActions from "./profile/ProfileActions";
import ProfileBio from "./profile/ProfileBio";
import ProfileContent from "./profile/ProfileContent";
import ProfileHeader, { ProfileStats } from "./profile/ProfileHeader";
import ProfileTabs, { ProfileTabType } from "./profile/ProfileTabs";

const { width } = Dimensions.get("window");

export type UserProfileData = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  stats: ProfileStats;
};

type ProfileViewProps = {
  user: UserProfileData;
  posts: PostData[];
};

export default function ProfileView({ user, posts }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('feed');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader avatar={user.avatar} stats={user.stats} />
        <ProfileBio name={user.name} handle={user.handle} bio={user.bio} />
        <ProfileActions />
        
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <ProfileContent activeTab={activeTab} posts={posts} />
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
});
