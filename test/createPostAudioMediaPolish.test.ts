import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Batch B — professional media preview names + audio copy/state polish in
// Create Post. Matches this repo's established convention (see
// momentVideoUploadFlow.test.ts / peopleTagModalKeyboard.test.ts): there is
// no React Native render/interaction harness, so control-flow and copy are
// verified against the exact component source.
//
// The one exception is the display-name sanitizer itself: it is a small,
// dependency-free pure function (only built-in string/regex operations, no
// React Native / expo imports), so it is extracted from source and executed
// directly for real input -> output coverage rather than only pattern-
// matching the implementation.

const source = readFileSync(
  join(process.cwd(), "app/post-screen/create-post.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

// ── Extract the pure sanitizer helpers and execute them for real ───────

const helperStart = source.indexOf("const MEDIA_DISPLAY_NAME_FALLBACK");
const helperEnd = source.indexOf("const RECORDING_AUDIO_MODE");

assert.ok(helperStart !== -1, "MEDIA_DISPLAY_NAME_FALLBACK should exist");
assert.ok(helperEnd !== -1, "RECORDING_AUDIO_MODE should exist");
assert.ok(helperStart < helperEnd, "helper block should precede RECORDING_AUDIO_MODE");

const helperSource = source.slice(helperStart, helperEnd);

// Minimal TypeScript -> JS stripping for this narrow, self-contained block
// (no generics/interfaces here — only `: type` parameter/return annotations
// and `?:` optional markers) so the real pure function can be executed by
// `new Function` instead of only pattern-matched.
const stripTypeAnnotations = (code: string) => code
  .replace(/(\w+)\?\s*:\s*[^=,()]+(?=[,)=])/g, "$1")
  .replace(/(\w+)\s*:\s*[^=,()]+(?=[,)=])/g, "$1")
  .replace(/\)\s*:\s*[^{=]+=>/g, ") =>");

const executableHelperSource = stripTypeAnnotations(helperSource);

const helperFactory = new Function(`${executableHelperSource}\nreturn { getProfessionalMediaDisplayName };`);
const { getProfessionalMediaDisplayName } = helperFactory() as {
  getProfessionalMediaDisplayName: (rawName?: string | null, fallback?: string) => string;
};

// ── Part A / §29: sanitizer test matrix ─────────────────────────────────

test("useful original filenames are preserved", () => {
  assert.equal(getProfessionalMediaDisplayName("meeting notes.mp3"), "meeting notes.mp3");
  assert.equal(getProfessionalMediaDisplayName("Interview With John.m4a"), "Interview With John.m4a");
  assert.equal(getProfessionalMediaDisplayName("interview-with-john.m4a"), "interview-with-john.m4a");
});

test("whitespace is trimmed and collapsed", () => {
  assert.equal(getProfessionalMediaDisplayName("   demo.wav   "), "demo.wav");
  assert.equal(getProfessionalMediaDisplayName("demo   file.wav"), "demo file.wav");
});

test("a unix path is reduced to its basename", () => {
  assert.equal(getProfessionalMediaDisplayName("/tmp/folder/demo.m4a"), "demo.m4a");
});

test("a windows path is reduced to its basename", () => {
  assert.equal(getProfessionalMediaDisplayName("C:\\Users\\x\\Music\\demo.mp3"), "demo.mp3");
});

test("a backend object-storage path falls back to Audio", () => {
  assert.equal(getProfessionalMediaDisplayName("moments/audio/1728391-abc123.m4a"), "Audio");
  assert.equal(getProfessionalMediaDisplayName("uploads/audio/1728391-abc123.m4a"), "Audio");
});

test("a UUID-only basename falls back to Audio", () => {
  assert.equal(
    getProfessionalMediaDisplayName("550e8400-e29b-41d4-a716-446655440000.m4a"),
    "Audio",
  );
});

test("a timestamp+random-token generated basename falls back to Audio", () => {
  assert.equal(getProfessionalMediaDisplayName("1728391827-2fd91a.m4a"), "Audio");
});

test("a scheme-prefixed URI (content/file/http) never surfaces verbatim and falls back to Audio", () => {
  assert.equal(getProfessionalMediaDisplayName("content://media/external/audio/123"), "Audio");
  assert.equal(getProfessionalMediaDisplayName("file:///data/user/0/app/cache/audio.m4a"), "Audio");
  assert.equal(getProfessionalMediaDisplayName("https://cdn.example.com/x/y/z.mp3"), "Audio");
});

