import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import type { MomentInteractionSummary } from "@/lib/moments";
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
  accountType?: 'personal' | 'business';
  isFollowing?: boolean;
};

type ProfileViewProps = {
  user: UserProfileData;
  posts: PostData[];
  isOwnProfile?: boolean;
  onRepost?: (post: PostData) => Promise<void> | void;
  onDeletePost?: (post: PostData) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  onRefresh?: () => Promise<void>;
};

export default function ProfileView({
  user,
  posts,
  isOwnProfile = true,
  onRepost,
  onDeletePost,
  onInteractionChange,
  onRefresh,
}: ProfileViewProps) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('feed');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [selectedSharePost, setSelectedSharePost] = useState<PostData | null>(null);
  const [selectedCommentPost, setSelectedCommentPost] = useState<PostData | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [addProductVisible, setAddProductVisible] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          ) : undefined
        }
      >
        <ProfileHeader
          userId={user.id}
          avatar={user.avatar}
          stats={user.stats}
          accountType={user.accountType}
          isOwnProfile={isOwnProfile}
          onMenuPress={() => setMenuVisible(true)}
        />
        <ProfileBio
          name={user.name}
          handle={user.handle}
          bio={user.bio}
          accountType={user.accountType}
          isOwnProfile={isOwnProfile}
          actions={<ProfileActions isOwnProfile={isOwnProfile} onlyButtons={true} initialIsFollowing={user.isFollowing} />}
        />
        {isOwnProfile && <ProfileActions isOwnProfile={isOwnProfile} />}
        
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} isOwnProfile={isOwnProfile} />
        <ProfileContent 
          activeTab={activeTab} 
          posts={posts} 
          onCommentPress={(post) => {
            setSelectedCommentPost(post);
            setCommentsVisible(true);
          }}
          onSharePress={(post) => {
            setSelectedSharePost(post);
            setShareVisible(true);
          }}
          onDeletePost={onDeletePost}
          onInteractionChange={(postId, summary) => {
            onInteractionChange?.(postId, summary);
            setSelectedCommentPost((currentPost) => (
              currentPost?.id === postId
                ? {
                    ...currentPost,
                    likesCount: summary.likesCount,
                    commentsCount: summary.commentsCount,
                    sharesCount: summary.sharesCount,
                    isLiked: summary.isLiked,
                  }
                : currentPost
            ));
          }}
          isOwnProfile={isOwnProfile}
          profileUserId={user.id}
        />
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <CommentsModal
        visible={commentsVisible}
        onClose={() => {
          setCommentsVisible(false);
          setSelectedCommentPost(null);
        }}
        momentId={selectedCommentPost?.id}
        likesCount={selectedCommentPost?.likesCount ?? 0}
        sharesCount={selectedCommentPost?.sharesCount ?? 0}
        onInteractionChange={(summary) => {
          onInteractionChange?.(summary.momentId, summary);
          setSelectedCommentPost((currentPost) => (
            currentPost?.id === summary.momentId
              ? {
                  ...currentPost,
                  likesCount: summary.likesCount,
                  commentsCount: summary.commentsCount,
                  sharesCount: summary.sharesCount,
                  isLiked: summary.isLiked,
                }
              : currentPost
          ));
        }}
      />
      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        onRepost={
          selectedSharePost && onRepost
            ? async () => {
                await onRepost(selectedSharePost);
                setShareVisible(false);
                setSelectedSharePost(null);
              }
            : undefined
        }
        shareUrl={selectedSharePost ? `https://mooment.app/moments/${selectedSharePost.id}` : undefined}
      />
      
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
  },
});
