import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Phase 2B: Feed video playback is currently out of scope. The video
// implementation is kept for future work, but its runtime *viewability
// tracking* is disabled so ordinary vertical scrolling no longer churns
// activeFeedVideoItemId -> HomeFeed render -> FlatList extraData / renderItem.
// These are source-level guards (matching the repo's existing feed-wiring
// test style: feedScrollSmoothnessPhase1 / videoUploadDisabled /
// feedVideoProcessingState).

const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const repostSource = readFileSync(join(process.cwd(), "components/post/RepostFeedCard.tsx"), "utf8");
const eventsSource = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");

const sliceBetween = (source: string, from: string, to: string) => {
  const start = source.indexOf(from);
  const end = to ? source.indexOf(to, start + 1) : source.length;
  assert.ok(start >= 0 && end > start, `could not slice between ${from!} and ${to}`);
  return source.slice(start, end);
};

// 1 ─────────────────────────────────────────────────────────────────────────
test("1. VIDEO_PLAYBACK_ENABLED is still false and is the single exported source of truth", () => {
  assert.match(feedPostSource, /export const VIDEO_PLAYBACK_ENABLED = false;/);
  // exactly one definition
  assert.equal((feedPostSource.match(/VIDEO_PLAYBACK_ENABLED = false/g) ?? []).length, 1);
  assert.match(homeSource, /import FeedPost, \{ PostData, VIDEO_PLAYBACK_ENABLED \} from "@\/components\/post\/FeedPost";/);
  // home.tsx does not shadow it with a local copy
  assert.doesNotMatch(homeSource, /const VIDEO_PLAYBACK_ENABLED\b/);
});

