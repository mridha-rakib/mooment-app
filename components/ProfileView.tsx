import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { PostData } from "./FeedPost";
import ProfileActions from "./profile/ProfileActions";
import ProfileBio from "./profile/ProfileBio";
import ProfileContent from "./profile/ProfileContent";
import ProfileHeader, { ProfileStats } from "./profile/ProfileHeader";
import ProfileTabs, { ProfileTabType } from "./profile/ProfileTabs";
import CommentsModal from "./CommentsModal";
import AddProductModal from "./profile/AddProductModal";
import ProfileMenuDrawer from "./profile/ProfileMenuDrawer";
import ShareModal from "./ShareModal";

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
  isOwnProfile?: boolean;
};

export default function ProfileView({ user, posts, isOwnProfile = true }: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ProfileTabType>('feed');
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [addProductVisible, setAddProductVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader 
          avatar={user.avatar} 
          stats={user.stats} 
          isOwnProfile={isOwnProfile} 
          onMenuPress={() => setMenuVisible(true)}
        />
        <ProfileBio name={user.name} handle={user.handle} bio={user.bio} />
        <ProfileActions isOwnProfile={isOwnProfile} />
        
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <ProfileContent 
          activeTab={activeTab} 
          posts={posts} 
          onCommentPress={() => setCommentsVisible(true)}
          onSharePress={() => setShareVisible(true)}
        />
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <CommentsModal visible={commentsVisible} onClose={() => setCommentsVisible(false)} />
      <ShareModal visible={shareVisible} onClose={() => setShareVisible(false)} />
      
      <ProfileMenuDrawer 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        onAddProductPress={() => {
          setMenuVisible(false);
          setAddProductVisible(true);
        }}
        userName={user.name}
        userHandle={user.handle}
      />

      <AddProductModal 
        visible={addProductVisible} 
        onClose={() => setAddProductVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
});
