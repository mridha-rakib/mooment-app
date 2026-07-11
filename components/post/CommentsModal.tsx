import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
import {
  createMomentComment,
  getMomentComments,
  toggleCommentReaction,
  type MomentComment,
  type MomentInteractionSummary,
} from "@/lib/moments";
import { getStorageFileUrl } from "@/lib/storage";
import { navigateToProfile } from "@/lib/profileNavigation";
import {
  createStoryComment,
  getStoryComments,
  type StoryComment,
  type StoryInteraction,
} from "@/lib/stories";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UserAvatar from "../ui/UserAvatar";
import { useAuthStore } from "@/stores/authStore";

type CommentType = {
  id: string;
  parentCommentId?: string | null;
  authorId?: string;
  authorName: string;
  authorAvatar?: string | null;
  text: string;
  createdAt: string;
  timeAgo: string;
  likesCount: number;
  isLiked?: boolean;
  replies?: CommentType[];
};

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const getKeyboardBottomInset = (
  coordinates: { height: number; screenY?: number },
  containerHeight = Dimensions.get("screen").height,
) => {
  const keyboardHeight = Math.max(0, coordinates.height);
  const keyboardTop =
    typeof coordinates.screenY === "number" ? coordinates.screenY : null;

  if (keyboardTop === null) {
    return keyboardHeight;
  }

  const frameOverlap = Math.max(0, containerHeight - keyboardTop);

  return frameOverlap;
};

