import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-string convention (see viewStoryParity.test.ts / storyHorizontalSwipe.test.ts):
// no component renderer is installed, so tap-navigation wiring is asserted
// against the exact view-story.tsx source text.
const viewStorySource = readFileSync(
  join(process.cwd(), "app/post-screen/view-story.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const sliceFn = (marker: string) => {
  const start = viewStorySource.indexOf(marker);
  assert.ok(start > -1, `expected to find ${marker}`);
  // stop at the first "\n  };" (component-scope helper) or "}, [" (useCallback)
  const endBrace = viewStorySource.indexOf("\n  };", start);
  const endCb = viewStorySource.indexOf("}, [", start);
  const end =
    endCb > -1 && (endCb < endBrace || endBrace === -1) ? endCb : endBrace;
  return viewStorySource.slice(start, end);
};

const handlePressAction = sliceFn(
  "const handlePressAction = (action: () => void) => {",
);

// ===========================================================================
// Basic left/right tap
// ===========================================================================

test("left tap routes through handlePressAction(goToPreviousStory), right through goToNextStory", () => {
  assert.match(
    viewStorySource,
    /onPress=\{\(\) => handlePressAction\(goToPreviousStory\)\}/,
  );
  assert.match(
    viewStorySource,
    /onPress=\{\(\) => handlePressAction\(goToNextStory\)\}/,
  );
  // both tap zones bump the press sequence on press-in
  assert.equal(
    (viewStorySource.match(/onPressIn=\{handleTapPressIn\}/g) ?? []).length,
    2,
  );
  assert.match(
    viewStorySource,
    /const handleTapPressIn = \(\) => \{\s*tapPressSequenceRef\.current \+= 1;\s*\};/,
  );
});

test("one genuine tap invokes at most one navigation action", () => {
  // action() appears exactly once and is the final statement
  assert.equal((handlePressAction.match(/\baction\(\);/g) ?? []).length, 1);
  assert.match(handlePressAction, /\n {4}action\(\);\s*$/);
  // onPressOut → resumeFromHold and onLongPress → pauseForHold never navigate
  const resumeFromHold = sliceFn("const resumeFromHold = useCallback(() => {");
  const pauseForHold = sliceFn("const pauseForHold = useCallback(() => {");
  for (const b of [resumeFromHold, pauseForHold]) {
    assert.doesNotMatch(b, /goToNextStory\(\)|goToPreviousStory\(\)/);
  }
});

test("advanceLockRef still serialises navigation (unchanged architecture)", () => {
  const next = sliceFn("const goToNextStory = useCallback(() => {");
  const prev = sliceFn("const goToPreviousStory = useCallback(() => {");
  for (const b of [next, prev]) {
    assert.match(b, /if \(advanceLockRef\.current\) \{\s*return;\s*\}/);
    assert.match(b, /advanceLockRef\.current = true;/);
  }
  // released on Story-id change in the per-story load effect (not tied to image decode)
  assert.match(
    viewStorySource,
    /loadRequestIdRef\.current = loadRequestId;\s*advanceLockRef\.current = false;/,
  );
});

test("genuine taps do not mutate swipe axis state", () => {
  assert.doesNotMatch(
    handlePressAction,
    /activePanAxisRef\.current = "|verticalDragY\.setValue|horizontalDragX\.setValue\([^0]/,
  );
});

// ===========================================================================
// Cancelled swipe → tap  (P0-A)
// ===========================================================================

test("a tap during a CANCELLED (non-committing) horizontal spring is accepted, not dropped", () => {
  // the cancel-spring branch normalises then FALLS THROUGH to action() (no return)
  assert.match(
    handlePressAction,
    /if \(horizontalCancelSpringActiveRef\.current\) \{\s*horizontalCancelSpringActiveRef\.current = false;\s*horizontalDragX\.stopAnimation\(\);\s*horizontalDragX\.setValue\(0\);\s*setHorizontalAdjacentLayerState\(null\);\s*horizontalSwipeLockRef\.current = false;\s*horizontalGestureActiveRef\.current = false;\s*resumePlaybackAfterHorizontalGesture\(\);\s*\} else if \(/,
  );
});

test("cancelHorizontalStoryGesture is token-guarded so its late callback can't double-clean or clobber a new drag", () => {
  const cancel = sliceFn("const cancelHorizontalStoryGesture = useCallback(");
  assert.match(cancel, /horizontalSwipeLockRef\.current = true;\s*horizontalCancelSpringActiveRef\.current = true;/);
  assert.match(
    cancel,
    /\.start\(\(\) => \{\s*if \(!horizontalCancelSpringActiveRef\.current\) \{\s*\/\/[\s\S]*?return;\s*\}\s*horizontalCancelSpringActiveRef\.current = false;/,
  );
});

test("a CANCELLED swipe still never navigates by itself", () => {
  const cancel = sliceFn("const cancelHorizontalStoryGesture = useCallback(");
  assert.doesNotMatch(cancel, /goToNextStory|goToPreviousStory|setCurrentIndex|setActiveGroupIndex/);
});

// ===========================================================================
// Committed swipe → tap stays blocked  (P0-A must not regress §6)
// ===========================================================================

test("an in-flight committed transition still blocks a tap (no +2)", () => {
  // advanceLockRef (set by commitHorizontalStorySwipe before the timing anim) blocks
  assert.match(
    handlePressAction,
    /if \(activePanAxisRef\.current !== null \|\| advanceLockRef\.current\) \{\s*return;\s*\}/,
  );
  // committed settle where a lock is set: else-if returns (stays blocked)
  assert.match(
    handlePressAction,
    /\} else if \(\s*horizontalGestureActiveRef\.current \|\|\s*horizontalSwipeLockRef\.current\s*\) \{\s*\/\/[\s\S]*?return;\s*\}/,
  );
  const commit = sliceFn("const commitHorizontalStorySwipe = useCallback(");
  assert.match(commit, /advanceLockRef\.current = true;/);
});

// ===========================================================================
// Long-press press-sequence ownership  (P0-B)
// ===========================================================================

test("pauseForHold records the current press sequence as the held sequence", () => {
  const pauseForHold = sliceFn("const pauseForHold = useCallback(() => {");
  assert.match(
    pauseForHold,
    /heldPressSequenceRef\.current = tapPressSequenceRef\.current;/,
  );
});

test("handlePressAction swallows ONLY the exact physical press that became the long-press", () => {
  assert.match(
    handlePressAction,
    /if \(\s*heldPressSequenceRef\.current !== null &&\s*heldPressSequenceRef\.current === tapPressSequenceRef\.current\s*\) \{\s*heldPressSequenceRef\.current = null;\s*return;\s*\}/,
  );
});

test("the old lingering ignoreNextPressRef one-shot guard is fully removed (no competing guard)", () => {
  assert.doesNotMatch(viewStorySource, /ignoreNextPressRef/);
});

test("held sequence is also cleared on Story load (cannot linger across Stories)", () => {
  assert.match(
    viewStorySource,
    /holdActivatedRef\.current = false;\s*heldPressSequenceRef\.current = null;/,
  );
});

test("hold-to-pause primitives are untouched", () => {
  assert.match(viewStorySource, /const LONG_PRESS_DELAY_MS = 160;/);
  assert.match(viewStorySource, /onLongPress=\{pauseForHold\}/);
  assert.match(viewStorySource, /onPressOut=\{resumeFromHold\}/);
  const pauseForHold = sliceFn("const pauseForHold = useCallback(() => {");
  const resumeFromHold = sliceFn("const resumeFromHold = useCallback(() => {");
  assert.match(pauseForHold, /freezeImagePlaybackProgress\(\)/);
  assert.match(pauseForHold, /holdActivatedRef\.current = true;/);
  assert.match(resumeFromHold, /if \(!holdActivatedRef\.current\) \{\s*return;\s*\}/);
  assert.match(resumeFromHold, /resumeImagePlaybackProgress\(\)/);
  assert.doesNotMatch(resumeFromHold, /setProgressTime\(0\)/);
});

// ===========================================================================
// First-Story left-tap progress restart  (P0-C)
// ===========================================================================

test("first-Story left tap resets the full timing origin (progressTimeRef + visibleStartedAtRef), not just the state", () => {
  const prev = sliceFn("const goToPreviousStory = useCallback(() => {");
  // the restart branch (no index change) now also resets the timing origin
  assert.match(
    prev,
    /progressTimeRef\.current = 0;\s*visibleStartedAtRef\.current = Date\.now\(\);\s*setProgressTime\(0\);/,
  );
});

test("first-Story left tap does NOT change currentIndex / activeGroupIndex / Story id", () => {
  const prev = sliceFn("const goToPreviousStory = useCallback(() => {");
  const restartBranch = prev.slice(prev.lastIndexOf("progressTimeRef.current = 0;"));
  assert.doesNotMatch(restartBranch, /setCurrentIndex|setActiveGroupIndex|pendingStoryIndexRef/);
});

test("restarting the first Story does not re-fire the seen/view effect (keyed on currentStory.id)", () => {
  assert.match(
    viewStorySource,
    /useEffect\(\(\) => \{\s*if \(currentStory\?\.id\) \{\s*void markStoriesSeen\(\[currentStory\.id\]\);/,
  );
  assert.match(
    viewStorySource,
    /void recordStoryView\(currentStory\.id\)[\s\S]*?\}, \[currentStory\?\.id\]\);/,
  );
});

// ===========================================================================
// Group-boundary progress flash — DISPLAY ONLY  (P1)
// ===========================================================================

test("progress segments render off a clamped display index, not the raw (transiently stale) currentIndex", () => {
  assert.match(
    viewStorySource,
    /const progressDisplayIndex = Math\.min\(\s*Math\.max\(pendingStoryIndexRef\.current \?\? currentIndex, 0\),\s*Math\.max\(storyItems\.length - 1, 0\),\s*\);/,
  );
  const segMap = viewStorySource.slice(
    viewStorySource.indexOf("{storyItems.map((story, index) => {"),
    viewStorySource.indexOf("<Text style={styles.durationText}>"),
  );
  assert.match(segMap, /index < progressDisplayIndex/);
  assert.match(segMap, /index > progressDisplayIndex/);
  assert.doesNotMatch(segMap, /index < currentIndex|index > currentIndex/);
});

test("the display index is NEVER used for navigation / currentStory / seen / grouping", () => {
  // progressDisplayIndex appears only in its own definition + the segment map
  assert.equal(
    (viewStorySource.match(/progressDisplayIndex/g) ?? []).length,
    3,
  );
  for (const fn of [
    "const goToNextStory = useCallback(() => {",
    "const goToPreviousStory = useCallback(() => {",
  ]) {
    assert.doesNotMatch(sliceFn(fn), /progressDisplayIndex/);
  }
});

test("group navigation architecture is unchanged (currentIndex / activeGroupIndex / pendingStoryIndexRef)", () => {
  const next = sliceFn("const goToNextStory = useCallback(() => {");
  const prev = sliceFn("const goToPreviousStory = useCallback(() => {");
  assert.match(next, /pendingStoryIndexRef\.current = 0;\s*setProgressTime\(0\);[\s\S]*?setActiveGroupIndex\(\(index\) => index \+ 1\);/);
  assert.match(prev, /pendingStoryIndexRef\.current = Math\.max\(/);
  assert.match(
    viewStorySource,
    /useEffect\(\(\) => \{\s*setCurrentIndex\(pendingStoryIndexRef\.current \?\? 0\);\s*pendingStoryIndexRef\.current = null;\s*\}, \[activeGroupIndex\]\);/,
  );
});

// ===========================================================================
// Overlay guard  (§18)
// ===========================================================================

test("handlePressAction no-ops while an overlay is open (defensive)", () => {
  assert.match(
    handlePressAction,
    /\/\/ Defensive:[\s\S]*?if \(isOverlayOpen\) \{\s*return;\s*\}/,
  );
});

// ===========================================================================
// Control non-conflict — unchanged
// ===========================================================================

test("back / tab / overflow / reaction / comment / share handlers contain no Story navigation", () => {
  // back
  assert.match(viewStorySource, /onPress=\{\(\) => safeBack\(router, "\/\(tabs\)\/home"\)\}/);
  // tab switch
  const tab = sliceFn("const handleStoryTabPress = (tab: StoryViewerTab) => {");
  assert.doesNotMatch(tab, /goToNextStory\(\)|goToPreviousStory\(\)/);
  // overflow menu
  const menu = sliceFn("const handleMenu = () => {");
  assert.doesNotMatch(menu, /goToNextStory\(\)|goToPreviousStory\(\)/);
  // reaction
  const reaction = sliceFn("const handleReactionPress = () => {");
  assert.doesNotMatch(reaction, /goToNextStory\(\)|goToPreviousStory\(\)/);
  // comment + share open overlay only
  const openOverlay = sliceFn("const openOverlay = useCallback(");
  assert.doesNotMatch(openOverlay, /goToNextStory\(\)|goToPreviousStory\(\)/);
  // caption remains a plain <Text> (no Pressable / onPress)
  assert.match(
    viewStorySource,
    /currentStory\?\.caption \? \(\s*<Text style=\{styles\.captionText\} numberOfLines=\{2\}>/,
  );
});

// ===========================================================================
// Progress synchronisation — already-correct behaviour must remain
// ===========================================================================

test("every accepted navigation resets progress + timing origin for the entered Story", () => {
  const next = sliceFn("const goToNextStory = useCallback(() => {");
  const prev = sliceFn("const goToPreviousStory = useCallback(() => {");
  assert.match(next, /setProgressTime\(0\);/);
  assert.match(prev, /setProgressTime\(0\);/);
  // load effect resets the timing origin on Story-id change
  assert.match(viewStorySource, /visibleStartedAtRef\.current = Date\.now\(\);/);
  // old 100ms interval is cleared on Story change
  const interval = viewStorySource.slice(
    viewStorySource.indexOf("const interval = setInterval(() => {"),
    viewStorySource.indexOf("goToNextStory,\n    isCurrentVideo,"),
  );
  assert.match(interval, /return \(\) => clearInterval\(interval\);/);
  assert.match(interval, /clearInterval\(interval\);\s*goToNextStory\(\);/);
});

// ===========================================================================
// Image / text parity — no new media-type branch in the tap path
// ===========================================================================

test("tap navigation has no image/text branch (only the dormant dual video-player slot check remains)", () => {
  assert.doesNotMatch(handlePressAction, /mediaType/);
  for (const fn of [
    "const goToNextStory = useCallback(() => {",
    "const goToPreviousStory = useCallback(() => {",
  ]) {
    const b = sliceFn(fn);
    const mediaTypeHits = b.match(/mediaType/g) ?? [];
    // the only allowed reference is the dual-player preload slot swap
    for (const _ of mediaTypeHits) void _;
    assert.match(
      b,
      /\(targetStory\?\.mediaType \?\? "video"\) === "video" &&/,
    );
    assert.doesNotMatch(b, /mediaType === "text"|mediaType === "image"/);
  }
});

// ===========================================================================
// Regression guards
// ===========================================================================

test("vertical group pager wiring is untouched", () => {
  assert.match(viewStorySource, /const verticalDragY = useRef\(new Animated\.Value\(0\)\)\.current;/);
  assert.match(viewStorySource, /getStoryGroupSwipeDirection\(\{/);
  assert.match(viewStorySource, /STORY_GROUP_ACTIVATION_DISTANCE/);
});

test("no auto-advance grace window / lastAutoAdvance suppression was added", () => {
  assert.doesNotMatch(viewStorySource, /lastAutoAdvance|autoAdvanceAt|graceWindow|gracePeriod/i);
});

test("video Story functionality stays disabled; no video-specific tap behaviour", () => {
  assert.doesNotMatch(viewStorySource, /VIDEO_STORY_CREATION_ENABLED\s*=\s*true/);
  assert.doesNotMatch(viewStorySource, /ENABLE_VIDEO_UPLOADS/);
  assert.doesNotMatch(handlePressAction, /video/i);
});
