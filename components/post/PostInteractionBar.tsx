import { Comment02Icon, Share01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
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
  viewsCount?: number;
  isLiked?: boolean;
  showLike?: boolean;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;
  likeDisabled?: boolean;
  commentDisabled?: boolean;
  shareDisabled?: boolean;
  viewDisabled?: boolean;
  likeIconStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  actionStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
  vertical?: boolean;
  iconColor?: string;
  countColor?: string;
};

export default function PostInteractionBar({
  likesCount,
  commentsCount,
  sharesCount,
  viewsCount,
  isLiked = false,
  showLike = likesCount !== undefined,
  onLikePress,
  onCommentPress,
  onSharePress,
  likeDisabled = false,
  commentDisabled = false,
  shareDisabled = false,
  viewDisabled = true,
  likeIconStyle,
  style,
  actionStyle,
  compact = false,
  vertical = false,
  iconColor,
  countColor,
}: PostInteractionBarProps) {
  const { colors } = useTheme();
  const resolvedIconColor = iconColor ?? colors.textSecondary;
  const resolvedCountColor = countColor ?? colors.text;
  const actionStyles = [styles.action, compact && styles.compactAction, vertical && styles.verticalAction, actionStyle];
  const countStyles = [styles.count, compact && styles.compactCount, vertical && styles.verticalCount, { color: resolvedCountColor }];

  return (
    <View style={[styles.container, vertical && styles.verticalContainer, style]}>
      {showLike && (
        <TouchableOpacity
          style={actionStyles}
          activeOpacity={0.7}
          onPress={onLikePress}
          disabled={likeDisabled || !onLikePress}
        >
          <Animated.View style={likeIconStyle}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={compact ? 20 : 22}
              color={isLiked ? '#F2245C' : resolvedIconColor}
            />
          </Animated.View>
          {likesCount !== undefined && (
            <Text style={countStyles}>{likesCount}</Text>
          )}
        </TouchableOpacity>
      )}

      {commentsCount !== undefined && (
        <TouchableOpacity
          style={actionStyles}
          activeOpacity={0.7}
          onPress={onCommentPress}
          disabled={commentDisabled || !onCommentPress}
        >
          <HugeiconsIcon icon={Comment02Icon} size={20} color={resolvedIconColor} />
          <Text style={countStyles}>{commentsCount}</Text>
        </TouchableOpacity>
      )}

      {sharesCount !== undefined && (
        <TouchableOpacity
          style={actionStyles}
          activeOpacity={0.7}
          onPress={onSharePress}
          disabled={shareDisabled || !onSharePress}
        >
          <HugeiconsIcon icon={Share01Icon} size={20} color={resolvedIconColor} />
          <Text style={countStyles}>{sharesCount}</Text>
        </TouchableOpacity>
      )}

      {viewsCount !== undefined && (
        <TouchableOpacity
          style={actionStyles}
          activeOpacity={0.7}
          disabled={viewDisabled}
        >
          <Feather name="eye" size={20} color={resolvedIconColor} />
          <Text style={countStyles}>{viewsCount}</Text>
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
  verticalContainer: {
    flexDirection: 'column',
    gap: 18,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  verticalAction: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: 0,
    minHeight: 40,
    minWidth: 36,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  verticalCount: {
    marginLeft: 0,
    marginTop: 4,
    textAlign: 'center',
  },
  compactAction: {
    marginRight: 20,
  },
  compactCount: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginLeft: 8,
  },
});
