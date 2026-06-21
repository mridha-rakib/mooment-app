import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { createMomentComment, getMomentComments, toggleCommentReaction, type MomentComment, type MomentInteractionSummary } from '@/lib/moments';
import { getStorageFileUrl } from '@/lib/storage';

type CommentType = {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timeAgo: string;
  likesCount: number;
  isLiked?: boolean;
  viewMoreReplies?: number;
  replies?: CommentType[];
  isViewMore?: boolean;
};

const INITIAL_COMMENTS: CommentType[] = [
  {
    id: '1',
    authorName: 'Del Ray',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    text: 'What an amazing DJ party! The atmosphere was electric and everyone had a blast.',
    timeAgo: '5h',
    likesCount: 0,
  },
  {
    id: '2',
    authorName: 'Somia Kasem',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    text: 'This party was so much fun! The DJ played fantastic tracks that kept everyone dancing.',
    timeAgo: '5h',
    likesCount: 5000,
    viewMoreReplies: 4,
  },
  {
    id: '3',
    authorName: 'Somia Kasem',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    text: 'I had a great time at the DJ event! The music was on point and the vibe was incredible.',
    timeAgo: '5h',
    likesCount: 5000,
    replies: [
      {
        id: '3-1',
        authorName: 'Kasem Khondokar',
        authorAvatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
        text: 'What a fantastic night at the DJ party! The energy was high and the crowd was loving it.',
        timeAgo: '5h',
        likesCount: 5000,
      },
      {
        id: '3-2',
        authorName: 'Yasin Kasem',
        authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
        text: 'Everyone is loving the concert! The atmosphere is electric, and the performers are amazing.',
        timeAgo: '5h',
        likesCount: 5000,
      }
    ]
  }
];

const DEFAULT_COMMENT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop';
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const formatCommentTimeAgo = (createdAt: string) => {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));

  if (elapsedSeconds < 60) {
    return 'Just now';
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
  authorId: comment.author?.id,
  authorName: comment.author?.name ?? 'Mooment User',
  authorAvatar: (comment.author?.avatarKey ? getStorageFileUrl(comment.author.avatarKey) : null) ?? comment.author?.avatarUrl ?? DEFAULT_COMMENT_AVATAR,
  text: comment.text,
  timeAgo: formatCommentTimeAgo(comment.createdAt),
  likesCount: comment.likesCount,
  isLiked: comment.isLiked,
  replies: comment.replies.map(momentCommentToComment),
});

