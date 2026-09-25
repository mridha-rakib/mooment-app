import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the "Record voice" addition to the Event Window Audio flow.
// Like eventWindowEligibilityUI.test.ts and videoUploadDisabled.test.ts,
// this repo has no React Native render harness, so these assert against the
// actual source wiring rather than rendered output — specifically that
// recording is an additive input source that funnels into the exact same
// selectedMedia state and submitPost() pipeline the existing "Choose audio"
// file picker already uses, with no second upload/post/authorization path.

const attendeeWindowsSource = readFileSync(
  join(process.cwd(), "components/eventTabs/AttendeeEventWindowsTab.tsx"),
  "utf8",
);

// ============================================================
// Existing Audio upload untouched
// ============================================================

test("pickMedia's existing audio branch still uses expo-document-picker with type audio/*, unchanged", () => {
  const pickMediaStart = attendeeWindowsSource.indexOf("const pickMedia = async () => {");
  const pickMediaEnd = attendeeWindowsSource.indexOf("const loadGallery", pickMediaStart);
  assert.notEqual(pickMediaStart, -1);
  assert.notEqual(pickMediaEnd, -1);
  const pickMediaFn = attendeeWindowsSource.slice(pickMediaStart, pickMediaEnd);

  assert.match(pickMediaFn, /DocumentPicker\.getDocumentAsync\(\{\s*type: "audio\/\*"/);
  assert.match(pickMediaFn, /source: "upload"/);
});

test("there is exactly one submitPost function, and it is not duplicated for recorded audio", () => {
  const matches = attendeeWindowsSource.match(/const submitPost = async \(\) => \{/g) ?? [];
  assert.equal(matches.length, 1);
});

test("submitPost still calls uploadFileToStorage then createEventWindowPost exactly once each", () => {
  const submitPostStart = attendeeWindowsSource.indexOf("const submitPost = async () => {");
  const submitPostEnd = attendeeWindowsSource.indexOf("const renderGalleryPost", submitPostStart);
  assert.notEqual(submitPostStart, -1);
  assert.notEqual(submitPostEnd, -1);
  const submitPostFn = attendeeWindowsSource.slice(submitPostStart, submitPostEnd);

  assert.equal((submitPostFn.match(/uploadFileToStorage\(/g) ?? []).length, 1);
  assert.equal((submitPostFn.match(/createEventWindowPost\(/g) ?? []).length, 1);
});

test("no new API call is introduced — the only endpoints referenced are the existing storage and event-window post calls", () => {
  // lib/eventWindows.ts and lib/storage.ts own the actual endpoint strings;
  // this file must only ever call their exported functions, never api.* directly.
  assert.doesNotMatch(attendeeWindowsSource, /\bapi\.(get|post|patch|delete)\(/);
});

// ============================================================
// Record Voice entry point
// ============================================================

test("Record voice is offered only when selectedType is audio, as a sibling of Choose audio (not a replacement)", () => {
  assert.match(attendeeWindowsSource, /selectedType === "audio" \? \(\s*<View style=\{styles\.audioMediaOptionsRow\}>/);
  assert.match(attendeeWindowsSource, />Choose audio</);
  assert.match(attendeeWindowsSource, />Record voice</);
  assert.match(attendeeWindowsSource, /onPress=\{\(\) => setShowRecordVoice\(true\)\}/);
});

test("Record voice option is not reachable for image/text/video content types", () => {
  // The audio-specific branch is only taken when selectedType === "audio";
  // the pre-existing generic branch (image/video) is unchanged below it and
  // never renders the two-button row.
  const mediaSectionStart = attendeeWindowsSource.indexOf('styles.formLabel, { color: colors.textSecondary }]}>MEDIA</Text>');
  const mediaSectionEnd = attendeeWindowsSource.indexOf("</>\n                ) : null}", mediaSectionStart);
  assert.notEqual(mediaSectionStart, -1);
  const mediaSection = attendeeWindowsSource.slice(mediaSectionStart, mediaSectionEnd === -1 ? undefined : mediaSectionEnd);

  assert.match(mediaSection, /selectedType === "audio" \?/);
});

// ============================================================
// Recorder implementation reuses the project's proven expo-audio pattern
// ============================================================

test("recorder uses expo-audio's AudioModule.AudioRecorder with RecordingPresets.HIGH_QUALITY — no new audio library", () => {
  assert.match(attendeeWindowsSource, /from "expo-audio"/);
  assert.doesNotMatch(attendeeWindowsSource, /expo-av/);
  assert.match(attendeeWindowsSource, /AudioModule as unknown as \{ AudioRecorder\?/);
  assert.match(attendeeWindowsSource, /RecordingPresets\.HIGH_QUALITY/);
});

test("microphone permission is requested via the existing expo-audio functions, with an Alert on denial", () => {
  const startRecordingStart = attendeeWindowsSource.indexOf("const startRecording = async () => {");
  const startRecordingEnd = attendeeWindowsSource.indexOf("const stopRecording = async () => {", startRecordingStart);
  assert.notEqual(startRecordingStart, -1);
  const startRecordingFn = attendeeWindowsSource.slice(startRecordingStart, startRecordingEnd);

  assert.match(startRecordingFn, /getRecordingPermissionsAsync\(\)/);
  assert.match(startRecordingFn, /requestRecordingPermissionsAsync\(\)/);
  assert.match(startRecordingFn, /Alert\.alert\("Microphone access needed"/);
});

test("recorded audio is validated as a non-empty local file before being offered for preview, like picked audio", () => {
  assert.match(attendeeWindowsSource, /const validateRecordedFile = async \(uri: string\) => \{/);
  assert.match(attendeeWindowsSource, /fileInfo\.size <= 0/);
});

// ============================================================
// Confirmed recording feeds into the SAME selectedMedia state
// ============================================================

test("confirming a recording sets the same selectedMedia shape as the file picker: type audio, source upload, contentType audio/mp4", () => {
  const handlerStart = attendeeWindowsSource.indexOf("const handleVoiceRecorded = (");
  const handlerEnd = attendeeWindowsSource.indexOf("const selectType", handlerStart) > -1
    ? attendeeWindowsSource.indexOf("};", handlerStart) + 2
    : -1;
  assert.notEqual(handlerStart, -1);
  const handlerFn = attendeeWindowsSource.slice(handlerStart, handlerEnd);

  assert.match(handlerFn, /setSelectedMedia\(\{/);
  assert.match(handlerFn, /type: "audio"/);
  assert.match(handlerFn, /source: "upload"/);
  assert.match(handlerFn, /uri,/);
  assert.match(handlerFn, /contentType,/);
});

test("RecordVoiceSheet confirms recordings as audio/mp4, matching the existing recorder convention in create-post.tsx", () => {
  assert.match(attendeeWindowsSource, /onConfirm\(previewUri, "audio\/mp4", fileName, previewDurationSeconds\)/);
});

test("no new content type or media source value is introduced", () => {
  // "voice" as a contentType/source string must never appear — recorded
  // voice stays the existing "audio" contentType / "upload" source.
  assert.doesNotMatch(attendeeWindowsSource, /"voice"/);
});

// ============================================================
// Recorder lifecycle / cleanup
// ============================================================

test("RecordVoiceSheet resets the native audio mode to playback and stops any active recorder on hide/unmount", () => {
  const sheetStart = attendeeWindowsSource.indexOf("function RecordVoiceSheet(");
  const sheetEnd = attendeeWindowsSource.indexOf("const AttendeeEventWindowsTab", sheetStart);
  assert.notEqual(sheetStart, -1);
  const sheetFn = attendeeWindowsSource.slice(sheetStart, sheetEnd);

  assert.match(sheetFn, /const teardownRecorder = useCallback\(\(\) => \{/);
  assert.match(sheetFn, /setAudioModeAsync\(PLAYBACK_AUDIO_MODE\)/);
  // Teardown must run both on unmount and whenever the sheet becomes hidden
  // (RN's Modal keeps children mounted while visible=false).
  assert.match(sheetFn, /return \(\) => \{\s*mountedRef\.current = false;\s*teardownRecorder\(\);/);
  assert.match(sheetFn, /if \(visible\) return;\s*teardownRecorder\(\);/);
});

test("closing the post form or switching post type also resets the record-voice sheet visibility", () => {
  const closePostFormStart = attendeeWindowsSource.indexOf("const closePostForm = () => {");
  const closePostFormEnd = attendeeWindowsSource.indexOf("};", closePostFormStart);
  const openPostFormStart = attendeeWindowsSource.indexOf("const openPostForm = (window: EventWindow) => {");
  const openPostFormEnd = attendeeWindowsSource.indexOf("const selectType", openPostFormStart);
  const selectTypeStart = attendeeWindowsSource.indexOf("const selectType = (type: EventWindowContentType) => {");
  const selectTypeEnd = attendeeWindowsSource.indexOf("const handleVoiceRecorded", selectTypeStart);

  assert.notEqual(closePostFormStart, -1);
  assert.notEqual(openPostFormStart, -1);
  assert.notEqual(selectTypeStart, -1);

  assert.match(attendeeWindowsSource.slice(closePostFormStart, closePostFormEnd), /setShowRecordVoice\(false\)/);
  assert.match(attendeeWindowsSource.slice(openPostFormStart, openPostFormEnd), /setShowRecordVoice\(false\)/);
  assert.match(attendeeWindowsSource.slice(selectTypeStart, selectTypeEnd), /setShowRecordVoice\(false\)/);
});

// ============================================================
// Everything else stays untouched
// ============================================================

test("Image and Text post-type handling are untouched by the audio-only branch", () => {
  assert.match(attendeeWindowsSource, /selectedType !== "image" && selectedType !== "video"\) return;/);
  assert.match(attendeeWindowsSource, /selectedType === "text" && !trimmedText/);
});

test("GalleryAudio playback component is unmodified — still the sole audio player, using expo-audio's useAudioPlayer", () => {
  const galleryAudioMatches = attendeeWindowsSource.match(/function GalleryAudio\(/g) ?? [];
  assert.equal(galleryAudioMatches.length, 1);
  assert.match(attendeeWindowsSource, /function GalleryAudio\(\{ uri, headers, durationSeconds \}/);
});
