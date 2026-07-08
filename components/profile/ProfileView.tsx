import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import type { EventResponse, ProfileEventGroups } from "@/lib/events";
import type {
  MomentInteractionSummary,
  MomentTimelineItem,
  RepostPayload,
} from "@/lib/moments";
import { createReport } from "@/lib/reports";
import { getUserStories, type Story } from "@/lib/stories";
import { createStoryViewerSession } from "@/lib/storyViewerSession";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import ReportDetailsModal from "../modals/ReportDetailsModal";
import ReportModal from "../modals/ReportModal";
import CommentsModal from "../post/CommentsModal";
import { PostData } from "../post/FeedPost";
import ShareModal from "../post/ShareModal";
import AddProductModal from "./AddProductModal";
import ProfileAvatarModal, { type ProfileAvatarModalMode } from "./ProfileAvatarModal";
import ProfileActions from "./ProfileActions";
import ProfileBio from "./ProfileBio";
import ProfileContent from "./ProfileContent";
import ProfileHeader, { ProfileStats } from "./ProfileHeader";
import ProfileMenuDrawer from "./ProfileMenuDrawer";
import ProfileTabs, { ProfileTabType } from "./ProfileTabs";

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const PROFILE_STORY_CACHE_TTL_MS = 15_000;
const PROFILE_STORY_CHECK_TIMEOUT_MS = 3_000;

type ProfileStoryItem = {
  id: string;
  mediaType: Story["mediaType"];
  mediaUri?: string | null;
  contentType?: string | null;
  durationSeconds: number;
  caption?: string | null;
  textContent?: string | null;
  textBackground?: Story["textBackground"];
  textOverlay?: Story["textOverlay"];
  createdAt?: string;
  expiresAt?: string;
  viewsCount?: number;
  reactionsCount?: number;
  commentsCount?: number;
  isReacted?: boolean;
  isOwner?: boolean;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string | null;
};

const getActiveStories = (stories: Story[]) => {
  const now = Date.now();

  return stories.filter((story) => {
    const expiresAt = new Date(story.expiresAt).getTime();
    return !Number.isFinite(expiresAt) || expiresAt > now;
  });
};

export type UserProfileData = {
  id: string;
  name: string;
  handle: string;
  avatar?: string | null;
  bio: string;
  stats: ProfileStats;
  accountType?: "personal" | "business";
  isFollowing?: boolean;
};