test("an empty or whitespace-only name falls back to Audio", () => {
  assert.equal(getProfessionalMediaDisplayName(""), "Audio");
  assert.equal(getProfessionalMediaDisplayName("   "), "Audio");
  assert.equal(getProfessionalMediaDisplayName(null), "Audio");
  assert.equal(getProfessionalMediaDisplayName(undefined), "Audio");
});

test("a very long filename is bounded without exposing raw path noise", () => {
  const longName = `${"a".repeat(200)}.mp3`;
  const result = getProfessionalMediaDisplayName(longName);

  assert.ok(result.length <= 60, `expected result to be bounded, got length ${result.length}`);
  assert.match(result, /\.mp3$/, "a safe extension should be preserved when truncating");
  assert.doesNotMatch(result, /\//);
});

test("a custom fallback is honored (used for non-audio callers)", () => {
  assert.equal(getProfessionalMediaDisplayName("moments/video/abc.mp4", "Video"), "Video");
});

// ── §30: recorded audio label is untouched (format, not a fixed clock time) ──

test("recorded audio still builds a human 'Recording <time>' label, not a generated filename", () => {
  assert.match(
    source,
    /onRecorded\(\s*\n\s*uri,\s*\n\s*'audio\/mp4',\s*\n\s*`Recording \$\{new Date\(\)\.toLocaleTimeString\(\[\], \{ hour: '2-digit', minute: '2-digit' \}\)\}`,/,
  );
});

test("the recorded-audio label is passed through the sanitizer via handleAudioSelect, not stored verbatim", () => {
  assert.match(
    source,
    /setSelectedMediaName\(getProfessionalMediaDisplayName\(name, 'Audio'\)\);/,
  );
});

// ── §31 / Part E: storage key / URI can never become the visible label ──

test("the visible audio title never falls back to storageKey or a raw uri/selectedImage value", () => {
  assert.doesNotMatch(source, /selectedMediaName\s*\?\?\s*storageKey/);
  assert.doesNotMatch(source, /selectedMediaName\s*\?\?\s*(selectedImage|uri)\b/);
  assert.doesNotMatch(source, /audioAttachmentTitle[\s\S]{0,80}storageKey/);
});

test("storageKey is never referenced inside a <Text> render", () => {
  // storageKey must only ever appear in the upload/payload-building code
  // (buildMediaItem), never inside JSX text content.
  const jsxTextWithStorageKey = source.match(/<Text[^>]*>[^<]*\{[^}]*storageKey[^}]*\}[^<]*<\/Text>/);
  assert.equal(jsxTextWithStorageKey, null);
});

// ── Part B: exact audio helper copy ─────────────────────────────────────

test("the audio sheet subtitle matches the exact target copy", () => {
  assert.match(source, /Record or choose audio for your post\./);
  assert.doesNotMatch(source, /Record or choose audio for your post<\/Text>/);
});

test("core audio control copy is unchanged", () => {
  assert.match(source, /: isRecording \? \(isStoppingRecording \? 'Wait' : 'Stop'\) : isPreparingRecording \? 'Wait' : 'Record'\}/);
  assert.match(source, /isPreviewBusy \? 'Wait' : isPreviewPlaying \? 'Pause' : 'Play'/);
  assert.match(source, /Choose audio file/);
});

// ── §13 / §23: Remove control accessibility ─────────────────────────────

test("the inline audio Remove control has an accessible role and label", () => {
  assert.match(
    source,
    /style=\{styles\.audioRemoveBtn\}\s*\n\s*onPress=\{clearSelectedMedia\}\s*\n\s*activeOpacity=\{0\.8\}\s*\n\s*accessibilityRole="button"\s*\n\s*accessibilityLabel="Remove audio"/,
  );
});

// ── Part C: playback position / duration presentation ───────────────────

