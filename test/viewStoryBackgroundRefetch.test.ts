import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Regression coverage for the Story viewer bug where a newly-created
// transformed image Story rendered correctly on first paint, then snapped
// to the legacy full-screen cover render a moment later. Root cause: this
// screen used to define its own private copy of groupStoriesByAuthor for
// its mount-time background refetch (getDiscoverStories/getFriendStories),
// and that copy's per-story field mapping never carried imageTransform.
// Once the refetch resolved, it silently replaced the correct
// session-provided Story data with a copy missing imageTransform, which
// flips hasValidStoryImageTransform() from true to false for the same
// Story and drops it into the legacy cover branch.
//
// Follows the same source-string testing convention as
// test/viewStoryParity.test.ts: this repo has no component-rendering test
// library installed.
const viewStorySource = readFileSync(
  join(process.cwd(), "app/post-screen/view-story.tsx"),
  "utf8",
);

test("view-story.tsx no longer defines its own local groupStoriesByAuthor", () => {
  assert.doesNotMatch(viewStorySource, /const groupStoriesByAuthor = \(/);
});

test("view-story.tsx imports the canonical groupStoriesByAuthor from lib/storyRow", () => {
  assert.match(
    viewStorySource,
    /import \{ groupStoriesByAuthor \} from "@\/lib\/storyRow";/,
  );
});

test("the background refetch path regroups both Discover and Friends results through the shared mapper", () => {
  const loadViewerStoriesStart = viewStorySource.indexOf(
    "const loadViewerStories = async () => {",
  );
  assert.ok(
    loadViewerStoriesStart > -1,
    "expected to find the loadViewerStories background refetch effect",
  );
  const loadViewerStoriesBlock = viewStorySource.slice(
    loadViewerStoriesStart,
    viewStorySource.indexOf("void loadViewerStories();"),
  );

  const groupingCalls =
    loadViewerStoriesBlock.match(/groupStoriesByAuthor\(/g) ?? [];
  assert.equal(
    groupingCalls.length,
    2,
    "expected one groupStoriesByAuthor(...) call for discoverResult and one for friendsResult",
  );
  assert.match(loadViewerStoriesBlock, /groupStoriesByAuthor\(discoverResult\.value\)/);
  assert.match(loadViewerStoriesBlock, /groupStoriesByAuthor\(friendsResult\.value\)/);
});

test("the viewer's StoryGroup adapter only reshapes the container, it does not re-list individual Story fields", () => {
  const adapterStart = viewStorySource.indexOf("const toStoryGroups = (");
  assert.ok(adapterStart > -1, "expected a toStoryGroups adapter");
  const adapterEnd = viewStorySource.indexOf(
    "const removeStoryFromGroupList",
    adapterStart,
  );
  const adapterBlock = viewStorySource.slice(adapterStart, adapterEnd);

  // The adapter must pass storyItems through wholesale (no field-by-field
  // reconstruction), which is what let imageTransform get silently dropped
  // last time.
  assert.match(adapterBlock, /stories: group\.storyItems \?\? \[\]/);
  assert.doesNotMatch(adapterBlock, /imageTransform:/);
  assert.doesNotMatch(adapterBlock, /textOverlay:/);
});

test("hasValidStoryImageTransform gating is untouched by this fix", () => {
  assert.match(
    viewStorySource,
    /import \{ hasValidStoryImageTransform \} from "@\/lib\/storyTransform";/,
  );
  const hasValidUses =
    viewStorySource.match(/hasValidStoryImageTransform\(/g) ?? [];
  assert.equal(hasValidUses.length, 2);
});

test("canvas onLayout measurement is untouched by this fix", () => {
  assert.match(
    viewStorySource,
    /const \[canvasSize, setCanvasSize\] = useState<\{ width: number; height: number \}>\(\(\) => \{/,
  );
  assert.match(viewStorySource, /onLayout=\{\(event\) => \{/);
});
