import React from "react";
import { StyleSheet, View } from "react-native";
import FeedPost, { PostData } from "../post/FeedPost";
import ProfileEvents from "./ProfileEvents";
import ProfileShop from "./ProfileShop";
import { ProfileTabType } from "./ProfileTabs";

type ProfileContentProps = {
  activeTab: ProfileTabType;
  posts: PostData[];
  onCommentPress: () => void;
  onSharePress: () => void;
  isOwnProfile?: boolean;
};

export default function ProfileContent({ 
  activeTab, 
  posts, 
  onCommentPress, 
  onSharePress,
  isOwnProfile = true 
}: ProfileContentProps) {
  return (
    <View style={styles.container}>
      {activeTab === 'feed' && (
        posts.map((post) => (
          <FeedPost 
            key={post.id} 
            post={post} 
            onCommentPress={onCommentPress} 
            onSharePress={onSharePress} 
            isOwnPost={isOwnProfile}
          />
        ))
      )}
      
      {activeTab === 'events' && (
        <ProfileEvents 
          onCommentPress={onCommentPress} 
          onSharePress={onSharePress} 
        />
      )}
      
      {activeTab === 'shop' && (
        <ProfileShop 
          onCommentPress={onCommentPress} 
          onSharePress={onSharePress} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E9B',
    textAlign: 'center',
  }
});
