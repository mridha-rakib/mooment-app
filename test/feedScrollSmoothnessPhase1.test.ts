import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  isLatestFeedRefreshCommit,
  shouldDeferFeedRefreshCommit,
  type FeedRefreshCommit,
} from "../lib/feedRefreshCommit";

const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
const repostFeedCardSource = readFileSync(join(process.cwd(), "components/post/RepostFeedCard.tsx"), "utf8");
const smartFeedSource = readFileSync(join(process.cwd(), "lib/smartFeedDiversity.ts"), "utf8");
const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");

test("event repost loading reserves substantial embedded event-card geometry", () => {
  assert.match(repostFeedCardSource, /function EventRepostLoadingPlaceholder/);
  // Row-height stabilization: the placeholder now reserves the embedded
  // EventFeedCard's real in-flow height (1 + 64 + 250 + 68 + 1 = 384) instead
  // of the old shorter 362, and its action block matches the real 68px
  // actionBar instead of 48.
  assert.match(repostFeedCardSource, /eventLoadingCard:\s*\{\s*minHeight:\s*384,/);
  assert.match(repostFeedCardSource, /eventLoadingImage:\s*\{\s*height:\s*250,/);
  assert.match(repostFeedCardSource, /eventLoadingActions:\s*\{[\s\S]*?minHeight:\s*68,/);
});

test("event repost final rendered EventFeedCard remains unchanged", () => {
  assert.match(repostFeedCardSource, /<EventFeedCard event=\{event\} onRepostSuccess=\{onRepostSuccess\} embedded \/>/);
});

test("event repost loading no longer collapses to a tiny spinner-only placeholder", () => {
  assert.doesNotMatch(repostFeedCardSource, /return showLoadingIndicator\s*\?\s*<ActivityIndicator/);
  assert.doesNotMatch(repostFeedCardSource, /loadingSpacer:\s*\{\s*height:\s*72\s*\}/);
  // The loading branch now renders the shared `eventHeaderArea` block (header
  // + real caption) above the placeholder — same block the loaded branch uses.
  assert.match(repostFeedCardSource, /\{eventHeaderArea\}\s*<EventRepostLoadingPlaceholder showLoadingIndicator=\{showLoadingIndicator\} \/>/);
});

test("feed refresh while not scrolling applies immediately", () => {
  assert.equal(shouldDeferFeedRefreshCommit(false, true), false);
});

test("feed refresh while scrolling does not immediately replace visible arrays", () => {
  assert.equal(shouldDeferFeedRefreshCommit(true, true), true);
  assert.match(homeSource, /if \(shouldDeferFeedRefreshCommit\(isFeedScrollingRef\.current, nextCommit\.hasAnyFreshData\)\) \{/);
  assert.match(homeSource, /pendingFeedRefreshCommitRef\.current = nextCommit;/);
});

test("latest pending refresh is applied once scroll becomes idle", () => {
  const pending: FeedRefreshCommit<string[], string[], string[]> = {
    requestId: 7,
    posts: ["fresh-post"],
    events: ["fresh-event"],
    reposts: ["fresh-repost"],
    hasAnyFreshData: true,
  };

  assert.equal(isLatestFeedRefreshCommit(pending, 7), true);
  assert.match(homeSource, /const flushPendingFeedRefreshCommit = useCallback/);
  assert.match(homeSource, /pendingFeedRefreshCommitRef\.current = null;\s*applyFeedRefreshCommit\(pendingCommit\);/);
});

test("multiple refreshes while scrolling use latest-result-wins semantics", () => {
  assert.equal(isLatestFeedRefreshCommit({ requestId: 1, hasAnyFreshData: true }, 2), false);
  assert.match(homeSource, /const requestId = \+\+feedRequestIdRef\.current;/);
  assert.match(homeSource, /if \(!isLatestFeedRefreshCommit\(pendingCommit, feedRequestIdRef\.current\)\) \{/);
});

test("feed refresh commit replaces arrays and does not append duplicate items", () => {
  const applyCommitBody = homeSource.slice(
    homeSource.indexOf("const applyFeedRefreshCommit = useCallback"),
    homeSource.indexOf("const flushPendingFeedRefreshCommit = useCallback"),
  );

  assert.match(applyCommitBody, /setFeedMomentPosts\(commit\.posts\);/);
  assert.match(applyCommitBody, /setFeedEvents\(commit\.events\);/);
  assert.match(applyCommitBody, /setFeedReposts\(commit\.reposts\);/);
  assert.doesNotMatch(applyCommitBody, /\[\.\.\.current/);
});

test("Smart Feed sorting function remains untouched by Phase 1", () => {
  assert.match(smartFeedSource, /export const applySmartFeedAuthorDiversity = <T>/);
  assert.match(smartFeedSource, /const remaining = \[\.\.\.items\];/);
  assert.match(smartFeedSource, /result\.push\(picked\);/);
});

test("Feed keys remain unchanged", () => {
  assert.match(homeSource, /id: `moment-\$\{post\.id\}`/);
  assert.match(homeSource, /id: `event-\$\{event\.id\}`/);
  assert.match(homeSource, /id: `repost-\$\{share\.id\}`/);
  assert.match(homeSource, /keyExtractor=\{\(item\) => item\.id\}/);
});

test("FlatList batch/window configuration remains unchanged", () => {
  assert.match(homeSource, /initialNumToRender=\{3\}/);
  assert.match(homeSource, /maxToRenderPerBatch=\{3\}/);
  assert.match(homeSource, /updateCellsBatchingPeriod=\{40\}/);
  assert.match(homeSource, /windowSize=\{7\}/);
  assert.match(homeSource, /removeClippedSubviews=\{Platform\.OS === 'android'\}/);
  assert.doesNotMatch(homeSource, /FlashList/);
});

test("existing reactions, comments, share, and repost wiring remains present", () => {
  assert.match(homeSource, /onInteractionChange=\{applyInteractionSummary\}/);
  assert.match(homeSource, /onCommentPress=\{handleCommentPress\}/);
  assert.match(homeSource, /onSharePress=\{handleSharePress\}/);
  assert.match(homeSource, /onRepostSuccess=\{refreshFeedAfterRepost\}/);
});

test("LIVE animation and EventFeedCard code remain outside Phase 1 refresh changes", () => {
  assert.match(eventFeedCardSource, /withRepeat\(\s*withSequence\(/);
  assert.match(eventFeedCardSource, /cancelAnimation\(livePulseProgress\);/);
  assert.doesNotMatch(homeSource, /livePulseProgress/);
});

// Phase 2B intentionally changed this wiring: while Feed video playback is
// disabled (VIDEO_PLAYBACK_ENABLED in FeedPost) the Feed no longer tracks the
// active video on scroll, so inactive video state is gated out of the
// FlatList extraData / renderItem identity. The video implementation is
// preserved (gated), not deleted. Phase 1's scroll-deferral behaviour — the
// actual subject of this file — is unaffected; see the other tests here.
test("video viewability wiring is gated off VIDEO_PLAYBACK_ENABLED (Phase 2B)", () => {
  assert.match(homeSource, /import FeedPost, \{ PostData, VIDEO_PLAYBACK_ENABLED \} from "@\/components\/post\/FeedPost";/);
  assert.match(
    homeSource,
    /const feedListExtraData = useMemo\(\s*\(\) => \(VIDEO_PLAYBACK_ENABLED \? \{ activeFeedVideoItemId, activeTheme \} : \{ activeTheme \}\),/,
  );
  assert.match(homeSource, /extraData=\{feedListExtraData\}/);
  assert.match(homeSource, /isActiveVideo=\{VIDEO_PLAYBACK_ENABLED && activeFeedVideoItemId === item\.id\}/);
  assert.match(homeSource, /onViewableItemsChanged=\{VIDEO_PLAYBACK_ENABLED \? onViewableFeedItemsChanged : undefined\}/);
  assert.match(homeSource, /viewabilityConfig=\{VIDEO_PLAYBACK_ENABLED \? feedViewabilityConfig : undefined\}/);
  // Implementation kept for future re-enable, not removed.
  assert.match(homeSource, /const onViewableFeedItemsChanged = useRef\(/);
  assert.match(homeSource, /const feedViewabilityConfig = useRef\(/);
});
