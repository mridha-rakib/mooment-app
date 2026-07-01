import React, { useCallback, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import type { MomentInteractionSummary, MomentTimelineItem, RepostPayload } from "@/lib/moments";
import CommentsModal from "../post/CommentsModal";
import ReportDetailsModal from "../modals/ReportDetailsModal";
import ReportModal from "../modals/ReportModal";
import { PostData } from "../post/FeedPost";
import ShareModal from "../post/ShareModal";
import AddProductModal from "./AddProductModal";
import ProfileActions from "./ProfileActions";
import ProfileBio from "./ProfileBio";
import ProfileContent from "./ProfileContent";
import ProfileHeader, { ProfileStats } from "./ProfileHeader";
import ProfileMenuDrawer from "./ProfileMenuDrawer";
import ProfileTabs, { ProfileTabType } from "./ProfileTabs";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { createReport } from "@/lib/reports";

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export type UserProfileData = {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  bio: string;
  stats: ProfileStats;
  accountType?: 'personal' | 'business';
  isFollowing?: boolean;
};

type ProfileViewProps = {
  user: UserProfileData;
  posts: PostData[];
  reposts?: MomentTimelineItem[];
  isOwnProfile?: boolean;
  onRepost?: (post: PostData, payload: RepostPayload) => Promise<void> | void;
  onDeletePost?: (post: PostData) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  onFollowChange?: (isFollowing: boolean) => void;
  onRefresh?: () => Promise<void>;
};

export default function ProfileView({
  user,
  posts,
  reposts = [],
  isOwnProfile = true,
  onRepost,
  onDeletePost,
  onInteractionChange,
  onFollowChange,
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
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportReasonVisible, setReportReasonVisible] = useState(false);
  const [reportDetailsVisible, setReportDetailsVisible] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const isReportSubmittingRef = useRef(false);

  const handleReportPress = useCallback(() => {
    if (isOwnProfile) return;

    if (!MONGO_OBJECT_ID_PATTERN.test(user.id)) {
      Alert.alert("Unable to report profile", "This profile cannot be reported right now.");
      return;
    }

    setReportReasonVisible(true);
  }, [isOwnProfile, user.id]);

  const handleReportReason = useCallback((reason: string) => {
    setReportReason(reason);
    setReportReasonVisible(false);
    setTimeout(() => setReportDetailsVisible(true), 300);
  }, []);

  const handleReportDetailsClose = useCallback(() => {
    if (isReportSubmitting) return;
    setReportDetailsVisible(false);
    setReportReason(null);
  }, [isReportSubmitting]);

  const handleSubmitProfileReport = useCallback(async (details: string) => {
    if (isReportSubmittingRef.current || !reportReason) {
      return;
    }

    isReportSubmittingRef.current = true;
    setIsReportSubmitting(true);

    try {
      await createReport({
        reportedUserId: user.id,
        targetType: "user",
        targetId: user.id,
        reason: reportReason,
        details: details.trim() || null,
      });
      setReportDetailsVisible(false);
      setReportReason(null);
      Alert.alert("Report submitted", "Thanks for letting us know. Our team will review this profile.");
    } catch (error) {
      Alert.alert("Unable to submit report", getAuthErrorMessage(error, "Please try again."));
      throw error;
    } finally {
      isReportSubmittingRef.current = false;
      setIsReportSubmitting(false);
    }
  }, [reportReason, user.id]);

  const handleSavePress = useCallback(() => {
    Alert.alert(
      "Save unavailable",
      "Profile save is not supported by the API yet. No saved state was changed.",
    );
  }, []);

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
          name={user.name}
          avatar={user.avatar}
          stats={user.stats}
          accountType={user.accountType}
          isOwnProfile={isOwnProfile}
          onMenuPress={() => setMenuVisible(true)}
          onReport={!isOwnProfile ? handleReportPress : undefined}
          onSave={!isOwnProfile ? handleSavePress : undefined}
        />
        <ProfileBio
          name={user.name}
          handle={user.handle}
          bio={user.bio}
          accountType={user.accountType}
          isOwnProfile={isOwnProfile}
          actions={
            <ProfileActions
              userId={user.id}
              userName={user.name}
              userAvatar={user.avatar}
              isOwnProfile={isOwnProfile}
              onlyButtons={true}
              initialIsFollowing={user.isFollowing}
              onFollowChange={onFollowChange}
            />
          }
        />
        {isOwnProfile && <ProfileActions isOwnProfile={isOwnProfile} />}
        
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} isOwnProfile={isOwnProfile} />
        <ProfileContent 
          activeTab={activeTab} 
          posts={posts} 
          reposts={reposts}
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
          profileIsFollowing={user.isFollowing}
          onFollowChange={onFollowChange}
          onRepostSuccess={onRefresh}
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
            ? async (payload) => {
                await onRepost(selectedSharePost, payload);
                setShareVisible(false);
                setSelectedSharePost(null);
              }
            : undefined
        }
        shareUrl={selectedSharePost ? `https://mooment.app/moments/${selectedSharePost.id}` : undefined}
        item={selectedSharePost ? {
          type: 'post', id: selectedSharePost.id, preview: selectedSharePost.caption,
          imageUrl: selectedSharePost.mediaItems?.[0]?.uri ?? selectedSharePost.mediaUris?.[0],
          authorName: selectedSharePost.authorName,
        } : undefined}
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

      <ReportModal
        visible={reportReasonVisible}
        onClose={() => setReportReasonVisible(false)}
        onReport={handleReportReason}
      />
      <ReportDetailsModal
        visible={reportDetailsVisible}
        onClose={handleReportDetailsClose}
        onDone={handleSubmitProfileReport}
        isSubmitting={isReportSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