type ProfileViewProps = {
  user: UserProfileData;
  posts: PostData[];
  reposts?: MomentTimelineItem[];
  isOwnProfile?: boolean;
  onRepost?: (post: PostData, payload: RepostPayload) => Promise<void> | void;
  onDeletePost?: (post: PostData) => void;
  onInteractionChange?: (
    postId: string,
    summary: MomentInteractionSummary,
  ) => void;
  onFollowChange?: (isFollowing: boolean) => void;
  onRefresh?: () => Promise<void>;
  profileEvents: ProfileEventGroups;
  onProfileEventsChange?: (events: ProfileEventGroups) => void;
  profileFeedEvents?: EventResponse[];
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
  profileEvents,
  onProfileEventsChange,
  profileFeedEvents,
}: ProfileViewProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTabType>("feed");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [avatarModalMode, setAvatarModalMode] = useState<ProfileAvatarModalMode>(null);
  const profileStoriesRef = useRef<{
    userId: string;
    stories: Story[];
    fetchedAt: number;
  } | null>(null);
  const profileStoriesRequestRef = useRef<{ userId: string; request: Promise<Story[]> } | null>(null);
  const avatarTapInFlightRef = useRef(false);
  const storyNavigationInFlightRef = useRef(false);
  const viewedUserIdRef = useRef(user.id);

  viewedUserIdRef.current = user.id;

  const loadProfileStories = useCallback(() => {
    const cached = profileStoriesRef.current;
    if (
      cached?.userId === user.id &&
      Date.now() - cached.fetchedAt < PROFILE_STORY_CACHE_TTL_MS
    ) {
      return Promise.resolve(getActiveStories(cached.stories));
    }

    const pending = profileStoriesRequestRef.current;
    if (pending?.userId === user.id) {
      return pending.request;
    }

    const requestedUserId = user.id;
    const request = getUserStories(requestedUserId)
      .then(getActiveStories)
      .catch(() => [] as Story[])
      .then((stories) => {
        if (viewedUserIdRef.current === requestedUserId) {
          profileStoriesRef.current = {
            userId: requestedUserId,
            stories,
            fetchedAt: Date.now(),
          };
        }
        return stories;
      })
      .finally(() => {
        if (profileStoriesRequestRef.current?.request === request) {
          profileStoriesRequestRef.current = null;
        }
      });

    profileStoriesRequestRef.current = { userId: requestedUserId, request };
    return request;
  }, [user.id]);

  useEffect(() => {
    setAvatarModalMode(null);
    avatarTapInFlightRef.current = false;
    storyNavigationInFlightRef.current = false;
    void loadProfileStories();
  }, [loadProfileStories]);

  const handleAvatarPress = useCallback(async () => {
    if (avatarTapInFlightRef.current || avatarModalMode) {
      return;
    }

    avatarTapInFlightRef.current = true;
    const requestedUserId = user.id;

    try {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const stories = await Promise.race([
        loadProfileStories(),
        new Promise<Story[]>((resolve) => {
          timeoutId = setTimeout(
            () => resolve([]),
            PROFILE_STORY_CHECK_TIMEOUT_MS,
          );
        }),
      ]);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (viewedUserIdRef.current !== requestedUserId) {
        return;
      }
      setAvatarModalMode(stories.length > 0 ? "actions" : "preview");
    } finally {
      avatarTapInFlightRef.current = false;
    }
  }, [avatarModalMode, loadProfileStories, user.id]);

  const handleViewProfileStory = useCallback(() => {
    if (storyNavigationInFlightRef.current) {
      return;
    }

    const stories = getActiveStories(
      profileStoriesRef.current?.userId === user.id
        ? profileStoriesRef.current.stories
        : [],
    ).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const storyItems = stories
      .map<ProfileStoryItem>((story) => ({
        id: story.id,
        mediaType: story.mediaType,
        mediaUri: story.mediaUrl,
        contentType: story.contentType,
        durationSeconds: story.durationSeconds || 15,
        caption: story.caption,
        textContent: story.textContent,
        textBackground: story.textBackground,
        textOverlay: story.textOverlay,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewsCount: story.viewsCount,
        reactionsCount: story.reactionsCount,
        commentsCount: story.commentsCount,
        isReacted: story.isReacted,
        isOwner: story.isOwner,
        authorId: story.author?.id ?? story.userId,
        authorName: story.author?.name ?? user.name,
        authorAvatar: story.author?.avatarUrl ?? user.avatar,
      }))
      .filter((story) => story.mediaType === "text" || Boolean(story.mediaUri));

    if (storyItems.length === 0) {
      setAvatarModalMode("preview");
      return;
    }

    storyNavigationInFlightRef.current = true;
    const latestStory = storyItems[storyItems.length - 1];
    const title = latestStory.authorName ?? user.name ?? "Story";
    const group = {
      title,
      authorId: latestStory.authorId ?? user.id,
      authorAvatar: latestStory.authorAvatar ?? user.avatar,
      stories: storyItems,
    };
    const storySessionId = createStoryViewerSession({
      activeTab: "discover",
      discoverGroups: [group],
      friendGroups: [],
    });

    setAvatarModalMode(null);
    router.push({
      pathname: "/post-screen/view-story",
      params: {
        stories: JSON.stringify(storyItems),
        title,
        openedAt: String(Date.now()),
        storySessionId,
        groupIndex: "0",
      },
    });
    setTimeout(() => {
      storyNavigationInFlightRef.current = false;
    }, 750);
  }, [router, user.avatar, user.id, user.name]);

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
  const [selectedSharePost, setSelectedSharePost] = useState<PostData | null>(
    null,
  );
  const [selectedCommentPost, setSelectedCommentPost] =
    useState<PostData | null>(null);
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
      Alert.alert(
        "Unable to report profile",
        "This profile cannot be reported right now.",
      );
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

  const handleSubmitProfileReport = useCallback(
    async (details: string) => {
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
        Alert.alert(
          "Report submitted",
          "Thanks for letting us know. Our team will review this profile.",
        );
      } catch (error) {
        Alert.alert(
          "Unable to submit report",
          getAuthErrorMessage(error, "Please try again."),
        );
        throw error;
      } finally {
        isReportSubmittingRef.current = false;
        setIsReportSubmitting(false);
      }
    },
    [reportReason, user.id],
  );

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
          onAvatarPress={() => void handleAvatarPress()}
          onReport={!isOwnProfile ? handleReportPress : undefined}
          onSave={!isOwnProfile ? handleSavePress : undefined}
          onEventsPress={() =>
            router.push({
              pathname: "/profile-screen/all-events",
              params: { userId: user.id },
            })
          }
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

        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOwnProfile={isOwnProfile}
        />
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
            setSelectedCommentPost((currentPost) =>
              currentPost?.id === postId
                ? {
                    ...currentPost,
                    likesCount: summary.likesCount,
                    commentsCount: summary.commentsCount,
                    sharesCount: summary.sharesCount,
                    isLiked: summary.isLiked,
                  }
                : currentPost,
            );
          }}
          isOwnProfile={isOwnProfile}
          profileUserId={user.id}
          profileIsFollowing={user.isFollowing}
          onFollowChange={onFollowChange}
          onRepostSuccess={onRefresh}
          profileEvents={profileEvents}
          onProfileEventsChange={onProfileEventsChange}
          profileFeedEvents={profileFeedEvents}
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
          setSelectedCommentPost((currentPost) =>
            currentPost?.id === summary.momentId
              ? {
                  ...currentPost,
                  likesCount: summary.likesCount,
                  commentsCount: summary.commentsCount,
                  sharesCount: summary.sharesCount,
                  isLiked: summary.isLiked,
                }
              : currentPost,
          );
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
        shareUrl={
          selectedSharePost
            ? `https://mooment.app/moments/${selectedSharePost.id}`
            : undefined
        }
        item={
          selectedSharePost
            ? {
                type: "post",
                id: selectedSharePost.id,
                preview: selectedSharePost.caption,
                imageUrl:
                  selectedSharePost.mediaItems?.[0]?.uri ??
                  selectedSharePost.mediaUris?.[0],
                authorName: selectedSharePost.authorName,
              }
            : undefined
        }
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

      <ProfileAvatarModal
        mode={avatarModalMode}
        avatar={user.avatar}
        name={user.name}
        onClose={() => setAvatarModalMode(null)}
        onViewStory={handleViewProfileStory}
        onViewProfilePicture={() => setAvatarModalMode("preview")}
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
