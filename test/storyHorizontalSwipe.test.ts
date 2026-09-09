import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  clampHorizontalStoryDrag,
  getHorizontalAdjacentTranslateX,
  getHorizontalCommitDuration,
  getHorizontalCommitTranslateX,
  getHorizontalStorySwipeDirection,
  shouldCaptureHorizontalStorySwipe,
  shouldCommitHorizontalStorySwipe,
  STORY_HORIZONTAL_ACTIVATION_DISTANCE,
  STORY_HORIZONTAL_ACTIVATION_VELOCITY,
  STORY_HORIZONTAL_COMMIT_DISTANCE_RATIO,
  STORY_HORIZONTAL_COMMIT_VELOCITY,
  STORY_HORIZONTAL_SWIPE_COMMIT_MAX_DURATION_MS,
  STORY_HORIZONTAL_SWIPE_COMMIT_MIN_DURATION_MS,
} from "../lib/storyViewerGestures";

// Source-string convention (see viewStoryParity.test.ts / storyViewerGestures.test.ts):
// no component renderer is installed, so the pure helpers are tested directly
// and the view-story.tsx wiring is asserted against exact source text.
const viewStorySource = readFileSync(
  join(process.cwd(), "app/post-screen/view-story.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const W = 400; // stand-in Story canvas width

// ===========================================================================
// Pure helpers — finger tracking / commit / cancel math
// ===========================================================================

test("clampHorizontalStoryDrag bounds one gesture to a single page (±canvasWidth)", () => {
  assert.equal(clampHorizontalStoryDrag(5 * W, W), W);
  assert.equal(clampHorizontalStoryDrag(-5 * W, W), -W);
  assert.equal(clampHorizontalStoryDrag(0.4 * W, W), 0.4 * W);
  assert.equal(clampHorizontalStoryDrag(-0.4 * W, W), -0.4 * W);
});

test("getHorizontalStorySwipeDirection classifies drag axis+direction only", () => {
  assert.equal(getHorizontalStorySwipeDirection({ dx: -30, dy: 4 }), "next");
  assert.equal(getHorizontalStorySwipeDirection({ dx: 30, dy: 4 }), "previous");
  // vertical-dominant → not a horizontal drag
  assert.equal(getHorizontalStorySwipeDirection({ dx: 20, dy: 60 }), null);
});

test("shouldCaptureHorizontalStorySwipe claims on distance OR fast flick, never on a vertical drag", () => {
  assert.equal(
    shouldCaptureHorizontalStorySwipe({
      dx: STORY_HORIZONTAL_ACTIVATION_DISTANCE + 4,
      dy: 3,
      vx: 0,
    }),
    true,
  );
  // short but fast flick still captures (so it can't fall through as a tap)
  assert.equal(
    shouldCaptureHorizontalStorySwipe({
      dx: 8,
      dy: 2,
      vx: -(STORY_HORIZONTAL_ACTIVATION_VELOCITY + 0.05),
    }),
    true,
  );
  // vertical-dominant gesture never captured as horizontal
  assert.equal(
    shouldCaptureHorizontalStorySwipe({ dx: 40, dy: 80, vx: 2 }),
    false,
  );
  // tiny idle jitter does not capture
  assert.equal(
    shouldCaptureHorizontalStorySwipe({ dx: 6, dy: 1, vx: 0.1 }),
    false,
  );
});

test("shouldCommitHorizontalStorySwipe is width-aware and only ever one step", () => {
  const distance = W * STORY_HORIZONTAL_COMMIT_DISTANCE_RATIO;

  // short / insufficient → null (cancel)
  assert.equal(
    shouldCommitHorizontalStorySwipe({
      translationX: -(distance - 10),
      velocityX: 0,
      translationY: 4,
      canvasWidth: W,
    }),
    null,
  );
  // long left → next
  assert.equal(
    shouldCommitHorizontalStorySwipe({
      translationX: -(distance + 10),
      velocityX: 0,
      translationY: 4,
      canvasWidth: W,
    }),
    "next",
  );
  // long right → previous
  assert.equal(
    shouldCommitHorizontalStorySwipe({
      translationX: distance + 10,
      velocityX: 0,
      translationY: 4,
      canvasWidth: W,
    }),
    "previous",
  );
  // fast left flick under the distance threshold still commits next
  assert.equal(
    shouldCommitHorizontalStorySwipe({
      translationX: -20,
      velocityX: -(STORY_HORIZONTAL_COMMIT_VELOCITY + 0.05),
      translationY: 3,
      canvasWidth: W,
    }),
    "next",
  );
  // vertical-dominant release never commits a horizontal swipe
  assert.equal(
    shouldCommitHorizontalStorySwipe({
      translationX: distance + 10,
      velocityX: 0.9,
      translationY: distance + 200,
      canvasWidth: W,
    }),
    null,
  );
  // the result set is exactly {"next","previous",null} — no multi-page value
  for (const tx of [-5 * W, -W, -1, 0, 1, W, 5 * W]) {
    const r = shouldCommitHorizontalStorySwipe({
      translationX: tx,
      velocityX: 0,
      translationY: 2,
      canvasWidth: W,
    });
    assert.ok(r === "next" || r === "previous" || r === null);
  }
});

test("adjacent layer enters from +canvasWidth (next) / -canvasWidth (previous), tracking the finger", () => {
  // finger at rest: next sits one page to the right, previous one page to the left
  assert.equal(
    getHorizontalAdjacentTranslateX({ direction: "next", dragX: 0, canvasWidth: W }),
    W,
  );
  assert.equal(
    getHorizontalAdjacentTranslateX({ direction: "previous", dragX: 0, canvasWidth: W }),
    -W,
  );
  // dragging left by 120: next slides in with the finger, 1:1
  assert.equal(
    getHorizontalAdjacentTranslateX({ direction: "next", dragX: -120, canvasWidth: W }),
    W - 120,
  );
  // fully dragged: adjacent is centred exactly on screen
  assert.equal(
    getHorizontalAdjacentTranslateX({ direction: "next", dragX: -W, canvasWidth: W }),
    0,
  );
  assert.equal(
    getHorizontalAdjacentTranslateX({ direction: "previous", dragX: W, canvasWidth: W }),
    0,
  );
});

test("committed swipe animates the current surface exactly one page off", () => {
  assert.equal(getHorizontalCommitTranslateX("next", W), -W);
  assert.equal(getHorizontalCommitTranslateX("previous", W), W);
});

test("horizontal commit duration stays in the short 140–220ms band and shortens with velocity", () => {
  assert.equal(
    getHorizontalCommitDuration(W, W, W),
    STORY_HORIZONTAL_SWIPE_COMMIT_MIN_DURATION_MS,
  );
  assert.equal(
    getHorizontalCommitDuration(0, W, W),
    STORY_HORIZONTAL_SWIPE_COMMIT_MAX_DURATION_MS,
  );
  assert.ok(
    getHorizontalCommitDuration(0, W, W, 1.2) <
      STORY_HORIZONTAL_SWIPE_COMMIT_MAX_DURATION_MS,
  );
  assert.ok(
    getHorizontalCommitDuration(0, -W, W, 0.6) >=
      STORY_HORIZONTAL_SWIPE_COMMIT_MIN_DURATION_MS,
  );
});

// ===========================================================================
// view-story.tsx wiring — finger tracking
// ===========================================================================

test("a dedicated horizontalDragX Animated.Value drives horizontal paging (not verticalDragY)", () => {
  assert.match(
    viewStorySource,
    /const horizontalDragX = useRef\(new Animated\.Value\(0\)\)\.current;/,
  );
  assert.match(viewStorySource, /const verticalDragY = useRef\(new Animated\.Value\(0\)\)\.current;/);
});

test("the horizontal onMove branch tracks gesture.dx into horizontalDragX with no setState per frame", () => {
  const moveStart = viewStorySource.indexOf("onPanResponderMove: (_event, gesture) => {");
  const moveBlock = viewStorySource.slice(
    moveStart,
    viewStorySource.indexOf("onPanResponderTerminate:", moveStart),
  );
  assert.match(moveBlock, /activePanAxisRef\.current === "horizontal"/);
  assert.match(
    moveBlock,
    /horizontalDragX\.setValue\(\s*adjacent\s*\?\s*clampHorizontalStoryDrag\(gesture\.dx, canvasWidth\)/,
  );
  // no React state setters in the horizontal move path (translation is a
  // native Animated write, not a rerender)
  const horizontalPortion = moveBlock.slice(
    moveBlock.indexOf('activePanAxisRef.current === "horizontal"'),
    moveBlock.indexOf("if (groupSwipeLockRef.current)"),
  );
  assert.doesNotMatch(horizontalPortion, /setCurrentIndex|setActiveGroupIndex|setProgressTime\(/);
});

test("the current Story surface transform includes translateX: horizontalSurfaceTranslateX", () => {
  assert.match(viewStorySource, /const horizontalSurfaceTranslateX = horizontalDragX;/);
  assert.match(
    viewStorySource,
    /transform: \[\s*\{ translateX: horizontalSurfaceTranslateX \},\s*\{ translateY: verticalSurfaceTranslateY \},\s*\]/,
  );
});

test("exactly one horizontal adjacent Story layer is rendered, reusing the static renderers, pointer-inert", () => {
  const start = viewStorySource.indexOf("const renderHorizontalAdjacentStoryLayer = () => {");
  assert.ok(start > -1);
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n  };", start));
  assert.match(block, /if \(!horizontalAdjacentLayer\) \{\s*return null;/);
  assert.match(block, /pointerEvents="none"/);
  assert.match(block, /styles\.adjacentStorySurface/);
  assert.match(block, /transform: \[\{ translateX: horizontalAdjacentTranslateX \}\]/);
  assert.match(block, /renderStaticStoryVisual\(horizontalAdjacentLayer\.story\)/);
  assert.match(block, /renderTextOverlay\(horizontalAdjacentLayer\.story\.textOverlay\)/);
  // called exactly once in the render tree
  assert.equal(
    (viewStorySource.match(/renderHorizontalAdjacentStoryLayer\(\)/g) ?? []).length,
    1,
  );
});

test("horizontal adjacent translate uses the SAME canvasWidth for +next and -previous", () => {
  const memoStart = viewStorySource.indexOf("const horizontalAdjacentTranslateX = useMemo(");
  const memo = viewStorySource.slice(memoStart, viewStorySource.indexOf("}, [", memoStart));
  assert.match(
    memo,
    /Animated\.add\(\s*horizontalDragX,\s*horizontalAdjacentLayer\.direction === "next" \? canvasWidth : -canvasWidth,\s*\)/,
  );
});

// ===========================================================================
// view-story.tsx wiring — commit / cancel / ordering
// ===========================================================================

test("cancelled swipe springs horizontalDragX back to 0 with the vertical pager's cancel feel, no index change", () => {
  const start = viewStorySource.indexOf("const cancelHorizontalStoryGesture = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("}, [", start));
  assert.match(block, /Animated\.spring\(horizontalDragX, \{/);
  assert.match(block, /toValue: 0,/);
  assert.match(block, /useNativeDriver: true,/);
  assert.match(block, /tension: 80,/);
  assert.match(block, /friction: 12,/);
  assert.doesNotMatch(block, /setCurrentIndex|setActiveGroupIndex|goToNextStory|goToPreviousStory/);
});

test("committed swipe animates one page with Easing.out(Easing.cubic) + native driver + the short duration helper", () => {
  const start = viewStorySource.indexOf("const commitHorizontalStorySwipe = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n    ],\n  );", start));
  assert.match(block, /Animated\.timing\(horizontalDragX, \{/);
  assert.match(block, /toValue: targetX,/);
  assert.match(block, /getHorizontalCommitTranslateX\(direction, canvasWidth\)/);
  assert.match(block, /getHorizontalCommitDuration\(/);
  assert.match(block, /easing: Easing\.out\(Easing\.cubic\),/);
  assert.match(block, /useNativeDriver: true,/);
});

test("the logical index commit happens ONLY inside the animation-completion callback, after finished === true", () => {
  const start = viewStorySource.indexOf("const commitHorizontalStorySwipe = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n    ],\n  );", start));
  // guarded start callback
  assert.match(block, /\.start\(\(\{ finished \}\) => \{/);
  assert.match(block, /if \(!finished\) \{[\s\S]*?return;\s*\}/);
  // exactly one next + one previous nav call, both after the !finished guard
  const afterGuard = block.slice(block.indexOf("if (!finished) {"));
  assert.equal((afterGuard.match(/goToNextStory\(\)/g) ?? []).length, 1);
  assert.equal((afterGuard.match(/goToPreviousStory\(\)/g) ?? []).length, 1);
  // one committed gesture takes at most one guarded transition path
  assert.match(afterGuard, /if \(direction === "next"\) \{\s*goToNextStory\(\);\s*\} else \{\s*goToPreviousStory\(\);\s*\}/);
});

test("horizontalDragX is only reset to 0 / adjacent layer cleared after the new currentIndex is committed", () => {
  const start = viewStorySource.indexOf("const clearHorizontalStoryGesture = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("}, [", start));
  assert.match(block, /horizontalDragX\.stopAnimation\(\);/);
  assert.match(block, /horizontalDragX\.setValue\(0\);/);
  assert.match(block, /setHorizontalAdjacentLayerState\(null\);/);
  // driven by the index effect (post-commit), plus overlay + unmount cleanup
  assert.match(
    viewStorySource,
    /useEffect\(\(\) => \{\s*clearHorizontalStoryGesture\(\);\s*\}, \[\s*activeGroupIndex,\s*activeStoryTab,\s*clearHorizontalStoryGesture,\s*currentIndex,\s*\]\)/,
  );
  assert.match(
    viewStorySource,
    /useEffect\(\(\) => clearHorizontalStoryGesture, \[clearHorizontalStoryGesture\]\)/,
  );
});

test("stale animation completion cannot commit: horizontalSwipeLockRef + advanceLockRef gate the commit", () => {
  const start = viewStorySource.indexOf("const commitHorizontalStorySwipe = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n    ],\n  );", start));
  assert.match(
    block,
    /if \(horizontalSwipeLockRef\.current \|\| advanceLockRef\.current\) \{\s*return false;\s*\}/,
  );
  assert.match(block, /horizontalSwipeLockRef\.current = true;/);
  assert.match(block, /advanceLockRef\.current = true;/);
  // the not-finished branch releases both locks and resumes playback
  assert.match(
    block,
    /if \(!finished\) \{\s*horizontalSwipeLockRef\.current = false;\s*advanceLockRef\.current = false;\s*resumePlaybackAfterHorizontalGesture\(\);\s*return;\s*\}/,
  );
});

test("release path: threshold met with an adjacent Story commits; at a boundary it keeps the existing edge behavior", () => {
  const relStart = viewStorySource.indexOf("onPanResponderRelease: (_event, gesture) => {");
  const relBlock = viewStorySource.slice(
    relStart,
    viewStorySource.indexOf("onPanResponderMove:", relStart),
  );
  assert.match(relBlock, /shouldCommitHorizontalStorySwipe\(\{/);
  assert.match(relBlock, /if \(commitHorizontalStorySwipe\(direction, gesture\.vx\)\) \{\s*return;\s*\}/);
  // boundary (no adjacent layer) falls back to the pre-existing nav semantics
  assert.match(relBlock, /if \(!horizontalAdjacentLayerRef\.current\) \{/);
  assert.match(relBlock, /if \(direction === "next"\) \{\s*goToNextStory\(\);\s*\} else \{\s*goToPreviousStory\(\);\s*\}/);
  // no threshold → cancel spring
  assert.match(relBlock, /if \(horizontalGestureActiveRef\.current\) \{\s*cancelHorizontalStoryGesture\(\);\s*\}/);
});

// ===========================================================================
// view-story.tsx wiring — timer / tap / axis
// ===========================================================================

test("auto-advance is paused during a horizontal pan (isHolding gates the interval effect)", () => {
  const start = viewStorySource.indexOf("const pausePlaybackForHorizontalGesture = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("}, [", start));
  assert.match(block, /horizontalGestureActiveRef\.current = true;/);
  assert.match(block, /freezeImagePlaybackProgress\(\);/);
  assert.match(block, /setIsHolding\(true\);/);
  // the horizontal move branch calls it every qualifying frame
  const moveStart = viewStorySource.indexOf("onPanResponderMove: (_event, gesture) => {");
  const moveBlock = viewStorySource.slice(moveStart, viewStorySource.indexOf("onPanResponderTerminate:", moveStart));
  assert.match(moveBlock, /pausePlaybackForHorizontalGesture\(\);/);
  // the auto-advance interval effect still bails on isHolding (unchanged gate)
  assert.match(
    viewStorySource,
    /if \(\s*!currentStory \|\|\s*isCurrentVideo \|\|\s*isHolding \|\|\s*loadFailed \|\|\s*!sourceReady\s*\) \{\s*return;\s*\}/,
  );
});

test("cancelled swipe resumes the frozen progress; committed swipe starts the fresh next-Story lifecycle", () => {
  const cancelStart = viewStorySource.indexOf("const cancelHorizontalStoryGesture = useCallback(");
  const cancelBlock = viewStorySource.slice(cancelStart, viewStorySource.indexOf("}, [", cancelStart));
  assert.match(cancelBlock, /resumePlaybackAfterHorizontalGesture\(\);/);
  const resumeStart = viewStorySource.indexOf("const resumePlaybackAfterHorizontalGesture = useCallback(");
  const resumeBlock = viewStorySource.slice(resumeStart, viewStorySource.indexOf("}, [", resumeStart));
  assert.match(resumeBlock, /resumeImagePlaybackProgress\(\);/);
  // committed path hands off to goToNextStory/goToPreviousStory which own the
  // normal progress reset (setProgressTime(0)); it does not itself restart 0.
  const commitStart = viewStorySource.indexOf("const commitHorizontalStorySwipe = useCallback(");
  const commitBlock = viewStorySource.slice(commitStart, viewStorySource.indexOf("\n    ],\n  );", commitStart));
  assert.doesNotMatch(commitBlock, /setProgressTime/);
});

test("a fast flick can no longer fall through to tap navigation", () => {
  // capture claims the responder on velocity (option A)
  assert.match(viewStorySource, /shouldCaptureHorizontalStorySwipe\(\{/);
  const start = viewStorySource.indexOf("const handlePressAction = (action: () => void) => {");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n  };", start));
  // A latched pan / an in-flight committed transition still blocks a press:
  // activePanAxisRef (latched pan) or advanceLockRef (committed swipe settle /
  // just-issued nav) → return.
  assert.match(
    block,
    /if \(activePanAxisRef\.current !== null \|\| advanceLockRef\.current\) \{\s*return;\s*\}/,
  );
  // A committed horizontal settle (locks set, no advanceLockRef path) stays
  // blocked via the else-if.
  assert.match(
    block,
    /\} else if \(\s*horizontalGestureActiveRef\.current \|\|\s*horizontalSwipeLockRef\.current\s*\) \{\s*\/\/[\s\S]*?return;\s*\}/,
  );
});

test("a genuine tap during a CANCELLED (non-committing) horizontal spring is accepted, not dropped", () => {
  const start = viewStorySource.indexOf("const handlePressAction = (action: () => void) => {");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n  };", start));
  // The cancel-spring branch normalises the surface then falls through to
  // action() — it does NOT `return`.
  assert.match(
    block,
    /if \(horizontalCancelSpringActiveRef\.current\) \{\s*horizontalCancelSpringActiveRef\.current = false;\s*horizontalDragX\.stopAnimation\(\);\s*horizontalDragX\.setValue\(0\);\s*setHorizontalAdjacentLayerState\(null\);\s*horizontalSwipeLockRef\.current = false;\s*horizontalGestureActiveRef\.current = false;\s*resumePlaybackAfterHorizontalGesture\(\);\s*\}/,
  );
  // action() is the last statement — the tap navigates exactly once.
  assert.match(block, /\n {4}action\(\);\s*$/);
  assert.equal((block.match(/\baction\(\);/g) ?? []).length, 1);
  // The cancel spring is token-guarded so its own late callback can't double-clean.
  const cancelStart = viewStorySource.indexOf("const cancelHorizontalStoryGesture = useCallback(");
  const cancelBlock = viewStorySource.slice(cancelStart, viewStorySource.indexOf("}, [", cancelStart));
  assert.match(cancelBlock, /horizontalCancelSpringActiveRef\.current = true;/);
  assert.match(
    cancelBlock,
    /\}\)\.start\(\(\) => \{\s*if \(!horizontalCancelSpringActiveRef\.current\) \{\s*[\s\S]*?return;\s*\}/,
  );
});

test("genuine left/right tap zones are untouched", () => {
  assert.match(viewStorySource, /onPress=\{\(\) => handlePressAction\(goToPreviousStory\)\}/);
  assert.match(viewStorySource, /onPress=\{\(\) => handlePressAction\(goToNextStory\)\}/);
  assert.match(viewStorySource, /onLongPress=\{pauseForHold\}/);
  assert.match(viewStorySource, /onPressOut=\{resumeFromHold\}/);
});

test("axis is latched once per gesture and cleared on start/release/terminate — no frame-to-frame flip", () => {
  assert.match(viewStorySource, /const activePanAxisRef = useRef<"horizontal" \| "vertical" \| null>\(null\);/);
  assert.match(viewStorySource, /const resolvePanAxis = \(gesture: \{/);
  assert.match(viewStorySource, /if \(activePanAxisRef\.current\) \{\s*return activePanAxisRef\.current;\s*\}/);
  assert.match(viewStorySource, /activePanAxisRef\.current = "vertical";/);
  assert.match(viewStorySource, /activePanAxisRef\.current = "horizontal";/);
  assert.match(
    viewStorySource,
    /onStartShouldSetPanResponder: \(\) => \{\s*activePanAxisRef\.current = null;\s*return false;\s*\}/,
  );
});

// ===========================================================================
// view-story.tsx wiring — navigation semantics / media parity
// ===========================================================================

test("horizontal adjacent target uses the existing same-group then group-boundary semantics", () => {
  const start = viewStorySource.indexOf("const getHorizontalAdjacentStory = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("}, [", start));
  // next: same group i+1, else next group's first story
  assert.match(block, /if \(idx < items\.length - 1\) \{\s*const story = items\[idx \+ 1\];/);
  assert.match(block, /currentGroups\[groupIndex \+ 1\]\?\.stories\[0\]/);
  // previous: same group i-1, else previous group's LAST story
  assert.match(block, /if \(idx > 0\) \{\s*const story = items\[idx - 1\];/);
  assert.match(block, /previousGroup\.stories\[previousGroup\.stories\.length - 1\]/);
  // reads from refs (no re-sort, no groupStoriesByAuthor here)
  assert.doesNotMatch(block, /groupStoriesByAuthor|\.sort\(/);
});

test("the horizontal paging engine is media-type agnostic (no image/text branch in the gesture path)", () => {
  for (const anchor of [
    "const commitHorizontalStorySwipe = useCallback(",
    "const cancelHorizontalStoryGesture = useCallback(",
    "const getHorizontalAdjacentStory = useCallback(",
  ]) {
    const start = viewStorySource.indexOf(anchor);
    const block = viewStorySource.slice(start, viewStorySource.indexOf("}, [", start));
    assert.doesNotMatch(block, /mediaType === "image"|mediaType === "text"|mediaType === "video"/);
  }
  const moveStart = viewStorySource.indexOf("onPanResponderMove: (_event, gesture) => {");
  const moveBlock = viewStorySource.slice(moveStart, viewStorySource.indexOf("onPanResponderTerminate:", moveStart));
  const horizontalPortion = moveBlock.slice(
    moveBlock.indexOf('activePanAxisRef.current === "horizontal"'),
    moveBlock.indexOf("if (groupSwipeLockRef.current)"),
  );
  assert.doesNotMatch(horizontalPortion, /mediaType/);
});

// ===========================================================================
// Regression guards — vertical pager / renderers / seen / video
// ===========================================================================

test("vertical group pager is unchanged", () => {
  assert.match(viewStorySource, /const verticalDragY = useRef\(new Animated\.Value\(0\)\)\.current;/);
  const resetStart = viewStorySource.indexOf("const resetVerticalGroupDrag = useCallback(");
  const resetBlock = viewStorySource.slice(resetStart, viewStorySource.indexOf("}, [", resetStart));
  assert.match(resetBlock, /Animated\.spring\(verticalDragY, \{/);
  assert.match(resetBlock, /tension: 80,/);
  assert.match(resetBlock, /friction: 12,/);
  assert.match(viewStorySource, /getStoryGroupCommitTranslateY\(/);
  assert.match(viewStorySource, /getStoryGroupCommitDuration\(/);
  // vertical adjacent layer still translateY-only
  assert.match(
    viewStorySource,
    /styles\.adjacentStorySurface,\s*\{ transform: \[\{ translateY: adjacentSurfaceTranslateY \}\] \},/,
  );
});

test("image + text renderers and their gating are untouched", () => {
  assert.equal((viewStorySource.match(/hasValidStoryImageTransform\(/g) ?? []).length, 2);
  assert.match(viewStorySource, /const renderCurrentStoryImage = \(\) => \{/);
  assert.match(viewStorySource, /const renderStoryImage = \(/);
  assert.match(viewStorySource, /const textStoryTextStyle = \(textStyle\?: StoryTextStyle \| null\) => \[/);
  assert.match(viewStorySource, /fontWeight: textStyle\?\.fontWeight \?\? \("800" as const\)/);
});

test("Story seen / view recording still fires only for the actually-current Story (never the preview)", () => {
  // the seen effect is unchanged and keyed on currentStory?.id
  assert.match(
    viewStorySource,
    /useEffect\(\(\) => \{\s*if \(currentStory\?\.id\) \{\s*void markStoriesSeen\(\[currentStory\.id\]\);/,
  );
  // no seen/view side effects anywhere in the horizontal gesture code
  for (const anchor of [
    "const renderHorizontalAdjacentStoryLayer = () => {",
    "const commitHorizontalStorySwipe = useCallback(",
    "const prepareHorizontalAdjacentLayer = useCallback(",
    "const getHorizontalAdjacentStory = useCallback(",
    "const cancelHorizontalStoryGesture = useCallback(",
  ]) {
    const start = viewStorySource.indexOf(anchor);
    const end = viewStorySource.indexOf(anchor.includes("=> {\n") ? "\n  };" : "}, [", start);
    const block = viewStorySource.slice(start, end > start ? end : start + 1200);
    assert.doesNotMatch(block, /markStoriesSeen|recordStoryView/);
  }
});

test("mount refetch preserves the current logical Story id and still regroups both tabs once each", () => {
  const start = viewStorySource.indexOf("const loadViewerStories = async () => {");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("void loadViewerStories();"));
  // unchanged: exactly two shared-mapper calls, one per tab
  assert.equal((block.match(/groupStoriesByAuthor\(/g) ?? []).length, 2);
  assert.match(block, /groupStoriesByAuthor\(discoverResult\.value\)/);
  assert.match(block, /groupStoriesByAuthor\(friendsResult\.value\)/);
  // new: skip while a gesture is active, then re-anchor by story id
  assert.match(block, /horizontalGestureActiveRef\.current \|\|\s*verticalGestureActiveRef\.current \|\|\s*horizontalSwipeLockRef\.current \|\|\s*groupSwipeLockRef\.current \|\|\s*advanceLockRef\.current/);
  assert.match(block, /const anchorStoryId =\s*storyItemsRef\.current\[currentIndexRef\.current\]\?\.id \?\? null;/);
  assert.match(block, /\.stories\.findIndex\(\s*\(story\) => story\.id === anchorStoryId,\s*\)/);
});

test("no video Story functionality is enabled and no video-specific horizontal path is added", () => {
  assert.doesNotMatch(viewStorySource, /VIDEO_STORY_CREATION_ENABLED\s*=\s*true/);
  assert.doesNotMatch(viewStorySource, /ENABLE_VIDEO_UPLOADS/);
  const start = viewStorySource.indexOf("const commitHorizontalStorySwipe = useCallback(");
  const block = viewStorySource.slice(start, viewStorySource.indexOf("\n    ],\n  );", start));
  assert.doesNotMatch(block, /video/i);
});
