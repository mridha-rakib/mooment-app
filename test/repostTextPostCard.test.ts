import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-string assertions, matching this repo's established convention
// (repostShareManagement / homeFeedTextHierarchy / eventRepostRowHeightStabilization):
// there is no React Native render harness here, so behaviour is verified
// against the exact component/mapper source text.
//
// Covers the Feed / Profile half of the shared/reposted text-post card fix:
//   * text-only Moments still map to a standard post (caption preserved, no
//     media) — RepostFeedCard keeps rendering the embedded FeedPost;
//   * a whitespace-only caption with no media now routes through the mapper's
//     existing `return null` -> RepostFeedCard <UnavailableCard/> path;
//   * the embedded text-only caption is clamped to 3 lines + tail ellipsis;
//   * a normal (non-embedded) text post is NOT clamped;
//   * an embedded IMAGE repost is NOT clamped (guard requires zero media);
//   * a compact "View post" affordance reuses /post-screen/view-post + post.id;
//   * PostInteractionBar / RepostHeader / author avatar / timestamp untouched.

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

const mapperSource = read("lib/momentPostMapper.ts");
const feedPostSource = read("components/post/FeedPost.tsx");
const repostFeedCardSource = read("components/post/RepostFeedCard.tsx");
const hashtagTextSource = read("components/post/HashtagText.tsx");
const momentsLibSource = read("lib/moments.ts");

const hashtagCall = feedPostSource.slice(
  feedPostSource.indexOf("<HashtagText"),
  feedPostSource.indexOf("</HashtagText>"),
);

// ── Mapper: text-only mapping is unchanged ───────────────────────────────

test("1. a text-only Moment still maps to postType 'standard' with an empty media list and the caption preserved", () => {
  assert.match(mapperSource, /caption: moment\.caption \?\? undefined,/);
  assert.match(mapperSource, /return \{\s*\n\s*\.\.\.basePost,\s*\n\s*postType: "standard",\s*\n\s*mediaItems: visualMedia,\s*\n\s*\};/);
});