// 2 ─────────────────────────────────────────────────────────────────────────
test("2. ordinary Feed scrolling cannot update activeFeedVideoItemId while playback is disabled", () => {
  // The FlatList does not receive the viewability callback at all when disabled,
  // so React Native never runs viewability tracking during scroll.
  assert.match(homeSource, /onViewableItemsChanged=\{VIDEO_PLAYBACK_ENABLED \? onViewableFeedItemsChanged : undefined\}/);
  assert.match(homeSource, /viewabilityConfig=\{VIDEO_PLAYBACK_ENABLED \? feedViewabilityConfig : undefined\}/);

  // Second guard: even if it were re-wired, the body no-ops first.
  const cb = sliceBetween(homeSource, "const onViewableFeedItemsChanged = useRef(", ").current;");
  // The very first statement of the callback body is the disabled-guard early return.
  assert.match(cb, /=> \{\s*if \(!VIDEO_PLAYBACK_ENABLED\) \{\s*return;\s*\}/);
  // setActiveFeedVideoItemIdIfChanged is only ever called from inside that
  // guarded callback.
  assert.equal((homeSource.match(/setActiveFeedVideoItemIdIfChanged\(nextActiveVideoPost/g) ?? []).length, 1);
});

// 3 ─────────────────────────────────────────────────────────────────────────
test("3. video viewability changes do not trigger video-related HomeFeed state while disabled", () => {
  // The only writer of the activeFeedVideoItemId state is the guarded callback
  // + the explicit reset helper (reset-to-null is a harmless no-op while the
  // value is already permanently null). No scroll handler sets it.
  const scrollActive = sliceBetween(homeSource, "const handleFeedScrollActive = useCallback(", "}, [clearFeedScrollIdleTimer]);");
  const scrollIdle = sliceBetween(homeSource, "const handleFeedScrollIdle = useCallback(", "}, [clearFeedScrollIdleTimer, flushPendingFeedRefreshCommit]);");
  const momentumEnd = sliceBetween(homeSource, "const handleFeedMomentumScrollEnd = useCallback(", "}, [clearFeedScrollIdleTimer, flushPendingFeedRefreshCommit]);");
  for (const handler of [scrollActive, scrollIdle, momentumEnd]) {
    assert.doesNotMatch(handler, /setActiveFeedVideoItemId/);
  }
});

// 4 ─────────────────────────────────────────────────────────────────────────
test("4. FlatList extraData does not depend on inactive video state", () => {
  assert.match(
    homeSource,
    /const feedListExtraData = useMemo\(\s*\(\) => \(VIDEO_PLAYBACK_ENABLED \? \{ activeFeedVideoItemId, activeTheme \} : \{ activeTheme \}\),/,
  );
  assert.match(homeSource, /extraData=\{feedListExtraData\}/);
});

// 5 ─────────────────────────────────────────────────────────────────────────
test("5. renderFeedItem's isActiveVideo is constant-false while disabled", () => {
  const matches = homeSource.match(/isActiveVideo=\{VIDEO_PLAYBACK_ENABLED && activeFeedVideoItemId === item\.id\}/g) ?? [];
  assert.equal(matches.length, 2); // FeedPost + RepostFeedCard
  assert.doesNotMatch(homeSource, /isActiveVideo=\{activeFeedVideoItemId === item\.id\}/);
});

// 6 ─────────────────────────────────────────────────────────────────────────
test("6. video-containing FeedPost keeps its existing disabled/fallback presentation", () => {
  // Unchanged gated render: real player only when enabled, DisabledVideoFeedMedia otherwise.
  assert.match(feedPostSource, /VIDEO_PLAYBACK_ENABLED \? \(\s*<VideoFeedMedia uri=\{item\.uri\} isActive=\{Boolean\(isActiveVideo && currentMediaIndex === index && !showFullScreenMedia\)\} \/>\s*\) : \(\s*<DisabledVideoFeedMedia \/>\s*\)/);
  const disabled = sliceBetween(feedPostSource, "const DisabledVideoFeedMedia = React.memo(function DisabledVideoFeedMedia()", "const VideoFeedMedia = React.memo");
  assert.doesNotMatch(disabled, /useVideoPlayer|<VideoView/);
  // Player implementation preserved for future work.
  assert.match(feedPostSource, /const VideoFeedMedia = React\.memo\(function VideoFeedMedia/);
  assert.match(feedPostSource, /useVideoPlayer\(videoSource/);
});

// 7 ─────────────────────────────────────────────────────────────────────────
test("7. video-containing RepostFeedCard remains safe and unchanged in the media path", () => {
  // Repost of a post still renders the embedded FeedPost (which owns the
  // gated video branch); isActiveVideo is still forwarded, now constant-false.
  assert.match(repostSource, /<FeedPost post=\{post\} onSharePress=\{\(\) => setShareVisible\(true\)\} embedded isActiveVideo=\{isActiveVideo\} \/>/);
  // Repost media detection helper is untouched in home.tsx.
  assert.match(homeSource, /const hasVideoRepostMedia = \(share: MomentTimelineItem\) => \(/);
});

// 8 ─────────────────────────────────────────────────────────────────────────
test("8. image post rendering is untouched", () => {
  assert.match(feedPostSource, /<CroppedFeedImage item=\{item\} frameWidth=\{mediaFrameWidth\} frameHeight=\{isNormalPost \? mediaFrameWidth : 340\} \/>/);
  assert.match(feedPostSource, /cachePolicy="memory-disk"/);
});

// 9 ─────────────────────────────────────────────────────────────────────────
test("9. EventFeedCard render path in the Feed is unchanged", () => {
  assert.match(
    homeSource,
    /<EventFeedCard\s+event=\{item\.data\}\s+onRepostSuccess=\{refreshFeedAfterRepost\}\s+onHostBlocked=\{handleUserBlockedFromReport\}\s+onHostFollowChange=\{handleAuthorFollowChange\}\s+\/>/,
  );
});

// 10 ────────────────────────────────────────────────────────────────────────
test("10. Smart Feed build/order is unchanged", () => {
  assert.match(homeSource, /const buildFeedItems = \(/);
  assert.match(homeSource, /applySmartFeedAuthorDiversity\(\s*rankedContentItems,/);
  assert.match(homeSource, /\.sort\(compareContentItems\)/);
});

// 11 ────────────────────────────────────────────────────────────────────────
test("11. Phase 1 scroll deferral + repost loading geometry are unchanged", () => {
  assert.match(homeSource, /if \(shouldDeferFeedRefreshCommit\(isFeedScrollingRef\.current, nextCommit\.hasAnyFreshData\)\) \{/);
  assert.match(homeSource, /pendingFeedRefreshCommitRef\.current = nextCommit;/);
  assert.match(homeSource, /const flushPendingFeedRefreshCommit = useCallback/);
  assert.match(homeSource, /feedScrollIdleTimerRef\.current = setTimeout\(/);
  assert.match(repostSource, /eventLoadingCard:\s*\{\s*minHeight:\s*362,/);
});

// 12 ────────────────────────────────────────────────────────────────────────
test("12. Phase 2A event repost cache + dedupe is unchanged", () => {
  assert.match(repostSource, /import \{ getEventByIdCached, type EventResponse \} from '@\/lib\/events'/);
  assert.match(repostSource, /getEventByIdCached\(eventId\)/);
  assert.match(eventsSource, /export const getEventByIdCached = \(eventId: string\)/);
  assert.match(eventsSource, /getEventByIdCachedInternal\(eventId, getEventById\)/);
  assert.match(eventsSource, /from "@\/lib\/eventByIdCache"/);
});

// 13 ────────────────────────────────────────────────────────────────────────
test("13. FlatList batch/window configuration is unchanged", () => {
  assert.match(homeSource, /initialNumToRender=\{3\}/);
  assert.match(homeSource, /maxToRenderPerBatch=\{3\}/);
  assert.match(homeSource, /updateCellsBatchingPeriod=\{40\}/);
  assert.match(homeSource, /windowSize=\{7\}/);
  assert.match(homeSource, /removeClippedSubviews=\{Platform\.OS === 'android'\}/);
  assert.match(homeSource, /keyExtractor=\{\(item\) => item\.id\}/);
  assert.doesNotMatch(homeSource, /FlashList/);
});
