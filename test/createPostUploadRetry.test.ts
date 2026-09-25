import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// CRT-012 — Create Post upload progress + safe retry + createMoment
// idempotency. Follows this repo's established convention (see
// createPostDoubleTapSafety.test.ts / createPostAudioMediaPolish.test.ts):
// no React Native render/interaction harness, so control-flow and copy are
// verified against the exact component source. The pure clampProgress
// helper is extracted and executed directly for real input -> output
// coverage.

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

// ── clampProgress: real execution, not pattern-matching ─────────────────

// Minimal TypeScript -> JS stripping for this narrow, self-contained function
// (mirrors the approach in createPostAudioMediaPolish.test.ts).
const clampStart = source.indexOf("const clampProgress = (value: number): number => {");
assert.notEqual(clampStart, -1, "expected to find clampProgress");
const clampEnd = source.indexOf("};", clampStart) + 2;
const clampSource = source
  .slice(clampStart, clampEnd)
  .replace("(value: number): number", "(value)");

const clampFactory = new Function(`${clampSource}\nreturn clampProgress;`);
const clampProgress = clampFactory() as (value: number) => number;

test("clampProgress bounds NaN/Infinity/negative/over-100% into a safe 0-1 range", () => {
  assert.equal(clampProgress(0.5), 0.5);
  assert.equal(clampProgress(0), 0);
  assert.equal(clampProgress(1), 1);
  assert.equal(clampProgress(-3), 0);
  assert.equal(clampProgress(4.2), 1);
  assert.equal(clampProgress(Number.NaN), 0);
  assert.equal(clampProgress(Number.POSITIVE_INFINITY), 0);
  assert.equal(clampProgress(Number.NEGATIVE_INFINITY), 0);
});

// ── Draft signature / pending attempt lifecycle ──────────────────────────

test("computeDraftSignature excludes volatile upload/submit state", () => {
  const fn = sliceBetween(
    "const computeDraftSignature = useCallback((): string => {",
    "const getOrCreatePendingAttempt = useCallback",
  );

  for (const volatile of ["uploadProgress", "storageKey", "isSubmitting", "isUploadingAudio", "Date.now()"]) {
    assert.doesNotMatch(fn, new RegExp(volatile.replace(/[().]/g, "\\$&")));
  }

  // Logical post inputs it DOES key off.
  for (const logical of ["caption.trim()", "normalizeAudience(audience)", "selectedEventId", "selectedMediaType", "taggedFriends"]) {
    assert.match(fn, new RegExp(logical.replace(/[().]/g, "\\$&")));
  }
});