test("2. whitespace-only caption + no media falls through the mapper's existing null path (no new component)", () => {
  // The guard now treats a blank/whitespace caption as "no readable caption"
  // via the file's existing hasText() helper — same `return null` outcome.
  assert.match(
    mapperSource,
    /if \(!hasText\(moment\.caption\) && visualMedia\.length === 0 && !isEventInteractionMoment\) \{\s*\n\s*return null;\s*\n\s*\}/,
  );
  // Old raw `!moment.caption` form of this one guard is gone.
  assert.doesNotMatch(mapperSource, /if \(!moment\.caption && visualMedia\.length === 0/);
  // hasText is the pre-existing helper, not a new function.
  assert.match(mapperSource, /const hasText = \(value\?: string \| null\) => Boolean\(value\?\.trim\(\)\);/);
});

test("3. only the no-media guard changed — audio / visual / event-interaction branches are untouched", () => {
  assert.match(mapperSource, /if \(audioMedia && visualMedia\.length === 0\) \{/);
  assert.match(mapperSource, /postType: "audio",/);
  assert.match(mapperSource, /const isEventInteractionMoment =/);
  // exactly one `return null` in the mapper (the single blank-content guard)
  assert.equal((mapperSource.match(/return null;/g) ?? []).length, 1);
});

// ── FeedPost: bounded excerpt, only for embedded text-only reposts ───────

test("4. embedded text-only reposts are identified by a narrow guard (embedded + standard + zero media)", () => {
  assert.match(
    feedPostSource,
    /const isEmbeddedTextOnly = embedded && post\.postType === 'standard' && mediaItems\.length === 0;/,
  );
});

test("5. the embedded text-only caption is clamped to 3 lines with a tail ellipsis", () => {
  assert.match(
    hashtagCall,
    /\{\.\.\.\(isEmbeddedTextOnly \? \{ numberOfLines: 3, ellipsizeMode: 'tail' as const \} : null\)\}/,
  );
});

test("6. a normal, non-embedded text post keeps its unbounded caption (no unconditional numberOfLines)", () => {
  assert.doesNotMatch(hashtagCall, /numberOfLines=\{/);
  assert.doesNotMatch(hashtagCall, /ellipsizeMode="/);
  // still primary-token colour — no regression on the earlier hierarchy fix
  assert.match(hashtagCall, /\{ color: colors\.text \}/);
});

test("7. an embedded IMAGE repost is not clamped — the guard requires mediaItems.length === 0", () => {
  assert.match(feedPostSource, /isEmbeddedTextOnly = embedded && post\.postType === 'standard' && mediaItems\.length === 0/);
});

// ── FeedPost: visible View Post affordance ──────────────────────────────

test("8. a compact 'View post' affordance is rendered only for the embedded text-only case", () => {
  assert.match(
    feedPostSource,
    /\{isEmbeddedTextOnly && \(\s*\n\s*<TouchableOpacity\s*\n\s*style=\{styles\.embeddedViewPostBtn\}/,
  );
  assert.match(feedPostSource, /<Text style=\{\[styles\.embeddedViewPostText, \{ color: colors\.primary \}\]\}>View post<\/Text>/);
});

test("9. View post reuses the existing /post-screen/view-post route with the original post id — no new route", () => {
  assert.match(
    feedPostSource,
    /const handleViewPostPress = \(\) => \{\s*\n\s*if \(!post\.id\) return;\s*\n\s*router\.push\(\{ pathname: '\/post-screen\/view-post', params: \{ postId: post\.id \} \}\);\s*\n\s*\};/,
  );
});

test("10. the View post affordance carries the required accessibility props", () => {
  const btn = feedPostSource.slice(
    feedPostSource.indexOf("style={styles.embeddedViewPostBtn}"),
    feedPostSource.indexOf("View post</Text>"),
  );
  assert.match(btn, /accessibilityRole="button"/);
  assert.match(btn, /accessibilityLabel="View post"/);
});

// ── Untouched surrounding behaviour ─────────────────────────────────────

test("11. RepostFeedCard still maps synchronously and renders the embedded FeedPost for a non-event repost", () => {
  assert.match(repostFeedCardSource, /return mapMomentToPost\(share\.moment, \{/);
  assert.match(repostFeedCardSource, /<FeedPost post=\{post\} onSharePress=\{\(\) => setShareVisible\(true\)\} embedded/);
  assert.match(repostFeedCardSource, /<RepostHeader/);
});

test("12. RepostFeedCard still falls back to its existing UnavailableCard for an unmappable original", () => {
  assert.match(repostFeedCardSource, /<UnavailableCard \/>/);
  assert.match(repostFeedCardSource, /The original item is no longer available\./);
});

test("13. the embedded FeedPost still renders the original author avatar, timestamp and interaction bar", () => {
  assert.match(feedPostSource, /<UserAvatar\s*\n\s*uri=\{post\.authorAvatar\}/);
  assert.match(feedPostSource, /\{post\.timeAgo\}/);
  assert.match(feedPostSource, /<PostInteractionBar/);
  // footer render condition unchanged
  assert.match(
    feedPostSource,
    /post\.postType !== 'product' && \(post\.likesCount !== undefined \|\| post\.commentsCount !== undefined \|\| post\.sharesCount !== undefined\)/,
  );
});

test("14. HashtagText forwards an optional ellipsizeMode without altering default behaviour", () => {
  assert.match(hashtagTextSource, /ellipsizeMode\?: 'head' \| 'middle' \| 'tail' \| 'clip';/);
  assert.match(
    hashtagTextSource,
    /<Text style=\{style\} numberOfLines=\{numberOfLines\} ellipsizeMode=\{ellipsizeMode\}>/,
  );
});

test("15. no backend / API contract change — getMoment signature is untouched", () => {
  assert.match(momentsLibSource, /export const getMoment = async \(momentId: string\): Promise<Moment> => \{/);
});
