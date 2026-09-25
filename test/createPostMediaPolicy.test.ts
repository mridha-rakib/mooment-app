import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// CRT-011 media-policy completion — image size/count/MIME, audio size/
// duration/MIME. Follows this repo's established convention (see
// createPostUploadRetry.test.ts / createPostValidationState.test.ts): no RN
// render harness, so pure helpers are extracted and executed directly, and
// everything else is verified against the exact component source.

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

// ── Extract and execute the real MIME normalization/approval helpers ──────

const stripTypeAnnotations = (code: string) => code
  .replace(/\(value\?: string \| null\): string/g, "(value)")
  .replace(/\(contentType\?: string \| null\): boolean/g, "(contentType)");

const mimeHelpersSource = stripTypeAnnotations(sliceBetween(
  "const APPROVED_IMAGE_MIME_TYPES = new Set(",
  "const CREATE_MOMENT_COLORS = {",
));
const mimeHelperFactory = new Function(
  `${mimeHelpersSource}\nreturn { normalizeMimeType, isApprovedImageMimeType, isApprovedAudioMimeType };`,
);
const { normalizeMimeType, isApprovedImageMimeType, isApprovedAudioMimeType } = mimeHelperFactory() as {
  normalizeMimeType: (value?: string | null) => string;
  isApprovedImageMimeType: (contentType?: string | null) => boolean;
  isApprovedAudioMimeType: (contentType?: string | null) => boolean;
};

// ── §52: image MIME ─────────────────────────────────────────────────────

test("approved image MIME types are valid", () => {
  assert.equal(isApprovedImageMimeType("image/jpeg"), true);
  assert.equal(isApprovedImageMimeType("image/png"), true);
  assert.equal(isApprovedImageMimeType("image/webp"), true);
});

test("unsupported image MIME types are invalid", () => {
  assert.equal(isApprovedImageMimeType("image/gif"), false);
  assert.equal(isApprovedImageMimeType("image/heic"), false);
  assert.equal(isApprovedImageMimeType("image/heif"), false);
  assert.equal(isApprovedImageMimeType(null), false);
  assert.equal(isApprovedImageMimeType(undefined), false);
});

// ── §55: audio MIME + normalization ──────────────────────────────────────

test("approved base audio MIME forms are valid", () => {
  for (const mime of [
    "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac",
    "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg",
  ]) {
    assert.equal(isApprovedAudioMimeType(mime), true, `${mime} should be approved`);
  }
});

test("unsupported audio MIME types are invalid", () => {
  assert.equal(isApprovedAudioMimeType("audio/flac"), false);
  assert.equal(isApprovedAudioMimeType("audio/webm"), false);
});

test("MIME comparison is case-insensitive and strips harmless parameters", () => {
  assert.equal(normalizeMimeType("AUDIO/MPEG"), "audio/mpeg");
  assert.equal(normalizeMimeType("audio/mp4; codecs=mp4a.40.2"), "audio/mp4");
  assert.equal(isApprovedAudioMimeType("AUDIO/MPEG"), true);
  assert.equal(isApprovedAudioMimeType("audio/mp4; codecs=mp4a.40.2"), true);
});

// ── §56: the app's own recorded-audio output remains accepted ───────────

