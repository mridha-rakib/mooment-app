import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { groupStoriesByAuthor } from "../lib/storyRow";
import type { Story } from "../lib/stories";

// Follows the same source-string testing convention as
// test/viewStoryParity.test.ts / test/addStoryTextControls.test.ts: this
// repo has no component-rendering test library installed, so the text-only
// Story capsule preview fix is verified by asserting on the exact
// StoryCarousel.tsx source text (plus a pure groupStoriesByAuthor check).
const storyCarouselSource = readFileSync(
  join(process.cwd(), "components/home/StoryCarousel.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const sliceStoryThumbnail = () => {
  const start = storyCarouselSource.indexOf("const StoryThumbnail = React.memo(");
  assert.ok(start > -1, "expected to find the StoryThumbnail component");
  const end = storyCarouselSource.indexOf("function StoryCarousel(");
  assert.ok(end > start, "expected StoryCarousel to follow StoryThumbnail");
  return storyCarouselSource.slice(start, end);
};

const sliceTextBranch = () => {
  const thumbnail = sliceStoryThumbnail();
  const start = thumbnail.indexOf('if (mediaType === "text") {');
  assert.ok(start > -1, "expected an explicit mediaType === \"text\" branch");
  const end = thumbnail.indexOf('if (mediaType === "image"', start);
  assert.ok(end > start, "expected the image branch to follow the text branch");
  return thumbnail.slice(start, end);
};

test("1. StoryThumbnail accepts a textContent prop", () => {
  const thumbnail = sliceStoryThumbnail();
  assert.match(thumbnail, /\n\s{2}textContent,\n/, "textContent must be destructured");
  assert.match(thumbnail, /textContent\?:\s*string\s*\|\s*null;/, "textContent prop must be typed");
});

test("2. both capsule call sites pass story.textContent into StoryThumbnail", () => {
  const passCount = storyCarouselSource.match(/textContent=\{story\.textContent\}/g) ?? [];
  assert.equal(passCount.length, 2, "expected exactly two <StoryThumbnail textContent={story.textContent} /> call sites");
});

test("3. a valid text Story renders textContent, not fallbackName", () => {
  const branch = sliceTextBranch();
  assert.match(branch, /const storyText = textContent\?\.trim\(\);/);
  assert.match(branch, /const previewText = storyText \|\| fallbackName \|\| "Story";/);
  // The primary content path is storyText; fallbackName is only ever a
  // downstream `||` fallback, never rendered directly on its own.
  assert.doesNotMatch(branch, />\n?\s*\{fallbackName \|\| "Story"\}\n?\s*</);
});

test("4. textContent is trimmed before the validity check / render", () => {
  const branch = sliceTextBranch();
  assert.match(branch, /textContent\?\.trim\(\)/);
});

test("5. empty / whitespace textContent keeps the fallbackName || \"Story\" fallback", () => {
  const branch = sliceTextBranch();
  // storyText is "" for whitespace-only input, so `||` falls through.
  assert.match(branch, /storyText \|\| fallbackName \|\| "Story"/);
});

test("6. the text branch is gated only by mediaType === \"text\"", () => {
  const branch = sliceTextBranch();
  assert.match(branch, /^if \(mediaType === "text"\) \{/);
  assert.doesNotMatch(branch, /!mediaUri/);
  assert.doesNotMatch(branch, /!fallbackUri/);
  assert.doesNotMatch(branch, /!storageKey/);
});

test("7. a media-less image Story cannot enter the text branch", () => {
  const thumbnail = sliceStoryThumbnail();
  // The image branch still requires mediaUri; when it is missing the code
  // falls through to thumbnailSource / UserAvatar, never to the text tile.
  assert.match(thumbnail, /if \(mediaType === "image" && mediaUri\) \{/);
  const textBranch = sliceTextBranch();
  assert.doesNotMatch(textBranch, /mediaType === "image"/);
});

test("8. long text is bounded with numberOfLines={2} and ellipsizeMode=\"tail\"", () => {
  const branch = sliceTextBranch();
  assert.match(branch, /numberOfLines=\{2\}/);
  assert.match(branch, /ellipsizeMode="tail"/);
  assert.doesNotMatch(branch, /numberOfLines=\{3\}/);
});

test("9-11. solid vs gradient background use canonical textBackground semantics", () => {
  const branch = sliceTextBranch();
  // Solid: first colour.
  assert.match(branch, /backgroundColor: backgroundColors\[0\] \?\? "#37214F"/);
  // Gradient: only when type is gradient AND there are >= 2 colours.
  assert.match(branch, /textBackground\?\.type === "gradient" && backgroundColors\.length >= 2/);
  assert.match(branch, /<LinearGradient\s*\n\s*colors=\{\[backgroundColors\[0\], backgroundColors\[1\]\]\}/);
});

test("12. no random / generated / author-derived background is introduced", () => {
  const branch = sliceTextBranch();
  assert.doesNotMatch(branch, /Math\.random/);
  assert.doesNotMatch(branch, /Math\.floor/);
  assert.doesNotMatch(branch, /hsl\(/i);
  // The only colour literal is the pre-existing safe fallback.
  const hexLiterals = branch.match(/#[0-9a-fA-F]{3,6}/g) ?? [];
  assert.deepEqual(hexLiterals, ["#37214F"]);
});

test("13-15. image / thumbnail / UserAvatar fallback branches remain intact", () => {
  const thumbnail = sliceStoryThumbnail();
  assert.match(thumbnail, /if \(mediaType === "image" && mediaUri\) \{[\s\S]*?contentFit="cover"[\s\S]*?cachePolicy="memory-disk"[\s\S]*?transition=\{150\}/);
  assert.match(thumbnail, /if \(thumbnailSource\) \{[\s\S]*?source=\{thumbnailSource\}/);
  assert.match(thumbnail, /<UserAvatar\s*\n\s*uri=\{null\}\n\s*name=\{fallbackName\}\n\s*size=\{70\}/);
});

test("16. story ring / image geometry styles are unchanged", () => {
  assert.match(storyCarouselSource, /storyRing: \{\n\s*width: 74,\n\s*height: 92,\n\s*borderRadius: 37,/);
  assert.match(storyCarouselSource, /storyImage: \{\n\s*width: "100%",\n\s*height: "100%",\n\s*borderRadius: 35,\n\s*borderWidth: 2,\n\s*borderColor: "#0e0d12",/);
  // The text tile still reuses the shared storyImage geometry.
  const branch = sliceTextBranch();
  assert.match(branch, /\[styles\.storyImage, styles\.textThumbnail\]/);
});

test("17. seen / ring colour selection is unchanged", () => {
  assert.match(storyCarouselSource, /const ringStyle = story\.seen\n\s*\? styles\.storyRingSeen/);
  assert.match(storyCarouselSource, /const selfRingStyle = story\.seen\n\s*\? styles\.storyRingSeen\n\s*: styles\.storyRingStandard;/);
});

test("18. own-story self tile shell + add badge behaviour is unchanged", () => {
  assert.match(storyCarouselSource, /if \(story\.isSelfTile\) \{/);
  assert.match(storyCarouselSource, /accessibilityLabel=\{\n?\s*story\.hasOwnStory\n?\s*\? "View your story"\n?\s*: "Add to your story"/);
  assert.match(storyCarouselSource, /styles\.addStoryBadge/);
});

test("19. standard-story compact author-name overlay is still rendered", () => {
  assert.match(
    storyCarouselSource,
    /story\.type === "standard" && compactStoryName && \(\n\s*<View style=\{styles\.storyOverlayTextContainer\}>/,
  );
});

test("20. story tap navigation is unchanged", () => {
  assert.match(storyCarouselSource, /onPress=\{\(\) => openStoryViewer\(story\)\}/);
});

test("standard capsule exposes an additive author-only accessibility label", () => {
  assert.match(
    storyCarouselSource,
    /accessibilityRole="button"\n\s*accessibilityLabel=\{`Story by \$\{story\.title \?\? story\.authorName \?\? "someone"\}`\}/,
  );
  // The full Story text is never dumped into the label.
  assert.doesNotMatch(storyCarouselSource, /accessibilityLabel=\{[^}]*textContent/);
});

test("27. VIDEO_STORY_CREATION_ENABLED is not referenced / re-enabled here, and no new video render path is added", () => {
  assert.doesNotMatch(storyCarouselSource, /VIDEO_STORY_CREATION_ENABLED/);
  // The text branch adds no video handling of its own.
  assert.doesNotMatch(sliceTextBranch(), /video/i);
  // No dedicated `if (mediaType === "video") { return ... }` render guard is
  // introduced — video Stories keep flowing through the shared
  // thumbnail/UserAvatar fallback (the pre-existing dormant
  // `mediaType === "video"` check inside the thumbnail useEffect is left
  // untouched, so exactly one reference remains).
  assert.doesNotMatch(sliceStoryThumbnail(), /if \(mediaType === "video"\) \{\n\s*return/);
  const videoRefs = sliceStoryThumbnail().match(/mediaType === "video"/g) ?? [];
  assert.equal(videoRefs.length, 1, "only the pre-existing dormant video-thumbnail check should reference video");
});

const baseStory = (overrides: Partial<Story>): Story => ({
  id: "story-1",
  userId: "user-1",
  author: { id: "user-1", name: "Author" },
  mediaType: "text",
  mediaSource: "upload",
  storageKey: null,
  mediaUrl: null,
  contentType: null,
  durationSeconds: 5,
  caption: null,
  textContent: "hello world",
  textBackground: { type: "gradient", colors: ["#37214F", "#111827"] },
  textOverlay: null,
  audience: "connections",
  viewsCount: 0,
  reactionsCount: 0,
  commentsCount: 0,
  isReacted: false,
  isOwner: false,
  expiresInSeconds: 60,
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

test("21. groupStoriesByAuthor still carries textContent + textBackground onto the capsule and its items", () => {
  const groups = groupStoriesByAuthor([baseStory({})]);
  assert.equal(groups[0]?.textContent, "hello world");
  assert.deepEqual(groups[0]?.textBackground, { type: "gradient", colors: ["#37214F", "#111827"] });
  assert.equal(groups[0]?.storyItems?.[0]?.textContent, "hello world");
  assert.deepEqual(groups[0]?.storyItems?.[0]?.textBackground, {
    type: "gradient",
    colors: ["#37214F", "#111827"],
  });
});

test("22. the newest Story still drives the capsule preview", () => {
  const older = baseStory({ id: "old", textContent: "older", createdAt: "2020-01-01T00:00:00.000Z" });
  const newer = baseStory({ id: "new", textContent: "newer", createdAt: "2024-01-01T00:00:00.000Z" });
  const groups = groupStoriesByAuthor([older, newer]);
  assert.equal(groups[0]?.textContent, "newer");
});
