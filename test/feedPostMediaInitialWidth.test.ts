import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Normal-post media initial-width stabilization.
//
// A normal ("standard") standalone Feed post's media container measures
// windowWidth - 32 (styles.postCard keeps its 16px horizontal margin;
// styles.normalPostCard sets padding:0). The old initializer seeded
// mediaFrameWidth at windowWidth - 64 — the *non-normal* card value
// (postCard's 16px margin + 16px padding) — so every fresh mount/remount of a
// normal-post cell rendered one frame ~32px too narrow, then snapped once
// handleMediaLayout measured the real width.
//
// The fix seeds the correct width per layout variant so the ordinary normal
// post mounts already-correct and handleMediaLayout's tolerance guard returns
// without a redundant setMediaFrameWidth / scroll correction. Non-normal and
// embedded (repost) cards keep the legacy windowWidth - 64 assumption.
//
// Source-structure assertions, consistent with the repo's test convention
// (CRLF-normalized read; no RN render harness).

const feedPostSource = readFileSync(
  join(process.cwd(), "components/post/FeedPost.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const initializerBlock = feedPostSource.slice(
  feedPostSource.indexOf("const [mediaFrameWidth, setMediaFrameWidth] = useState("),
  feedPostSource.indexOf("const [showMoreMenu, setShowMoreMenu] = useState("),
);

test("mediaFrameWidth is no longer seeded unconditionally at windowWidth - 64", () => {
  assert.doesNotMatch(
    initializerBlock,
    /useState\(\(\) => Math\.max\(windowWidth - 64, 1\)\)/,
  );
});

test("the initializer is layout-aware: standard + non-embedded seeds windowWidth - 32", () => {
  assert.match(
    initializerBlock,
    /post\.postType === 'standard' && !embedded \? windowWidth - 32 : windowWidth - 64/,
  );
  // still clamped to a positive width
  assert.match(initializerBlock, /Math\.max\(\s*[\s\S]*?,\s*1,?\s*\)/);
});

test("non-normal and embedded cards keep the existing windowWidth - 64 seed", () => {
  // the ternary's else-branch is windowWidth - 64 (unchanged for event/product
  // and for embedded reposted posts)
  assert.match(initializerBlock, /: windowWidth - 64/);
});

test("windowWidth still comes from useWindowDimensions (no new hook / listener)", () => {
  assert.match(feedPostSource, /const \{ width: windowWidth \} = useWindowDimensions\(\);/);
  assert.doesNotMatch(feedPostSource, /Dimensions\.addEventListener/);
});

test("handleMediaLayout still measures, guards with a tolerance, and corrects real changes", () => {
  const handler = feedPostSource.slice(
    feedPostSource.indexOf("const handleMediaLayout ="),
    feedPostSource.indexOf("const handleMediaPress ="),
  );
  assert.match(handler, /const nextWidth = event\.nativeEvent\.layout\.width;/);
  assert.match(handler, /Math\.abs\(nextWidth - mediaFrameWidth\) < 0\.5/);
  assert.match(handler, /setMediaFrameWidth\(nextWidth\);/);
  assert.match(handler, /requestAnimationFrame\(\(\) => \{[\s\S]*?mediaScrollRef\.current\?\.scrollTo\(\{[\s\S]*?x: currentMediaIndex \* nextWidth,/);
});

test("final media geometry is unchanged: CroppedFeedImage still receives mediaFrameWidth-driven frame", () => {
  assert.match(
    feedPostSource,
    /<CroppedFeedImage item=\{item\} frameWidth=\{mediaFrameWidth\} frameHeight=\{isNormalPost \? mediaFrameWidth : 340\} \/>/,
  );
  assert.match(feedPostSource, /style=\{\[styles\.mediaSlide, \{ width: mediaFrameWidth \}\]\}/);
});

test("normalPostMediaContainer stays width/aspect-ratio driven (row height unaffected)", () => {
  assert.match(
    feedPostSource,
    /normalPostMediaContainer:\s*\{\s*\n?\s*aspectRatio:\s*1,\s*\n?\s*height:\s*undefined,/,
  );
});

test("CroppedFeedImage image-resolution + ExpoImage props are untouched", () => {
  assert.match(feedPostSource, /Image\.getSize\(/);
  assert.match(feedPostSource, /cachePolicy="memory-disk"/);
  assert.match(feedPostSource, /contentFit="cover"/);
  assert.match(feedPostSource, /contentFit="fill"/);
  assert.doesNotMatch(feedPostSource, /transition=\{/);
  assert.match(feedPostSource, /const imageInstanceKey = `\$\{resolvedUri\}-\$\{loadAttempt\}`;/);
});

test("dormant Video flag is still false/inert", () => {
  assert.match(feedPostSource, /export const VIDEO_PLAYBACK_ENABLED = false;/);
});