const formatCommentTimeAgo = (createdAt: string) => {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000),
  );

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays}d`;
};

const momentCommentToComment = (comment: MomentComment): CommentType => ({
  id: comment.id,
  parentCommentId: comment.parentCommentId ?? null,
  authorId: comment.author?.id,
  authorName: comment.author?.name ?? "Mooment User",
  authorAvatar:
    (comment.author?.avatarKey
      ? getStorageFileUrl(comment.author.avatarKey)
      : null) ??
    comment.author?.avatarUrl ??
    null,
  text: comment.text,
  createdAt: comment.createdAt,
  timeAgo: formatCommentTimeAgo(comment.createdAt),
  likesCount: comment.likesCount,
  isLiked: comment.isLiked,
  replies: comment.replies.map(momentCommentToComment),
});

const storyCommentToComment = (comment: StoryComment): CommentType => ({
  id: comment.id,
  parentCommentId: comment.parentCommentId ?? null,
  authorId: comment.author?.id,
  authorName: comment.author?.name ?? "Mooment User",
  authorAvatar:
    comment.author?.avatarUrl ??
    (comment.author?.avatarKey
      ? getStorageFileUrl(comment.author.avatarKey)
      : null),
  text: comment.text,
  createdAt: comment.createdAt,
  timeAgo: formatCommentTimeAgo(comment.createdAt),
  likesCount: comment.likesCount,
  isLiked: comment.isLiked,
  replies: comment.replies.map(storyCommentToComment),
});

const sortCommentsByCreatedAt = (comments: CommentType[]) =>
  [...comments].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );

const flattenReplies = (replies: CommentType[]): CommentType[] =>
  sortCommentsByCreatedAt(
    replies.flatMap((reply) => [
      { ...reply, replies: [] },
      ...flattenReplies(reply.replies ?? []),
    ]),
  );

const normalizeCommentThreads = (comments: CommentType[]): CommentType[] =>
  sortCommentsByCreatedAt(comments).map((comment) => ({
    ...comment,
    parentCommentId: null,
    replies: flattenReplies(comment.replies ?? []),
  }));

const hasCommentId = (comments: CommentType[], commentId: string): boolean =>
  comments.some(
    (comment) =>
      comment.id === commentId ||
      Boolean(comment.replies?.length && hasCommentId(comment.replies, commentId)),
  );

const appendCommentToRootThread = (
  comments: CommentType[],
  rootParentId: string,
  reply: CommentType,
): CommentType[] =>
  comments.map((comment) => {
    if (comment.id !== rootParentId) {
      return comment;
    }

    if (hasCommentId(comment.replies ?? [], reply.id)) {
      return comment;
    }

    return {
      ...comment,
      replies: sortCommentsByCreatedAt([
        ...(comment.replies ?? []),
        {
          ...reply,
          parentCommentId: rootParentId,
          replies: [],
        },
      ]),
    };
  });

export default function CommentsModal({
  visible,
  onClose,
  momentId,
  likesCount = 0,
  sharesCount = 0,
  onInteractionChange,
  entityType = "moment",
  onStoryInteractionChange,
}: {
  visible: boolean;
  onClose: () => void;
  momentId?: string | null;
  likesCount?: number;
  sharesCount?: number;
  onInteractionChange?: (summary: MomentInteractionSummary) => void;
  entityType?: "moment" | "story";
  onStoryInteractionChange?: (interaction: StoryInteraction) => void;
}) {
  const { colors, isDark } = useTheme();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [expandedReplyThreadIds, setExpandedReplyThreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    rootParentId: string;
    name: string;
  } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardShown, setIsKeyboardShown] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isInputFocusedRef = useRef(false);
  const wasKeyboardVisibleRef = useRef(false);
  const suppressKeyboardHideCloseRef = useRef(false);
  const keyboardCoordinatesRef = useRef<{
    height: number;
    screenY?: number;
  } | null>(null);
  const overlayHeightRef = useRef(Dimensions.get("screen").height);
  const translateY = useRef(new Animated.Value(0)).current;
  // Android: set to true when the send button receives a touch-start.
  // Checked in TextInput.onBlur so we can send even though Android's Dialog
  // consumes the first tap to dismiss the keyboard before onPress fires.
  const sendBtnPressedRef = useRef(false);
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const insets = useSafeAreaInsets();
  const canUseCommentsApi = Boolean(
    momentId && MONGO_OBJECT_ID_PATTERN.test(momentId),
  );
  const sheetTranslateY = React.useMemo(
    () =>
      translateY.interpolate({
        inputRange: [-72, 0],
        outputRange: [-72, 0],
        extrapolateLeft: "clamp",
        extrapolateRight: "extend",
      }),
    [translateY],
  );
  const handlePanResponderMove = React.useMemo(
    () =>
      Animated.event([null, { dy: translateY }], {
        useNativeDriver: false,
      }),
    [translateY],
  );
  const closeFromDrag = useCallback(() => {
    Animated.timing(translateY, {
      toValue: overlayHeightRef.current,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose, translateY]);
  const dragResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          translateY.stopAnimation(() => {
            translateY.setValue(0);
          });
        },
        onPanResponderMove: handlePanResponderMove,
        onPanResponderRelease: (_event, gesture) => {
          const shouldClose =
            gesture.dy > 120 || gesture.vy > 0.9;

          if (shouldClose) {
            closeFromDrag();
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 70,
            friction: 10,
          }).start();
        },
      }),
    [closeFromDrag, handlePanResponderMove, translateY],
  );

  const loadComments = useCallback(async () => {
    if (!momentId || !MONGO_OBJECT_ID_PATTERN.test(momentId)) {
      setComments([]);
      setExpandedReplyThreadIds(new Set());
      return;
    }

    setIsLoadingComments(true);

    try {
      if (entityType === "story") {
        setComments(
          normalizeCommentThreads(
            (await getStoryComments(momentId)).map(storyCommentToComment),
          ),
        );
      } else {
        setComments(
          normalizeCommentThreads(
            (await getMomentComments(momentId)).map(momentCommentToComment),
          ),
        );
      }
    } catch (error) {
      Alert.alert(
        "Unable to load comments",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsLoadingComments(false);
    }
  }, [entityType, momentId]);

  useEffect(() => {
    if (visible) {
      setReplyingTo(null);
      setCommentText("");
      setComments([]);
      setExpandedReplyThreadIds(new Set());
      setIsKeyboardShown(false);
      translateY.setValue(0);
      void loadComments();
      return;
    }
    setIsKeyboardShown(false);
    translateY.setValue(0);
  }, [loadComments, translateY, visible]);

  const updateKeyboardHeight = useCallback(
    (coordinates: { height: number; screenY?: number }) => {
      keyboardCoordinatesRef.current = coordinates;
      setKeyboardHeight(
        getKeyboardBottomInset(coordinates, overlayHeightRef.current),
      );
    },
    [],
  );

  const handleOverlayLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      overlayHeightRef.current = event.nativeEvent.layout.height;

      if (keyboardCoordinatesRef.current) {
        setKeyboardHeight(
          getKeyboardBottomInset(
            keyboardCoordinatesRef.current,
            overlayHeightRef.current,
          ),
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      // Track the actual bottom inset covered by the keyboard so the composer
      // stays above Android IME/navigation bar combinations inside Modal.
      // This replaces KeyboardAvoidingView, which has a known Android bug where
      // behavior="height" doesn't fully restore height after keyboard dismiss,
      // leaving a transparent gap that exposes the activity tab bar underneath.
      setIsKeyboardShown(true);
      updateKeyboardHeight(e.endCoordinates);
      if (Platform.OS === "android") {
        wasKeyboardVisibleRef.current = true;
      }
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardCoordinatesRef.current = null;
      setIsKeyboardShown(false);
      setKeyboardHeight(0);
      if (Platform.OS === "android") {
        const shouldClose =
          !suppressKeyboardHideCloseRef.current &&
          isInputFocusedRef.current &&
          wasKeyboardVisibleRef.current;
        wasKeyboardVisibleRef.current = false;
        suppressKeyboardHideCloseRef.current = false;

        // Android sends Back to the IME before the Modal. Close the sheet when
        // that Back press dismisses the keyboard from the focused comment input.
        if (shouldClose) {
          inputRef.current?.blur();
          onClose();
        }
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      keyboardCoordinatesRef.current = null;
      setIsKeyboardShown(false);
      setKeyboardHeight(0);
      isInputFocusedRef.current = false;
      wasKeyboardVisibleRef.current = false;
      suppressKeyboardHideCloseRef.current = false;
      translateY.setValue(0);
    };
  }, [onClose, translateY, updateKeyboardHeight, visible]);

  const toggleCommentLike = async (commentId: string) => {
    if (entityType === "story") return;
    if (!canUseCommentsApi) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const findInTree = (
      items: CommentType[],
      id: string,
    ): CommentType | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        const found = item.replies ? findInTree(item.replies, id) : undefined;
        if (found) return found;
      }
      return undefined;
    };

    const target = findInTree(comments, commentId);
    if (!target) return;

    const prevIsLiked = target.isLiked ?? false;
    const prevLikesCount = target.likesCount;

    const applyUpdate = (
      items: CommentType[],
      isLiked: boolean,
      likesCount: number,
    ): CommentType[] =>
      items.map((item) => {
        if (item.id === commentId) return { ...item, isLiked, likesCount };
        if (item.replies?.length)
          return {
            ...item,
            replies: applyUpdate(item.replies, isLiked, likesCount),
          };
        return item;
      });

    // Optimistic update
    const newIsLiked = !prevIsLiked;
    const newLikesCount = newIsLiked
      ? prevLikesCount + 1
      : Math.max(0, prevLikesCount - 1);
    setComments((prev) => applyUpdate(prev, newIsLiked, newLikesCount));

    try {
      const { isLiked, likesCount } = await toggleCommentReaction(
        momentId!,
        commentId,
      );
      setComments((prev) => applyUpdate(prev, isLiked, likesCount));
    } catch {
      setComments((prev) => applyUpdate(prev, prevIsLiked, prevLikesCount));
    }
  };

  const handleReplyPress = (
    item: CommentType,
    rootParentId: string,
  ) => {
    setReplyingTo({ id: item.id, rootParentId, name: item.authorName });
    inputRef.current?.focus();
  };

  const toggleReplyThread = (commentId: string) => {
    setExpandedReplyThreadIds((current) => {
      const next = new Set(current);

      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }

      return next;
    });
  };

  const handleProfilePress = (item: CommentType) => {
    onClose();
    // Use a small timeout to allow modal to close before navigating
    setTimeout(() => {
      navigateToProfile(router, currentUserId, {
        userId: item.authorId,
        name: item.authorName,
        avatar: item.authorAvatar,
      });
    }, 300);
  };

  const handleSendComment = async () => {
    const trimmedText = commentText.trim();

    if (!trimmedText || !momentId || !canUseCommentsApi || isSendingComment) {
      return;
    }

    setIsSendingComment(true);

    try {
      const payload = {
        text: trimmedText,
        parentCommentId: replyingTo?.rootParentId ?? null,
      };
      const result =
        entityType === "story"
          ? await createStoryComment(momentId, payload)
          : await createMomentComment(momentId, payload);

      const newComment =
        entityType === "story"
          ? storyCommentToComment(result.comment as StoryComment)
          : momentCommentToComment(result.comment as MomentComment);
      const parentId = replyingTo?.rootParentId ?? null;

      // Capture parentId before clearing replyingTo so the setComments
      // updater below can close over the correct value.
      setCommentText("");
      setReplyingTo(null);
      suppressKeyboardHideCloseRef.current = true;
      isInputFocusedRef.current = false;
      inputRef.current?.blur();
      Keyboard.dismiss();
      setIsKeyboardShown(false);
      setKeyboardHeight(0);
      if ("summary" in result) onInteractionChange?.(result.summary);
      if ("interaction" in result)
        onStoryInteractionChange?.(result.interaction);

      // Append the server-returned comment directly instead of re-fetching
      // the full list. Re-fetching triggers isLoadingComments true→false which
      // replaces the ScrollView content twice while the keyboard is visible,
      // causing the KeyboardAvoidingView to re-measure its offset each time
      // and producing the visible shake/jump on send.
      if (parentId) {
        setExpandedReplyThreadIds((current) => {
          const next = new Set(current);
          next.add(parentId);
          return next;
        });
      }

      setComments((prev) => {
        if (!parentId) {
          if (hasCommentId(prev, newComment.id)) {
            return prev;
          }

          return [...prev, newComment];
        }

        return appendCommentToRootThread(prev, parentId, newComment);
      });
    } catch (error) {
      Alert.alert(
        "Unable to post comment",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsSendingComment(false);
    }
  };

  const renderComment = (
    item: CommentType,
    options: {
      isChild?: boolean;
      isLast?: boolean;
      rootParentId: string;
    },
  ) => {
    const isChild = options.isChild ?? false;
    const isLast = options.isLast ?? false;
    const avatarSize = isChild ? 30 : 36;
    const formattedLikes =
      item.likesCount >= 1000
        ? `${(item.likesCount / 1000).toFixed(0)}K`
        : item.likesCount;

    return (
      <View
        key={item.id}
        style={[styles.commentRow, isChild && styles.childCommentRow]}
      >
        {/* Connection line for replies */}
        {isChild && (
          <View
            style={[
              styles.replyLineVertical,
              { borderColor: colors.border },
              isLast ? styles.replyLineVerticalLast : undefined,
            ]}
            pointerEvents="none"
          />
        )}
        {isChild && (
          <View
            style={[styles.replyLineHorizontal, { borderColor: colors.border }]}
            pointerEvents="none"
          />
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleProfilePress(item)}
        >
          <UserAvatar
            uri={item.authorAvatar}
            name={item.authorName}
            size={avatarSize}
            style={[
              styles.commentAvatar,
              isChild && styles.replyAvatar,
            ]}
            iconSize={isChild ? 12 : 14}
          />
        </TouchableOpacity>

        <View style={styles.commentContent}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleProfilePress(item)}
          >
            <Text style={[styles.commentName, { color: colors.text }]}>
              {item.authorName}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>
            {item.text}
          </Text>

          <View style={styles.commentActions}>
            <Text
              style={[styles.actionMutedText, { color: colors.textSecondary }]}
            >
              {item.timeAgo}
            </Text>

            <TouchableOpacity onPress={() => toggleCommentLike(item.id)}>
              <Text
                style={[
                  item.isLiked
                    ? styles.actionPurpleText
                    : styles.actionMutedText,
                  {
                    color: item.isLiked ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {item.likesCount > 0 ? `${formattedLikes} ` : ""}Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleReplyPress(item, options.rootParentId)}
            >
              <Text
                style={[
                  styles.actionMutedText,
                  { color: colors.textSecondary },
                ]}
              >
                Reply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderReplyToggle = (comment: CommentType) => {
    const replyCount = comment.replies?.length ?? 0;

    if (replyCount === 0) {
      return null;
    }

    const isExpanded = expandedReplyThreadIds.has(comment.id);
    const label = isExpanded
      ? "Hide replies"
      : `View ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`;

    return (
      <TouchableOpacity
        style={styles.viewMoreRow}
        activeOpacity={0.75}
        onPress={() => toggleReplyThread(comment.id)}
      >
        <View
          style={[styles.viewMoreLine, { borderColor: colors.border }]}
          pointerEvents="none"
        />
        <Text style={[styles.viewMoreText, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Plain View overlay — always flex:1 / full screen height so the rgba
          background always covers the tab bar area.
          Keyboard avoidance is handled manually via keyboardHeight state
          (Keyboard.addListener) instead of KeyboardAvoidingView to avoid
          the well-known Android KAV bug where behavior="height" fails to
          restore its height after keyboard dismiss, leaving a transparent
          gap that exposes the activity tab bar underneath. */}
      <View style={styles.modalOverlay} onLayout={handleOverlayLayout}>
        {/* Clickable background to dismiss */}
        <TouchableOpacity
          style={styles.backgroundDismiss}
          onPress={onClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[styles.sheetWrapper, { transform: [{ translateY: sheetTranslateY }] }]}
        >
          {/* Comment Heading Outside Container */}
          <View style={styles.headerLabelContainer}>
            <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>
              Comment
            </Text>
          </View>

          <View
            style={[styles.modalContainer, { backgroundColor: colors.card }]}
          >
            {/* Top Indicator */}
            <View
              {...dragResponder.panHandlers}
              style={styles.grabberContainer}
            >
              <View
                style={[styles.grabber, { backgroundColor: colors.border }]}
              />
              <View style={styles.statsHeader}>
                <View style={styles.statsLeft}>
                  <Ionicons name="heart" size={16} color="#F2245C" />
                  <Text
                    style={[styles.statsText, { color: colors.textSecondary }]}
                  >
                    {likesCount}
                  </Text>
                </View>
                <Text
                  style={[styles.statsShares, { color: colors.textSecondary }]}
                >
                  {sharesCount} shares
                </Text>
              </View>
            </View>

            {/* Content area: paddingBottom shifts the scrollview + input above the
                keyboard. The modalContainer itself stays at fixed 85% height so its
                opaque background always covers the tab bar — we never change the
                panel's height, only the internal content padding. */}
            <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
              {/* Stats Header */}

              {/* Comments List */}
              <ScrollView
                style={styles.scrollList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
              >
                {isLoadingComments ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : comments.length === 0 ? (
                  <Text
                    style={[styles.emptyText, { color: colors.textSecondary }]}
                  >
                    No comments yet
                  </Text>
                ) : (
                  comments.map((comment) => {
                    const replies = comment.replies ?? [];
                    const isExpanded = expandedReplyThreadIds.has(comment.id);

                    return (
                      <View key={comment.id} style={styles.threadBlock}>
                        {renderComment(comment, { rootParentId: comment.id })}
                        {renderReplyToggle(comment)}
                        {isExpanded && replies.length > 0 ? (
                          <View style={styles.repliesContainer}>
                            {replies.map((reply, index, arr) =>
                              renderComment(reply, {
                                isChild: true,
                                isLast: index === arr.length - 1,
                                rootParentId: comment.id,
                              }),
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })
                )}
                <View style={{ height: 20 }} />
              </ScrollView>

              <View
                style={[
                  styles.inputSection,
                  {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    paddingBottom:
                      isKeyboardShown
                        ? 8
                        : Platform.OS === "android"
                          ? insets.bottom + 12
                          : 12,
                  },
                ]}
              >
                {replyingTo && (
                  <View
                    style={[
                      styles.replyContextBar,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.replyContextText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Replying to{" "}
                      <Text
                        style={{ color: colors.primary, fontWeight: "bold" }}
                      >
                        @{replyingTo.name}
                      </Text>
                    </Text>
                    <TouchableOpacity onPress={() => setReplyingTo(null)}>
                      <Feather
                        name="x"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      ref={inputRef}
                      style={[styles.input, { color: colors.text }]}
                      placeholder={
                        replyingTo
                          ? `Reply to ${replyingTo.name}...`
                          : "Add Comment"
                      }
                      placeholderTextColor={colors.textSecondary}
                      value={commentText}
                      onChangeText={setCommentText}
                      onFocus={() => {
                        isInputFocusedRef.current = true;
                      }}
                      onBlur={() => {
                        isInputFocusedRef.current = false;
                        // On Android the Dialog-level keyboard dismiss consumes the
                        // first tap before onPress reaches JS. If the send button
                        // was touched (flag set in onTouchStart below), send now.
                        if (
                          Platform.OS === "android" &&
                          sendBtnPressedRef.current
                        ) {
                          sendBtnPressedRef.current = false;
                          handleSendComment();
                        }
                      }}
                    />
                  </View>
                  {/* View wrapper captures onTouchStart at the native level — fires
                    before Android's Dialog dismisses the keyboard and before
                    TextInput.onBlur, so the ref is set when onBlur checks it. */}
                  <View
                    onTouchStart={() => {
                      if (
                        Platform.OS === "android" &&
                        isInputFocusedRef.current
                      ) {
                        sendBtnPressedRef.current = true;
                      }
                    }}
                    onTouchEnd={() => {
                      if (Platform.OS === "android") {
                        // Delay reset so onBlur can read the flag first
                        setTimeout(() => {
                          sendBtnPressedRef.current = false;
                        }, 500);
                      }
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.sendBtn,
                        { backgroundColor: buttonBackground(colors) },
                        (!commentText.trim() ||
                          !canUseCommentsApi ||
                          isSendingComment) &&
                          styles.sendBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                      disabled={
                        !commentText.trim() ||
                        !canUseCommentsApi ||
                        isSendingComment
                      }
                      onPress={handleSendComment}
                    >
                      {isSendingComment ? (
                        <ActivityIndicator
                          size="small"
                          color={buttonForeground(colors)}
                        />
                      ) : (
                        <Feather
                          name="send"
                          size={18}
                          color={buttonForeground(colors)}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  backgroundDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  headerLabelContainer: {
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500",
  },
  sheetWrapper: {
    width: "100%",
  },
  modalContainer: {
    height: "90%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: Platform.OS === "ios" ? 24 : 0,
    overflow: "hidden",
  },
  grabberContainer: {
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    paddingBottom: 18,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  statsHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  statsLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginLeft: 6,
  },
  statsShares: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 22,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 30,
  },
  threadBlock: {
    paddingBottom: 4,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  childCommentRow: {
    position: "relative",
    marginBottom: 14,
  },
  commentAvatar: {
    marginRight: 12,
    zIndex: 2,
  },
  replyAvatar: {
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
    paddingTop: 1,
  },
  commentName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 9,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  actionMutedText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  actionPurpleText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  viewMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 48,
    marginTop: -2,
    marginBottom: 14,
    paddingVertical: 2,
    paddingRight: 12,
  },
  viewMoreLine: {
    width: 28,
    borderTopWidth: 1,
    marginRight: 8,
  },
  viewMoreText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  repliesContainer: {
    position: "relative",
    marginLeft: 54,
    paddingTop: 2,
  },
  replyLineVertical: {
    position: "absolute",
    left: -23,
    top: -16,
    bottom: -16,
    borderLeftWidth: 1,
    zIndex: 1,
  },
  replyLineVerticalLast: {
    bottom: undefined,
    height: 31,
    borderBottomLeftRadius: 8,
  },
  replyLineHorizontal: {
    position: "absolute",
    left: -23,
    top: 15,
    width: 21,
    borderTopWidth: 1,
    zIndex: 1,
  },
  inputSection: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  replyContextBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  replyContextText: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    marginRight: 10,
    paddingHorizontal: 14,
  },
  input: {
    height: 44,
    fontSize: 14,
    lineHeight: 18,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
