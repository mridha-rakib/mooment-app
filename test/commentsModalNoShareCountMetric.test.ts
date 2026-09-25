import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the "comment thread should not show a separate share-count metric"
// change. The only redundant standalone share-count render in the comment-thread
// UI was the `{sharesCount} shares` <Text> node in CommentsModal's statsHeader.
//
// Scope: that one plain-text metric (and its now-unused `statsShares` style) is
// removed. The like stat, comment composer, comment/reply list, and the ABSENCE
// of any share action inside the thread are all unchanged. The shared
// PostInteractionBar and every post/event/story/repost share action are
// untouched (guarded here and in postInteractionBarFlameAndHiddenCounts.test.ts).
//
// Source-level regex assertions, matching this repo's established convention.

const commentsModalSource = readFileSync(
  join(process.cwd(), "components/post/CommentsModal.tsx"),
  "utf8",
);

test("CommentsModal no longer renders the `{sharesCount} shares` metric", () => {
  assert.doesNotMatch(commentsModalSource, /\{sharesCount\}\s*shares/);
  assert.doesNotMatch(commentsModalSource, /\d+\s*shares/);
});

test("CommentsModal no longer references the `statsShares` style", () => {
  assert.doesNotMatch(commentsModalSource, /statsShares/);
});

test("statsHeader / statsLeft and the like count with heart icon still render", () => {
  assert.match(commentsModalSource, /style=\{styles\.statsHeader\}/);
  assert.match(commentsModalSource, /style=\{styles\.statsLeft\}/);
  assert.match(commentsModalSource, /<Ionicons name="heart"/);
  const statsLeftIndex = commentsModalSource.indexOf("style={styles.statsLeft}");
  const statsLeftBlock = commentsModalSource.slice(statsLeftIndex, statsLeftIndex + 300);
  assert.match(statsLeftBlock, /\{likesCount\}/);
});

test("statsHeader keeps its existing space-between layout (no row redesign)", () => {
  assert.match(commentsModalSource, /statsHeader:\s*\{[^}]*justifyContent:\s*"space-between"/s);
});

test("CommentsModal still contains NO share action (no Share icon / ShareModal / onShare)", () => {
  assert.doesNotMatch(commentsModalSource, /ShareModal/);
  assert.doesNotMatch(commentsModalSource, /onShare/);
  assert.doesNotMatch(commentsModalSource, /Share01Icon|ShareIcon|name="share/);
});

test("`sharesCount` prop is kept on the CommentsModal signature (minimum diff, no caller churn)", () => {
  assert.match(commentsModalSource, /sharesCount\?: number;/);
  assert.match(commentsModalSource, /sharesCount = 0,/);
});

test("Comment composer, list and reply rendering remain present", () => {
  assert.match(commentsModalSource, /placeholder=\{\s*replyingTo/);
  assert.match(commentsModalSource, /onPress=\{handleSendComment\}/);
  assert.match(commentsModalSource, /comments\.map\(\(comment\)/);
  assert.match(commentsModalSource, /renderReplyToggle/);
  assert.match(commentsModalSource, /toggleCommentLike\(item\.id\)/);
});

// ── Regression guards: share actions on other surfaces are untouched ──

test("PostInteractionBar still wires the share action and renders no share-count text", () => {
  const barSource = readFileSync(
    join(process.cwd(), "components/post/PostInteractionBar.tsx"),
    "utf8",
  );
  const shareBlockStart = barSource.indexOf("{sharesCount !== undefined && (");
  const shareBlockEnd = barSource.indexOf("{viewsCount !== undefined", shareBlockStart);
  const shareBlock = barSource.slice(shareBlockStart, shareBlockEnd);
  assert.match(shareBlock, /onPress=\{onSharePress\}/);
  assert.doesNotMatch(shareBlock, /<Text/);
});

test("FeedPost / EventFeedCard / view-story still pass onSharePress into PostInteractionBar", () => {
  const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
  const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
  const viewStorySource = readFileSync(join(process.cwd(), "app/post-screen/view-story.tsx"), "utf8");
  assert.match(feedPostSource, /onSharePress=\{\(\) => onSharePress\?\.\(post\)\}/);
  assert.match(eventFeedCardSource, /<PostInteractionBar[\s\S]*?onSharePress=/);
  assert.match(viewStorySource, /<PostInteractionBar[\s\S]*?onSharePress=/);
});

test("sharesCount data contract still exists on MomentInteractionSummary", () => {
  const momentsSource = readFileSync(join(process.cwd(), "lib/moments.ts"), "utf8");
  assert.match(momentsSource, /MomentInteractionSummary = \{[\s\S]*?sharesCount: number;/);
});
