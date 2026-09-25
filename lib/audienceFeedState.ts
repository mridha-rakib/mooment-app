import { shouldDeferFeedRefreshCommit } from "@/lib/feedRefreshCommit";
import type { FriendsFeedLoadState } from "@/lib/friendsFeedEmptyState";

// Per-audience (Discover/Friends) feed cache. Each audience keeps its own
// posts/events/reposts plus its own loading lifecycle, so switching tabs can
// show that tab's own cached content instantly instead of clearing shared
// state. `isInitialLoading` only ever applies before an audience's very
// first successful load (skeleton-eligible); every load after that is
// `isBackgroundRefreshing` (cache stays on screen, no skeleton, no blank).
export type AudienceFeedState<TPosts, TEvents, TReposts> = {
  posts: TPosts;
  events: TEvents;
  reposts: TReposts;
  hasLoadedOnce: boolean;
  isInitialLoading: boolean;
  isBackgroundRefreshing: boolean;
  error: string | null;
  friendsLoadState: FriendsFeedLoadState;
};

export const createInitialAudienceFeedState = <TPosts, TEvents, TReposts>(
  empty: { posts: TPosts; events: TEvents; reposts: TReposts },
  isInitialLoading: boolean,
): AudienceFeedState<TPosts, TEvents, TReposts> => ({
  ...empty,
  hasLoadedOnce: false,
  isInitialLoading,
  isBackgroundRefreshing: false,
  error: null,
  friendsLoadState: "idle",
});

// Whether starting a load for this audience should show the full first-load
// skeleton (isInitialLoading) or keep the cached list on screen with a
// silent background refresh (isBackgroundRefreshing) — mutually exclusive by
// construction, driven solely by whether this audience has ever loaded
// successfully before.
export const getAudienceLoadFlags = (
  hasLoadedOnce: boolean,
): { isInitialLoading: boolean; isBackgroundRefreshing: boolean } => ({
  isInitialLoading: !hasLoadedOnce,
  isBackgroundRefreshing: hasLoadedOnce,
});

// Applies a settled fetch's results on top of an audience's existing cached
// state. Always a FULL REPLACE per resolved source (never prepend/merge) —
// server-side ranking/boost order can legitimately change between requests,
// so the fresh response is the new source of truth for whichever sources
// actually resolved. A source that failed simply keeps its previous cached
// value untouched — cached content is never cleared by a failed refresh, and
// a total failure (hasAnyFreshData: false) only records a lightweight error
// flag alongside the still-intact cache.
export const mergeAudienceFeedCommit = <TPosts, TEvents, TReposts>(
  prev: AudienceFeedState<TPosts, TEvents, TReposts>,
  commit: {
    posts?: TPosts;
    events?: TEvents;
    reposts?: TReposts;
    hasAnyFreshData: boolean;
  },
  failureMessage = "Unable to refresh feed right now.",
): AudienceFeedState<TPosts, TEvents, TReposts> => ({
  ...prev,
  posts: commit.posts ?? prev.posts,
  events: commit.events ?? prev.events,
  reposts: commit.reposts ?? prev.reposts,
  hasLoadedOnce: prev.hasLoadedOnce || commit.hasAnyFreshData,
  error: commit.hasAnyFreshData ? null : failureMessage,
});

// A fresh commit for the audience currently on screen still respects the
// existing "don't disrupt an active scroll" rule (shouldDeferFeedRefreshCommit);
// an audience the user has since switched away from has nothing visible to
// disrupt, so its commit always applies immediately regardless of scroll state.
export const shouldDeferAudienceFeedCommit = (
  isActiveAudience: boolean,
  isScrolling: boolean,
  hasAnyFreshData: boolean,
): boolean => isActiveAudience && shouldDeferFeedRefreshCommit(isScrolling, hasAnyFreshData);
