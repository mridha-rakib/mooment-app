import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// CRT-011 — Post validation + content-aware primary CTA + inline guidance.
// Follows this repo's established convention (see
// createPostDoubleTapSafety.test.ts / createPostUploadRetry.test.ts): no
// React Native render/interaction harness, so control-flow and copy are
// verified against the exact component source.

const source = readFileSync(
  join(process.cwd(), "app/post-screen/create-post.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const sliceBetween = (start: string, end: string) => {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `expected to find: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `expected to find: ${end} after ${start}`);
  return source.slice(startIndex, endIndex);
};

const publishMomentSource = sliceBetween(
  "const publishMoment = async (",
  "const handleClose = () => {",
);

// ── Central validity model ───────────────────────────────────────────────

test("hasValidPostContent is the single source of truth: trimmed caption OR images OR a selected single media item", () => {
  assert.match(
    source,
    /const hasValidPostContent = caption\.trim\(\)\.length > 0 \|\| selectedImages\.length > 0 \|\| Boolean\(selectedImage\);/,
  );
});

test("hasValidPostContent never counts Event, tags, or audience as content on their own", () => {
  const declarationLine = source.slice(
    source.indexOf("const hasValidPostContent ="),
    source.indexOf(";", source.indexOf("const hasValidPostContent =")) + 1,
  );

  assert.doesNotMatch(declarationLine, /selectedEvent/);
  assert.doesNotMatch(declarationLine, /taggedFriends/);
  assert.doesNotMatch(declarationLine, /audience/);
});

test("whitespace-only caption is excluded by the exact same trim() semantics used elsewhere (no second normalization rule)", () => {
  // The value passed to createMoment (publishMoment's trimmedCaption) and the
  // button's validity check must use the identical `.trim()` call — not two
  // independently-maintained whitespace rules that could drift apart.
  assert.match(source, /const hasValidPostContent = caption\.trim\(\)\.length > 0/);
  assert.match(publishMomentSource, /const trimmedCaption = caption\.trim\(\);/);
});

// ── Post button disabled expression ──────────────────────────────────────

test("isPostButtonDisabled combines the submit lock with content validity, and drives both the style and the disabled prop", () => {
  assert.match(source, /const isPostButtonDisabled = isSubmitting \|\| !hasValidPostContent;/);
  assert.match(
    source,
    /<TouchableOpacity style=\{\[styles\.doneBtn, isPostButtonDisabled && styles\.doneBtnDisabled\]\} onPress=\{handleDone\} activeOpacity=\{0\.8\} disabled=\{isPostButtonDisabled\}>/,
  );
});

test("the visible CTA copy is still exactly Post", () => {
  assert.match(source, /<Text style=\{styles\.doneBtnText\}>Post<\/Text>/);
  assert.doesNotMatch(source, /<Text style=\{styles\.doneBtnText\}>Done<\/Text>/);
});

// ── Submit-time defensive fallback (defense-in-depth, unchanged) ─────────

test("publishMoment still independently rejects empty content, with the exact approved copy, even though the button is now content-aware", () => {
  assert.match(
    publishMomentSource,
    /if \(!trimmedCaption && selectedImages\.length === 0 && !selectedImage\) \{\s*\n\s*Alert\.alert\('Add something to your post', 'Write a caption or add media before posting\.'\);\s*\n\s*isSubmittingRef\.current = false;\s*\n\s*setIsSubmitting\(false\);\s*\n\s*return false;/,
  );
});

// ── Caption limit ─────────────────────────────────────────────────────────

test("MAX_POST_CAPTION_LENGTH mirrors the backend's authoritative 5000-char cap exactly", () => {
  assert.match(source, /const MAX_POST_CAPTION_LENGTH = 5000;/);
});

test("the caption TextInput enforces maxLength natively (no manual truncation effect)", () => {
  assert.match(source, /maxLength=\{MAX_POST_CAPTION_LENGTH\}/);
  assert.doesNotMatch(source, /caption\.slice\(0, MAX_POST_CAPTION_LENGTH\)/);
});

test("a compact character counter is shown, driven by the raw (untrimmed) caption length the input actually constrains", () => {
  assert.match(source, /\{caption\.length\} \/ \{MAX_POST_CAPTION_LENGTH\}/);
  // Explicitly NOT the trimmed length — typing feedback must track exactly
  // what the TextInput is bounding, not a post-normalization value.
  assert.doesNotMatch(source, /\{trimmedCaption\.length\} \/ \{MAX_POST_CAPTION_LENGTH\}/);
});

test("the counter exposes a meaningful accessibility label", () => {
  assert.match(source, /accessibilityLabel=\{`\$\{caption\.length\} of \$\{MAX_POST_CAPTION_LENGTH\} characters`\}/);
});

// ── Image count guidance ──────────────────────────────────────────────────

test("MAX_MEDIA_ITEMS remains the single authoritative image-count constant (no duplicate literal introduced)", () => {
  assert.match(source, /const MAX_MEDIA_ITEMS = 10;/);
  // Only one production numeric-literal definition of the cap.
  assert.equal((source.match(/const MAX_MEDIA_ITEMS = \d+;/g) ?? []).length, 1);
});

test("a compact inline image count/limit indicator is shown, reusing MAX_MEDIA_ITEMS", () => {
  assert.match(source, /\{selectedImages\.length\} \/ \{MAX_MEDIA_ITEMS\} photos/);
});

test("the existing Alert-based limit-reached defense is untouched", () => {
  assert.match(source, /Alert\.alert\('Image limit reached', `You can attach up to \$\{MAX_MEDIA_ITEMS\} images\.`\);/);
});

// ── No invented media policy ──────────────────────────────────────────────

// NOTE: at the time these three tests were first written, no product-approved
// image/audio size, duration, or MIME policy existed, so this file asserted
// none had been silently invented. That policy is now explicitly approved
// and locked (see createPostMediaPolicy.test.ts for its full coverage) — these
// three are kept here as light regression proof that the SAME sanctioned
// constants this file already exercises elsewhere are what's in force, not a
// second, independently-invented set of numbers.

test("the image/audio file-size caps are the approved values, not an arbitrary/independent set of numbers", () => {
  assert.match(source, /const IMAGE_MAX_FILE_SIZE_BYTES = 15 \* 1024 \* 1024;/);
  assert.match(source, /const IMAGE_MAX_TOTAL_SIZE_BYTES = 50 \* 1024 \* 1024;/);
  assert.match(source, /const AUDIO_MAX_FILE_SIZE_BYTES = 20 \* 1024 \* 1024;/);
});

test("the audio-duration cap is the approved 5-minute value, and video's existing cap remains untouched and video-only", () => {
  assert.match(source, /const AUDIO_MIN_DURATION_SECONDS = 1;/);
  assert.match(source, /const AUDIO_MAX_DURATION_SECONDS = 5 \* 60;/);
  // The pre-existing video duration constant is untouched by this policy.
  assert.match(source, /const MAX_VIDEO_RECORDING_DURATION_SECONDS = 60;/);
});

test("the audio MIME allowlist covers the approved formats and the native picker discovery filter is unchanged", () => {
  assert.match(source, /const APPROVED_AUDIO_MIME_TYPES = new Set\(\[/);
  // The document picker still uses the same permissive discovery filter —
  // policy enforcement happens after selection, not by narrowing discovery.
  assert.match(source, /type: 'audio\/\*',/);
});

test("invalid/unreadable audio can never reach selectedMedia state (existing validateReadableFile gate, unchanged)", () => {
  const handleAudioSelectBlock = sliceBetween("const handleAudioSelect = (", "const clearSelectedMedia = (");
  const handlePickAudioBlock = sliceBetween("const handlePickAudio = async () => {", "const handlePickImage = async () => {");

  // handleAudioSelect (which actually writes selectedImage/selectedMediaType)
  // is only ever invoked after validateReadableFile has already resolved.
  assert.doesNotMatch(handleAudioSelectBlock, /validateReadableFile/);
  const validateIndex = handlePickAudioBlock.indexOf("await validateReadableFile(audio.uri);");
  const selectIndex = handlePickAudioBlock.indexOf("handleAudioSelect(audio.uri,");
  assert.ok(validateIndex > -1 && selectIndex > validateIndex, "validation must run before the audio is accepted into composer state");
});

// ── Valid content matrix (A-O) — logical proof against hasValidPostContent ──

test("valid-content matrix: content combinations that must enable Post", () => {
  // These assert the exact boolean terms exist in the disjunction, which is
  // the full determinant of A-H below (caption-only, image-only, audio-only,
  // and any combination with Event/friends alongside real content).
  assert.match(source, /caption\.trim\(\)\.length > 0/); // A, D, E, F, G, H
  assert.match(source, /selectedImages\.length > 0/); // B, D
  assert.match(source, /Boolean\(selectedImage\)/); // C, E, G (audio)
});

test("valid-content matrix: Event/friends alone must NOT satisfy hasValidPostContent (I, J, K)", () => {
  const declarationLine = source.slice(
    source.indexOf("const hasValidPostContent ="),
    source.indexOf(";", source.indexOf("const hasValidPostContent =")) + 1,
  );

  assert.doesNotMatch(declarationLine, /selectedEventId/);
  assert.doesNotMatch(declarationLine, /taggedFriends\.length/);
});

test("valid-content matrix: isSubmitting overrides valid content (N)", () => {
  assert.match(source, /const isPostButtonDisabled = isSubmitting \|\| !hasValidPostContent;/);
});

// ── Retry stays usable once submission lock clears (O) ───────────────────

test("a failed submission does not permanently disable Post — only isSubmitting and content validity gate it", () => {
  // submissionFailureStage / uploadPhase (CRT-012) are never part of
  // isPostButtonDisabled — a failed-but-still-valid draft re-enables the
  // button the instant isSubmitting clears in `finally`.
  const disabledDeclaration = source.slice(
    source.indexOf("const isPostButtonDisabled ="),
    source.indexOf(";", source.indexOf("const isPostButtonDisabled =")) + 1,
  );

  assert.doesNotMatch(disabledDeclaration, /submissionFailureStage/);
  assert.doesNotMatch(disabledDeclaration, /uploadPhase/);
});

test("the retry banner is unaffected by this batch and still re-runs the same pipeline", () => {
  assert.match(source, /\{submissionFailureStage \? \(/);
  assert.match(source, /style=\{styles\.retryBanner\}\s*\n\s*onPress=\{handleDone\}/);
});

// ── CRT-012 regression protection — nothing in this batch may touch these ──

test("CRT-012 clientRequestId / pending-attempt / media-cache internals are untouched", () => {
  assert.match(source, /clientRequestId: attempt\.clientRequestId,/);
  assert.match(source, /const getOrCreatePendingAttempt = useCallback/);
  assert.match(source, /attempt\.uploadedMedia\.get\(cacheKey\)/);
  assert.match(source, /attempt\.uploadedMedia\.set\(cacheKey, uploadedMediaItem\);/);
  assert.match(source, /mediaKeySlots: new Map\(\),/);
});

test("CRT-012 upload progress plumbing (real onProgress, aggregation) is untouched", () => {
  assert.match(source, /const reportMediaUploadProgress = useCallback/);
  assert.match(source, /contentType,\s*\n\s*onProgress,\s*\n\s*\}\);/);
});

test("the content-validity derivation never mutates CRT-012 attempt state", () => {
  const disabledDeclaration = source.slice(
    source.indexOf("const hasValidPostContent ="),
    source.indexOf("const taggedLabel ="),
  );

  assert.doesNotMatch(disabledDeclaration, /pendingAttemptRef\.current\s*=/);
  assert.doesNotMatch(disabledDeclaration, /getOrCreatePendingAttempt\(\)/);
});

// ── Freezes ───────────────────────────────────────────────────────────────

test("FREEZE: isSubmittingRef same-tap guard is untouched", () => {
  assert.match(source, /const isSubmittingRef = useRef\(false\);/);
  assert.match(publishMomentSource, /if \(isSubmittingRef\.current\) \{\s*\n\s*return false;/);
});

test("FREEZE: video Moment creation remains disabled", () => {
  assert.match(source, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("FREEZE: exactly one createMoment call and one buildMediaItems() call per publishMoment", () => {
  assert.equal((publishMomentSource.match(/createMoment\(/g) ?? []).length, 1);
  assert.equal((publishMomentSource.match(/buildMediaItems\(\)/g) ?? []).length, 1);
});
