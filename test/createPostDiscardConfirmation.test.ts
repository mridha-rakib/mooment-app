import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// CRT-010 follow-up — Create Post discard confirmation. No draft, no
// autosave, no persistence: leaving a dirty composer shows a native Alert;
// "Keep Editing" changes nothing; "Discard" uses the existing safe
// navigation primitive. Follows this repo's established convention (see
// createPostComposerPreservation.test.ts): no RN render harness, so
// control-flow and wiring are verified against the exact component source.

const createPostSource = readFileSync(
  join(process.cwd(), "app/post-screen/create-post.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const layoutSource = readFileSync(
  join(process.cwd(), "app/_layout.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const sliceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `expected to find: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `expected to find: ${end} after ${start}`);
  return source.slice(startIndex, endIndex);
};

const requestCloseComposerSource = sliceBetween(
  createPostSource,
  "const requestCloseComposer = useCallback(() => {",
  "// Android hardware Back at the root Create Post screen.",
);

const hasUnsavedDeclaration = createPostSource.slice(
  createPostSource.indexOf("const hasUnsavedComposerChanges ="),
  createPostSource.indexOf(";", createPostSource.indexOf("const hasUnsavedComposerChanges =")) + 1,
);

// ── §7-9: hasUnsavedComposerChanges — separate concept from hasValidPostContent ──

test("hasUnsavedComposerChanges exists as its own boolean, never aliased to hasValidPostContent", () => {
  assert.match(createPostSource, /const hasUnsavedComposerChanges = \(/);
  assert.doesNotMatch(hasUnsavedDeclaration, /hasValidPostContent/);
});

test("caption dirty-detection uses the raw (untrimmed) length, not caption.trim()", () => {
  assert.match(hasUnsavedDeclaration, /caption\.length > 0/);
  assert.doesNotMatch(hasUnsavedDeclaration, /caption\.trim\(\)\.length > 0/);
});

test("images/audio/friends/Event/audience are each part of the dirty check", () => {
  assert.match(hasUnsavedDeclaration, /selectedImages\.length > 0/);
  assert.match(hasUnsavedDeclaration, /Boolean\(selectedImage\)/);
  assert.match(hasUnsavedDeclaration, /taggedFriends\.length > 0/);
  assert.match(hasUnsavedDeclaration, /selectedEventId !== initialEventIdRef\.current/);
  assert.match(hasUnsavedDeclaration, /audience !== 'Public'/);
});

test("transient UI state is never part of the dirty check (modal visibility, progress, submit lock, CRT-012 internals)", () => {
  for (const transient of [
    "showCamera", "showEventModal", "showAudienceModal", "showPeopleModal", "showAudioPicker",
    "search", "uploadProgress", "uploadPhase", "submissionFailureStage",
    "isSubmitting", "isUploadingAudio", "clientRequestId", "pendingAttemptRef", "uploadedMedia",
  ]) {
    assert.doesNotMatch(hasUnsavedDeclaration, new RegExp(transient));
  }
});

// ── §10: initial baseline — legitimate route-preselected Event ──────────

test("the Event baseline is captured once from the same route params the pre-population effect uses, not hardcoded to null", () => {
  const baselineDeclaration = sliceBetween(
    createPostSource,
    "const initialEventIdRef = useRef<string | null>(",
    "const [taggedFriends, setTaggedFriends] = useState<TaggedFriend[]>([]);",
  );
  assert.match(baselineDeclaration, /params\.eventId && params\.eventName \? params\.eventId : null/);
});

test("audience's baseline is the fixed initial default ('Public'), matching its actual useState initializer", () => {
  assert.match(createPostSource, /const \[audience, setAudience\] = useState\('Public'\);/);
  assert.match(hasUnsavedDeclaration, /audience !== 'Public'/);
});

// ── §11-14 / valid-content matrix items I-K: Event/friends/audience-only still dirty ──

test("an Event-only, friend-only, or audience-only user change is dirty even though it may leave Post disabled", () => {
  // hasValidPostContent (unchanged, CRT-011) never includes these three —
  // hasUnsavedComposerChanges (this batch) explicitly does. The two are
  // therefore provably different booleans for the same composer state.
  assert.match(createPostSource, /const hasValidPostContent = caption\.trim\(\)\.length > 0 \|\| selectedImages\.length > 0 \|\| Boolean\(selectedImage\);/);
  assert.doesNotMatch(
    createPostSource.slice(createPostSource.indexOf("const hasValidPostContent =")),
    /^const hasValidPostContent = caption\.trim\(\)\.length > 0 \|\| selectedImages\.length > 0 \|\| Boolean\(selectedImage\)\s*\|\| taggedFriends/,
  );
});

// ── §15-18: the confirmation dialog itself ───────────────────────────────

test("the Alert uses the exact approved title, message, and button copy/styles", () => {
  assert.match(
    requestCloseComposerSource,
    /Alert\.alert\(\s*\n\s*'Discard post\?',\s*\n\s*'Your changes will be lost if you leave now\.',\s*\n\s*\[\s*\n\s*\{ text: 'Keep Editing', style: 'cancel' \},\s*\n\s*\{ text: 'Discard', style: 'destructive', onPress: handleClose \},\s*\n\s*\],\s*\n\s*\);/,
  );
});

test("no third button, and no Save Draft / Save for Later / Restore Draft / Continue Draft copy exists anywhere", () => {
  const buttonCount = (requestCloseComposerSource.match(/\{ text: '/g) ?? []).length;
  assert.equal(buttonCount, 2);
  for (const forbidden of ["Save Draft", "Save for Later", "Restore Draft", "Continue Draft", "Autosave", "autosave"]) {
    assert.doesNotMatch(createPostSource, new RegExp(forbidden));
  }
});

test("Keep Editing (style: 'cancel') has no onPress — it only dismisses the Alert, nothing else runs", () => {
  assert.match(requestCloseComposerSource, /\{ text: 'Keep Editing', style: 'cancel' \},/);
  assert.doesNotMatch(requestCloseComposerSource, /text: 'Keep Editing'[^}]*onPress/);
});

test("Discard calls the existing handleClose primitive directly — no second navigation mechanism, no save/upload/persistence call first", () => {
  assert.match(requestCloseComposerSource, /onPress: handleClose \}/);
  assert.doesNotMatch(requestCloseComposerSource, /createMoment/);
  assert.doesNotMatch(requestCloseComposerSource, /uploadFileToStorage/);
  assert.doesNotMatch(requestCloseComposerSource, /AsyncStorage/);
  assert.doesNotMatch(requestCloseComposerSource, /router\.push|router\.replace|router\.navigate/);
});

// ── §19: Keep Editing changes no composer state (proof by omission) ─────

test("the entire requestCloseComposer body contains no composer state setter other than the implicit ones inside handleClose itself", () => {
  for (const setter of [
    "setCaption", "setSelectedImages", "setSelectedImage(", "setSelectedMediaType",
    "setTaggedFriends", "setSelectedEvent", "setSelectedEventId", "setAudience",
  ]) {
    assert.doesNotMatch(requestCloseComposerSource, new RegExp(setter.replace("(", "\\(")));
  }
});

// ── §21-24: clean vs dirty, submitting suppression ───────────────────────

test("requestCloseComposer: submitting suppresses exit entirely, clean exits immediately, dirty shows the Alert — in that order", () => {
  const submittingGuardIndex = requestCloseComposerSource.indexOf("if (isSubmitting) {");
  const cleanGuardIndex = requestCloseComposerSource.indexOf("if (!hasUnsavedComposerChanges) {");
  const alertIndex = requestCloseComposerSource.indexOf("Alert.alert(");

  assert.ok(submittingGuardIndex > -1 && submittingGuardIndex < cleanGuardIndex, "submitting is checked first");
  assert.ok(cleanGuardIndex < alertIndex, "clean-exit short-circuit happens before the Alert branch");
});

test("a clean composer's exit still calls handleClose exactly as before — no new navigation path was invented for the clean case", () => {
  const cleanBranch = sliceBetween(requestCloseComposerSource, "if (!hasUnsavedComposerChanges) {", "Alert.alert(");
  assert.match(cleanBranch, /handleClose\(\);/);
});

test("while submitting, requestCloseComposer returns without calling handleClose or showing the Alert (no misleading Discard for an in-flight request)", () => {
  const submittingBranch = sliceBetween(requestCloseComposerSource, "if (isSubmitting) {", "if (!hasUnsavedComposerChanges) {");
  assert.match(submittingBranch, /return;/);
  assert.doesNotMatch(submittingBranch, /handleClose/);
  assert.doesNotMatch(submittingBranch, /Alert\.alert/);
});

test("no request-cancellation/abort architecture was added for the in-flight-submit case", () => {
  assert.doesNotMatch(requestCloseComposerSource, /AbortController|cancel\(|abort\(/);
});

// ── §25: successful Post bypasses the guard entirely ─────────────────────

test("the post-success and pending navigation paths call handleClose directly, never requestCloseComposer — a successful Post can never show the discard Alert", () => {
  const handleDoneBody = sliceBetween(createPostSource, "const handleDone = async () => {", "};\n\n  // CRT-010:");
  assert.match(handleDoneBody, /setTimeout\(\(\) => \{\s*handleClose\(\);\s*\}, 1500\);/);
  assert.doesNotMatch(handleDoneBody, /requestCloseComposer/);
});

// ── §4/§28: header X routes through the guard ────────────────────────────

test("the header X button routes through requestCloseComposer, not directly through handleClose", () => {
  assert.match(createPostSource, /<CreateMomentCloseButton onPress=\{requestCloseComposer\} \/>/);
});

// ── §5/§23-24/§28-29: Android hardware Back ──────────────────────────────

const backHandlerEffectSource = sliceBetween(
  createPostSource,
  "useEffect(() => {\n    const isChildModalOpen = showCamera",
  "// CRT-011: the SAME rule the backend enforces",
);

test("the root-screen BackHandler only requests composer close when no child modal is open, and consumes the event (returns true) when it does act", () => {
  assert.match(backHandlerEffectSource, /if \(isChildModalOpen\) \{\s*\n\s*return false;\s*\n\s*\}/);
  assert.match(backHandlerEffectSource, /requestCloseComposer\(\);\s*\n\s*return true;/);
});

test("isChildModalOpen checks every sheet/picker visibility flag CRT-010 already fixed onRequestClose for, plus PeopleTagModal/AudioPickerSheet", () => {
  for (const flag of [
    "showCamera", "showVideoPicker", "showVideoCamera", "showAudioPicker",
    "showEventModal", "showPeopleModal", "showAudienceModal",
  ]) {
    assert.match(backHandlerEffectSource, new RegExp(flag));
  }
});

test("BackHandler is imported from react-native and subscribed/unsubscribed via addEventListener/remove (standard RN pattern, no new dependency)", () => {
  assert.match(createPostSource, /import \{\s*\n\s*Alert,\s*\n\s*Animated,\s*\n\s*BackHandler,/);
  assert.match(backHandlerEffectSource, /BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{/);
  assert.match(backHandlerEffectSource, /return \(\) => subscription\.remove\(\);/);
});

// ── §28: modal close callbacks remain visibility-only (regression) ──────

test("child modal onClose wiring is untouched — closing a picker is not routed through requestCloseComposer", () => {
  const modalWiringSource = sliceBetween(createPostSource, "{/* ── Modals ── */}", "</SafeAreaView>");
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowCamera\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowEventModal\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowAudienceModal\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowPeopleModal\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowAudioPicker\(false\)\}/);
  assert.doesNotMatch(modalWiringSource, /onClose=\{requestCloseComposer\}/);
});

// ── §6/gesture audit: iOS swipe-back routed through the same guard ───────

test("iOS swipe-back gesture is disabled for this screen so it cannot bypass requestCloseComposer (mirrors the existing add-story precedent for the same reason)", () => {
  const createPostScreenOptions = sliceBetween(layoutSource, 'name="post-screen/create-post"', "/>");
  assert.match(createPostScreenOptions, /gestureEnabled: false,/);
});

test("the create-post Stack.Screen entry changes nothing else about the screen (no presentation/animation override, unlike add-story's distinct camera UI)", () => {
  const createPostScreenOptions = sliceBetween(layoutSource, 'name="post-screen/create-post"', "/>");
  assert.doesNotMatch(createPostScreenOptions, /presentation:/);
  assert.doesNotMatch(createPostScreenOptions, /animation:/);
});

// ── §32/§33: no draft/persistence architecture anywhere in this file ────

test("no draft-persistence mechanism was introduced: no AsyncStorage/SecureStore/SQLite/MMKV/localStorage/draft API/global store", () => {
  for (const forbidden of [
    "AsyncStorage", "SecureStore", "SQLite", "MMKV", "localStorage",
    "/drafts", "DraftRepository", "useDraftStore", "createStore", "zustand",
  ]) {
    assert.doesNotMatch(createPostSource, new RegExp(forbidden.replace(/[/]/g, "\\/")));
  }
});

// ── Freezes: prior batches untouched ──────────────────────────────────────

test("FREEZE: CRT-012 clientRequestId / pending-attempt / media-cache internals are untouched", () => {
  assert.match(createPostSource, /clientRequestId: attempt\.clientRequestId,/);
  assert.match(createPostSource, /attempt\.uploadedMedia\.get\(cacheKey\)/);
  assert.match(createPostSource, /mediaKeySlots: new Map\(\),/);
});

test("FREEZE: CRT-011 content-aware Post CTA / caption / image-count constants are untouched", () => {
  assert.match(createPostSource, /const isPostButtonDisabled = isSubmitting \|\| !hasValidPostContent;/);
  assert.match(createPostSource, /const MAX_POST_CAPTION_LENGTH = 5000;/);
  assert.match(createPostSource, /const MAX_MEDIA_ITEMS = 10;/);
});

test("FREEZE: isSubmittingRef same-tap guard and handleClose's isClosingRef one-shot guard are both untouched", () => {
  assert.match(createPostSource, /const isSubmittingRef = useRef\(false\);/);
  assert.match(createPostSource, /const isClosingRef = useRef\(false\);/);
  assert.match(
    createPostSource,
    /const handleClose = \(\) => \{\s*\n\s*if \(isClosingRef\.current\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*isClosingRef\.current = true;\s*\n\s*safeBack\(router, '\/\(tabs\)\/home'\);/,
  );
});

test("FREEZE: video Moment creation remains disabled", () => {
  assert.match(createPostSource, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("FREEZE: the primary submit button still reads Post, not Done", () => {
  assert.match(createPostSource, /<Text style=\{styles\.doneBtnText\}>Post<\/Text>/);
  assert.doesNotMatch(createPostSource, /<Text style=\{styles\.doneBtnText\}>Done<\/Text>/);
});

test("FREEZE: add-story's own discard-confirmation and Stack.Screen gesture setting are untouched by this batch", () => {
  const addStorySource = readFileSync(join(process.cwd(), "app/post-screen/add-story.tsx"), "utf8");
  assert.match(addStorySource, /'Discard story\?'/);

  const addStoryScreenOptions = sliceBetween(layoutSource, 'name="post-screen/add-story"', "/>");
  assert.match(addStoryScreenOptions, /gestureEnabled: false,/);
});