export default function CommentsModal({
  visible,
  onClose,
  momentId,
  likesCount = 0,
  sharesCount = 0,
  onInteractionChange,
}: {
  visible: boolean;
  onClose: () => void;
  momentId?: string | null;
  likesCount?: number;
  sharesCount?: number;
  onInteractionChange?: (summary: MomentInteractionSummary) => void;
}) {
  const { colors, isDark } = useTheme();
  const [comments, setComments] = useState<CommentType[]>(INITIAL_COMMENTS);
  const [failedAvatarIds, setFailedAvatarIds] = useState(new Set<string>());
  const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isInputFocusedRef = useRef(false);
  const wasKeyboardVisibleRef = useRef(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const canUseCommentsApi = Boolean(momentId && MONGO_OBJECT_ID_PATTERN.test(momentId));

  const loadComments = useCallback(async () => {
    if (!momentId || !MONGO_OBJECT_ID_PATTERN.test(momentId)) {
      setComments(INITIAL_COMMENTS);
      return;
    }

    setIsLoadingComments(true);

    try {
      const momentComments = await getMomentComments(momentId);

      setComments(momentComments.map(momentCommentToComment));
    } catch (error) {
      Alert.alert('Unable to load comments', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsLoadingComments(false);
    }
  }, [momentId]);

  useEffect(() => {
    if (visible) {
      setReplyingTo(null);
      setCommentText('');
      setFailedAvatarIds(new Set());
      void loadComments();
    }
  }, [loadComments, visible]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      wasKeyboardVisibleRef.current = true;
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      const shouldClose = isInputFocusedRef.current && wasKeyboardVisibleRef.current;
      wasKeyboardVisibleRef.current = false;

      // Android sends Back to the IME before the Modal. Close the sheet when
      // that Back press dismisses the keyboard from the focused comment input.
      if (shouldClose) {
        inputRef.current?.blur();
        onClose();
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      isInputFocusedRef.current = false;
      wasKeyboardVisibleRef.current = false;
    };
  }, [onClose, visible]);

  const toggleCommentLike = async (commentId: string) => {
    if (!canUseCommentsApi) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const findInTree = (items: CommentType[], id: string): CommentType | undefined => {
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

    const applyUpdate = (items: CommentType[], isLiked: boolean, likesCount: number): CommentType[] =>
      items.map(item => {
        if (item.id === commentId) return { ...item, isLiked, likesCount };
        if (item.replies?.length) return { ...item, replies: applyUpdate(item.replies, isLiked, likesCount) };
        return item;
      });

    // Optimistic update
    const newIsLiked = !prevIsLiked;
    const newLikesCount = newIsLiked ? prevLikesCount + 1 : Math.max(0, prevLikesCount - 1);
    setComments(prev => applyUpdate(prev, newIsLiked, newLikesCount));

    try {
      const { isLiked, likesCount } = await toggleCommentReaction(momentId!, commentId);
      setComments(prev => applyUpdate(prev, isLiked, likesCount));
    } catch {
      setComments(prev => applyUpdate(prev, prevIsLiked, prevLikesCount));
    }
  };

  const handleReplyPress = (id: string, name: string) => {
    setReplyingTo({ id, name });
    inputRef.current?.focus();
  };

  const handleProfilePress = (item: CommentType) => {
    onClose();
    // Use a small timeout to allow modal to close before navigating
    setTimeout(() => {
      router.push({
        pathname: '/profile-screen/user-profile',
        params: {
          userId: item.authorId ?? item.id,
          name: item.authorName,
          avatar: item.authorAvatar
        }
      } as any);
    }, 300);
  };

  const handleSendComment = async () => {
    const trimmedText = commentText.trim();

    if (!trimmedText || !momentId || !canUseCommentsApi || isSendingComment) {
      return;
    }

    setIsSendingComment(true);

    try {
      const result = await createMomentComment(momentId, {
        text: trimmedText,
        parentCommentId: replyingTo?.id ?? null,
      });

      setCommentText('');
      setReplyingTo(null);
      onInteractionChange?.(result.summary);
      await loadComments();
    } catch (error) {
      Alert.alert('Unable to post comment', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSendingComment(false);
    }
  };

  const renderComment = (item: CommentType, isChild = false, isLast = false) => {
    const formattedLikes = item.likesCount >= 1000 ? `${(item.likesCount / 1000).toFixed(0)}K` : item.likesCount;
    
    return (
      <View key={item.id} style={[styles.commentRow, isChild && styles.childCommentRow]}>
        {/* Connection line for replies */}
        {isChild && (
          <View style={[
            styles.replyLineVertical,
            { borderColor: colors.border },
            isLast ? styles.replyLineVerticalLast : undefined
          ]} />
        )}
        {isChild && (
          <View style={[styles.replyLineHorizontal, { borderColor: colors.border }]} />
        )}
        
        <TouchableOpacity activeOpacity={0.7} onPress={() => handleProfilePress(item)}>
          {!failedAvatarIds.has(item.id) ? (
            <Image
              source={{ uri: item.authorAvatar }}
              style={styles.commentAvatar}
              onError={() => setFailedAvatarIds((prev) => new Set([...prev, item.id]))}
            />
          ) : (
            <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
              <Feather name="user" size={14} color="#8E8E9B" />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.commentContent}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => handleProfilePress(item)}>
            <Text style={[styles.commentName, { color: colors.text }]}>{item.authorName}</Text>
          </TouchableOpacity>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
          
          <View style={styles.commentActions}>
            <Text style={[styles.actionMutedText, { color: colors.textSecondary }]}>{item.timeAgo}</Text>
            
            <TouchableOpacity onPress={() => toggleCommentLike(item.id)}>
              <Text style={[
                item.isLiked ? styles.actionPurpleText : styles.actionMutedText, 
                { color: item.isLiked ? colors.primary : colors.textSecondary }
              ]}>
                {item.likesCount > 0 ? `${formattedLikes} ` : ''}Like
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleReplyPress(item.id, item.authorName)}>
              <Text style={[styles.actionMutedText, { color: colors.textSecondary }]}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Clickable background to dismiss */}
        <TouchableOpacity style={styles.backgroundDismiss} onPress={onClose} activeOpacity={1} />
        
        {/* Comment Heading Outside Container */}
        <View style={styles.headerLabelContainer}>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Comment</Text>
        </View>

        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {/* Top Indicator */}
          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          </View>
          
          {/* Stats Header */}
          <View style={styles.statsHeader}>
            <View style={styles.statsLeft}>
              <Ionicons name="heart" size={16} color="#F2245C" />
              <Text style={[styles.statsText, { color: colors.textSecondary }]}>{likesCount}</Text>
            </View>
            <Text style={[styles.statsShares, { color: colors.textSecondary }]}>{sharesCount} shares</Text>
          </View>

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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No comments yet</Text>
            ) : (
              comments.map((comment) => (
                <View key={comment.id}>
                  {renderComment(comment)}
                  {comment.viewMoreReplies ? (
                    <View style={styles.viewMoreRow}>
                      <View style={[styles.viewMoreLine, { borderColor: colors.border }]} />
                      <Text style={[styles.viewMoreText, { color: colors.textSecondary }]}>
                        View {comment.viewMoreReplies} replies
                      </Text>
                    </View>
                  ) : null}
                  {comment.replies && comment.replies.length > 0 ? (
                    <View style={styles.repliesContainer}>
                      {comment.replies.map((reply, index, arr) =>
                        renderComment(reply, true, index === arr.length - 1)
                      )}
                    </View>
                  ) : null}
                </View>
              ))
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Input */}
          <View
            style={[
              styles.inputSection,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: Platform.OS === 'android' ? insets.bottom + 12 : 12,
              },
            ]}
          >
            {replyingTo && (
              <View style={[styles.replyContextBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={[styles.replyContextText, { color: colors.textSecondary }]}>
                  Replying to <Text style={{ color: colors.primary, fontWeight: 'bold' }}>@{replyingTo.name}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Feather name="x" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.text }]}
                  placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Add Comment"}
                  placeholderTextColor={colors.textSecondary}
                  value={commentText}
                  onChangeText={setCommentText}
                  onFocus={() => {
                    isInputFocusedRef.current = true;
                  }}
                  onBlur={() => {
                    isInputFocusedRef.current = false;
                  }}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: colors.primary },
                  (!commentText.trim() || !canUseCommentsApi || isSendingComment) && styles.sendBtnDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!commentText.trim() || !canUseCommentsApi || isSendingComment}
                onPress={handleSendComment}
              >
                {isSendingComment ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Feather name="send" size={18} color={colors.background} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(58, 58, 58, 0.7)', 
  },
  backgroundDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  headerLabelContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  modalContainer: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
    overflow: 'hidden',
  },
  grabberContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 13,
    marginLeft: 6,
  },
  statsShares: {
    fontSize: 13,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 30,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  childCommentRow: {
    marginLeft: 18, 
    position: 'relative',
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    zIndex: 2,
  },
  commentAvatarFallback: {
    backgroundColor: '#2B2B36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionMutedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionPurpleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
    marginBottom: 20,
  },
  viewMoreLine: {
    width: 24,
    height: 16,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 8,
    marginRight: 8,
    marginTop: -16,
  },
  viewMoreText: {
    fontSize: 11,
    fontWeight: '600',
  },
  repliesContainer: {
    position: 'relative',
  },
  replyLineVertical: {
    position: 'absolute',
    left: -18,
    top: -30, // Connect from previous comment
    bottom: -20, // Continue to next comment
    borderLeftWidth: 1,
    zIndex: 1,
  },
  replyLineVerticalLast: {
    bottom: undefined,
    height: 48, // 30 (from top) + 18 (to center of avatar)
    borderBottomLeftRadius: 8,
  },
  replyLineHorizontal: {
    position: 'absolute',
    left: -18,
    top: 18, // Center of the 36x36 avatar
    width: 18,
    borderTopWidth: 1,
    zIndex: 1,
  },
  inputSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  replyContextBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyContextText: {
    fontSize: 12,
  },
  inputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    paddingHorizontal: 12,
  },
  input: {
    height: 40,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  }
});
