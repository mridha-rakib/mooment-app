import React, { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import CommentsModal from "../post/CommentsModal";
import { PostData } from "../post/FeedPost";
import ShareModal from "../post/ShareModal";
import AddProductModal from "./AddProductModal";
import ProfileActions from "./ProfileActions";
import ProfileBio from "./ProfileBio";
import ProfileContent from "./ProfileContent";
import ProfileHeader, { ProfileStats } from "./ProfileHeader";
import ProfileMenuDrawer from "./ProfileMenuDrawer";
import ProfileTabs, { ProfileTabType } from "./ProfileTabs";

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
        <ProfileBio 
          name={user.name} 
          handle={user.handle} 
          bio={user.bio} 
          isOwnProfile={isOwnProfile}
          actions={<ProfileActions isOwnProfile={isOwnProfile} onlyButtons={true} />}
        />
        {isOwnProfile && <ProfileActions isOwnProfile={isOwnProfile} />}
        
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} isOwnProfile={isOwnProfile} />
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
