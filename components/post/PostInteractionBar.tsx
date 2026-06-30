import { Comment02Icon, Share01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

type PostInteractionBarProps = {
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  isLiked?: boolean;
  showLike?: boolean;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;
  likeDisabled?: boolean;
  commentDisabled?: boolean;
  shareDisabled?: boolean;
  likeIconStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export default function PostInteractionBar({
  likesCount,
  commentsCount,
  sharesCount,
  isLiked = false,
  showLike = likesCount !== undefined,
  onLikePress,
  onCommentPress,
  onSharePress,
  likeDisabled = false,
  commentDisabled = false,
  shareDisabled = false,
  likeIconStyle,
  style,
}: PostInteractionBarProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {showLike && (
        <TouchableOpacity
          style={styles.action}
          activeOpacity={0.7}
          onPress={onLikePress}
          disabled={likeDisabled || !onLikePress}
        >
          <Animated.View style={likeIconStyle}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#F2245C' : colors.textSecondary}
            />
          </Animated.View>
          {likesCount !== undefined && (
            <Text style={[styles.count, { color: colors.text }]}>{likesCount}</Text>
          )}
        </TouchableOpacity>
      )}

      {commentsCount !== undefined && (
        <TouchableOpacity
          style={styles.action}
          activeOpacity={0.7}
          onPress={onCommentPress}
          disabled={commentDisabled || !onCommentPress}
        >
          <HugeiconsIcon icon={Comment02Icon} size={20} color={colors.textSecondary} />
          <Text style={[styles.count, { color: colors.text }]}>{commentsCount}</Text>
        </TouchableOpacity>
      )}

      {sharesCount !== undefined && (
        <TouchableOpacity
          style={styles.action}
          activeOpacity={0.7}
          onPress={onSharePress}
          disabled={shareDisabled || !onSharePress}
        >
          <HugeiconsIcon icon={Share01Icon} size={20} color={colors.textSecondary} />
          <Text style={[styles.count, { color: colors.text }]}>{sharesCount}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
