export type FeedRefreshCommit<TPosts, TEvents, TReposts> = {
  requestId: number;
  posts?: TPosts;
  events?: TEvents;
  reposts?: TReposts;
  hasAnyFreshData: boolean;
};

export const shouldDeferFeedRefreshCommit = (isScrolling: boolean, hasAnyFreshData: boolean): boolean =>
  isScrolling && hasAnyFreshData;

export const isLatestFeedRefreshCommit = <TPosts, TEvents, TReposts>(
  pending: FeedRefreshCommit<TPosts, TEvents, TReposts> | null,
  currentRequestId: number,
): pending is FeedRefreshCommit<TPosts, TEvents, TReposts> =>
  Boolean(pending && pending.requestId === currentRequestId);
