import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { MomentInteractionSummary } from "@/lib/moments";
import FeedPost, { PostData } from "../post/FeedPost";
import ProfileEvents from "./ProfileEvents";
import ProfileShop from "./ProfileShop";
import { ProfileTabType } from "./ProfileTabs";

type ProfileContentProps = {
  activeTab: ProfileTabType;
  posts: PostData[];
  onCommentPress: (post: PostData) => void;
  onSharePress: (post: PostData) => void;
  onDeletePost?: (post: PostData) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  isOwnProfile?: boolean;
  profileUserId: string;
  profileIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
};

export default function ProfileContent({ 
  activeTab, 
  posts, 
  onCommentPress, 
  onSharePress,
  onDeletePost,
  onInteractionChange,
  isOwnProfile = true,
  profileUserId,
  profileIsFollowing,
  onFollowChange,
}: ProfileContentProps) {
  const { colors } = useTheme();
  
  return (
    <View style={styles.container}>
      {activeTab === 'feed' && (
        posts.length > 0 ? (
          posts.map((post) => (
            <FeedPost 
              key={post.id} 
              post={post} 
              onCommentPress={onCommentPress} 
              onSharePress={onSharePress} 
              onDeletePress={onDeletePost}
              onInteractionChange={onInteractionChange}
              isOwnPost={isOwnProfile}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet</Text>
          </View>
        )
      )}
      
      {activeTab === 'events' && (
        <ProfileEvents 
          onCommentPress={onCommentPress} 
          onSharePress={onSharePress}
          isOwnProfile={isOwnProfile}
          profileUserId={profileUserId}
          profileIsFollowing={profileIsFollowing}
          onFollowChange={onFollowChange}
        />
      )}
      
      {/* Shop content hidden — preserved for future restoration
      {activeTab === 'shop' && (
        <ProfileShop 
          onCommentPress={onCommentPress} 
          onSharePress={onSharePress}
          isOwnProfile={isOwnProfile}
        />
      )}
      */}
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
    textAlign: 'center',
  }
});
