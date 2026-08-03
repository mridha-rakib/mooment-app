export type FeedVideoPlayerStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

export type FeedVideoErrorKind =
  | 'network'
  | 'http'
  | 'decoder'
  | 'source_unavailable'
  | 'timeout'
  | 'player_released'
  | 'unknown';

export type FeedVideoPlaybackFailure = {
  kind: FeedVideoErrorKind;
  message: string;
};

const HTTP_ERROR_PATTERN = /\b(40[0-9]|41[0-9]|42[0-9]|50[0-9]|http|response code|invalid response|forbidden|unauthorized|not found)\b/i;
const NETWORK_ERROR_PATTERN = /\b(network|connection|socket|dns|host|ssl|tls|cleartext|reset|refused|offline|unreachable)\b/i;
const DECODER_ERROR_PATTERN = /\b(codec|decoder|decode|mediacodec|unsupported|format|profile|sample|track)\b/i;
const SOURCE_ERROR_PATTERN = /\b(source|manifest|data source|file|object|content|uri|url|eof|end of stream)\b/i;
const TIMEOUT_ERROR_PATTERN = /(timeout|timed out|slow|stalled)/i;
const RELEASED_ERROR_PATTERN = /\b(released|disposed|destroyed|detached|unmounted)\b/i;

export const classifyFeedVideoPlaybackError = (message?: string | null): FeedVideoPlaybackFailure => {
  const safeMessage = message?.trim() || 'Unknown video playback error';

  if (HTTP_ERROR_PATTERN.test(safeMessage)) {
    return { kind: 'http', message: safeMessage };
  }

  if (TIMEOUT_ERROR_PATTERN.test(safeMessage)) {
    return { kind: 'timeout', message: safeMessage };
  }

  if (NETWORK_ERROR_PATTERN.test(safeMessage)) {
    return { kind: 'network', message: safeMessage };
  }

  if (DECODER_ERROR_PATTERN.test(safeMessage)) {
    return { kind: 'decoder', message: safeMessage };
  }

  if (SOURCE_ERROR_PATTERN.test(safeMessage)) {
    return { kind: 'source_unavailable', message: safeMessage };
  }

  if (RELEASED_ERROR_PATTERN.test(safeMessage)) {
    return { kind: 'player_released', message: safeMessage };
  }

  return { kind: 'unknown', message: safeMessage };
};

export const shouldShowFeedVideoRetry = (
  status: FeedVideoPlayerStatus,
  failure: FeedVideoPlaybackFailure | null,
) => status === 'error' && failure !== null;

export const shouldRunFeedVideoTimeUpdates = (
  isActiveVideo: boolean,
  isScreenFocused: boolean,
  appState: string,
) => isActiveVideo && isScreenFocused && appState === 'active';

export const isStaleFeedVideoGeneration = (expectedGeneration: number, currentGeneration: number) =>
  expectedGeneration !== currentGeneration;