test("playback position/duration still comes from useAudioPlayerStatus, not a new manual timer", () => {
  assert.match(source, /useAudioPlayerStatus\(audioPreviewPlayer\)/);
  assert.match(source, /updateInterval: 250/);
  // Pre-existing recording-elapsed timers (video camera + audio recorder) are
  // untouched; this batch must not add a new one for playback position.
  const recordingIntervalMatches = source.match(/setInterval\(/g) ?? [];
  assert.equal(recordingIntervalMatches.length, 2, "no new setInterval should be introduced for playback position");

  const audioPreviewSection = source.slice(
    source.indexOf("const toggleAudioPreview = useCallback"),
    source.indexOf("const handleImageSelect = ("),
  );
  assert.doesNotMatch(audioPreviewSection, /setInterval\(/);
});

test("pause/resume/replay-after-end logic is untouched", () => {
  assert.match(source, /if \(audioPreviewStatus\.playing\) \{\s*\n\s*audioPreviewPlayer\.pause\(\);\s*\n\s*return;\s*\n\s*\}/);
  assert.match(
    source,
    /const isAtEnd = audioPreviewStatus\.didJustFinish\s*\n\s*\|\| \(duration > 0 && audioPreviewStatus\.currentTime >= duration - 0\.25\);/,
  );
  assert.match(source, /if \(isAtEnd\) \{\s*\n\s*await audioPreviewPlayer\.seekTo\(0\);\s*\n\s*\}/);
  assert.match(source, /audioPreviewPlayer\.play\(\);/);
});

test("picked audio no longer shows the raw MIME type as a fake duration/status", () => {
  assert.doesNotMatch(source, /selectedMediaContentType \?\? 'audio'/);
  assert.match(source, /'Loading audio…'/);
});

test("real duration is shown once available, professional loading copy before that", () => {
  // CRT-012: upgraded to show real upload percentage once the transport has
  // reported nonzero progress, but still falls back to the exact original
  // 'Uploading audio…' copy at 0% (upload just started / no progress data
  // yet) — never a fake/estimated percentage.
  assert.match(
    source,
    /\{isUploadingAudio\s*\n\s*\? \(uploadProgress > 0 \? `Uploading audio… \$\{Math\.round\(clampProgress\(uploadProgress\) \* 100\)\}%` : 'Uploading audio…'\)\s*\n\s*: audioPreviewDurationSeconds > 0\s*\n\s*\? formatAudioPreviewTime\(audioPreviewStatus, selectedMediaDurationSeconds\)\s*\n\s*: 'Loading audio…'\}/,
  );
});

// ── Part D: local selection vs actual upload state ───────────────────────

test("choosing/recording audio never sets an uploading state (local selection only)", () => {
  const handleAudioSelectBlock = source.slice(
    source.indexOf("const handleAudioSelect = ("),
    source.indexOf("const clearSelectedMedia = ("),
  );

  assert.doesNotMatch(handleAudioSelectBlock, /setIsUploadingAudio/);
  assert.doesNotMatch(handleAudioSelectBlock, /Uploading/);
});

test("isUploadingAudio is set only around the real audio storage upload, and cleared via finally", () => {
  const buildMediaItemBlock = source.slice(
    source.indexOf("const buildMediaItem = async ("),
    source.indexOf("const buildMediaItems = async ("),
  );

  assert.match(buildMediaItemBlock, /const isLocalAudioUpload = type === 'audio';/);
  assert.match(buildMediaItemBlock, /if \(isLocalAudioUpload\) \{\s*\n\s*setIsUploadingAudio\(true\);\s*\n\s*\}/);
  assert.match(buildMediaItemBlock, /\} finally \{\s*\n\s*if \(isLocalAudioUpload\) \{\s*\n\s*setIsUploadingAudio\(false\);/);

  // The flag must be set after the remote-URI early return and the disabled
  // video guard, i.e. only around real local-file network upload work.
  const remoteReturnIndex = buildMediaItemBlock.indexOf("if (isRemoteUri(uri)) {");
  const videoGuardIndex = buildMediaItemBlock.indexOf("Video posts are temporarily unavailable");
  const flagSetIndex = buildMediaItemBlock.indexOf("setIsUploadingAudio(true)");

  assert.ok(remoteReturnIndex !== -1 && videoGuardIndex !== -1 && flagSetIndex !== -1);
  assert.ok(remoteReturnIndex < flagSetIndex && videoGuardIndex < flagSetIndex);
});

test("isUploadingAudio does not gate or replace the existing submit lock", () => {
  assert.match(source, /const \[isSubmitting, setIsSubmitting\] = useState\(false\);/);
  assert.match(source, /const \[isUploadingAudio, setIsUploadingAudio\] = useState\(false\);/);
  assert.doesNotMatch(source, /isUploadingAudio[\s\S]{0,40}isSubmittingRef/);
});

// ── Part G: regression safety proofs ─────────────────────────────────────

test("CRT-004 event/publish fields are untouched by this batch", () => {
  for (const field of [
    "selectedEventId",
    "selectedEvent",
    "selectedEventCode",
    "momentPayload",
  ]) {
    assert.match(source, new RegExp(field));
  }
  // No new field renames these away.
  assert.match(source, /const momentPayload = \{/);
});

test("video creation remains disabled and untouched", () => {
  assert.match(source, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
});

test("Create Post payload construction (taggedFriends/taggedFriendIds) is untouched", () => {
  assert.match(source, /taggedPeople: taggedFriends\.map\(\(friend\) => friend\.name\)/);
  assert.match(source, /taggedFriendIds: \[\.\.\.new Set\(taggedFriends\.map\(\(friend\) => friend\.id\)\)\]/);
});
