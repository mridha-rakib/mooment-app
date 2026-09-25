import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// CRT-010 — Create Post composer-state preservation + Android modal Back
// behavior. Follows this repo's established convention (see
// createPostValidationState.test.ts / createPostMediaPolicy.test.ts): no RN
// render/interaction harness, so control-flow, wiring, and copy are verified
// against the exact component source.

const createPostSource = readFileSync(
  join(process.cwd(), "app/post-screen/create-post.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const eventPickerSource = readFileSync(
  join(process.cwd(), "components/post/EventPickerModal.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const audiencePickerSource = readFileSync(
  join(process.cwd(), "components/post/AudiencePickerModal.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const peopleTagModalSource = readFileSync(
  join(process.cwd(), "components/post/PeopleTagModal.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const sliceBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `expected to find: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `expected to find: ${end} after ${start}`);
  return source.slice(startIndex, endIndex);
};

// ── Part A: Android modal Back behavior ──────────────────────────────────

const cameraSheetSource = sliceBetween(createPostSource, "function CameraSheet({", "function VideoPickerSheet({");
const videoCameraSheetSource = sliceBetween(createPostSource, "function VideoCameraSheet({", "function AudioPickerSheet({");

test("CameraSheet's Modal closes on Android Back via the same onClose callback used by its X/Cancel buttons", () => {
  assert.match(cameraSheetSource, /<Modal visible=\{visible\} animationType="slide" presentationStyle="fullScreen" onRequestClose=\{onClose\}>/);
  // The same onClose reference the X button and permission-denied Cancel use.
  assert.match(cameraSheetSource, /onPress=\{onClose\} style=\{camStyles\.closeBtn\}/);
  assert.match(cameraSheetSource, /<TouchableOpacity onPress=\{onClose\} style=\{\{ marginTop: 12 \}\}>/);
});

test("VideoCameraSheet's Modal (dormant, video disabled) also gets the same safe onRequestClose wiring", () => {
  assert.match(videoCameraSheetSource, /onRequestClose=\{onClose\}/);
});

test("EventPickerModal's Modal closes on Android Back via the existing onClose prop", () => {
  assert.match(eventPickerSource, /<Modal visible=\{visible\} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose=\{onClose\}>/);
});

test("AudiencePickerModal's Modal closes on Android Back via the existing onClose prop", () => {
  assert.match(audiencePickerSource, /<Modal visible=\{visible\} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose=\{onClose\}>/);
});

test("AudioPickerSheet's existing Android close handling is unchanged (not rewritten by this batch)", () => {
  assert.match(createPostSource, /<Modal visible=\{visible\} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose=\{closeSheet\}>/);
});

test("PeopleTagModal's existing Android close handling is unchanged (not rewritten by this batch)", () => {
  assert.match(peopleTagModalSource, /<Modal visible=\{visible\} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose=\{onClose\}>/);
});

// ── Part B: modal close callbacks are visibility-only, no state reset ────

const modalWiringSource = sliceBetween(createPostSource, "{/* ── Modals ── */}", "</SafeAreaView>");

test("every fixed modal's onClose prop in the JSX wiring only flips its own visibility flag", () => {
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowCamera\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowAudioPicker\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowEventModal\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowPeopleModal\(false\)\}/);
  assert.match(modalWiringSource, /onClose=\{\(\) => setShowAudienceModal\(false\)\}/);
});

test("no close-only callback in the modal wiring resets caption/tags/Event/media/audience", () => {
  // Scan each onClose={...} arrow body individually — narrower than a
  // whole-file regex, so a legitimate onSelect handler elsewhere (which DOES
  // intentionally set state) can never produce a false positive here.
  const onCloseCallbacks = [...modalWiringSource.matchAll(/onClose=\{(\(\) => [^}]+)\}/g)].map((m) => m[1]);
  assert.ok(onCloseCallbacks.length >= 5, "expected to find every modal's onClose prop");

  for (const callback of onCloseCallbacks) {
    assert.doesNotMatch(callback, /setCaption/);
    assert.doesNotMatch(callback, /setTaggedFriends/);
    assert.doesNotMatch(callback, /setSelectedEvent/);
    assert.doesNotMatch(callback, /setSelectedImages/);
    assert.doesNotMatch(callback, /setSelectedImage\(/);
    assert.doesNotMatch(callback, /setAudience/);
    assert.doesNotMatch(callback, /clearSelectedMedia/);
    assert.doesNotMatch(callback, /clearSelectedEvent/);
  }
});

// ── Part C: Event picker preservation ─────────────────────────────────────

test("Event picker cancel (onClose only) never touches selectedEvent/selectedEventId/selectedEventCode", () => {
  const eventModalWiring = sliceBetween(modalWiringSource, "<EventPickerModal", "<PeopleTagModal");
  assert.match(eventModalWiring, /onClose=\{\(\) => setShowEventModal\(false\)\}/);
});

test("Event selection updates exactly the Event fields, plus closing the modal — nothing else", () => {
  const eventModalWiring = sliceBetween(modalWiringSource, "<EventPickerModal", "<PeopleTagModal");
  const onSelectBody = sliceBetween(eventModalWiring, "onSelect={ev => {", "}}\n      />");

  assert.match(onSelectBody, /setSelectedEvent\(ev\.title\);/);
  assert.match(onSelectBody, /setSelectedEventId\(ev\.id\);/);
  assert.match(onSelectBody, /setSelectedEventCode\(null\);/);
  assert.match(onSelectBody, /setShowEventModal\(false\);/);
  // Nothing unrelated is touched by an Event selection.
  assert.doesNotMatch(onSelectBody, /setCaption/);
  assert.doesNotMatch(onSelectBody, /setTaggedFriends/);
  assert.doesNotMatch(onSelectBody, /setSelectedImages/);
  assert.doesNotMatch(onSelectBody, /setAudience/);
});

// ── Part D: Friend picker — live-apply semantics preserved, no rollback ───

test("PeopleTagModal toggles commit live to the parent immediately (no Cancel-reverts-selection behavior was added)", () => {
  assert.match(peopleTagModalSource, /toggle\(/);
  // The live-apply comment/behavior from Batch A is intact.
  assert.match(peopleTagModalSource, /Fire immediately so author row updates in real-time/);
});

test("Friend picker's onClose in create-post.tsx only hides the modal — it never reverts taggedFriends", () => {
  const peopleModalWiring = sliceBetween(modalWiringSource, "<PeopleTagModal", "<AudiencePickerModal");
  assert.match(peopleModalWiring, /onClose=\{\(\) => setShowPeopleModal\(false\)\}/);
  assert.doesNotMatch(peopleModalWiring, /setTaggedFriends\(\[\]\)/);
});

test("PeopleTagModal's search input is local UI state, never wired to taggedFriends/composer setters", () => {
  const searchDeclaration = peopleTagModalSource.match(/const \[search, setSearch\] = useState/);
  assert.ok(searchDeclaration, "expected local search state to still exist");
});

// ── Part E: Gallery preservation ──────────────────────────────────────────

const handleImageSelectSource = sliceBetween(createPostSource, "const handleImageSelect = async (", "const handleVideoSelect = (");
const handlePickImageSource = sliceBetween(createPostSource, "const handlePickImage = async () => {", "const handlePickVideo = async () => {");

test("a canceled gallery picker result returns immediately with no composer state touched", () => {
  const cancelGuard = sliceBetween(handlePickImageSource, "if (result.canceled || !result.assets[0]) {", "}");
  assert.match(cancelGuard, /return;/);
  assert.doesNotMatch(cancelGuard, /set[A-Z]/);
});

test("a valid image selection only ever writes media-related state (never caption/Event/friends/audience)", () => {
  const commitBlock = sliceBetween(handleImageSelectSource, "stopAudioPreview();", "if (overflowCount > 0)");
  assert.doesNotMatch(commitBlock, /setCaption/);
  assert.doesNotMatch(commitBlock, /setTaggedFriends/);
  assert.doesNotMatch(commitBlock, /setSelectedEvent/);
  assert.doesNotMatch(commitBlock, /setAudience/);
});

test("an image batch rejected by CRT-011 media policy (MIME/size/total) returns before any setSelectedImages call, leaving existing images intact", () => {
  const beforeCommit = handleImageSelectSource.slice(0, handleImageSelectSource.indexOf("stopAudioPreview();"));
  const rejectionReturns = [...beforeCommit.matchAll(/Alert\.alert\([^)]*\);\s*\n\s*return;/g)];
  assert.ok(rejectionReturns.length >= 3, "expected count/MIME/size/total rejection paths to each return before commit");
  assert.doesNotMatch(beforeCommit, /setSelectedImages/);
});

// ── Part F: Camera preservation ───────────────────────────────────────────

test("CameraSheet capture routes through the same shared handleImageSelect path — no duplicate media-policy logic", () => {
  const cameraWiring = sliceBetween(modalWiringSource, "<CameraSheet", "{/* Video is hard-disabled");
  assert.match(cameraWiring, /onCapture=\{\(uri, contentType, name\) => handleImageSelect\(\[/);
});

test("Camera cancel (X, permission-denied Cancel, or Android Back) only calls onClose — no composer field is reset", () => {
  assert.doesNotMatch(cameraSheetSource, /setCaption/);
  assert.doesNotMatch(cameraSheetSource, /setTaggedFriends/);
  assert.doesNotMatch(cameraSheetSource, /setSelectedEvent/);
  assert.doesNotMatch(cameraSheetSource, /setAudience/);
});

// ── Part G: Audio preservation ────────────────────────────────────────────

const handlePickAudioSource = sliceBetween(createPostSource, "const handlePickAudio = async () => {", "const handlePickImage = async () => {");
const audioSheetStopRecordingSource = sliceBetween(
  createPostSource,
  "  const stopRecording = async () => {\n    if (!isRecording || isStoppingRecording) {",
  "const closeSheet = async () => {",
);

test("AudioPickerSheet cancel (no successful pick/recording) never touches caption/Event/friends/images/audience", () => {
  const closeSheetSource = sliceBetween(createPostSource, "const closeSheet = async () => {", "const { sheetTranslateY, dragPanHandlers } = useBottomSheetDragDismiss({");
  assert.doesNotMatch(closeSheetSource, /setCaption/);
  assert.doesNotMatch(closeSheetSource, /setTaggedFriends/);
  assert.doesNotMatch(closeSheetSource, /setSelectedEvent/);
  assert.doesNotMatch(closeSheetSource, /setSelectedImages/);
  assert.doesNotMatch(closeSheetSource, /setAudience/);
});

test("an invalid audio candidate (MIME/size/duration) never reaches handleAudioSelect, so existing images are never cleared", () => {
  const rejectionReturns = [...handlePickAudioSource.matchAll(/Alert\.alert\([^)]*\);\s*\n\s*return;/g)];
  assert.ok(rejectionReturns.length >= 4, "expected MIME/size/duration-min/duration-max rejection paths");

  const lastRejectionIndex = Math.max(
    handlePickAudioSource.lastIndexOf("Alert.alert('Unsupported audio format'"),
    handlePickAudioSource.lastIndexOf("Alert.alert('Audio file is too large'"),
    handlePickAudioSource.lastIndexOf("Alert.alert('Audio is too short'"),
    handlePickAudioSource.lastIndexOf("Alert.alert('Audio is too long'"),
  );
  const commitIndex = handlePickAudioSource.indexOf("handleAudioSelect(audio.uri, 'upload', contentType, audio.name, durationSeconds);");
  assert.ok(commitIndex > lastRejectionIndex, "handleAudioSelect must be reachable only after every rejection branch");
});

test("a valid audio selection preserves caption/Event/friends/audience — only the intentional image/audio exclusivity applies", () => {
  const handleAudioSelectBlock = sliceBetween(createPostSource, "const handleAudioSelect = (", "const clearSelectedMedia = (");
  assert.match(handleAudioSelectBlock, /setSelectedImages\(\[\]\);/); // intentional exclusivity, unchanged
  assert.doesNotMatch(handleAudioSelectBlock, /setCaption/);
  assert.doesNotMatch(handleAudioSelectBlock, /setTaggedFriends/);
  assert.doesNotMatch(handleAudioSelectBlock, /setSelectedEvent/);
  assert.doesNotMatch(handleAudioSelectBlock, /setAudience/);
});

test("a too-short or oversized recording is rejected before onRecorded — existing images are never touched by the rejection path", () => {
  assert.doesNotMatch(audioSheetStopRecordingSource.slice(0, audioSheetStopRecordingSource.indexOf("onRecorded(")), /setSelectedImages/);
});

// ── Part H: Audience preservation ─────────────────────────────────────────

test("AudiencePickerModal cancel only hides the modal — the previous audience value is never reset", () => {
  const audienceWiring = modalWiringSource.slice(modalWiringSource.indexOf("<AudiencePickerModal"));
  assert.match(audienceWiring, /onClose=\{\(\) => setShowAudienceModal\(false\)\}/);
});

test("Audience selection updates exactly `audience`, plus closing the modal — nothing else", () => {
  const audienceWiring = modalWiringSource.slice(modalWiringSource.indexOf("<AudiencePickerModal"));
  assert.match(audienceWiring, /onSelect=\{aud => \{ setAudience\(aud\); setShowAudienceModal\(false\); \}\}/);
});

// ── Part I: composer exit — documented, unchanged product decision ───────

// NOTE: at the time this test was first written, full-screen composer exit
// had no discard-confirmation by design (a deliberate, documented product
// decision pending further input). That decision has since been finalized
// the other way — see createPostDiscardConfirmation.test.ts for full CRT-010
// follow-up coverage of the "Discard post?" confirmation. This test is kept
// as light regression proof that `handleClose`/`safeBack` themselves (the
// actual navigation primitive Discard still uses) are unchanged, and that
// no persistence mechanism was introduced alongside the new confirmation.
test("handleClose/safeBack (the navigation primitive Discard uses) are unchanged, and no draft-persistence mechanism was introduced", () => {
  assert.match(createPostSource, /const handleClose = \(\) => \{\s*\n\s*if \(isClosingRef\.current\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*\n\s*isClosingRef\.current = true;\s*\n\s*safeBack\(router, '\/\(tabs\)\/home'\);/);
  assert.doesNotMatch(createPostSource, /AsyncStorage/);
});

// ── Part J item 27: composer still owns all its own state (no new global store) ──

test("composer state is still plain local useState inside CreateMomentScreen — no new global/reducer store was introduced", () => {
  for (const stateVar of [
    "caption", "selectedImages", "selectedImage", "selectedMediaType",
    "selectedEvent", "selectedEventId", "taggedFriends", "audience",
  ]) {
    assert.match(createPostSource, new RegExp(`const \\[${stateVar}, set${stateVar[0].toUpperCase()}${stateVar.slice(1)}\\] = useState`));
  }
  assert.doesNotMatch(createPostSource, /useReducer/);
  assert.doesNotMatch(createPostSource, /createStore|zustand|create\(\(set/i);
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

test("FREEZE: video Moment creation remains disabled", () => {
  assert.match(createPostSource, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("FREEZE: the primary submit button still reads Post, not Done", () => {
  assert.match(createPostSource, /<Text style=\{styles\.doneBtnText\}>Post<\/Text>/);
  assert.doesNotMatch(createPostSource, /<Text style=\{styles\.doneBtnText\}>Done<\/Text>/);
});

test("FREEZE: isSubmittingRef same-tap guard is untouched", () => {
  assert.match(createPostSource, /const isSubmittingRef = useRef\(false\);/);
});
