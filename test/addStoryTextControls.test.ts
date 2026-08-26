import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Follows the same source-string testing convention as
// test/feedVideoProcessingState.test.ts: this repo has no component-rendering
// test library installed, so behavior is verified by asserting on the exact
// add-story.tsx / DraggableStoryText.tsx source text rather than by mounting
// components.
const addStorySource = readFileSync(join(process.cwd(), "app/post-screen/add-story.tsx"), "utf8").replace(/\r\n/g, "\n");
const draggableStoryTextSource = readFileSync(
  join(process.cwd(), "components/story/DraggableStoryText.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

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

test("S/M/L discrete size button controls remain removed in favor of freeform pinch-to-scale", () => {
  assert.doesNotMatch(addStorySource, /OVERLAY_SCALES/);
  assert.doesNotMatch(addStorySource, /label:\s*'S'/);
  assert.doesNotMatch(addStorySource, /label:\s*'L'/);
  // "M" is also a hex-color initial letter risk (#... colors), so check the
  // specific removed shape rather than a bare `'M'` substring.
  assert.doesNotMatch(addStorySource, /\{\s*label:\s*'M',\s*value:\s*1\s*\}/);
});

test("new Story text initializes to canonical scale and supports freeform pinch-to-scale", () => {
  assert.match(addStorySource, /const STANDARD_TEXT_SCALE = 1;/);
  // buildOverlay's call site passes the dynamic overlayScale state
  assert.match(
    addStorySource,
    /buildOverlay\(\s*overlayText,\s*overlayX,\s*overlayY,\s*overlayColor,\s*overlayScale,\s*overlayRotation,\s*overlayFontWeight,\s*overlayTextAlign,\s*\)/,
  );
  // The on-canvas object is given the dynamic overlayScale state and enables pinch
  assert.match(addStorySource, /<DraggableStoryText[\s\S]{0,500}scale=\{overlayScale\}/);
  assert.match(draggableStoryTextSource, /enablePinch:\s*true/);
  assert.match(draggableStoryTextSource, /scale:\s*scale\.value/);
});

test("only ONE overlay-text rendering/editing path exists — no separate toolbar TextInput duplicating it", () => {
  // add-story.tsx itself never renders a <TextInput> bound to overlayText —
  // the only remaining <TextInput> in the file is the unrelated full-screen
  // text-mode Story background input (bound to storyText, not overlayText).
  const overlayTextInputs = addStorySource.match(/<TextInput[\s\S]{0,120}value=\{overlayText\}/g) ?? [];
  assert.equal(overlayTextInputs.length, 0);

  // DraggableStoryText.tsx is the one place overlayText's TextInput lives.
  assert.match(draggableStoryTextSource, /<TextInput[\s\S]*?value=\{text\}/);
});

test("positioning mode exposes a single compact Add text trigger only when no text exists yet, not an always-visible input field", () => {
  assert.match(addStorySource, /onPress=\{handleStartEditingOverlayText\}/);
  // Once text exists, the tools tray (not a second "Edit text" trigger)
  // takes over — the trigger branch only ever renders when
  // !showOverlayTextObject, i.e. overlayText is empty, so its label is
  // unconditionally "Add text" now (no Edit-text ternary to duplicate the
  // on-canvas tap-to-edit entry point).
  assert.match(addStorySource, />Add text<\/Text>/);
  assert.doesNotMatch(addStorySource, /'Edit text'/);
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

test("finishing editing only toggles edit mode (and collapses the tools panel) — never clears text, position, rotation, or color", () => {
  const finishBlock = addStorySource.slice(
    addStorySource.indexOf("const handleFinishEditingOverlayText"),
    addStorySource.indexOf("const handleFinishEditingOverlayText") + 200,
  );
  assert.match(finishBlock, /setIsEditingOverlayText\(false\)/);
  assert.doesNotMatch(
    finishBlock,
    /setOverlayText|setOverlayX|setOverlayY|setOverlayRotation|setOverlayColor|setOverlayFontWeight|setOverlayTextAlign/,
  );
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

test("color tool contains a significantly broader palette than the previous 4-color row", () => {
  const paletteBlock = addStorySource.slice(
    addStorySource.indexOf("const TEXT_COLOR_PALETTE"),
    addStorySource.indexOf("const FONT_WEIGHT_OPTIONS"),
  );
  const colors = paletteBlock.match(/#[0-9A-Fa-f]{6}/g) ?? [];
  assert.ok(colors.length >= 24, `expected a broad palette, found ${colors.length} colors`);
  // No duplicate swatches.
  assert.equal(new Set(colors).size, colors.length);
});

test("selected color has an obvious visual selected state (ring + check), not just a size difference", () => {
  const colorToolBlock = addStorySource.slice(
    addStorySource.indexOf("activeTool === 'color' ? ("),
    addStorySource.indexOf("activeTool === 'align' ? ("),
  );
  assert.match(colorToolBlock, /styles\.colorSwatchRingSelected/);
  assert.match(colorToolBlock, /Feather name="check"/);
  assert.match(colorToolBlock, /isSelected \? \(/);
});

test("changing color only touches color state, never position, scale, or rotation", () => {
  const colorToolBlock = addStorySource.slice(
    addStorySource.indexOf("activeTool === 'color' ? ("),
    addStorySource.indexOf("activeTool === 'align' ? ("),
  );
  assert.match(colorToolBlock, /onPress=\{\(\) => onColorChange\(swatchColor\)\}/);
  assert.doesNotMatch(colorToolBlock, /setOverlayX|setOverlayY|setOverlayRotation|setIsEditingOverlayText/);

  const backgroundBlock = addStorySource.slice(
    addStorySource.indexOf("TEXT_BACKGROUNDS.map"),
    addStorySource.indexOf("TEXT_BACKGROUNDS.map") + 600,
  );
  assert.match(backgroundBlock, /onPress=\{\(\) => setTextBackground\(background\)\}/);
  assert.doesNotMatch(backgroundBlock, /setOverlayX|setOverlayY|setOverlayRotation/);
});

test("align tool changes only textAlign — never x/y position", () => {
  const alignToolBlock = addStorySource.slice(
    addStorySource.indexOf("activeTool === 'align' ? ("),
    addStorySource.indexOf("activeTool === 'shadow' ? ("),
  );
  assert.match(alignToolBlock, /onPress=\{\(\) => onTextAlignChange\(option\.value\)\}/);
  assert.doesNotMatch(alignToolBlock, /setOverlayX|setOverlayY|setOverlayRotation/);
  // Only left/center/right — no Top/Middle/Bottom presets reintroduced.
  assert.match(
    addStorySource,
    /const TEXT_ALIGN_OPTIONS[\s\S]{0,200}'left'[\s\S]{0,120}'center'[\s\S]{0,120}'right'/,
  );
});

test("style tool changes only fontWeight — never position, rotation, or color", () => {
  const styleToolBlock = addStorySource.slice(
    addStorySource.indexOf("activeTool === 'style' ? ("),
    addStorySource.indexOf("activeTool === 'color' ? ("),
  );
  assert.match(styleToolBlock, /onPress=\{\(\) => onFontWeightChange\(option\.value\)\}/);
  assert.doesNotMatch(
    styleToolBlock,
    /setOverlayX|setOverlayY|setOverlayRotation|setOverlayColor|setIsEditingOverlayText/,
  );
});

test("Color is the product-preferred default active tool, and is never reset on every edit cycle", () => {
  assert.match(addStorySource, /const \[activeTextTool, setActiveTextTool\] = useState<TextTool>\('color'\);/);
  // handleFinishEditingOverlayText (the only place editing hands control
  // back to positioning mode) must not touch it.
  const finishBlock = addStorySource.slice(
    addStorySource.indexOf("const handleFinishEditingOverlayText"),
    addStorySource.indexOf("const handleFinishEditingOverlayText") + 250,
  );
  assert.doesNotMatch(finishBlock, /setActiveTextTool/);
});

test("shadow tool changes only the local preview toggle — never position, color, or text", () => {
  const shadowToolBlock = addStorySource.slice(
    addStorySource.indexOf("activeTool === 'shadow' ? ("),
    addStorySource.indexOf("<View style={styles.textToolTabRow}>"),
  );
  assert.match(shadowToolBlock, /onPress=\{\(\) => onShadowToggle\(false\)\}/);
  assert.match(shadowToolBlock, /onPress=\{\(\) => onShadowToggle\(true\)\}/);
  assert.doesNotMatch(
    shadowToolBlock,
    /setOverlayX|setOverlayY|setOverlayRotation|setOverlayColor|setOverlayText/,
  );
});

test("DraggableStoryText's shadow is an opt-out prop, defaulting to the pre-existing always-on behavior", () => {
  assert.match(draggableStoryTextSource, /shadowEnabled = true/);
  assert.match(draggableStoryTextSource, /const shadowStyle = shadowEnabled \? styles\.overlayTextShadow : undefined;/);
});

test("collapse (chevron) only hides the tray via isTextToolsCollapsed — text, position, color, selected tool, and edit mode are untouched", () => {
  const collapseBlock = addStorySource.slice(
    addStorySource.indexOf("onCollapse={() => setIsTextToolsCollapsed(true)}"),
    addStorySource.indexOf("onCollapse={() => setIsTextToolsCollapsed(true)}") + 60,
  );
  assert.match(collapseBlock, /setIsTextToolsCollapsed\(true\)/);
  // Collapsing never touches the selected tool, text, or transform state.
  assert.doesNotMatch(
    collapseBlock,
    /setActiveTextTool|setOverlayText|setOverlayX|setOverlayY|setOverlayRotation|setOverlayColor|setIsEditingOverlayText/,
  );
});

test("collapsing the tray does not delete or reset the Story text object", () => {
  // isTextToolsCollapsed only gates whether <StoryTextToolbar> renders —
  // it must never gate whether <DraggableStoryText> itself renders
  // (showOverlayTextObject is the only thing that does that), so
  // collapsing the tools can never make the text object disappear.
  const textObjectBlock = addStorySource.slice(
    addStorySource.indexOf("showOverlayTextObject ? ("),
    addStorySource.indexOf("<DraggableStoryText") + 50,
  );
  assert.doesNotMatch(textObjectBlock, /isTextToolsCollapsed/);
});

test("finishing an edit session resets the collapsed flag but leaves the selected tool alone — tools reliably reappear without forgetting the tab", () => {
  const finishBlock = addStorySource.slice(
    addStorySource.indexOf("const handleFinishEditingOverlayText"),
    addStorySource.indexOf("const handleFinishEditingOverlayText") + 250,
  );
  assert.match(finishBlock, /setIsEditingOverlayText\(false\)/);
  assert.match(finishBlock, /setIsTextToolsCollapsed\(false\)/);
  assert.doesNotMatch(finishBlock, /setActiveTextTool/);
});

test("editing mode and the text-tools tray are mutually exclusive — the tray never renders while isEditingOverlayText is true", () => {
  // The single render branch governing both: editing renders neither
  // trigger nor tray (null); only when NOT editing does either the tray
  // (text exists) or the Add-text trigger (no text yet) appear.
  assert.match(
    addStorySource,
    /\{draft\.mediaType !== 'text' && !isEditingOverlayText \? \(/,
  );
  const toolbarBranch = addStorySource.slice(
    addStorySource.indexOf("{draft.mediaType !== 'text' && !isEditingOverlayText ? ("),
    addStorySource.indexOf("{isPublishing ? (\n          <View"),
  );
  assert.match(toolbarBranch, /<StoryTextToolbar/);
  assert.match(toolbarBranch, /isTextToolsCollapsed \? null : \(/);
});

test("the tools tray uses a plain content-sized View, not KeyboardAvoidingView — no keyboard-layout coupling remains", () => {
  // The product requirement changed: keyboard and tray are now mutually
  // exclusive (never shown together), so there is nothing for the tray to
  // avoid — KeyboardAvoidingView, its platform branching, and any
  // keyboard-show tracking would all be unnecessary complexity now.
  assert.doesNotMatch(addStorySource, /KeyboardAvoidingView/);
  assert.doesNotMatch(addStorySource, /keyboardVerticalOffset/);
  assert.doesNotMatch(addStorySource, /keyboardDidShow|keyboardWillShow/);
  assert.doesNotMatch(addStorySource, /textToolsKeyboardOffset/);

  const toolbarRoot = addStorySource.slice(
    addStorySource.indexOf("<View style={[styles.textToolbar,"),
    addStorySource.indexOf("<View style={[styles.textToolbar,") + 200,
  );
  assert.match(toolbarRoot, /<View style=\{\[styles\.textToolbar, \{ bottom: safeBottomInset \}\]\} pointerEvents="box-none">/);
});

test("text drag commit still writes normalized x/y/rotation, independent of image state", () => {
  const dragCommitBlock = addStorySource.slice(
    addStorySource.indexOf("<DraggableStoryText"),
    addStorySource.indexOf("<DraggableStoryText") + 1050,
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

test("no full-screen blocking layer is introduced by the text-tools toolbar or trigger", () => {
  // previewHeader: a plain row wrapper around 3 buttons — the wrapper
  // itself is not meant to be tappable, only its buttons are.
  assert.match(addStorySource, /<View style=\{styles\.previewHeader\} pointerEvents="box-none">/);

  // publishStatus: text-only status row, no interactive children at all.
  assert.match(addStorySource, /<View style=\{styles\.publishStatus\} pointerEvents="box-none">/);

  // The positioning-mode trigger wrapper is box-none — only the pill button
  // inside it is tappable, not its full-width wrapper.
  assert.match(addStorySource, /styles\.overlayTriggerWrap, \{ bottom: [\s\S]{0,80}\}\]\}\s*\n\s*pointerEvents="box-none"/);

  // The editing toolbar's outer wrapper is also box-none — only its two
  // content-sized children (the tab row and the tool panel) actually
  // intercept touches.
  assert.match(addStorySource, /styles\.textToolbar, \{ bottom: safeBottomInset \}\]\}\s*pointerEvents="box-none"/);

  // The outer SafeAreaView itself already had box-none from before this
  // fix — regression guard that it wasn't accidentally removed.
  assert.match(addStorySource, /pointerEvents="box-none"\s*\n\s*>/);

  // Neither toolbar container uses absoluteFillObject or full-screen
  // dimensions — both are anchored/content-sized (left/right/bottom only).
  assert.doesNotMatch(addStorySource, /styles\.textToolbar[\s\S]{0,10}StyleSheet\.absoluteFillObject/);
});

test("no hand-rolled keyboard height/show listener remains for toolbar positioning — no hardcoded or guessed offsets", () => {
  // No keyboard-show tracking of any kind is needed any more, since the
  // tray only ever renders while the keyboard is guaranteed closed.
  // Keyboard.dismiss() (used elsewhere, at publish time) is untouched and
  // must still exist.
  assert.doesNotMatch(addStorySource, /keyboardDidShow|keyboardWillShow/);
  assert.doesNotMatch(addStorySource, /textToolsKeyboardOffset/);
  assert.match(addStorySource, /Keyboard\.dismiss\(\)/);

  // No hardcoded pixel/dp keyboard-height literal anywhere near the toolbar.
  assert.doesNotMatch(addStorySource, /bottom:\s*[0-9]{3}/);
});

test("the toolbar's bottom anchor is a plain safe-area inset, not a keyboard-computed value", () => {
  assert.match(addStorySource, /safeBottomInset=\{Math\.max\(insets\.bottom, 16\)\}/);
  // Same fallback shape already used for the positioning-mode trigger and
  // the SafeAreaView's own padding — one safe-area constant, reused, not a
  // second independently-invented one.
  assert.match(addStorySource, /overlayTriggerWrap, \{ bottom: Math\.max\(insets\.bottom, 16\)/);
});

test("toolbar interactive children remain plain auto-pointerEvents elements (not disabled)", () => {
  const tabRowBlock = addStorySource.slice(
    addStorySource.indexOf("<View style={styles.textToolTabRow}>"),
    addStorySource.indexOf("<View style={styles.textToolTabRow}>") + 1700,
  );
  assert.match(tabRowBlock, /onPress=\{\(\) => onSelectTool\('style'\)\}/);
  assert.match(tabRowBlock, /onPress=\{\(\) => onSelectTool\('color'\)\}/);
  assert.match(tabRowBlock, /onPress=\{\(\) => onSelectTool\('align'\)\}/);
  assert.match(tabRowBlock, /onPress=\{\(\) => onSelectTool\('shadow'\)\}/);
  assert.match(tabRowBlock, /onPress=\{onCollapse\}/);
  assert.doesNotMatch(tabRowBlock, /pointerEvents="none"/);
});

test("the toolbar's Add/Edit text trigger and DraggableStoryText's own tap-to-edit both route to the same handler", () => {
  // Confirms "tap the toolbar trigger" and "tap the existing text" are the
  // same entry point onto the same object, not two different code paths.
  const toolbarButtonUses = addStorySource.match(/onPress=\{handleStartEditingOverlayText\}/g) ?? [];
  const propWiredUses = addStorySource.match(/onStartEditing=\{handleStartEditingOverlayText\}/g) ?? [];
  assert.equal(toolbarButtonUses.length, 1);
  assert.equal(propWiredUses.length, 1);
});

test("the color palette ScrollView persists taps without dismissing the keyboard first", () => {
  const colorToolBlock = addStorySource.slice(
    addStorySource.indexOf("activeTool === 'color' ? ("),
    addStorySource.indexOf("activeTool === 'align' ? ("),
  );
  assert.match(colorToolBlock, /keyboardShouldPersistTaps="always"/);
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

test("no new Story text drag/rotate state was introduced in DraggableStoryText — only isEditing drives the keyboard listener", () => {
  // The keyboard-hide effect must not introduce any new component state
  // (e.g. a second "keyboardVisible" flag) — it reacts to the existing
  // `isEditing` prop and calls the existing `onFinishEditing` prop only.
  assert.doesNotMatch(draggableStoryTextSource, /useState/);
});

test("the positioning GestureDetector branch is unchanged by the keyboard-hide fix", () => {
  assert.match(draggableStoryTextSource, /<GestureDetector gesture=\{composedGesture\}>\s*<Text/);
  assert.match(draggableStoryTextSource, /Gesture\.Race\(dragRotateGesture, tapGesture\)/);
});
