import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Phase-0 invisible performance fixes on the Profile stack: the
// feed merge/sort recomputing on every render, unstable inline renderItem/
// ListHeaderComponent identities defeating FlatList's row diffing, and
// FeedPost not being memoized. Source-level regex assertions, matching this
// repo's convention. No FlatList perf props (windowSize etc.) were tuned —
// this is asserted as a negative to keep that scope-creep from sneaking in.

const profileContentSource = readFileSync(join(process.cwd(), "components/profile/ProfileContent.tsx"), "utf8");
const profileEventsSource = readFileSync(join(process.cwd(), "components/profile/ProfileEvents.tsx"), "utf8");
const profileViewSource = readFileSync(join(process.cwd(), "components/profile/ProfileView.tsx"), "utf8");
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");

test("ProfileContent's feed merge/sort is wrapped in useMemo keyed on posts/reposts/profileFeedEvents", () => {
  assert.match(
    profileContentSource,
    /const feedItems = useMemo\(\(\) => \[[\s\S]*?\]\.sort\([\s\S]*?\), \[posts, reposts, profileFeedEvents\]\);/,
  );
});

test("ProfileContent's renderItem is a stable useCallback, not an inline arrow function in JSX", () => {
  assert.match(profileContentSource, /const renderFeedItem = useCallback<ListRenderItem<FeedItem>>\(/);
  assert.match(profileContentSource, /renderItem=\{renderFeedItem\}/);
  assert.doesNotMatch(profileContentSource, /renderItem=\{\(\{ item \}\) => \{/);
});

test("ProfileEvents' renderItem is a stable useCallback", () => {
  assert.match(profileEventsSource, /const renderEvent = useCallback<ListRenderItem<EventResponse>>\(/);
  assert.match(profileEventsSource, /renderItem=\{renderEvent\}/);
});

test("ProfileContent's ListHeaderComponent (headerWithGap) is memoized, not rebuilt every render", () => {
  assert.match(profileContentSource, /const headerWithGap = useMemo\(\(\) => \(/);
});

test("ProfileView's listHeader (ProfileHeader+ProfileBio+ProfileTabs) is memoized", () => {
  assert.match(profileViewSource, /const listHeader = useMemo\(\(\) => \(/);
  // A real, non-trivial dependency list — not an empty array masking stale closures.
  const depsMatch = profileViewSource.match(/\), \[\s*activeTab,[\s\S]*?user\.viewerHasBlockedTarget,\s*\]\);/);
  assert.ok(depsMatch, "listHeader useMemo dependency array not found or incomplete");
});

test("ProfileView passes stable useCallback handlers into ProfileContent instead of inline closures", () => {
  assert.match(profileViewSource, /const handleCommentPress = useCallback\(\(post: PostData\) => \{/);
  assert.match(profileViewSource, /const handleSharePress = useCallback\(\(post: PostData\) => \{/);
  assert.match(profileViewSource, /const handleFeedInteractionChange = useCallback\(\(postId: string, summary: MomentInteractionSummary\) => \{/);
  assert.match(profileViewSource, /onCommentPress=\{handleCommentPress\}/);
  assert.match(profileViewSource, /onSharePress=\{handleSharePress\}/);
  assert.match(profileViewSource, /onInteractionChange=\{handleFeedInteractionChange\}/);
});

test("FeedPost is wrapped in React.memo with default shallow comparison (no custom comparator masking updates)", () => {
  assert.match(feedPostSource, /^export default React\.memo\(FeedPost\);$/m);
  assert.doesNotMatch(feedPostSource, /React\.memo\(FeedPost,\s*\(/);
});

test("no FlatList tuning props were blindly added to the Profile lists", () => {
  for (const source of [profileContentSource, profileEventsSource]) {
    assert.doesNotMatch(source, /windowSize=/);
    assert.doesNotMatch(source, /initialNumToRender=/);
    assert.doesNotMatch(source, /maxToRenderPerBatch=/);
    assert.doesNotMatch(source, /removeClippedSubviews=/);
    assert.doesNotMatch(source, /getItemLayout=/);
  }
});

test("no new global state/cache library was introduced (no React Query, no new Zustand store)", () => {
  for (const source of [profileContentSource, profileEventsSource, profileViewSource]) {
    assert.doesNotMatch(source, /@tanstack\/react-query|useQuery|useInfiniteQuery|create\(\(set/);
  }
});