test("getOrCreatePendingAttempt reuses the same attempt for an unchanged draft signature, and only mints a new clientRequestId otherwise", () => {
  const fn = sliceBetween(
    "const getOrCreatePendingAttempt = useCallback((): PendingSubmissionAttempt => {",
    "// If the draft changes while a failed attempt",
  );

  assert.match(fn, /if \(existingAttempt && existingAttempt\.draftSignature === draftSignature\) \{\s*\n\s*return existingAttempt;/);
  assert.match(fn, /clientRequestId: `post:\$\{Date\.now\(\)\}:\$\{Math\.random\(\)\.toString\(36\)\.slice\(2\)\}`,/);
  assert.match(fn, /uploadedMedia: new Map\(\),/);
  assert.match(fn, /mediaKeySlots: new Map\(\),/);
  assert.match(fn, /pendingAttemptRef\.current = attempt;/);
});

test("a draft change clears stale failure/progress UI without waiting for the next submit", () => {
  const effectBlock = sliceBetween(
    "if (attempt && attempt.draftSignature !== computeDraftSignature()) {",
    "}, [computeDraftSignature]);",
  );

  assert.match(effectBlock, /setSubmissionFailureStage\(null\);/);
  assert.match(effectBlock, /setUploadPhase\('idle'\);/);
  assert.match(effectBlock, /setUploadProgress\(0\);/);
});

// ── publishMoment: attempt creation, clientRequestId wiring, failure stage ──

const publishMomentSource = sliceBetween(
  "const publishMoment = async (",
  "const handleClose = () => {",
);

test("publishMoment obtains the pending attempt exactly once, after the empty-content guard", () => {
  assert.equal((publishMomentSource.match(/getOrCreatePendingAttempt\(\)/g) ?? []).length, 1);

  const guardIndex = publishMomentSource.indexOf("Write a caption or add media before posting.");
  const attemptIndex = publishMomentSource.indexOf("getOrCreatePendingAttempt()");
  assert.ok(attemptIndex > guardIndex, "the attempt must not be created for a rejected empty submission");
});

test("momentPayload carries the attempt's clientRequestId (still a single createMoment/buildMediaItems call)", () => {
  assert.match(publishMomentSource, /clientRequestId: attempt\.clientRequestId,/);
  // Untouched CRT-010/CRT-011 invariants this batch must not regress.
  assert.equal((publishMomentSource.match(/createMoment\(/g) ?? []).length, 1);
  assert.equal((publishMomentSource.match(/buildMediaItems\(\)/g) ?? []).length, 1);
});

test("an upload failure and a createMoment failure are distinguished internally via failureStage", () => {
  assert.match(publishMomentSource, /let failureStage: 'upload' \| 'create' = 'upload';/);

  const mediaItemsIndex = publishMomentSource.indexOf("const mediaItems = await buildMediaItems();");
  const failureStageCreateIndex = publishMomentSource.indexOf("failureStage = 'create';");
  const createMomentIndex = publishMomentSource.indexOf("const newMoment = await createMoment(");

  assert.ok(mediaItemsIndex > -1 && failureStageCreateIndex > mediaItemsIndex, "failureStage flips to 'create' only after media upload succeeds");
  assert.ok(createMomentIndex > failureStageCreateIndex, "the flip happens before the createMoment call, not after");
});

const sliceWithin = (haystack: string, start: string, end: string) => {
  const startIndex = haystack.indexOf(start);
  assert.notEqual(startIndex, -1, `expected to find: ${start}`);
  const endIndex = haystack.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `expected to find: ${end} after ${start}`);
  return haystack.slice(startIndex, endIndex);
};

test("the catch block records the failure stage and still releases the lock exactly as before", () => {
  const catchBlock = sliceWithin(publishMomentSource, "} catch (error) {", "} finally {");

  assert.match(catchBlock, /setSubmissionFailureStage\(failureStage\);/);
  assert.match(catchBlock, /setUploadPhase\(failureStage === 'upload' \? 'failed' : 'completed'\);/);
  assert.match(catchBlock, /return false;/);
  // P0 double-tap regression: shouldReleaseSubmitLock must never appear here.
  assert.doesNotMatch(catchBlock, /shouldReleaseSubmitLock/);
});

test("success clears the pending attempt and the failure banner before returning 'created'", () => {
  const createdReturnIndex = publishMomentSource.indexOf("return 'created';");
  const beforeReturn = publishMomentSource.slice(0, createdReturnIndex);

  assert.ok(beforeReturn.lastIndexOf("pendingAttemptRef.current = null;") > beforeReturn.lastIndexOf("setPendingNewMoment(newMoment);"));
});

test("submissionFailureStage is cleared at the start of every submit attempt", () => {
  const beforeAttempt = publishMomentSource.slice(0, publishMomentSource.indexOf("const eventTitle ="));
  assert.match(beforeAttempt, /setSubmissionFailureStage\(null\);/);
});

// ── buildMediaItem: cache reuse, stable per-attempt storage key, real progress ──

const buildMediaItemSource = sliceBetween("const buildMediaItem = async ({", "const buildMediaItems = async");

test("a cached (already-uploaded-this-attempt) media item is returned without re-uploading", () => {
  assert.match(buildMediaItemSource, /const cachedMediaItem = attempt\.uploadedMedia\.get\(cacheKey\);/);
  assert.match(buildMediaItemSource, /if \(cachedMediaItem\) \{\s*\n\s*onProgress\?\.\(1\);\s*\n\s*return cachedMediaItem;/);

  // The cache check must run before any network upload work.
  const cacheCheckIndex = buildMediaItemSource.indexOf("attempt.uploadedMedia.get(cacheKey)");
  const uploadIndex = buildMediaItemSource.indexOf("uploadFileToStorage({");
  assert.ok(cacheCheckIndex > -1 && cacheCheckIndex < uploadIndex);
});

test("a freshly uploaded media item is cached under its cacheKey for a later unchanged retry", () => {
  assert.match(buildMediaItemSource, /attempt\.uploadedMedia\.set\(cacheKey, uploadedMediaItem\);/);
});

test("the storage key is stable per (attempt, media item), not regenerated on every call", () => {
  assert.match(
    buildMediaItemSource,
    /key: `moments\/\$\{type\}\/\$\{attempt\.clientRequestId\}-\$\{getAttemptMediaSlot\(attempt, cacheKey\)\}\.\$\{getMediaExtension\(contentType\)\}`,/,
  );
  // No more Date.now()/Math.random() key regenerated on every buildMediaItem call.
  assert.doesNotMatch(buildMediaItemSource, /Date\.now\(\)-\$\{Math\.random/);
});

test("the real onProgress callback is threaded into uploadFileToStorage — no fake timer", () => {
  assert.match(buildMediaItemSource, /contentType,\s*\n\s*onProgress,\s*\n\s*\}\);/);
  assert.doesNotMatch(buildMediaItemSource, /setInterval\(/);
});

test("isUploadingAudio scoping around the real upload is unchanged by this batch", () => {
  assert.match(buildMediaItemSource, /const isLocalAudioUpload = type === 'audio';/);
  assert.match(buildMediaItemSource, /if \(isLocalAudioUpload\) \{\s*\n\s*setIsUploadingAudio\(true\);\s*\n\s*\}/);
  assert.match(buildMediaItemSource, /\} finally \{\s*\n\s*if \(isLocalAudioUpload\) \{\s*\n\s*setIsUploadingAudio\(false\);/);
});

test("video creation stays refused and unreachable inside buildMediaItem", () => {
  assert.match(buildMediaItemSource, /if \(type === 'video' && !VIDEO_MOMENT_CREATION_ENABLED\) \{/);
  assert.match(buildMediaItemSource, /throw new Error\('Video posts are temporarily unavailable\.'\);/);
});

// ── buildMediaItems: multi-image partial-failure reuse + progress reset ────

const buildMediaItemsSource = sliceBetween("const buildMediaItems = async (): Promise<MomentMediaItem[]> => {", "const scrollToCaption");

test("buildMediaItems reads the active attempt from the ref rather than taking a parameter (preserves the buildMediaItems() call-site contract)", () => {
  assert.match(buildMediaItemsSource, /const attempt = pendingAttemptRef\.current;/);
  assert.match(buildMediaItemsSource, /if \(!attempt\) \{/);
});

test("each image keeps its own stable cacheKey (image.id) so partial multi-image failure can reuse the successful ones", () => {
  assert.match(buildMediaItemsSource, /cacheKey: image\.id,/);
  assert.match(buildMediaItemsSource, /attempt,\s*\n\s*onProgress: \(value\) => reportMediaUploadProgress\(image\.id, value, totalCount\),/);
});

test("image upload order is preserved (Promise.all over the existing selectedImages order, not reordered)", () => {
  assert.match(buildMediaItemsSource, /selectedImages\.map\(\(image\) => buildMediaItem\(\{/);
});

test("progress state resets to a clean slate at the start of every buildMediaItems() call", () => {
  assert.match(buildMediaItemsSource, /uploadProgressMapRef\.current = new Map\(\);/);
  assert.match(buildMediaItemsSource, /setUploadProgress\(0\);/);
});

test("single audio/video media gets its own stable cacheKey derived from type+uri, not display name", () => {
  assert.match(buildMediaItemsSource, /const singleCacheKey = `\$\{selectedMediaType\}:\$\{selectedImage\}`;/);
  assert.doesNotMatch(buildMediaItemsSource, /cacheKey: selectedMediaName/);
});

// ── Aggregate progress: concurrent images never fake a sequential index ────

test("reportMediaUploadProgress aggregates real per-item progress, clamped, never a fabricated byte total", () => {
  const fn = sliceBetween(
    "const reportMediaUploadProgress = useCallback((cacheKey: string, value: number, totalCount: number) => {",
    "const buildMediaItem = async ({",
  );

  assert.match(fn, /uploadProgressMapRef\.current\.set\(cacheKey, clampProgress\(value\)\);/);
  assert.match(fn, /setUploadProgress\(clampProgress\(sum \/ totalCount\)\);/);
});

test("multi-image status copy never fakes a sequential 'file N of M' index (uploads run concurrently via Promise.all)", () => {
  assert.match(source, /Uploading media… \$\{Math\.round\(clampProgress\(uploadProgress\) \* 100\)\}%/);
  assert.doesNotMatch(source, /Uploading \$\{index/);
});

// ── Retry UI ──────────────────────────────────────────────────────────────

test("a visible retry affordance appears on failure and re-runs the exact same submission pipeline", () => {
  assert.match(source, /\{submissionFailureStage \? \(/);
  assert.match(source, /style=\{styles\.retryBanner\}\s*\n\s*onPress=\{handleDone\}/);
  // Not a second publish implementation — the existing handleDone/publishMoment path.
  assert.equal((source.match(/const publishMoment = async \(/g) ?? []).length, 1);
});

// ── Existing copy must survive verbatim (createPostCopyCleanup.test.ts also covers this) ──

test("the original 'Uploading audio…' copy still exists verbatim for the zero-progress moment", () => {
  assert.match(source, /'Uploading audio…'/);
  assert.match(source, /'Loading audio…'/);
});

// ── Freezes ───────────────────────────────────────────────────────────────

test("FREEZE: video Moment creation remains disabled", () => {
  assert.match(source, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("FREEZE: isSubmittingRef same-tap guard is untouched and clientRequestId does not replace it", () => {
  assert.match(source, /const isSubmittingRef = useRef\(false\);/);
  assert.match(publishMomentSource, /if \(isSubmittingRef\.current\) \{\s*\n\s*return false;/);
});

test("FREEZE: the primary submit button still reads Post, not Done", () => {
  assert.match(source, /<Text style=\{styles\.doneBtnText\}>Post<\/Text>/);
  assert.doesNotMatch(source, /<Text style=\{styles\.doneBtnText\}>Done<\/Text>/);
});
