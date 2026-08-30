import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Surgical double-tap / duplicate-action safety fixes for Create Post.
// Scope is exactly three proven interaction-safety issues:
//   P0 - the submit lock is released on the success path before the delayed
//        navigation leaves the screen, opening a duplicate-submit window.
//   P1 - the header X / close action has no synchronous double-navigation guard.
//   P2 - the Image picker launch has no single-flight opening guard.
// These tests follow the repo convention of asserting against source text — the
// project has no render/interaction test harness.

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");

const createPostSource = read("app/post-screen/create-post.tsx");
const navigationSource = read("lib/navigation.ts");
const addOptionsSource = read("components/modals/AddOptionsModal.tsx");

const sliceBetween = (source: string, startMarker: string, endMarker: string) => {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `expected to find: ${endMarker} after ${startMarker}`);
  return source.slice(start, end);
};

const publishMomentSource = sliceBetween(
  createPostSource,
  "const publishMoment = async (",
  "const handleClose = () => {",
);
const handleCloseSource = sliceBetween(
  createPostSource,
  "const handleClose = () => {",
  "const handleDone = async () => {",
);
const handleDoneSource = sliceBetween(
  createPostSource,
  "const handleDone = async () => {",
  "const taggedLabel",
);
const handlePickImageSource = sliceBetween(
  createPostSource,
  "const handlePickImage = async () => {",
  "const handlePickVideo = async () => {",
);

// ── P0 — post-success duplicate submit ────────────────────────────────────────

test("P0: the in-flight submit guard is preserved (synchronous ref, set before any await)", () => {
  assert.match(createPostSource, /const \[isSubmitting, setIsSubmitting\] = useState\(false\);/);
  assert.match(createPostSource, /const isSubmittingRef = useRef\(false\);/);

  const guardIndex = publishMomentSource.indexOf("if (isSubmittingRef.current) {");
  const acquireIndex = publishMomentSource.indexOf("isSubmittingRef.current = true;");
  const setStateIndex = publishMomentSource.indexOf("setIsSubmitting(true);");

  assert.ok(guardIndex > -1, "publishMoment must early-return when isSubmittingRef is set");
  assert.ok(acquireIndex > guardIndex, "the ref must be acquired after the guard check");
  assert.ok(setStateIndex > acquireIndex, "isSubmitting state is set after the ref");
});

test("P0: the success path holds the submit lock (shouldReleaseSubmitLock = false before return 'created')", () => {
  const createdReturnIndex = publishMomentSource.indexOf("return 'created';");
  assert.ok(createdReturnIndex > -1, "publishMoment still returns 'created' on success");

  const beforeCreatedReturn = publishMomentSource.slice(0, createdReturnIndex);
  const lastReleaseAssignment = beforeCreatedReturn.lastIndexOf("shouldReleaseSubmitLock = false;");
  assert.ok(
    lastReleaseAssignment > beforeCreatedReturn.lastIndexOf("setPendingNewMoment(newMoment);"),
    "the success path must set shouldReleaseSubmitLock = false after setPendingNewMoment and before return 'created'",
  );
});

