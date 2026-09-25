import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Home feed text-hierarchy/readability fix:
//   1. PeopleToFollow.tsx never called useTheme() — user names and the
//      section title were hard-coded to "#FFFFFF", invisible in light mode.
//   2. FeedPost.tsx's caption used colors.textSecondary (or an even more
//      muted "#B3B3B3" in dark mode) instead of colors.text — primary
//      content rendered with secondary/muted styling in BOTH themes.
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const peopleToFollowSource = readFileSync(join(process.cwd(), "components/home/PeopleToFollow.tsx"), "utf8");
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const repostFeedCardSource = readFileSync(join(process.cwd(), "components/post/RepostFeedCard.tsx"), "utf8");
const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");

// ── People to follow ────────────────────────────────────────────────────

test("PeopleToFollow is theme-aware (previously had no useTheme() call — name/title were hard-coded white)", () => {
  assert.match(peopleToFollowSource, /import \{ useTheme \} from '@\/hooks\/useTheme';/);
  assert.match(peopleToFollowSource, /const \{ colors \} = useTheme\(\);/);
});

test("PeopleToFollow user name uses the primary text token in both light and dark mode", () => {
  assert.match(peopleToFollowSource, /styles\.userName, \{ color: colors\.text \}/);
});

test("PeopleToFollow section title uses the primary text token", () => {
  assert.match(peopleToFollowSource, /styles\.title, \{ color: colors\.text \}/);
});

test("PeopleToFollow's Follow/Following button styling is untouched", () => {
  assert.match(peopleToFollowSource, /followBtnText: \{\s*color: '#AC86D4',/);
  assert.match(peopleToFollowSource, /followingBtnText: \{\s*color: '#8E8E9B',/);
});

// ── Regular feed post caption ────────────────────────────────────────────

test("FeedPost's caption uses the primary text token, not textSecondary or a muted hard-coded gray", () => {
  const captionCallIndex = feedPostSource.indexOf("<HashtagText");
  const captionCallEnd = feedPostSource.indexOf("</HashtagText>", captionCallIndex);
  const captionCall = feedPostSource.slice(captionCallIndex, captionCallEnd);
  assert.match(captionCall, /\{ color: colors\.text \}/);
  assert.doesNotMatch(captionCall, /colors\.textSecondary/);
  assert.doesNotMatch(captionCall, /#B3B3B3/);
});

test("FeedPost's timestamp remains secondary (unaffected by the caption fix)", () => {
  assert.match(feedPostSource, /styles\.postTime,[\s\S]{0,80}\{ color: isNormalPost && isDark \? '#777777' : colors\.textSecondary \}/);
});

test("FeedPost's 'liked by' hierarchy is preserved: the prefix is secondary, the name(s) are primary", () => {
  assert.match(feedPostSource, /styles\.likedByText, \{ color: colors\.text \}/);
  assert.match(feedPostSource, /styles\.likedByNormal, \{ color: colors\.textSecondary \}/);
});

// ── Repost / embedded caption ─────────────────────────────────────────────

test("RepostFeedCard's own repost caption already uses the primary text token (no regression)", () => {
  assert.match(repostFeedCardSource, /styles\.repostCaption, \{ color: colors\.text \}\]\}>\{caption\.trim\(\)\}/);
});

// ── Event card text hierarchy (regression guard from the prior fix) ──────

test("EventFeedCard's host name and caption stay on the primary token; 'liked by' prefix stays secondary", () => {
  assert.match(eventFeedCardSource, /styles\.hostName, \{ color: isDark \? "#FFFFFF" : colors\.text \}/);
  assert.match(eventFeedCardSource, /styles\.socialContextMuted, \{ color: isDark \? "#AFAFB8" : colors\.textSecondary \}/);
});

// ── Regression guards for untouched areas ─────────────────────────────────

test("PostInteractionBar is not called with an explicit iconColor/countColor anywhere touched by this fix", () => {
  for (const source of [feedPostSource, eventFeedCardSource]) {
    const barCallIndex = source.indexOf("<PostInteractionBar");
    const barCallEnd = source.indexOf("/>", barCallIndex);
    const barCall = source.slice(barCallIndex, barCallEnd);
    assert.doesNotMatch(barCall, /iconColor=/);
    assert.doesNotMatch(barCall, /countColor=/);
  }
});

test("Discover/Friends/Windows active-state wiring is untouched by this fix", () => {
  const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
  assert.match(homeSource, /activeTab=\{homeAudience === 'windows' \? null : homeAudience\}/);
  assert.match(homeSource, /isWindowsActive=\{homeAudience === 'windows'\}/);
});
