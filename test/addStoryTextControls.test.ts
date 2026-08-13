import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoProcessingState.test.ts: this repo has no component-rendering
// test library installed, so behavior is verified by asserting on the exact
// add-story.tsx / DraggableStoryText.tsx source text rather than by mounting
// components.
const addStorySource = readFileSync(join(process.cwd(), "app/post-screen/add-story.tsx"), "utf8");
const draggableStoryTextSource = readFileSync(
  join(process.cwd(), "components/story/DraggableStoryText.tsx"),
  "utf8",
);

test("DraggableStoryImage and DraggableStoryText use role-prefixed keys off the same draftKey (never collide)", () => {
  assert.match(addStorySource, /<DraggableStoryImage\s*\n\s*key=\{`image-\$\{draftKey\}`\}/);
  assert.match(addStorySource, /<DraggableStoryText\s*\n\s*key=\{`text-\$\{draftKey\}`\}/);

  // Neither component uses the bare, collision-prone `key={draftKey}` any more.
  assert.doesNotMatch(addStorySource, /key=\{draftKey\}/);

  // The two prefixed keys can never be equal for any draftKey value.
  const draftKey = 1;
  const imageKey = `image-${draftKey}`;
  const textKey = `text-${draftKey}`;
  assert.notEqual(imageKey, textKey);
});

test("Top/Middle/Bottom position controls are removed", () => {
  assert.doesNotMatch(addStorySource, /OVERLAY_POSITIONS/);
  assert.doesNotMatch(addStorySource, /label:\s*'Top'/);
  assert.doesNotMatch(addStorySource, /label:\s*'Middle'/);
  assert.doesNotMatch(addStorySource, /label:\s*'Bottom'/);
});

test("S/M/L size controls are removed", () => {
  assert.doesNotMatch(addStorySource, /OVERLAY_SCALES/);
  assert.doesNotMatch(addStorySource, /setOverlayScale/);
  assert.doesNotMatch(addStorySource, /label:\s*'S'/);
  assert.doesNotMatch(addStorySource, /label:\s*'L'/);
  // "M" is also a hex-color initial letter risk (#... colors), so check the
  // specific removed shape rather than a bare `'M'` substring.
  assert.doesNotMatch(addStorySource, /\{\s*label:\s*'M',\s*value:\s*1\s*\}/);
});

test("new Story text uses the existing canonical/default scale, not a newly-invented value", () => {
  assert.match(addStorySource, /const STANDARD_TEXT_SCALE = 1;/);
  // buildOverlay's call site (used for the publish payload) passes the
  // standard constant, not a variable state a removed control could drive.
  assert.match(addStorySource, /buildOverlay\(overlayText, overlayX, overlayY, overlayColor, STANDARD_TEXT_SCALE, overlayRotation\)/);
  // The on-canvas object is also always given the same standard constant.
  assert.match(addStorySource, /<DraggableStoryText[\s\S]{0,400}scale=\{STANDARD_TEXT_SCALE\}/);
});

test("only ONE overlay-text rendering/editing path exists — no separate toolbar TextInput duplicating it", () => {
  // The image-mode toolbar no longer contains any TextInput bound to
  // overlayText — DraggableStoryText's own internal TextInput (rendered
  // only while isEditing) is the sole editable surface.
  const overlayEditorBranch = addStorySource.slice(
    addStorySource.indexOf("draft.mediaType !== 'text' ? ("),
    addStorySource.indexOf("draft.mediaType !== 'text' ? (") + 700,
  );
  assert.doesNotMatch(overlayEditorBranch, /<TextInput/);
  assert.doesNotMatch(overlayEditorBranch, /value=\{overlayText\}/);

  // add-story.tsx itself never renders a <TextInput> bound to overlayText —
  // the only remaining <TextInput> in the file is the unrelated full-screen
  // text-mode Story background input (bound to storyText, not overlayText).
  const overlayTextInputs = addStorySource.match(/<TextInput[\s\S]{0,120}value=\{overlayText\}/g) ?? [];
  assert.equal(overlayTextInputs.length, 0);

  // DraggableStoryText.tsx is the one place overlayText's TextInput lives.
  assert.match(draggableStoryTextSource, /<TextInput[\s\S]*?value=\{text\}/);
});

