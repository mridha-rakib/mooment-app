import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type ReportedContentOutcome = 'report_only' | 'report_block_success' | 'report_block_failed';

type ReportedContentCardProps = {
  contentLabel: 'post' | 'event';
  outcome: ReportedContentOutcome;
  onShow?: () => void;
  onRetryBlock?: () => void;
  isRetryingBlock?: boolean;
};

// The inline Feed-slot success/partial-success state a reported Post/Event
// card is replaced with — reuses the app's existing success-checkmark visual
// language (see payment-success.tsx's pulse circle) instead of any
// third-party UI reference. Renders in place of FeedPost/EventFeedCard, in
// the same FlatList slot, so surrounding items and scroll position are
// untouched.
export default function ReportedContentCard({
  contentLabel,
  outcome,
  onShow,
  onRetryBlock,
  isRetryingBlock = false,
}: ReportedContentCardProps) {
  const { colors, isDark } = useTheme();

  const title = outcome === 'report_block_success'
    ? 'Reported and user blocked'
    : outcome === 'report_block_failed'
      ? 'Report submitted — blocking failed'
      : `Thanks for reporting this ${contentLabel}`;

  const subtitle = outcome === 'report_block_success'
    ? `You won't see this user's ${contentLabel === 'post' ? 'posts' : 'events'} anymore.`
    : outcome === 'report_block_failed'
      ? "Your report was submitted successfully, but we couldn't block this user. You can try again."
      : 'Your feedback is important in helping us keep the Mooment community safe.';

  const showShowAction = outcome === 'report_only' || outcome === 'report_block_failed';

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.pulseOuter,
          { backgroundColor: isDark ? 'rgba(22, 216, 105, 0.1)' : 'rgba(22, 216, 105, 0.05)' },
        ]}
      >
        <View
          style={[
            styles.pulseInner,
            {
              backgroundColor: isDark ? 'rgba(22, 216, 105, 0.15)' : 'rgba(22, 216, 105, 0.1)',
              borderColor: 'rgba(22, 216, 105, 0.3)',
            },
          ]}
        >
          <Ionicons name="checkmark-sharp" size={28} color={colors.success} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>

      <View style={styles.actions}>
        {outcome === 'report_block_failed' && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={onRetryBlock}
            disabled={isRetryingBlock}
            activeOpacity={0.7}
          >
            {isRetryingBlock ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.retryBtnText, { color: colors.primary }]}>Retry block</Text>
            )}
          </TouchableOpacity>
        )}

        {showShowAction && (
          <TouchableOpacity style={styles.showBtn} onPress={onShow} activeOpacity={0.7}>
            <Text style={[styles.showBtnText, { color: colors.textSecondary }]}>
              {contentLabel === 'post' ? 'Show post' : 'Show event'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  pulseOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pulseInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
  },
  retryBtn: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  showBtn: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
