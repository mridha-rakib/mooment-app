import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Batch C — Create Post copy cleanup (Create Hub description/title,
// empty-submit alert, primary submit button). Copy-only; matches this
// repo's source-assertion convention since there is no render harness.

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const addOptionsSource = read("components/modals/AddOptionsModal.tsx");
const createPostSource = read("app/post-screen/create-post.tsx");

// ── §13: Create Hub Post label + description ────────────────────────────

test("Create Hub Post option keeps its correct label and gets the corrected description", () => {
  assert.match(addOptionsSource, /label: "New Post"/);
  assert.match(
    addOptionsSource,
    /description:\s*\n\s*"Share a post with your followers or tag an event you're attending\.",/,
  );
  assert.doesNotMatch(addOptionsSource, /Share one to your followers in just about on event/);
});

test("Create Hub Post option id, route, icon and other options are untouched", () => {
  assert.match(addOptionsSource, /id: "moment",/);
  assert.match(addOptionsSource, /route: "\/post-screen\/create-post",/);
  assert.match(addOptionsSource, /icon: PencilEdit01Icon,/);
  assert.match(addOptionsSource, /label: "New Event"/);
  assert.match(addOptionsSource, /label: "Scan QR"/);
});

// ── §14: Create Hub sheet title ──────────────────────────────────────────

test("Create Hub sheet title is replaced and the old text is gone", () => {
  assert.match(addOptionsSource, /What would you like to create\?/);
  assert.doesNotMatch(addOptionsSource, /Select to proceed/);
});

// ── §15: empty-post validation alert ─────────────────────────────────────

test("the empty-submission alert uses the corrected title and body", () => {
  assert.match(
    createPostSource,
    /Alert\.alert\('Add something to your post', 'Write a caption or add media before posting\.'\);/,
  );
  assert.doesNotMatch(createPostSource, /Create Mooment/);
  assert.doesNotMatch(createPostSource, /Write a stitch or add media before creating a post\./);
});

test("the empty-submission validation condition and control flow are unchanged", () => {
  assert.match(
    createPostSource,
    /if \(!trimmedCaption && selectedImages\.length === 0 && !selectedImage\) \{\s*\n\s*Alert\.alert\('Add something to your post', 'Write a caption or add media before posting\.'\);\s*\n\s*isSubmittingRef\.current = false;\s*\n\s*setIsSubmitting\(false\);\s*\n\s*return false;/,
  );
});

// ── §16: primary submit button ────────────────────────────────────────────

test("the primary submit button now reads Post, still wired to the existing handler", () => {
  // CRT-011: disabled state is now content-aware (isPostButtonDisabled),
  // still onPress={handleDone} and still the exact same "Post" label.
  assert.match(
    createPostSource,
    /<TouchableOpacity style=\{\[styles\.doneBtn, isPostButtonDisabled && styles\.doneBtnDisabled\]\} onPress=\{handleDone\} activeOpacity=\{0\.8\} disabled=\{isPostButtonDisabled\}>\s*\n\s*<Text style=\{styles\.doneBtnText\}>Post<\/Text>/,
  );
  assert.doesNotMatch(createPostSource, /<Text style=\{styles\.doneBtnText\}>Done<\/Text>/);
});

test("internal identifiers for the submit button/flow are not renamed", () => {
  assert.match(createPostSource, /const handleDone = /);
  assert.match(createPostSource, /styles\.doneBtn\b/);
  assert.match(createPostSource, /styles\.doneBtnDisabled\b/);
  assert.match(createPostSource, /doneBtnText: \{/);
  assert.match(createPostSource, /const publishMoment = async \(/);
});

// ── Screen header / caption placeholder / audio copy — must stay as-is ──

test("Create Post header and caption placeholder are unchanged (not violations, out of scope)", () => {
  assert.match(createPostSource, /<Text style=\{styles\.headerTitle\}>Create Post<\/Text>/);
  assert.match(createPostSource, /placeholder="Write your thoughts"/);
});

test("Batch B audio copy is untouched by this batch", () => {
  assert.match(createPostSource, /Record or choose audio for your post\./);
  assert.match(createPostSource, /'Loading audio…'/);
  assert.match(createPostSource, /'Uploading audio…'/);
});

// ── §17: no active generic "moment"/"Mooment" wording in visible strings ──
// Deliberately narrow: only checks literal user-facing string patterns, never
// bare `moment` occurrences, so it can't false-positive on legitimate
// internal identifiers like createMoment / MomentMediaItem / momentPayload.

test("no active user-facing string reintroduces generic Moment/Mooment composer wording", () => {
  const forbiddenUserFacingPhrases = [
    /['"]Create Mooment['"]/,
    /['"]Create Moment['"]/,
    /['"]New Moment['"]/,
    /['"]Select to proceed['"]/,
  ];

  for (const pattern of forbiddenUserFacingPhrases) {
    assert.doesNotMatch(createPostSource, pattern);
    assert.doesNotMatch(addOptionsSource, pattern);
  }
});

// ── §18: internal Moment identifiers must remain exactly as they are ────

test("internal Moment identifiers in create-post.tsx are untouched", () => {
  for (const identifier of [
    "CreateMomentScreen",
    "CreateMomentCloseButton",
    "publishMoment",
    "momentPayload",
    "createMoment",
    "setPendingNewMoment",
    "MomentMediaItem",
    "MomentMediaSource",
    "MomentAudience",
    "CREATE_MOMENT_COLORS",
    "VIDEO_MOMENT_CREATION_ENABLED",
  ]) {
    assert.match(createPostSource, new RegExp(identifier), `${identifier} should still exist`);
  }
});

test("AddOptions internal option id is untouched", () => {
  assert.match(addOptionsSource, /id: "moment",/);
});

// ── §19-23: cross-batch regression proofs (payload/backend untouched) ───

test("Create Post payload construction and backend call sites are untouched", () => {
  assert.match(createPostSource, /const momentPayload = \{/);
  assert.match(
    createPostSource,
    /const newMoment = await createMoment\(\{\s*\n\s*\.\.\.momentPayload,\s*\n\s*mediaItems,\s*\n\s*\}\);/,
  );
  assert.match(createPostSource, /taggedFriendIds: \[\.\.\.new Set\(taggedFriends\.map\(\(friend\) => friend\.id\)\)\]/);
});

test("video remains disabled and Batch B upload-state wiring is untouched", () => {
  assert.match(createPostSource, /const VIDEO_MOMENT_CREATION_ENABLED = false;/);
  assert.match(createPostSource, /const \[isUploadingAudio, setIsUploadingAudio\] = useState\(false\);/);
  assert.match(createPostSource, /const isLocalAudioUpload = type === 'audio';/);
});
