import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

// Shared, minimal Search state message used by the Search screen and the
// hashtag results screen for the EMPTY and ERROR states. Deliberately reuses
// the existing left-aligned, top-anchored empty-state layout — no new
// illustration, no redesign. LOADING stays a plain <ActivityIndicator> at each
// call site; RESULTS renders the list.
export type SearchStateVariant = 'empty' | 'error';

type Props = {
  variant: SearchStateVariant;
  onRetry?: () => void;
};

// Exported so tests can assert the exact strings without a render harness.
export const SEARCH_EMPTY_TITLE = 'No results found';
export const SEARCH_EMPTY_HINT = 'Check your spelling or try another search term.';
export const SEARCH_ERROR_TITLE = 'Something went wrong';
export const SEARCH_ERROR_HINT = 'Please try again.';
export const SEARCH_RETRY_LABEL = 'Retry';

export default function SearchStateMessage({ variant, onRetry }: Props) {
  const { colors } = useTheme();
  const isError = variant === 'error';
  const title = isError ? SEARCH_ERROR_TITLE : SEARCH_EMPTY_TITLE;
  const hint = isError ? SEARCH_ERROR_HINT : SEARCH_EMPTY_HINT;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      {isError && onRetry ? (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.7}>
          <Text style={[styles.retryText, { color: colors.primary }]}>{SEARCH_RETRY_LABEL}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
