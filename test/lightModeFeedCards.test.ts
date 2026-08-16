import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the light-mode feed-card contrast fixes: regular Moment cards,
// reposted/embedded cards, and Event cards previously either had no visible
// boundary in light mode (colors.card === colors.background, both pure
// white, with no border/shadow) or — in EventFeedCard's case — had no theme
// branch at all and always rendered dark-styled hex values regardless of
// the active theme. Source-level regex assertions, matching this repo's
// established convention (no React Native component render harness here).

const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
const repostFeedCardSource = readFileSync(join(process.cwd(), "components/post/RepostFeedCard.tsx"), "utf8");

// ── FeedPost (regular Moment cards) ──────────────────────────────────────

test("FeedPost's card gets a light-mode-only border/shadow so it doesn't blend into the white page", () => {
  assert.match(feedPostSource, /!isDark && styles\.postCardLight/);
  assert.match(feedPostSource, /postCardLight: \{/);
});

test("FeedPost's dark-mode card overlay (normalPostCardDark) keeps its exact approved pixel value", () => {
  assert.match(feedPostSource, /normalPostCardDark: \{\s*backgroundColor: "rgba\(17, 17, 17, 0\.85\)",\s*\}/);
});

test("FeedPost's embedded (repost-quoted) card is theme-aware instead of an always-white tint invisible in light mode", () => {
  assert.match(feedPostSource, /embedded && \(isDark \? styles\.embeddedPostCardDark : styles\.embeddedPostCardLight\)/);
  // Dark mode keeps the exact previous values.
  assert.match(feedPostSource, /embeddedPostCardDark: \{\s*borderWidth: 1,\s*borderColor: "rgba\(255,255,255,0\.08\)",\s*backgroundColor: "rgba\(255,255,255,0\.035\)",\s*\}/);
});

// ── EventFeedCard ─────────────────────────────────────────────────────────

test("EventFeedCard is now theme-aware (previously had no useTheme() call at all — always dark-styled)", () => {
  assert.match(eventFeedCardSource, /import \{ useTheme \} from "@\/hooks\/useTheme";/);
  assert.match(eventFeedCardSource, /const \{ colors, isDark \} = useTheme\(\);/);
});

test("EventFeedCard's card background/border branches on isDark, preserving the exact old dark value", () => {
  assert.match(eventFeedCardSource, /isDark \? styles\.cardDark : \{ backgroundColor: colors\.card, borderWidth: 1, borderColor: colors\.border \}/);
  assert.match(eventFeedCardSource, /cardDark: \{\s*backgroundColor: "rgba\(17, 17, 17, 0\.95\)",\s*\}/);
});

test("EventFeedCard's host name and repost caption are no longer hard-coded white (invisible on a light card)", () => {
  assert.match(eventFeedCardSource, /styles\.hostName, \{ color: isDark \? "#FFFFFF" : colors\.text \}/);
  assert.match(eventFeedCardSource, /styles\.repostCaption, \{ color: isDark \? "#FFFFFF" : colors\.text \}/);
});

test("EventFeedCard's interaction row (reaction/comment/share icons + counts) already defaults to theme tokens — untouched", () => {
  // PostInteractionBar isn't passed an explicit iconColor/countColor here,
  // so it already falls through to colors.textSecondary / colors.text.
  const barCallIndex = eventFeedCardSource.indexOf("<PostInteractionBar");
  const barCallEnd = eventFeedCardSource.indexOf("/>", barCallIndex);
  const barCall = eventFeedCardSource.slice(barCallIndex, barCallEnd);
  assert.doesNotMatch(barCall, /iconColor=/);
  assert.doesNotMatch(barCall, /countColor=/);
});

test("EventFeedCard's image/media overlay (badges, title, categories, View Map, View button) is untouched — those sit on the photo, not the page", () => {
  assert.match(eventFeedCardSource, /eventName: \{\s*color: "#FFFFFF",/);
  assert.match(eventFeedCardSource, /viewBtnText: \{\s*color: "#111111",/);
  assert.match(eventFeedCardSource, /categoryTagText: \{\s*color: "#111111",/);
});

// ── RepostFeedCard ────────────────────────────────────────────────────────

test("RepostFeedCard's outer card gets a light-mode-only border so it doesn't blend into the white page", () => {
  assert.match(repostFeedCardSource, /!isDark && \{ borderWidth: 1, borderColor: colors\.border \}/);
});
