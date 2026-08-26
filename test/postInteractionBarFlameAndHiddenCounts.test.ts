import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the "Red Flame + Hide Interaction Counts" UI change to the shared
// PostInteractionBar (used by Post/Event/Story/Repost via FeedPost,
// EventFeedCard, event.tsx, and view-story.tsx).
//
// Scope: Like icon heart -> flame (red when active), and the numeric
// like/comment/share count <Text> nodes no longer render. The props/data
// contracts (likesCount/commentsCount/sharesCount, handlers, disabled flags,
// the `!== undefined` visibility gating) are unchanged — only the count
// <Text> nodes were removed from the render output.
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const barSource = readFileSync(
  join(process.cwd(), "components/post/PostInteractionBar.tsx"),
  "utf8",
);

test("Like icon no longer uses the heart glyph", () => {
  assert.doesNotMatch(barSource, /name=\{isLiked \? 'heart' : 'heart-outline'\}/);
  assert.doesNotMatch(barSource, /'heart'|'heart-outline'/);
});

test("Like icon uses flame / flame-outline from the existing Ionicons import", () => {
  assert.match(barSource, /name=\{isLiked \? 'flame' : 'flame-outline'\}/);
  assert.match(barSource, /import \{ Feather, Ionicons \} from '@expo\/vector-icons';/);
});

test("Active (liked) Flame uses the theme's danger/red token, not a new hardcoded hex color", () => {
  assert.match(barSource, /color=\{isLiked \? colors\.danger : resolvedIconColor\}/);
  assert.doesNotMatch(barSource, /#F2245C/);
});

test("Inactive Flame keeps the existing theme-aware icon color behavior", () => {
  assert.match(barSource, /const resolvedIconColor = iconColor \?\? colors\.textSecondary;/);
});

test("Like count numeric text is no longer rendered", () => {
  const likeBlockStart = barSource.indexOf("{showLike && (");
  const likeBlockEnd = barSource.indexOf("{commentsCount !== undefined", likeBlockStart);
  const likeBlock = barSource.slice(likeBlockStart, likeBlockEnd);
  assert.doesNotMatch(likeBlock, /likesCount/);
  assert.doesNotMatch(likeBlock, /<Text/);
});

test("Comment count numeric text is no longer rendered", () => {
  const commentBlockStart = barSource.indexOf("{commentsCount !== undefined && (");
  const commentBlockEnd = barSource.indexOf("{sharesCount !== undefined", commentBlockStart);
  const commentBlock = barSource.slice(commentBlockStart, commentBlockEnd);
  assert.doesNotMatch(commentBlock, /<Text/);
  // the visibility gate itself must remain, so the button doesn't disappear
  assert.match(commentBlock, /commentsCount !== undefined/);
});

test("Share count numeric text is no longer rendered", () => {
  const shareBlockStart = barSource.indexOf("{sharesCount !== undefined && (");
  const shareBlockEnd = barSource.indexOf("{viewsCount !== undefined", shareBlockStart);
  const shareBlock = barSource.slice(shareBlockStart, shareBlockEnd);
  assert.doesNotMatch(shareBlock, /<Text/);
  assert.match(shareBlock, /sharesCount !== undefined/);
});

test("View count (unrelated numeric info) is untouched and still renders its <Text>", () => {
  const viewsBlockStart = barSource.indexOf("{viewsCount !== undefined && (");
  const viewsBlock = barSource.slice(viewsBlockStart, viewsBlockStart + 300);
  assert.match(viewsBlock, /<Text style=\{countStyles\}>\{viewsCount\}<\/Text>/);
});

test("Like handler wiring is unchanged (onPress/disabled/hitSlop still wired to onLikePress)", () => {
  assert.match(barSource, /onPress=\{onLikePress\}/);
  assert.match(barSource, /disabled=\{likeDisabled \|\| !onLikePress\}/);
});

test("Comment handler wiring is unchanged", () => {
  assert.match(barSource, /onPress=\{onCommentPress\}/);
  assert.match(barSource, /disabled=\{commentDisabled \|\| !onCommentPress\}/);
});

test("Share handler wiring is unchanged", () => {
  assert.match(barSource, /onPress=\{onSharePress\}/);
  assert.match(barSource, /disabled=\{shareDisabled \|\| !onSharePress\}/);
});

test("Count props/data contracts remain intact (still accepted, still gate visibility, not removed from the prop type)", () => {
  assert.match(barSource, /likesCount\?: number;/);
  assert.match(barSource, /commentsCount\?: number;/);
  assert.match(barSource, /sharesCount\?: number;/);
  assert.match(barSource, /showLike = likesCount !== undefined/);
});

test("Touch target sizing (minWidth/minHeight 44) is preserved so removing count text doesn't shrink tap targets", () => {
  assert.match(barSource, /minWidth: 44,\s*\n\s*minHeight: 44,/);
});

// ── Regression guards: callers still pass real count data (props not stripped) ──

const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
const viewStorySource = readFileSync(join(process.cwd(), "app/post-screen/view-story.tsx"), "utf8");

test("FeedPost (Post) still passes real likesCount/commentsCount/sharesCount and handlers into PostInteractionBar", () => {
  const barCallIndex = feedPostSource.indexOf("<PostInteractionBar");
  const barCallEnd = feedPostSource.indexOf("/>", barCallIndex);
  const barCall = feedPostSource.slice(barCallIndex, barCallEnd);
  assert.match(barCall, /likesCount=\{post\.likesCount !== undefined \? likesCount : undefined\}/);
  assert.match(barCall, /onLikePress=\{handleLike\}/);
});

test("EventFeedCard (Event) still passes real counts and handlers into PostInteractionBar", () => {
  const barCallIndex = eventFeedCardSource.indexOf("<PostInteractionBar");
  const barCallEnd = eventFeedCardSource.indexOf("/>", barCallIndex);
  const barCall = eventFeedCardSource.slice(barCallIndex, barCallEnd);
  assert.match(barCall, /likesCount=\{likesCount\}/);
  assert.match(barCall, /onLikePress=\{handleLike\}/);
});

test("view-story (Story) still wires the reaction/comment/share actions through the shared bar", () => {
  const barCallIndex = viewStorySource.indexOf("<PostInteractionBar");
  const barCallEnd = viewStorySource.indexOf("/>", barCallIndex);
  const barCall = viewStorySource.slice(barCallIndex, barCallEnd);
  assert.match(barCall, /isLiked=\{interaction\.isReacted\}/);
  assert.match(barCall, /onLikePress=\{handleReactionPress\}/);
});

test("EventFeedCard's attendee/going count rendering is untouched by this fix (separate from the interaction bar)", () => {
  const barCallIndex = eventFeedCardSource.indexOf("<PostInteractionBar");
  const barCallEnd = eventFeedCardSource.indexOf("/>", barCallIndex);
  const barCall = eventFeedCardSource.slice(barCallIndex, barCallEnd);
  assert.doesNotMatch(barCall, /going/i);
});