test("P0: failure still releases the lock for retry", () => {
  // The catch block returns false and must NOT hold the lock — release happens
  // in `finally` gated on shouldReleaseSubmitLock, which stays true on failure.
  const catchBlock = sliceBetween(publishMomentSource, "} catch (error) {", "} finally {");
  assert.match(catchBlock, /return false;/);
  assert.doesNotMatch(catchBlock, /shouldReleaseSubmitLock/);

  const finallyBlock = publishMomentSource.slice(publishMomentSource.indexOf("} finally {"));
  assert.match(finallyBlock, /if \(shouldReleaseSubmitLock && screenMountedRef\.current\) \{\s*isSubmittingRef\.current = false;\s*setIsSubmitting\(false\);/);
});

test("P0: the empty-content early return still releases the lock (no accidental permanent lock)", () => {
  const emptyGuard = sliceBetween(
    publishMomentSource,
    "if (!trimmedCaption && selectedImages.length === 0 && !selectedImage) {",
    "}",
  );
  assert.match(emptyGuard, /isSubmittingRef\.current = false;/);
  assert.match(emptyGuard, /setIsSubmitting\(false\);/);
});

test("P0: exactly one create request and one media build per publishMoment call", () => {
  assert.equal((publishMomentSource.match(/createMoment\(/g) ?? []).length, 1);
  assert.equal((publishMomentSource.match(/buildMediaItems\(\)/g) ?? []).length, 1);
});

test("P0: the Done button remains disabled while the submit lock is held", () => {
  assert.match(
    createPostSource,
    /<TouchableOpacity style=\{\[styles\.doneBtn, isSubmitting && styles\.doneBtnDisabled\]\} onPress=\{handleDone\} activeOpacity=\{0\.8\} disabled=\{isSubmitting\}>/,
  );
});

// ── P1 — X / close double-navigation guard ───────────────────────────────────

test("P1: handleClose is a synchronous one-shot guard around the existing safeBack", () => {
  assert.match(createPostSource, /const isClosingRef = useRef\(false\);/);
  assert.match(handleCloseSource, /if \(isClosingRef\.current\) \{\s*return;\s*\}/);

  const guardIndex = handleCloseSource.indexOf("if (isClosingRef.current)");
  const acquireIndex = handleCloseSource.indexOf("isClosingRef.current = true;");
  const backIndex = handleCloseSource.indexOf("safeBack(router, '/(tabs)/home');");

  assert.ok(acquireIndex > guardIndex, "lock acquired after guard check");
  assert.ok(backIndex > acquireIndex, "safeBack runs after the lock is acquired");
  assert.equal((handleCloseSource.match(/safeBack\(/g) ?? []).length, 1);
});

test("P1: the header X button and the post-success navigation both route through handleClose", () => {
  assert.match(createPostSource, /<CreateMomentCloseButton onPress=\{handleClose\} \/>/);
  assert.match(handleDoneSource, /setTimeout\(\(\) => \{\s*handleClose\(\);\s*\}, 1500\);/);
  // No bare safeBack calls remain inside the screen body's handlers.
  assert.doesNotMatch(handleDoneSource, /safeBack\(/);
});

test("P1: safeBack itself is unchanged", () => {
  assert.match(navigationSource, /export function safeBack\(/);
  assert.match(navigationSource, /if \(router\.canGoBack\(\)\) \{\s*router\.back\(\);\s*\} else \{/);
  assert.match(navigationSource, /router\.replace\(fallback as any\);/);
});

// ── P2 — Image picker single-flight guard ────────────────────────────────────

test("P2: handlePickImage acquires a single-flight ref before the permission/picker flow", () => {
  assert.match(createPostSource, /const isImagePickerOpeningRef = useRef\(false\);/);

  const guardIndex = handlePickImageSource.indexOf("if (isImagePickerOpeningRef.current) {");
  const acquireIndex = handlePickImageSource.indexOf("isImagePickerOpeningRef.current = true;");
  const permissionIndex = handlePickImageSource.indexOf("ImagePicker.requestMediaLibraryPermissionsAsync()");
  const launchIndex = handlePickImageSource.indexOf("ImagePicker.launchImageLibraryAsync(");

  assert.ok(guardIndex > -1 && acquireIndex > guardIndex, "guard checked, then ref acquired");
  assert.ok(permissionIndex > acquireIndex, "permission request happens after the lock");
  assert.ok(launchIndex > permissionIndex, "picker launch happens after the lock");
});

test("P2: the image-picker lock is released in finally (cancel / error / success all release)", () => {
  const finallyBlock = handlePickImageSource.slice(handlePickImageSource.indexOf("} finally {"));
  assert.match(finallyBlock, /isImagePickerOpeningRef\.current = false;/);
  // Matches the existing sibling pattern used for audio.
  assert.match(createPostSource, /isAudioPickerOpeningRef\.current = false;\s*\}\s*\};/);
});

test("P2: native picker configuration is unchanged", () => {
  assert.match(handlePickImageSource, /mediaTypes: \['images'\]/);
  assert.match(handlePickImageSource, /quality: 0\.9/);
  assert.match(handlePickImageSource, /allowsMultipleSelection: true/);
  assert.match(handlePickImageSource, /selectionLimit: MAX_MEDIA_ITEMS - selectedImageCount/);
  assert.match(handlePickImageSource, /orderedSelection: true/);
  assert.match(handlePickImageSource, /source: 'gallery'/);
});

// ── Freezes ─────────────────────────────────────────────────────────────────

test("FREEZE: Video Moment creation remains disabled and unreachable", () => {
  assert.match(createPostSource, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
  assert.match(
    createPostSource,
    /\{VIDEO_MOMENT_CREATION_ENABLED \? \(\s*<TouchableOpacity style=\{styles\.toolbarItem\} onPress=\{\(\) => setShowVideoPicker\(true\)\}/,
  );
  // Phase 1 mount-gate: while disabled the dormant Video sheets are not mounted.
  assert.match(createPostSource, /\{VIDEO_MOMENT_CREATION_ENABLED && \(\s*<VideoPickerSheet\s/);
  assert.match(createPostSource, /\{VIDEO_MOMENT_CREATION_ENABLED && \(\s*<VideoCameraSheet\s/);
  assert.equal((createPostSource.match(/<VideoPickerSheet[\s\n]/g) ?? []).length, 1);
  assert.equal((createPostSource.match(/<VideoCameraSheet[\s\n]/g) ?? []).length, 1);
  // The dormant Video components/helpers themselves are untouched.
  assert.match(createPostSource, /function VideoPickerSheet\(/);
  assert.match(createPostSource, /function VideoCameraSheet\(/);
  assert.match(createPostSource, /const handlePickVideo = async \(\) => \{\s*if \(!VIDEO_MOMENT_CREATION_ENABLED\) return;/);
  assert.match(handlePickImageSource, /mediaTypes: \['images'\]/);
  // buildMediaItem still refuses a video item if somehow reached.
  const buildMediaItem = sliceBetween(createPostSource, "const buildMediaItem = async ({", "const buildMediaItems = async");
  assert.match(buildMediaItem, /if \(type === 'video' && !VIDEO_MOMENT_CREATION_ENABLED\) \{/);
  assert.match(buildMediaItem, /throw new Error\('Video posts are temporarily unavailable\.'\);/);
});

test("FREEZE: CameraSheet and AudioPickerSheet are not moved behind the video flag", () => {
  assert.match(createPostSource, /<CameraSheet\s+visible=\{showCamera\}/);
  assert.match(createPostSource, /<AudioPickerSheet\s+visible=\{showAudioPicker\}/);
  assert.doesNotMatch(createPostSource, /VIDEO_MOMENT_CREATION_ENABLED && \(\s*<CameraSheet/);
  assert.doesNotMatch(createPostSource, /VIDEO_MOMENT_CREATION_ENABLED && \(\s*<AudioPickerSheet/);
});

test("FREEZE: Create Post header design (X icon, Done label/style) is unchanged", () => {
  assert.match(createPostSource, /<Text style=\{styles\.headerTitle\}>Create Post<\/Text>/);
  assert.match(createPostSource, /<Text style=\{styles\.doneBtnText\}>Done<\/Text>/);
  assert.match(createPostSource, /function CreateMomentCloseButton\(\{ onPress \}: \{ onPress: \(\) => void \}\)/);
});

test("FREEZE: post payload shape and the moments API call are unchanged", () => {
  assert.match(publishMomentSource, /mode: selectedEventId \? 'event' as const : 'feed' as const,/);
  assert.match(publishMomentSource, /audience: normalizeAudience\(audience\),/);
  assert.match(publishMomentSource, /taggedFriendIds: \[\.\.\.new Set\(taggedFriends\.map\(\(friend\) => friend\.id\)\)\],/);
  assert.match(publishMomentSource, /const newMoment = await createMoment\(\{\s*\.\.\.momentPayload,\s*mediaItems,\s*\}\);/);
  assert.match(publishMomentSource, /setPendingNewMoment\(newMoment\);/);
});

test("FREEZE: New Post entry (AddOptionsModal) press lock is untouched", () => {
  assert.match(addOptionsSource, /const optionPressLockRef = React\.useRef\(true\);/);
  assert.match(addOptionsSource, /if \(optionPressLockRef\.current\) return;/);
  assert.match(addOptionsSource, /route: "\/post-screen\/create-post"/);
});
