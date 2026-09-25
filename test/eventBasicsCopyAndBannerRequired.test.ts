import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-004 (Basics copy cleanup) + narrow EVT-005 (banner required for Save
// Draft, invalid-selection preservation) source-level checks against the
// active Create/Edit Event Basics screen. This screen can't be mounted under
// the plain `bun test` runner (no RN component harness in this repo — see the
// other event*.test.ts files), so these are source-text guards, not runtime
// proof of on-screen behavior; app/test/eventBanner.test.ts covers the pure
// validation/consistency logic at runtime instead.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const basicsSource = read("app/create-event/index.tsx");

// ── EVT-004: required copy is present on the active Basics screen ──────────

test("EVT-004: Event name placeholder is present", () => {
  assert.match(basicsSource, /placeholder="Event name"/);
});

test("EVT-004: description placeholder reads 'Tell people what to expect'", () => {
  assert.match(basicsSource, /placeholder="Tell people what to expect"/);
});

test("EVT-004: banner helper copy is the single concise sentence", () => {
  assert.match(basicsSource, /Upload one event banner image - JPEG or PNG\./);
});

// ── EVT-004: legacy copy is gone from the active Basics screen ─────────────

test("EVT-004: legacy 'Event main highlights' placeholder is gone", () => {
  assert.doesNotMatch(basicsSource, /Event main highlights/);
});

test("EVT-004: legacy 'JPEG, or PNG' split hint is gone", () => {
  assert.doesNotMatch(basicsSource, /JPEG, or PNG/);
});

// ── EVT-005 (narrow): banner required for Save Draft ────────────────────────

test("EVT-005: Save Draft blocks and does not call saveDraft() when there is no banner", () => {
  const handler = basicsSource.slice(
    basicsSource.indexOf("const handleSaveDraft = async () => {"),
    basicsSource.indexOf("const handleNextDraftSaveError"),
  );

  assert.match(handler, /if \(!bannerImage\) \{/);
  // The early-return guard must come before persistStepOne()/saveDraft() are
  // reached — i.e. the guard's `return` textually precedes both calls.
  const guardReturnIndex = handler.indexOf("return;");
  const persistIndex = handler.indexOf("persistStepOne()");
  const saveDraftCallIndex = handler.indexOf("await saveDraft()");

  assert.ok(guardReturnIndex >= 0 && persistIndex > guardReturnIndex, "guard must precede persistStepOne()");
  assert.ok(saveDraftCallIndex > persistIndex, "saveDraft() must only run after the guard/persist");
});

test("EVT-005: removing the banner also clears the tracked content type", () => {
  const removeImage = basicsSource.slice(
    basicsSource.indexOf("const removeImage = () => {"),
    basicsSource.indexOf("const persistStepOne"),
  );

  assert.match(removeImage, /setBannerImage\(null\)/);
  assert.match(removeImage, /setBannerOriginalImage\(null\)/);
  assert.match(removeImage, /setBannerContentType\(null\)/);
});

test("EVT-005: an invalid replacement is rejected before any banner state changes", () => {
  const pickImage = basicsSource.slice(
    basicsSource.indexOf("const pickImage = async () => {"),
    basicsSource.indexOf("const removeImage"),
  );
  const rejectionIndex = pickImage.indexOf("if (rejectionReason)");
  const setBannerIndex = pickImage.indexOf("setBannerImage(asset.uri)");

  assert.ok(rejectionIndex >= 0, "pickImage must check for a rejection reason");
  assert.ok(setBannerIndex > rejectionIndex, "state must not be mutated until after the rejection check");
  assert.match(pickImage, /return;/);
});

test("EVT-005: the wizard's own banner-required validation schema is unchanged (still required)", () => {
  assert.match(basicsSource, /bannerImageUri: requiredText\('Banner image', 300\)/);
});

test("EVT-005: draft reopen does not silently drop crop/display metadata", () => {
  const draftStoreSource = read("stores/eventDraftStore.ts");
  const setStepOne = draftStoreSource.slice(
    draftStoreSource.indexOf("setStepOne: ({"),
    draftStoreSource.indexOf("setStepTwo: ({"),
  );

  // Crop metadata is only reset when the banner URI actually changes (or the
  // caller explicitly supplies a new value) — not on every save/navigation.
  assert.match(setStepOne, /bannerImageDisplay !== undefined/);
  assert.match(setStepOne, /state\.bannerImageDisplay/);
});
