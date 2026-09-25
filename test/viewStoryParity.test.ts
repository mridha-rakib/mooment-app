import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoProcessingState.test.ts and test/addStoryTextControls.test.ts:
// this repo has no component-rendering test library installed, so
// editor/viewer parity is verified by asserting on the exact source text of
// both files rather than by mounting components.
const viewStorySource = readFileSync(join(process.cwd(), "app/post-screen/view-story.tsx"), "utf8");
const draggableStoryTextSource = readFileSync(
  join(process.cwd(), "components/story/DraggableStoryText.tsx"),
  "utf8",
);
const draggableStoryImageSource = readFileSync(
  join(process.cwd(), "components/story/DraggableStoryImage.tsx"),
  "utf8",
);

const extractStyleBlock = (source: string, styleName: string) => {
  const marker = `${styleName}: {`;
  const start = source.indexOf(marker);
  assert.ok(start > -1, `expected to find a "${styleName}:" style block`);
  const end = source.indexOf("},", start);
  return source.slice(start, end);
};

test("viewer's overlayTextWrap geometry is byte-identical to the editor's (width, alignItems, paddingVertical, anchor)", () => {
  const editorWrap = extractStyleBlock(draggableStoryTextSource, "overlayTextWrap");
  const viewerWrap = extractStyleBlock(viewStorySource, "overlayTextWrap");

  for (const fragment of ['left: "50%"', 'top: "50%"', "width: 280", 'alignItems: "center"', "paddingVertical: 10"]) {
    assert.ok(editorWrap.includes(fragment), `editor overlayTextWrap missing ${fragment}`);
    assert.ok(viewerWrap.includes(fragment), `viewer overlayTextWrap missing ${fragment}`);
  }
});

test("viewer no longer positions text via percentage left/top — it uses the same explicit canvas-multiplication formula as the editor", () => {
  assert.doesNotMatch(viewStorySource, /left: `\$\{overlay\.x \* 100\}%`/);
  assert.doesNotMatch(viewStorySource, /top: `\$\{overlay\.y \* 100\}%`/);
  assert.match(viewStorySource, /translateX: \(overlay\.x - 0\.5\) \* canvasWidth - 140/);
  assert.match(viewStorySource, /translateY: \(overlay\.y - 0\.5\) \* canvasHeight - 30/);
});

test("viewer measures its own Story canvas via onLayout, bootstrapped from Dimensions.get('window') as a safe non-crashing fallback", () => {
  assert.match(viewStorySource, /const \[canvasSize, setCanvasSize\] = useState<\{ width: number; height: number \}>\(\(\) => \{/);
  assert.match(viewStorySource, /const \{ width, height \} = Dimensions\.get\("window"\);/);
  assert.match(viewStorySource, /const canvasWidth = canvasSize\.width;/);
  assert.match(viewStorySource, /const canvasHeight = canvasSize\.height;/);
});

test("onLayout is attached to storySurface — the common containing block for both the transformed image and the text overlay", () => {
  const storySurfaceBlock = viewStorySource.slice(
    viewStorySource.indexOf("styles.storySurface,"),
    viewStorySource.indexOf("styles.storySurface,") + 500,
  );
  assert.match(storySurfaceBlock, /onLayout=\{\(event\) => \{/);
  assert.match(storySurfaceBlock, /setCanvasSize\(/);
});

test("renderCurrentStoryImage and renderStoryImage both use measured canvasWidth/canvasHeight, not viewportWidth/viewportHeight", () => {
  const imageTransformSites = viewStorySource.match(
    /translateX: \(imageTransform\.x - 0\.5\) \* (\w+) \},\s*\n\s*\{ translateY: \(imageTransform\.y - 0\.5\) \* (\w+) \}/g,
  ) ?? [];
  assert.equal(imageTransformSites.length, 2, "expected exactly 2 image transform sites (renderStoryImage + renderCurrentStoryImage)");
  for (const site of imageTransformSites) {
    assert.match(site, /canvasWidth/);
    assert.match(site, /canvasHeight/);
    assert.doesNotMatch(site, /viewportWidth/);
    assert.doesNotMatch(site, /viewportHeight/);
  }
});

test("viewportWidth is no longer destructured from useWindowDimensions (it has no remaining use)", () => {
  assert.doesNotMatch(viewStorySource, /viewportWidth/);
});

test("viewportHeight from useWindowDimensions remains — but only for the unrelated vertical swipe-between-groups navigation animation", () => {
  assert.match(viewStorySource, /const \{ height: viewportHeight \} = useWindowDimensions\(\);/);
  // Still referenced by the swipe/pager navigation math (unrelated to Story
  // content transforms), not by any imageTransform/textOverlay site.
  assert.match(viewStorySource, /clampStoryGroupPagerDrag\(gesture\.dy, viewportHeight\)/);
});

test("image transform formula/order is unchanged: translateX, translateY, scale, rotate — matching the editor's DraggableStoryImage", () => {
  const editorOrder = draggableStoryImageSource.match(
    /transform: \[\s*\{ translateX:[\s\S]*?\},\s*\{ translateY:[\s\S]*?\},\s*\{ scale:[\s\S]*?\},\s*\{ rotate:[\s\S]*?\},\s*\]/,
  );
  assert.ok(editorOrder, "editor image transform array order not found");

  const viewerOrders = viewStorySource.match(
    /transform: \[\s*\{ translateX: \(imageTransform\.x[\s\S]*?\},\s*\{ translateY: \(imageTransform\.y[\s\S]*?\},\s*\{ scale: imageTransform\.scale \},\s*\{ rotate:[\s\S]*?\},\s*\]/g,
  ) ?? [];
  assert.equal(viewerOrders.length, 2, "expected both viewer image transform sites to keep translate→scale→rotate order");
});

test("legacy Story fallback (no/invalid imageTransform) is unchanged — still the plain cover Image, gated by hasValidStoryImageTransform", () => {
  assert.match(viewStorySource, /import \{ hasValidStoryImageTransform \} from "@\/lib\/storyTransform";/);
  const hasValidUses = viewStorySource.match(/hasValidStoryImageTransform\(/g) ?? [];
  assert.equal(hasValidUses.length, 2, "expected the guard in both renderStoryImage and renderCurrentStoryImage");
  assert.match(viewStorySource, /if \(!hasValidStoryImageTransform\(imageTransform\)\) \{/);
  assert.match(viewStorySource, /if \(!hasValidStoryImageTransform\(currentStory\.imageTransform\)\) \{/);
});

test("text standard scale/font size are unchanged in the viewer", () => {
  const overlayTextStyle = extractStyleBlock(viewStorySource, "overlayText");
  assert.match(overlayTextStyle, /fontSize: 30/);
  assert.match(overlayTextStyle, /lineHeight: 36/);
  assert.match(viewStorySource, /\{ scale: overlay\.scale \}/);
});
