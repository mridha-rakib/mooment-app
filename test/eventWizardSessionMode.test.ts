import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

const storeSource = read("stores/eventDraftStore.ts");
const stepOneSource = read("app/create-event/index.tsx");
const stepTwoSource = read("app/create-event/step-2.tsx");
const stepThreeSource = read("app/create-event/step-3.tsx");
const stepFourSource = read("app/create-event/step-4.tsx");
const stepFiveSource = read("app/create-event/step-5.tsx");

const wizardSteps = [
  { name: "index.tsx (Step 1)", source: stepOneSource },
  { name: "step-2.tsx", source: stepTwoSource },
  { name: "step-3.tsx", source: stepThreeSource },
  { name: "step-4.tsx", source: stepFourSource },
  { name: "step-5.tsx", source: stepFiveSource },
];

// ---------------------------------------------------------------------------
// Store: isExistingEventSession is the sole header-mode source of truth
// ---------------------------------------------------------------------------

test("eventDraftStore declares isExistingEventSession as its own boolean field", () => {
  assert.match(storeSource, /isExistingEventSession: boolean;/);
});

test("createInitialState defaults isExistingEventSession to false, so Start New always resets to Create", () => {
  const initialStateSection = storeSource.slice(
    storeSource.indexOf("const createInitialState = () => {"),
    storeSource.indexOf("const isRemoteUri ="),
  );
  assert.match(initialStateSection, /isExistingEventSession: false,/);
});

test("loadFromEvent sets isExistingEventSession to true unconditionally, not derived from status/draftId", () => {
  const loadFromEventSection = storeSource.slice(
    storeSource.indexOf("loadFromEvent: (event) => {"),
    storeSource.indexOf("discardDraft: async () => {"),
  );
  assert.match(loadFromEventSection, /isExistingEventSession: true,/);
  // Must be a literal true, never gated behind isPersistedEventEditStatus/status,
  // since existing DRAFT edits (status: "draft") must also be Edit sessions.
  assert.doesNotMatch(loadFromEventSection, /isExistingEventSession:\s*isPersistedEventEditStatus/);
});

test("autosave/persistence paths never assign isExistingEventSession, so a fresh Create session can't flip to Edit", () => {
  const saveDraftSection = storeSource.slice(
    storeSource.indexOf("saveDraft: () => {"),
    storeSource.indexOf("publish: async () => {"),
  );
  const publishSection = storeSource.slice(
    storeSource.indexOf("publish: async () => {"),
    storeSource.indexOf("loadFromEvent: (event) => {"),
  );
  const getEventSyncStateSection = storeSource.slice(
    storeSource.indexOf("const getEventSyncState ="),
    storeSource.indexOf("const normalizeForComparison ="),
  );

  for (const [label, section] of [
    ["saveDraft", saveDraftSection],
    ["publish", publishSection],
    ["getEventSyncState", getEventSyncStateSection],
  ] as const) {
    assert.doesNotMatch(
      section,
      /isExistingEventSession/,
      `${label} must not reference isExistingEventSession — autosave/persistence is not a mode change`,
    );
  }
});

test("isEditingPublishedEvent remains untouched and still drives persistence/button behavior (not repurposed)", () => {
  assert.match(storeSource, /isEditingPublishedEvent: boolean;/);
  assert.match(
    storeSource,
    /state\.isEditingPublishedEvent && state\.draftId\s*\n\s*\? await updateEvent/,
  );
});

// ---------------------------------------------------------------------------
// All five wizard steps: header title reads isExistingEventSession, never draftId
// ---------------------------------------------------------------------------

for (const { name, source } of wizardSteps) {
  test(`${name}: header title mode comes from isExistingEventSession, not draftId`, () => {
    assert.match(source, /const isEditingEvent = useEventDraftStore\(\(state\) => state\.isExistingEventSession\);/);
    assert.doesNotMatch(source, /Boolean\(draftId \|\| isEditingPublished\)/);
    assert.doesNotMatch(source, /state\.draftId/);
  });

  test(`${name}: isEditingEvent still only controls the header text, isEditingPublished still controls Save & Exit/Save Changes`, () => {
    assert.match(source, /\{isEditingEvent \? 'Edit Event' : 'Create Event'\}/);
    assert.match(source, /const isEditingPublished = useEventDraftStore\(\(state\) => state\.isEditingPublishedEvent\);/);
  });
}