test("the toolbar exposes a single compact Add/Edit text trigger, not an always-visible input field", () => {
  assert.match(addStorySource, /onPress=\{handleStartEditingOverlayText\}/);
  assert.match(addStorySource, /\{overlayText\.trim\(\) \? 'Edit text' : 'Add text'\}/);
});

test("starting a fresh (currently empty) text object centers it; re-editing existing text does not move it", () => {
  const handlerBlock = addStorySource.slice(
    addStorySource.indexOf("const handleStartEditingOverlayText"),
    addStorySource.indexOf("const handleFinishEditingOverlayText"),
  );
  assert.match(handlerBlock, /if \(!overlayText\.trim\(\)\) \{/);
  assert.match(handlerBlock, /setOverlayX\(0\.5\)/);
  assert.match(handlerBlock, /setOverlayY\(0\.5\)/);
  assert.match(handlerBlock, /setOverlayRotation\(0\)/);
  assert.match(handlerBlock, /setIsEditingOverlayText\(true\)/);
});

test("finishing editing only toggles edit mode — never clears text, position, rotation, or color", () => {
  const finishBlock = addStorySource.slice(
    addStorySource.indexOf("const handleFinishEditingOverlayText"),
    addStorySource.indexOf("const handleFinishEditingOverlayText") + 200,
  );
  assert.match(finishBlock, /setIsEditingOverlayText\(false\)/);
  assert.doesNotMatch(finishBlock, /setOverlayText|setOverlayX|setOverlayY|setOverlayRotation|setOverlayColor/);
});

test("edit mode and drag/rotate mode are mutually exclusive in DraggableStoryText", () => {
  // While editing: TextInput renders, no GestureDetector/Pan/Rotation/Tap
  // gesture is mounted at all, so it can never fight the TextInput's own
  // touch handling.
  assert.match(draggableStoryTextSource, /isEditing \? \(\s*<TextInput/);
  // While not editing: plain Text wrapped in a GestureDetector composing
  // drag/rotate raced against a tap (tap re-enters edit mode).
  assert.match(draggableStoryTextSource, /<GestureDetector gesture=\{composedGesture\}>\s*<Text/);
  assert.match(draggableStoryTextSource, /Gesture\.Race\(dragRotateGesture, tapGesture\)/);
  assert.match(draggableStoryTextSource, /runOnJS\(onStartEditing\)\(\)/);
});

test("color controls only touch their own state, never position or scale", () => {
  const colorBlock = addStorySource.slice(
    addStorySource.indexOf("TEXT_COLORS.map"),
    addStorySource.indexOf("TEXT_COLORS.map") + 300,
  );
  assert.match(colorBlock, /onPress=\{\(\) => setOverlayColor\(color\)\}/);
  assert.doesNotMatch(colorBlock, /setOverlayX|setOverlayY|setOverlayRotation|setIsEditingOverlayText/);

  const backgroundBlock = addStorySource.slice(
    addStorySource.indexOf("TEXT_BACKGROUNDS.map"),
    addStorySource.indexOf("TEXT_BACKGROUNDS.map") + 600,
  );
  assert.match(backgroundBlock, /onPress=\{\(\) => setTextBackground\(background\)\}/);
  assert.doesNotMatch(backgroundBlock, /setOverlayX|setOverlayY|setOverlayRotation/);
});

test("text drag commit still writes normalized x/y/rotation, independent of image state", () => {
  const dragCommitBlock = addStorySource.slice(
    addStorySource.indexOf("<DraggableStoryText"),
    addStorySource.indexOf("<DraggableStoryText") + 950,
  );
  assert.match(dragCommitBlock, /setOverlayX\(transform\.x\)/);
  assert.match(dragCommitBlock, /setOverlayY\(transform\.y\)/);
  assert.match(dragCommitBlock, /setOverlayRotation\(transform\.rotation\)/);
  // The text drag commit never sets image state, and vice versa.
  assert.doesNotMatch(dragCommitBlock, /setImageTransform/);
});

test("image drag commit never touches text overlay state", () => {
  const imageCommitBlock = addStorySource.slice(
    addStorySource.indexOf("<DraggableStoryImage"),
    addStorySource.indexOf("<DraggableStoryImage") + 400,
  );
  assert.match(imageCommitBlock, /onTransformEnd=\{setImageTransform\}/);
  assert.doesNotMatch(imageCommitBlock, /setOverlayX|setOverlayY|setOverlayRotation|setOverlayScale|setIsEditingOverlayText/);
});

test("publish payload still sends the standard scale and final dragged x/y for image Stories with overlay text", () => {
  const publishSection = addStorySource.slice(
    addStorySource.indexOf("mediaType: 'image'", addStorySource.indexOf("createStory({")),
    addStorySource.indexOf("mediaType: 'image'", addStorySource.indexOf("createStory({")) + 400,
  );
  assert.match(publishSection, /textOverlay: finalOverlay/);
  // finalOverlay is built from currentOverlay, which always uses the live
  // overlayX/overlayY (the last dragged position) and STANDARD_TEXT_SCALE.
  assert.match(addStorySource, /const finalOverlay = draft\.mediaType === 'text' \? null : currentOverlay;/);
});

test("legacy StoryTextOverlay.scale field is untouched (backward compatibility)", () => {
  const storiesLibSource = readFileSync(join(process.cwd(), "lib/stories.ts"), "utf8");
  assert.match(storiesLibSource, /scale:\s*number;/);
});

test("image and text remain independent sibling layers, not nested", () => {
  const imageIndex = addStorySource.indexOf("<DraggableStoryImage");
  const imageBranchEnd = addStorySource.indexOf(")}", imageIndex);
  const textIndex = addStorySource.indexOf("<DraggableStoryText");
  assert.ok(imageIndex > -1 && textIndex > -1);
  // DraggableStoryText is not opened before the image branch closes.
  assert.ok(textIndex > imageBranchEnd);
});

test("the non-interactive toolbar containers that overlap DraggableStoryText pass touches through to it", () => {
  // previewHeader: a plain row wrapper around 3 buttons — the wrapper
  // itself is not meant to be tappable, only its buttons are.
  assert.match(addStorySource, /<View style=\{styles\.previewHeader\} pointerEvents="box-none">/);

  // overlayEditor (image-mode branch only — the text-mode branch never
  // overlaps DraggableStoryText, since no overlay text object exists when
  // draft.mediaType === 'text').
  assert.match(
    addStorySource,
    /\{draft\.mediaType !== 'text' \? \(\s*<View style=\{styles\.overlayEditor\} pointerEvents="box-none">/,
  );

  // publishStatus: text-only status row, no interactive children at all.
  assert.match(addStorySource, /<View style=\{styles\.publishStatus\} pointerEvents="box-none">/);

  // The outer SafeAreaView itself already had box-none from before this
  // fix — regression guard that it wasn't accidentally removed.
  assert.match(addStorySource, /pointerEvents="box-none"\s*\n\s*>/);
});

test("toolbar interactive children remain plain auto-pointerEvents elements (not disabled)", () => {
  // None of the interactive children (the Add/Edit text button, color
  // dots, header buttons) should ever be given pointerEvents="none" — the
  // box-none from the previous fix only ever applies to their
  // non-interactive parent container.
  const overlayEditorBlock = addStorySource.slice(
    addStorySource.indexOf('<View style={styles.overlayEditor} pointerEvents="box-none">'),
    addStorySource.indexOf('<View style={styles.overlayEditor} pointerEvents="box-none">') + 900,
  );
  assert.match(overlayEditorBlock, /onPress=\{handleStartEditingOverlayText\}/);
  assert.match(overlayEditorBlock, /onPress=\{\(\) => setOverlayColor\(color\)\}/);
  assert.doesNotMatch(overlayEditorBlock, /pointerEvents="none"/);
});

test("the toolbar's Add/Edit text trigger and DraggableStoryText's own tap-to-edit both route to the same handler", () => {
  // Confirms "tap the toolbar button" and "tap the existing text" are the
  // same entry point onto the same object, not two different code paths.
  const toolbarButtonUses = addStorySource.match(/onPress=\{handleStartEditingOverlayText\}/g) ?? [];
  const propWiredUses = addStorySource.match(/onStartEditing=\{handleStartEditingOverlayText\}/g) ?? [];
  assert.equal(toolbarButtonUses.length, 1);
  assert.equal(propWiredUses.length, 1);
});

test("a keyboard-hide listener exists and uses the platform-correct event name", () => {
  assert.match(draggableStoryTextSource, /Keyboard\.addListener\(hideEvent/);
  assert.match(
    draggableStoryTextSource,
    /const hideEvent = Platform\.OS === "ios" \? "keyboardWillHide" : "keyboardDidHide";/,
  );
});

test("keyboard-hide subscription is scoped to editing mode only, and is always cleaned up", () => {
  const effectBlock = draggableStoryTextSource.slice(
    draggableStoryTextSource.indexOf("useEffect(() => {\n    if (!isEditing) return;"),
    draggableStoryTextSource.indexOf("useEffect(() => {\n    if (!isEditing) return;") + 500,
  );
  // Bails out (no subscription) when not editing.
  assert.match(effectBlock, /if \(!isEditing\) return;/);
  // Cleanup removes the subscription every time (unmount, isEditing flips
  // back to false, or the effect re-runs).
  assert.match(effectBlock, /return \(\) => \{\s*subscription\.remove\(\);/);
  // Dependency array covers both values the callback closes over, so a
  // stale `onFinishEditing` can never linger in an old subscription.
  assert.match(effectBlock, /\}, \[isEditing, onFinishEditing\]\);/);
});

test("keyboard-hide callback calls the existing onFinishEditing — no second finish-editing pathway or new state", () => {
  const effectBlock = draggableStoryTextSource.slice(
    draggableStoryTextSource.indexOf("useEffect(() => {\n    if (!isEditing) return;"),
    draggableStoryTextSource.indexOf("}, [isEditing, onFinishEditing]);") + 40,
  );
  assert.match(effectBlock, /Keyboard\.addListener\(hideEvent, \(\) => \{\s*onFinishEditing\(\);/);
  // Nothing else is set from the keyboard-hide path — no text/x/y/rotation/
  // color reset, and no separate "isEditing" setter called directly here
  // (only the existing onFinishEditing prop, same as onBlur/onSubmitEditing).
  assert.doesNotMatch(effectBlock, /setOverlayText|setOverlayX|setOverlayY|setOverlayRotation|setOverlayColor|setIsEditingOverlayText/);
});

test("existing onBlur and onSubmitEditing paths are preserved, both still routed to onFinishEditing", () => {
  assert.match(draggableStoryTextSource, /onBlur=\{onFinishEditing\}/);
  assert.match(draggableStoryTextSource, /onSubmitEditing=\{onFinishEditing\}/);
});

test("no new Story text state was introduced — only the existing isEditing prop drives the keyboard listener", () => {
  // The keyboard-hide effect must not introduce any new component state
  // (e.g. a second "keyboardVisible" flag) — it reacts to the existing
  // `isEditing` prop and calls the existing `onFinishEditing` prop only.
  assert.doesNotMatch(draggableStoryTextSource, /useState/);
});

test("the positioning GestureDetector branch is unchanged by the keyboard-hide fix", () => {
  assert.match(draggableStoryTextSource, /<GestureDetector gesture=\{composedGesture\}>\s*<Text/);
  assert.match(draggableStoryTextSource, /Gesture\.Race\(dragRotateGesture, tapGesture\)/);
});
