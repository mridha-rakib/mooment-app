import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, TextInput, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const { height } = Dimensions.get('window');

type CommentType = {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timeAgo: string;
  likesCount?: string;
  viewMoreReplies?: number;
  replies?: CommentType[];
  isViewMore?: boolean;
};

const MOCK_COMMENTS: CommentType[] = [
  {
    id: '1',
    authorName: 'Del Ray',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
    text: 'What an amazing DJ party! The atmosphere was electric and everyone had a blast.',
    timeAgo: '5h',
  },
  {
    id: '2',
    authorName: 'Somia Kasem',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    text: 'This party was so much fun! The DJ played fantastic tracks that kept everyone dancing.',
    timeAgo: '5h',
    likesCount: '5K',
    viewMoreReplies: 4,
  },
  {
    id: '3',
    authorName: 'Somia Kasem',
    authorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150&auto=format&fit=crop',
    text: 'I had a great time at the DJ event! The music was on point and the vibe was incredible.',
    timeAgo: '5h',
    likesCount: '5K',
    replies: [
      {
        id: '3-1',
        authorName: 'Kasem Khondokar',
        authorAvatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?q=80&w=150&auto=format&fit=crop',
        text: 'What a fantastic night at the DJ party! The energy was high and the crowd was loving it.',
        timeAgo: '5h',
        likesCount: '5K',
      },
      {
        id: '3-2',
        authorName: 'Yasin Kasem',
        authorAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
        text: 'Everyone is loving the concert! The atmosphere is electric, and the performers are amazing.',
        timeAgo: '5h',
        likesCount: '5K',
      }
    ]
  }
];

export default function CommentsModal({ 
  visible, 
  onClose 
}: { 
  visible: boolean; 
  onClose: () => void;
}) {
  const { colors, isDark } = useTheme();

  const renderComment = (item: CommentType, isChild = false, isLast = false) => {
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
        
        <Image source={{ uri: item.authorAvatar }} style={styles.commentAvatar} />
        
        <View style={styles.commentContent}>
          <Text style={[styles.commentName, { color: colors.text }]}>{item.authorName}</Text>
          <Text style={[styles.commentText, { color: colors.textSecondary }]}>{item.text}</Text>
          
          <View style={styles.commentActions}>
            <Text style={[styles.actionMutedText, { color: colors.textSecondary }]}>{item.timeAgo}</Text>
            {item.likesCount ? (
              <Text style={[styles.actionPurpleText, { color: colors.primary }]}>{item.likesCount} Like</Text>
            ) : (
              <Text style={[styles.actionMutedText, { color: colors.textSecondary }]}>Like</Text>
            )}
            <Text style={[styles.actionMutedText, { color: colors.textSecondary }]}>Reply</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              <Text style={[styles.statsText, { color: colors.textSecondary }]}>12.5K</Text>
            </View>
            <Text style={[styles.statsShares, { color: colors.textSecondary }]}>33 shares</Text>
          </View>

          {/* Comments List */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {/* Comment 1 */}
            {renderComment(MOCK_COMMENTS[0])}

            {/* Comment 2 with View More */}
            {renderComment(MOCK_COMMENTS[1])}
            <View style={styles.viewMoreRow}>
              <View style={[styles.viewMoreLine, { borderColor: colors.border }]} />
              <Text style={[styles.viewMoreText, { color: colors.textSecondary }]}>View 4 replies</Text>
            </View>

            {/* Comment 3 with deeply nested children */}
            <View>
               {renderComment(MOCK_COMMENTS[2])}
               <View style={styles.repliesContainer}>
                  {MOCK_COMMENTS[2].replies?.map((reply, index, arr) => 
                    renderComment(reply, true, index === arr.length - 1)
                  )}
               </View>
            </View>
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                placeholder="Add Comment"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
               <Feather name="send" size={18} color={colors.background} />
            </TouchableOpacity>
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
    height: height * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
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
  }
});
