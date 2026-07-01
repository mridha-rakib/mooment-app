import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { MomentInteractionSummary, MomentTimelineItem } from "@/lib/moments";
import FeedPost, { PostData } from "../post/FeedPost";
import RepostFeedCard from "../post/RepostFeedCard";
import ProfileEvents from "./ProfileEvents";
import { ProfileTabType } from "./ProfileTabs";

type ProfileContentProps = {
  activeTab: ProfileTabType;
  posts: PostData[];
  reposts?: MomentTimelineItem[];
  onCommentPress: (post: PostData) => void;
  onSharePress: (post: PostData) => void;
  onDeletePost?: (post: PostData) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  isOwnProfile?: boolean;
  profileUserId: string;
  profileIsFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  onRepostSuccess?: () => void;
};

export default function ProfileContent({ 
  activeTab, 
  posts, 
  reposts = [],
  onCommentPress, 
  onSharePress,
  onDeletePost,
  onInteractionChange,
  isOwnProfile = true,
  profileUserId,
  profileIsFollowing,
  onFollowChange,
  onRepostSuccess,
}: ProfileContentProps) {
  const { colors } = useTheme();
  const feedItems = [
    ...posts.map((post) => ({ type: 'post' as const, id: post.id, createdAt: post.createdAt ?? '', post })),
    ...reposts.map((share) => ({ type: 'repost' as const, id: share.id, createdAt: share.createdAt, share })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return (
    <View style={styles.container}>
      {activeTab === 'feed' && (
        feedItems.length > 0 ? (
          feedItems.map((item) => item.type === 'repost' ? (
            <RepostFeedCard key={`repost-${item.id}`} share={item.share} labelOverride={isOwnProfile ? 'Shared by you' : undefined} onRepostSuccess={onRepostSuccess} />
          ) : (
            <FeedPost key={`post-${item.id}`} post={item.post} onCommentPress={onCommentPress} onSharePress={onSharePress}
              onDeletePress={onDeletePost} onInteractionChange={onInteractionChange} isOwnPost={isOwnProfile} />
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
