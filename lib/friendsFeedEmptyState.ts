import type { FeedAudience } from "@/lib/moments";

// The narrowest possible view of the Friends feed's load lifecycle, tracked
// locally by HomeFeed. It exists ONLY so the empty-state copy is truthful:
// a zero-item Friends feed is called "empty" only after a load that fully
// succeeded (all three feed sources fulfilled) — never after a failure or
// a partial-source failure, which would otherwise be misread as
// "you have no friend posts".
export type FriendsFeedLoadState = "idle" | "loading" | "loaded" | "error";

// Pure + directly unit-testable (mirrors lib/eventFeedLoading.ts). Holds no
// fetching or business logic — the caller passes plain values in.
export const shouldShowFriendsFeedEmptyState = ({
  selectedType,
  feedAudience,
  isFeedLoading,
  isRefreshing,
  friendsFeedLoadState,
  itemCount,
}: {
  selectedType: string;
  feedAudience: FeedAudience;
  isFeedLoading: boolean;
  isRefreshing: boolean;
  friendsFeedLoadState: FriendsFeedLoadState;
  itemCount: number;
}): boolean =>
  selectedType === "Feed" &&
  feedAudience === "friends" &&
  friendsFeedLoadState === "loaded" &&
  !isFeedLoading &&
  !isRefreshing &&
  itemCount === 0;
