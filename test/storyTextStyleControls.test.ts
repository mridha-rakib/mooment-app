import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { groupStoriesByAuthor } from "../lib/storyRow";
import type { Story, StoryTextStyle } from "../lib/stories";

// Source-string convention (see addStoryTextControls.test.ts / viewStoryParity.test.ts):
// no component renderer is installed, so composer/viewer wiring is verified by
// asserting on the exact source text; data propagation is verified with the
// pure groupStoriesByAuthor().
const addStorySource = readFileSync(
  join(process.cwd(), "app/post-screen/add-story.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const viewStorySource = readFileSync(
  join(process.cwd(), "app/post-screen/view-story.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");
const storiesLibSource = readFileSync(
  join(process.cwd(), "lib/stories.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const storyRowSource = readFileSync(
  join(process.cwd(), "lib/storyRow.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
const storyCarouselSource = readFileSync(
  join(process.cwd(), "components/home/StoryCarousel.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

// ===========================================================================
// Image-overlay weight mapping + Heavy visual distinction
// ===========================================================================

test("FONT_WEIGHT_OPTIONS maps the four labels to normal / 600 / 700 / 800", () => {
  const block = addStorySource.slice(
    addStorySource.indexOf("const FONT_WEIGHT_OPTIONS"),
    addStorySource.indexOf("];", addStorySource.indexOf("const FONT_WEIGHT_OPTIONS")),
  );
  assert.match(block, /\{ label: 'Regular', value: 'normal' \}/);
  assert.match(block, /\{ label: 'Semibold', value: '600' \}/);
  assert.match(block, /\{ label: 'Bold', value: '700' \}/);
  assert.match(block, /\{ label: 'Heavy', value: '800' \}/);
});

test("Heavy is measurably distinct: it is '800', never React Native's 'bold' (== 700)", () => {
  const block = addStorySource.slice(
    addStorySource.indexOf("const FONT_WEIGHT_OPTIONS"),
    addStorySource.indexOf("];", addStorySource.indexOf("const FONT_WEIGHT_OPTIONS")),
  );
  assert.doesNotMatch(block, /label: 'Heavy', value: 'bold'/);
  const values = [...block.matchAll(/value: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(values, ["normal", "600", "700", "800"]);
  assert.equal(new Set(values).size, 4, "all four weight values must be distinct");
});

// ===========================================================================
// Client types: legacy "bold" kept, "800" + shadow added, StoryTextStyle added
// ===========================================================================

test("StoryTextOverlay keeps legacy 'bold' and gains '800' + optional shadow", () => {
  const block = storiesLibSource.slice(
    storiesLibSource.indexOf("export type StoryTextOverlay"),
    storiesLibSource.indexOf("};", storiesLibSource.indexOf("export type StoryTextOverlay")),
  );
  assert.match(block, /"normal" \| "600" \| "700" \| "800" \| "bold"/);
  assert.match(block, /shadow\?: boolean;/);
});

test("StoryTextStyle is a minimal 4-field style object — no positioning fields", () => {
  const block = storiesLibSource.slice(
    storiesLibSource.indexOf("export type StoryTextStyle"),
    storiesLibSource.indexOf("};", storiesLibSource.indexOf("export type StoryTextStyle")),
  );
  assert.match(block, /fontWeight\?: "normal" \| "600" \| "700" \| "800";/);
  assert.match(block, /color\?: string;/);
  assert.match(block, /textAlign\?: "left" \| "center" \| "right";/);
  assert.match(block, /shadow\?: boolean;/);
  for (const forbidden of ["x?:", "y?:", "scale?:", "rotation?:", "fontFamily", "fontSize", "lineHeight", "letterSpacing"]) {
    assert.ok(!block.includes(forbidden), `StoryTextStyle must not contain ${forbidden}`);
  }
});

test("Story and CreateStoryPayload carry textStyle", () => {
  assert.match(storiesLibSource, /textStyle\?: StoryTextStyle \| null;/);
  const payloadBlock = storiesLibSource.slice(
    storiesLibSource.indexOf("export type CreateStoryPayload"),
    storiesLibSource.indexOf("};", storiesLibSource.indexOf("export type CreateStoryPayload")),
  );
  assert.match(payloadBlock, /textStyle\?: StoryTextStyle \| null;/);
});

// ===========================================================================
// Image-overlay shadow persistence
// ===========================================================================

test("buildOverlay takes a shadow arg and serializes it into the overlay object", () => {
  const start = addStorySource.indexOf("const buildOverlay = (");
  const block = addStorySource.slice(start, start + 600);
  assert.match(block, /shadow: boolean,\n\): StoryTextOverlay \| null =>/);
  assert.match(block, /\n {4}shadow,\n {2}\};/);
});

test("currentOverlay passes overlayShadowEnabled and lists it as a memo dependency", () => {
  assert.match(
    addStorySource,
    /buildOverlay\(\s*overlayText,\s*overlayX,\s*overlayY,\s*overlayColor,\s*overlayScale,\s*overlayRotation,\s*overlayFontWeight,\s*overlayTextAlign,\s*overlayShadowEnabled,\s*\)/,
  );
  assert.match(
    addStorySource,
    /\[overlayColor, overlayText, overlayX, overlayY, overlayScale, overlayRotation, overlayFontWeight, overlayTextAlign, overlayShadowEnabled\]/,
  );
});

test("image create payload sends textOverlay (which now carries shadow); no textStyle on image Stories", () => {
  const imagePublish = addStorySource.slice(
    addStorySource.indexOf("mediaType: 'image',", addStorySource.lastIndexOf("createStory({")),
    addStorySource.indexOf("});", addStorySource.lastIndexOf("createStory({")),
  );
  assert.match(imagePublish, /textOverlay: finalOverlay/);
  assert.doesNotMatch(imagePublish, /textStyle:/);
});

// ===========================================================================
// Text-only Story: separate style state, toolbar reuse, immediate preview
// ===========================================================================

test("text-only style state is separate from overlay state, with the documented defaults", () => {
  assert.match(addStorySource, /const \[storyTextFontWeight, setStoryTextFontWeight\] = useState<NonNullable<StoryTextStyle\['fontWeight'\]>>\('800'\);/);
  assert.match(addStorySource, /const \[storyTextColor, setStoryTextColor\] = useState\('#FFFFFF'\);/);
  assert.match(addStorySource, /const \[storyTextAlign, setStoryTextAlign\] = useState<NonNullable<StoryTextStyle\['textAlign'\]>>\('center'\);/);
  assert.match(addStorySource, /const \[storyTextShadowEnabled, setStoryTextShadowEnabled\] = useState\(true\);/);
});

test("text-only Story reuses the SAME StoryTextToolbar component, wired to the storyText* state", () => {
  // Exactly one component definition.
  const defs = addStorySource.match(/function StoryTextToolbar\(/g) ?? [];
  assert.equal(defs.length, 1);
  // Two usage sites: one for the image overlay, one for the text-only body.
  const uses = addStorySource.match(/<StoryTextToolbar/g) ?? [];
  assert.equal(uses.length, 2);

  const textToolbar = addStorySource.slice(
    addStorySource.indexOf("draft.mediaType === 'text' && !isTextToolsCollapsed ? ("),
    addStorySource.indexOf("/>", addStorySource.indexOf("draft.mediaType === 'text' && !isTextToolsCollapsed ? (")),
  );
  assert.match(textToolbar, /color=\{storyTextColor\}/);
  assert.match(textToolbar, /onColorChange=\{setStoryTextColor\}/);
  assert.match(textToolbar, /fontWeight=\{storyTextFontWeight\}/);
  assert.match(textToolbar, /setStoryTextFontWeight\(weight\)/);
  assert.match(textToolbar, /textAlign=\{storyTextAlign\}/);
  assert.match(textToolbar, /setStoryTextAlign\(align\)/);
  assert.match(textToolbar, /shadowEnabled=\{storyTextShadowEnabled\}/);
  assert.match(textToolbar, /onShadowToggle=\{setStoryTextShadowEnabled\}/);
});

test("text-only TextInput renders the live storyText* style (immediate preview) + conditional shadow", () => {
  const input = addStorySource.slice(
    addStorySource.indexOf('placeholder="Write your story"'),
    addStorySource.indexOf("/>", addStorySource.indexOf('placeholder="Write your story"')),
  );
  assert.match(input, /styles\.textStoryInput,/);
  assert.match(input, /storyTextShadowEnabled && styles\.textStoryInputShadow,/);
  assert.match(input, /color: storyTextColor,/);
  assert.match(input, /fontWeight: storyTextFontWeight,/);
  assert.match(input, /textAlign: storyTextAlign,/);
  assert.match(input, /textAlign=\{storyTextAlign\}/);
});

test("text-only shadow style is shadow-keys-only and byte-identical to the viewer's text-Story shadow", () => {
  const composerStart = addStorySource.indexOf("textStoryInputShadow: {");
  const composerShadow = addStorySource.slice(composerStart, composerStart + 200);
  assert.match(composerShadow, /textShadowColor: 'rgba\(0,0,0,0\.45\)'/);
  assert.match(composerShadow, /textShadowOffset: \{ width: 0, height: 2 \}/);
  assert.match(composerShadow, /textShadowRadius: 5/);
  assert.doesNotMatch(composerShadow.slice(0, composerShadow.indexOf("\n  },")), /fontSize|fontWeight|lineHeight|color:/);

  const viewerStart = viewStorySource.indexOf("textStoryTextShadow: {");
  const viewerShadow = viewStorySource.slice(viewerStart, viewerStart + 200);
  assert.match(viewerShadow, /textShadowColor: "rgba\(0,0,0,0\.45\)"/);
  assert.match(viewerShadow, /textShadowOffset: \{ width: 0, height: 2 \}/);
  assert.match(viewerShadow, /textShadowRadius: 5/);
});

test("text-only publish payload sends textStyle (all 4 fields) and never textOverlay", () => {
  const createStoryStart = addStorySource.indexOf("await createStory({");
  const textPublish = addStorySource.slice(
    createStoryStart,
    addStorySource.indexOf("});", createStoryStart),
  );
  assert.match(textPublish, /textStyle: \{/);
  assert.match(textPublish, /fontWeight: storyTextFontWeight,/);
  assert.match(textPublish, /color: storyTextColor,/);
  assert.match(textPublish, /textAlign: storyTextAlign,/);
  assert.match(textPublish, /shadow: storyTextShadowEnabled,/);
  // No textOverlay key is ever sent for a text-only Story.
  assert.doesNotMatch(textPublish, /textOverlay:/);
});

test("draft reset restores the text-only style defaults", () => {
  const resetBlock = addStorySource.slice(
    addStorySource.indexOf("const resetDraft = useCallback(() => {"),
    addStorySource.indexOf("}, []);", addStorySource.indexOf("const resetDraft = useCallback(() => {")),
  );
  assert.match(resetBlock, /setStoryTextFontWeight\('800'\)/);
  assert.match(resetBlock, /setStoryTextColor\('#FFFFFF'\)/);
  assert.match(resetBlock, /setStoryTextAlign\('center'\)/);
  assert.match(resetBlock, /setStoryTextShadowEnabled\(true\)/);
});

// ===========================================================================
// Viewer: text-only + image-overlay read persisted style, with legacy fallbacks
// ===========================================================================

test("viewer applies persisted textStyle for text Stories with the non-negotiable legacy fallbacks", () => {
  const helper = viewStorySource.slice(
    viewStorySource.indexOf("const textStoryTextStyle = ("),
    viewStorySource.indexOf("];", viewStorySource.indexOf("const textStoryTextStyle = (")),
  );
  assert.match(helper, /styles\.textStoryText,/);
  assert.match(helper, /textStyle\?\.shadow !== false \? styles\.textStoryTextShadow : null,/);
  assert.match(helper, /fontWeight: textStyle\?\.fontWeight \?\? \("800" as const\)/);
  assert.match(helper, /color: textStyle\?\.color \?\? "#FFFFFF"/);
  assert.match(helper, /textAlign: textStyle\?\.textAlign \?\? \("center" as const\)/);
  // Both text-Story render sites go through the helper.
  const uses = viewStorySource.match(/textStoryTextStyle\((?:story|currentStory)\.textStyle\)/g) ?? [];
  assert.equal(uses.length, 2);
});

test("viewer honours overlay.shadow (=== false hides it; undefined keeps legacy shadow ON)", () => {
  assert.match(viewStorySource, /overlay\.shadow !== false \? styles\.overlayTextShadow : null,/);
  // fontWeight fallback unchanged; Heavy "800" renders directly, no special-case.
  assert.match(viewStorySource, /fontWeight: overlay\.fontWeight \?\? "700"/);
  assert.doesNotMatch(viewStorySource, /overlay\.shadow \|\| /); // never the falsy-clobbering form
});

test("viewer overlayText / textStoryText base styles no longer hardcode a shadow", () => {
  const overlayText = viewStorySource.slice(
    viewStorySource.indexOf("overlayText: {"),
    viewStorySource.indexOf("},", viewStorySource.indexOf("overlayText: {")),
  );
  assert.match(overlayText, /fontSize: 30/);
  assert.match(overlayText, /lineHeight: 36/);
  assert.doesNotMatch(overlayText, /textShadow/);

  const textStoryText = viewStorySource.slice(
    viewStorySource.indexOf("textStoryText: {"),
    viewStorySource.indexOf("},", viewStorySource.indexOf("textStoryText: {")),
  );
  assert.match(textStoryText, /fontSize: 34/);
  assert.match(textStoryText, /lineHeight: 40/);
  assert.doesNotMatch(textStoryText, /textShadow/);
});

// ===========================================================================
// Propagation: Story -> groupStoriesByAuthor -> StoryData/storyItems
// ===========================================================================

test("storyRow.ts copies textStyle onto both the group and each storyItem", () => {
  assert.match(storyRowSource, /textStyle: story\.textStyle,/);
  assert.match(storyRowSource, /textStyle: latestStory\.textStyle,/);
});

test("StoryCarousel propagates textStyle to the viewer but NOT into the capsule (StoryThumbnail)", () => {
  assert.match(storyCarouselSource, /textStyle\?: StoryTextStyle \| null;/);
  // openStoryViewer's single-item fallback forwards it.
  assert.match(storyCarouselSource, /textStyle: story\.textStyle,/);
  // The capsule renderer must not receive it.
  const thumbnailProps = storyCarouselSource.match(/<StoryThumbnail[\s\S]*?\/>/g) ?? [];
  assert.ok(thumbnailProps.length >= 2);
  for (const props of thumbnailProps) {
    assert.doesNotMatch(props, /textStyle/);
  }
});

const baseStory = (overrides: Partial<Story>): Story => ({
  id: "s1",
  userId: "u1",
  author: { id: "u1", name: "Author" },
  mediaType: "text",
  mediaSource: "upload",
  storageKey: null,
  mediaUrl: null,
  contentType: null,
  durationSeconds: 5,
  caption: null,
  textContent: "hello world",
  textBackground: { type: "color", colors: ["#15151F"] },
  textOverlay: null,
  textStyle: null,
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

test("groupStoriesByAuthor preserves a text Story's textStyle end to end", () => {
  const textStyle: StoryTextStyle = {
    fontWeight: "600",
    color: "#A855F7",
    textAlign: "left",
    shadow: false,
  };
  const groups = groupStoriesByAuthor([baseStory({ textStyle })]);
  assert.deepEqual(groups[0]?.textStyle, textStyle);
  assert.deepEqual(groups[0]?.storyItems?.[0]?.textStyle, textStyle);
});

test("a legacy text Story with no textStyle still groups cleanly (null passes through)", () => {
  const groups = groupStoriesByAuthor([baseStory({ textStyle: null })]);
  assert.equal(groups[0]?.textStyle ?? null, null);
  assert.equal(groups[0]?.storyItems?.[0]?.textStyle ?? null, null);
});

// ===========================================================================
// Video safety
// ===========================================================================

test("video Story creation stays disabled and gains no new render path from this change", () => {
  assert.match(addStorySource, /const VIDEO_STORY_CREATION_ENABLED = false;/);
  assert.doesNotMatch(viewStorySource, /VIDEO_STORY_CREATION_ENABLED\s*=\s*true/);
});