test("the recorder's actual output MIME ('audio/mp4', hardcoded in stopRecording) is approved", () => {
  assert.match(source, /onRecorded\(\s*\n\s*uri,\s*\n\s*'audio\/mp4',/);
  assert.equal(isApprovedAudioMimeType('audio/mp4'), true);
});

// ── Constants: exact approved values, binary byte units ──────────────────

test("frontend constants match the approved product policy exactly", () => {
  assert.match(source, /const IMAGE_MAX_FILE_SIZE_BYTES = 15 \* 1024 \* 1024;/);
  assert.match(source, /const IMAGE_MAX_TOTAL_SIZE_BYTES = 50 \* 1024 \* 1024;/);
  assert.match(source, /const AUDIO_MAX_FILE_SIZE_BYTES = 20 \* 1024 \* 1024;/);
  assert.match(source, /const AUDIO_MIN_DURATION_SECONDS = 1;/);
  assert.match(source, /const AUDIO_MAX_DURATION_SECONDS = 5 \* 60;/);
  assert.match(source, /const MAX_MEDIA_ITEMS = 10;/);
});

// ── §27: image validation order (MIME -> per-file size -> total -> commit) ──

const handleImageSelectSource = sliceBetween(
  "const handleImageSelect = async (",
  "const handleVideoSelect = (",
);

test("image candidates are resolved (MIME+size) before any commit, and the whole batch is rejected atomically on failure", () => {
  const resolveIndex = handleImageSelectSource.indexOf("const resolvedCandidates = await Promise.all(");
  const mimeCheckIndex = handleImageSelectSource.indexOf("const unsupportedImage = resolvedCandidates.find(");
  const sizeCheckIndex = handleImageSelectSource.indexOf("const oversizedImage = resolvedCandidates.find(");
  const totalCheckIndex = handleImageSelectSource.indexOf("if (existingTotalBytes + candidateTotalBytes > IMAGE_MAX_TOTAL_SIZE_BYTES)");
  const commitIndex = handleImageSelectSource.indexOf("setSelectedImages((currentImages) =>");

  assert.ok(resolveIndex > -1 && mimeCheckIndex > resolveIndex, "MIME resolved/checked before size");
  assert.ok(sizeCheckIndex > mimeCheckIndex, "per-file size checked after MIME");
  assert.ok(totalCheckIndex > sizeCheckIndex, "total size checked after per-file size");
  assert.ok(commitIndex > totalCheckIndex, "commit happens only after every check passes");
});

test("an unsupported image MIME never reaches setSelectedImages — existing valid images are untouched", () => {
  assert.match(handleImageSelectSource, /Alert\.alert\('Unsupported photo format', 'Choose a JPEG, PNG, or WebP image\.'\);\s*\n\s*return;/);
});

test("an oversized image (per-file) is rejected with the approved copy", () => {
  assert.match(handleImageSelectSource, /Alert\.alert\('Photo is too large', 'Choose a photo that is 15 MB or smaller\.'\);\s*\n\s*return;/);
});

test("a combined-size-exceeding batch is rejected with the approved copy, counting existing selected images too", () => {
  assert.match(handleImageSelectSource, /Alert\.alert\('Photo limit reached', 'Selected photos can be up to 50 MB in total\.'\);\s*\n\s*return;/);
  assert.match(handleImageSelectSource, /const existingTotalBytes = selectedMediaType === 'image'\s*\n\s*\? selectedImages\.reduce\(\(sum, image\) => sum \+ \(image\.sizeBytes \?\? 0\), 0\)/);
});

test("image byte size comes from real local file metadata, never estimated from dimensions/filename/MIME", () => {
  assert.match(handleImageSelectSource, /typeof image\.sizeBytes === 'number' \? image\.sizeBytes : await getLocalFileSizeBytes\(image\.uri\)/);
});

test("the existing 10-image-count Alert defense is unchanged and still runs first", () => {
  const limitIndex = handleImageSelectSource.indexOf("Alert.alert('Image limit reached', `You can attach up to ${MAX_MEDIA_ITEMS} images.`);");
  const resolveIndex = handleImageSelectSource.indexOf("const resolvedCandidates = await Promise.all(");
  assert.ok(limitIndex > -1 && limitIndex < resolveIndex, "count limit is still checked before any async size/MIME resolution");
});

// ── getLocalFileSizeBytes: never uploads to discover size, never fetches remote ──

test("getLocalFileSizeBytes reads local filesystem metadata only, never a remote fetch or upload", () => {
  const fn = sliceBetween(
    "const getLocalFileSizeBytes = async (uri: string): Promise<number> => {",
    "const resolvePickedAudioDurationSeconds",
  );
  assert.match(fn, /if \(isRemoteUri\(uri\)\) \{\s*\n\s*return 0;/);
  assert.match(fn, /FileSystem\.getInfoAsync\(uri\)/);
  assert.doesNotMatch(fn, /fetch\(/);
  assert.doesNotMatch(fn, /uploadFileToStorage/);
});

// ── §28: audio validation order (readable -> MIME -> size -> duration -> commit) ──

const handlePickAudioSource = sliceBetween(
  "const handlePickAudio = async () => {",
  "const handlePickImage = async () => {",
);

test("picked-audio validation runs in the required order: readable -> MIME -> size -> duration -> commit", () => {
  const readableIndex = handlePickAudioSource.indexOf("const sizeBytes = await validateReadableFile(audio.uri);");
  const mimeIndex = handlePickAudioSource.indexOf("if (!isApprovedAudioMimeType(contentType)) {");
  const sizeIndex = handlePickAudioSource.indexOf("if (sizeBytes > AUDIO_MAX_FILE_SIZE_BYTES) {");
  const durationResolveIndex = handlePickAudioSource.indexOf("durationSeconds = await resolvePickedAudioDurationSeconds(audio.uri);");
  const durationMinIndex = handlePickAudioSource.indexOf("if (durationSeconds < AUDIO_MIN_DURATION_SECONDS) {");
  const durationMaxIndex = handlePickAudioSource.indexOf("if (durationSeconds > AUDIO_MAX_DURATION_SECONDS) {");
  const commitIndex = handlePickAudioSource.indexOf("handleAudioSelect(audio.uri, 'upload', contentType, audio.name, durationSeconds);");

  assert.ok(readableIndex > -1 && mimeIndex > readableIndex, "readability checked before MIME");
  assert.ok(sizeIndex > mimeIndex, "size checked after MIME");
  assert.ok(durationResolveIndex > sizeIndex, "duration resolved after size");
  assert.ok(durationMinIndex > durationResolveIndex && durationMaxIndex > durationMinIndex, "duration bounds checked after resolution");
  assert.ok(commitIndex > durationMaxIndex, "handleAudioSelect (the only function that clears images) runs last, after every check passes");
});

test("an unsupported/oversized/mis-durationed picked audio never reaches handleAudioSelect — existing images survive", () => {
  assert.match(handlePickAudioSource, /Alert\.alert\('Unsupported audio format', 'Choose an M4A, AAC, MP3, WAV, or OGG file\.'\);\s*\n\s*return;/);
  assert.match(handlePickAudioSource, /Alert\.alert\('Audio file is too large', 'Choose an audio file that is 20 MB or smaller\.'\);\s*\n\s*return;/);
  assert.match(handlePickAudioSource, /Alert\.alert\('Audio is too short', `Audio must be at least \$\{AUDIO_MIN_DURATION_SECONDS\} second\.`\);\s*\n\s*return;/);
  assert.match(handlePickAudioSource, /Alert\.alert\('Audio is too long', 'Audio can be up to 5 minutes\.'\);\s*\n\s*return;/);
});

test("a picked-audio metadata-resolution failure is surfaced, never silently bypassed or faked", () => {
  assert.match(handlePickAudioSource, /catch \(error\) \{\s*\n\s*Alert\.alert\('Unable to choose audio', getAuthErrorMessage\(error, 'Could not read this audio file\. Please choose another\.'\)\);\s*\n\s*return;/);
});

// ── §26: picked-audio duration resolution — smallest supported metadata path ──

test("resolvePickedAudioDurationSeconds uses the installed expo-audio imperative API (createAudioPlayer + playbackStatusUpdate), not the render-bound hooks, and always releases the temporary player", () => {
  const fn = sliceBetween(
    "const resolvePickedAudioDurationSeconds = (uri: string): Promise<number> => (",
    "function AudioPickerSheet(",
  );

  assert.match(fn, /const player = createAudioPlayer\(uri\);/);
  assert.match(fn, /player\.addListener\('playbackStatusUpdate', \(status\) => \{/);
  assert.match(fn, /status\.isLoaded && Number\.isFinite\(status\.duration\) && status\.duration > 0/);
  assert.match(fn, /player\.remove\(\);/);
  // Never fakes a duration on failure/timeout — it rejects instead.
  assert.match(fn, /reject\(new Error\('Could not read the audio duration\.'\)\)/);
});

// ── §20/§23: recorded audio — too-short rejection ────────────────────────

const audioSheetStopRecordingSource = sliceBetween(
  "  const stopRecording = async () => {\n    if (!isRecording || isStoppingRecording) {",
  "const closeSheet = async () => {",
);

test("a too-short recording is rejected with the approved copy and never finalized via onRecorded", () => {
  assert.match(
    audioSheetStopRecordingSource,
    /Alert\.alert\('Recording is too short', `Record at least \$\{AUDIO_MIN_DURATION_SECONDS\} second of audio\.`\);\s*\n\s*return;/,
  );

  const rejectIndex = audioSheetStopRecordingSource.indexOf("Alert.alert('Recording is too short'");
  const onRecordedIndex = audioSheetStopRecordingSource.indexOf("onRecorded(");
  assert.ok(rejectIndex > -1 && rejectIndex < onRecordedIndex, "the too-short guard runs before onRecorded could ever fire");
});

test("an oversized recorded file is rejected with the approved copy before onRecorded", () => {
  assert.match(
    audioSheetStopRecordingSource,
    /Alert\.alert\('Audio file is too large', 'Choose an audio file that is 20 MB or smaller\.'\);\s*\n\s*return;/,
  );
});

// ── §21/§24: recorded audio — 5-minute auto-stop, no duplicate finalize ──

test("recording duration is clamped to the approved max rather than rejected for stop-latency overshoot (auto-stop 'truthfully' enforces 5:00)", () => {
  assert.match(
    audioSheetStopRecordingSource,
    /const recordingDurationSeconds = Math\.min\(rawDurationSeconds, AUDIO_MAX_DURATION_SECONDS\);/,
  );
});

test("auto-stop reuses the existing recordingDurationMillis tick — no second timer — and is guarded against a double-finalize race", () => {
  const autoStopEffect = sliceBetween(
    "useEffect(() => {\n    if (isRecording && recordingDurationMillis >= AUDIO_MAX_DURATION_SECONDS * 1000) {",
    "const closeSheet = async () => {",
  );

  assert.match(autoStopEffect, /stopRecording\(\);/);
  assert.match(autoStopEffect, /\}, \[isRecording, recordingDurationMillis\]\);/);

  // The single-flight guards that make a concurrent manual-Stop-vs-auto-stop
  // race safe already exist and are untouched by this addition.
  assert.match(source, /const stopRecording = async \(\) => \{\s*\n\s*if \(!isRecording \|\| isStoppingRecording\) \{\s*\n\s*return;/);
  assert.match(source, /if \(stopPromiseRef\.current\) \{\s*\n\s*return stopPromiseRef\.current;/);
});

test("elapsed recording time is shown against the 5-minute max, reusing the existing formatAudioDuration helper (no new formatter)", () => {
  assert.match(
    source,
    /`\$\{formatAudioDuration\(recordingDurationMillis\)\} \/ \$\{formatAudioDuration\(AUDIO_MAX_DURATION_SECONDS \* 1000\)\}`/,
  );
});

// ── §57/§58: invalid audio never clears images; valid audio still replaces them ──

test("handleAudioSelect (the only function that clears selectedImages for audio) is called only after every audio check has already passed", () => {
  // In handlePickAudio, every rejection branch returns before reaching this line.
  assert.match(handlePickAudioSource, /handleAudioSelect\(audio\.uri, 'upload', contentType, audio\.name, durationSeconds\);/);
  // In the recorder path, the same is true for onRecorded (which calls handleAudioSelect).
  const onRecordedCallIndex = audioSheetStopRecordingSource.indexOf("onRecorded(");
  const tooShortIndex = audioSheetStopRecordingSource.indexOf("Alert.alert('Recording is too short'");
  const oversizedIndex = audioSheetStopRecordingSource.indexOf("Alert.alert('Audio file is too large'");
  assert.ok(onRecordedCallIndex > tooShortIndex && onRecordedCallIndex > oversizedIndex);
});

test("handleAudioSelect itself still unconditionally clears images on a successful (already-validated) selection — the intentional exclusivity rule is unchanged", () => {
  const handleAudioSelectBlock = sliceBetween("const handleAudioSelect = (", "const clearSelectedMedia = (");
  assert.match(handleAudioSelectBlock, /setSelectedImages\(\[\]\);/);
});

// ── §34/§35: valid content while submitting / after failure — unaffected by media policy ──

test("hasValidPostContent is unaffected: it still only checks presence, not policy validity (invalid media never reaches that state to begin with)", () => {
  assert.match(source, /const hasValidPostContent = caption\.trim\(\)\.length > 0 \|\| selectedImages\.length > 0 \|\| Boolean\(selectedImage\);/);
});

// ── Freezes: prior batches untouched ──────────────────────────────────────

test("FREEZE: CRT-012 clientRequestId / pending-attempt / media-cache internals are untouched", () => {
  assert.match(source, /clientRequestId: attempt\.clientRequestId,/);
  assert.match(source, /attempt\.uploadedMedia\.get\(cacheKey\)/);
  assert.match(source, /mediaKeySlots: new Map\(\),/);
});

test("FREEZE: caption 5000 limit and image count 10 are unchanged", () => {
  assert.match(source, /const MAX_POST_CAPTION_LENGTH = 5000;/);
  assert.match(source, /const MAX_MEDIA_ITEMS = 10;/);
});

test("FREEZE: video Moment creation remains disabled", () => {
  assert.match(source, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("FREEZE: no new dependency — only expo-audio's already-installed createAudioPlayer is newly imported", () => {
  assert.match(source, /import \{\s*\n\s*AudioModule,\s*\n\s*createAudioPlayer,/);
});
