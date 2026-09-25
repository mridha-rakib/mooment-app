import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-015 — Batch 4: "Ticket created" confirmation with "Create another
// ticket" / "Continue". None of these screens can be mounted under this
// repo's plain `bun test` runner (no RN component harness — see the note at
// the top of eventStepNavigatorWiring.test.ts; eventDraftStore.ts itself
// can't even be imported directly here since it transitively pulls in
// react-native), so these are source-text wiring guards, the strongest
// regression proof available in this environment.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

const ticketDetails = read("app/create-event/ticket-details.tsx");
const stepFour = read("app/create-event/step-4.tsx");
const store = read("stores/eventDraftStore.ts");
const modal = read("components/ui/TicketCreatedModal.tsx");

const submitTicketBody = ticketDetails.match(/const submitTicket = async \(\)[\s\S]*?\n  \};\n/)?.[0] ?? "";
const successBlock = submitTicketBody.match(/if \(isEditingTicket\) \{[\s\S]*?\n      \}\n      router\.back\(\);/)?.[0] ?? "";
const catchBlock = submitTicketBody.match(/\} catch \(error\) \{[\s\S]*?\n    \} finally \{/)?.[0] ?? "";

// ── 1: successful NEW ticket creation produces the one-time signal ────────

test("EVT-015: a successful NEW ticket save calls markTicketCreated with the ticket's localId", () => {
  assert.ok(successBlock.length > 0, "expected to find the post-saveTicket success block");
  const elseBranch = successBlock.match(/\} else \{[\s\S]*?\n      \}/)?.[0] ?? "";
  assert.match(elseBranch, /markTicketCreated\(ticketLocalIdRef\.current\)/);
});

// ── 2/8/16: editing an existing ticket does NOT produce the signal ─────────

test("EVT-015: editing an existing ticket calls notifySuccess('Ticket updated') and never markTicketCreated", () => {
  const ifBranch = successBlock.match(/if \(isEditingTicket\) \{[\s\S]*?\n      \} else/)?.[0] ?? "";
  assert.match(ifBranch, /notifySuccess\('Ticket updated'\)/);
  assert.doesNotMatch(ifBranch, /markTicketCreated/);
});

// ── 3: save failure does NOT produce the signal ────────────────────────────

test("EVT-015: the failure (catch) path never calls markTicketCreated, navigates back, or shows the created toast", () => {
  assert.ok(catchBlock.length > 0, "expected to find the submitTicket catch block");
  assert.doesNotMatch(catchBlock, /markTicketCreated/);
  assert.doesNotMatch(catchBlock, /router\.back/);
  assert.doesNotMatch(catchBlock, /notifySuccess/);
  assert.match(catchBlock, /setErrors\(parseBackendTicketErrors\(error\)\)/);
});

// ── 4: Step 4 shows "Ticket created" / "Create another ticket" / "Continue"

test("EVT-015: the confirmation modal renders the exact required copy", () => {
  assert.match(modal, /Ticket created/);
  assert.match(modal, /Create another ticket/);
  assert.match(modal, />Continue</);
});

test("EVT-015: Step 4 renders TicketCreatedModal wired to the local visibility state and both handlers", () => {
  assert.match(stepFour, /import TicketCreatedModal from '\.\.\/\.\.\/components\/ui\/TicketCreatedModal';/);
  assert.match(stepFour, /<TicketCreatedModal\s+visible={isTicketCreatedModalVisible}\s+onCreateAnother={handleCreateAnotherTicket}\s+onContinue={handleContinueFromTicketCreated}\s+\/>/);
});

// ── 5: the newly-created ticket is already in the tickets array (unchanged
//      optimistic-update architecture) before/when the confirmation shows ──

test("EVT-015: saveTicket's existing optimistic update (set tickets before the API call) is untouched", () => {
  const saveTicketBody = store.match(/saveTicket: async \(ticket\)[\s\S]*?\n  \},/)?.[0] ?? "";
  assert.ok(saveTicketBody.length > 0, "expected to find the saveTicket action body");

  const setBeforeTry = saveTicketBody.split("try {")[0] ?? "";
  assert.match(setBeforeTry, /set\(\{ tickets: nextTickets \}\);/);
});

test("EVT-015: Step 4 still reads the live tickets array straight from the store (no refetch requirement added)", () => {
  assert.match(stepFour, /const tickets = useEventDraftStore\(\(state\) => state\.tickets\);/);
  assert.doesNotMatch(stepFour, /refetch|fetchEvent\(/);
});

// ── 6: Create another ticket opens a fresh form, no localId, no cloning ────

test("EVT-015: navigateToCreateTicket pushes ticket-details with no params, and is shared by the main button and Create-another", () => {
  const matches = stepFour.match(/router\.push\('\/create-event\/ticket-details'\);/g) ?? [];
  assert.equal(matches.length, 1, "expected exactly one bare ticket-details push call, reused by both callers");
  assert.match(stepFour, /onPress={navigateToCreateTicket}/);
  assert.match(stepFour, /const handleCreateAnotherTicket = \(\) => \{[\s\S]*?navigateToCreateTicket\(\);\s*\n  \};/);
});

test("EVT-015: Create another ticket does not carry a localId param (no cloning of the prior ticket)", () => {
  const navigateBody = stepFour.match(/const navigateToCreateTicket = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  assert.doesNotMatch(navigateBody, /localId/);
});

// ── 7: Continue reuses the existing next-step handler ──────────────────────

test("EVT-015: Continue dismisses the modal and calls the existing handleNext (no duplicate navigation path)", () => {
  const continueHandler = stepFour.match(/const handleContinueFromTicketCreated = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  assert.ok(continueHandler.length > 0, "expected to find handleContinueFromTicketCreated");
  assert.match(continueHandler, /dismissTicketCreatedModal\(\);/);
  assert.match(continueHandler, /void handleNext\(\);/);
  assert.doesNotMatch(continueHandler, /router\.push\('\/create-event\/step-5'\)/, "must not hardcode a duplicate step-5 navigation");
});

test("EVT-015: handleNext (reused by Continue) still targets step-5 exactly as before", () => {
  const handleNextBody = stepFour.match(/const handleNext = async \(\)[\s\S]*?\n  \};\n/)?.[0] ?? "";
  const pushes = handleNextBody.match(/router\.push\('\/create-event\/step-5'\);/g) ?? [];
  assert.equal(pushes.length, 2, "expected the two existing step-5 pushes (new-draft fire-and-forget path + editing-published awaited path) to remain unchanged");
});

// ── 9: confirmation is not shown after delete ──────────────────────────────

test("EVT-015: deleting a ticket never touches the ticket-created confirmation state", () => {
  const deleteHandler = stepFour.match(/const handleDeleteTicket = async \(\)[\s\S]*?\n  \};/)?.[0] ?? "";
  assert.ok(deleteHandler.length > 0, "expected to find handleDeleteTicket");
  assert.doesNotMatch(deleteHandler, /TicketCreatedModal|markTicketCreated|IsTicketCreatedModalVisible/);
});

// ── 10: confirmation does not retrigger after dismissal ────────────────────

test("EVT-015: the signal is consumed via a non-reactive getState() read inside useFocusEffect and cleared immediately", () => {
  const focusEffect = stepFour.match(/useFocusEffect\(\s*React\.useCallback\(\(\) => \{[\s\S]*?\n    \}, \[\]\),\s*\n  \);/)?.[0] ?? "";
  assert.ok(focusEffect.length > 0, "expected to find the useFocusEffect block");
  assert.match(focusEffect, /useEventDraftStore\.getState\(\)/);
  assert.match(focusEffect, /clearNewlyCreatedTicketSignal\(\);/);
  // Order matters: the signal must be cleared in the SAME pass that shows the
  // modal, not deferred to a later render or to dismissal.
  const showIndex = focusEffect.indexOf("setIsTicketCreatedModalVisible(true)");
  const clearIndex = focusEffect.indexOf("clearNewlyCreatedTicketSignal()");
  assert.ok(showIndex > -1 && clearIndex > -1 && clearIndex > showIndex);
});

test("EVT-015: dismissing the modal (Continue/Create another) only ever sets local state to false, never re-arms the store signal", () => {
  assert.match(stepFour, /const dismissTicketCreatedModal = \(\) => \{\s*setIsTicketCreatedModalVisible\(false\);\s*\};/);
});

// ── 11/12: rapid double-tap protection on both confirmation actions ────────

test("EVT-015: a single confirmationActionTakenRef guards both Create-another and Continue against rapid double taps", () => {
  const createAnother = stepFour.match(/const handleCreateAnotherTicket = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";
  const continueHandler = stepFour.match(/const handleContinueFromTicketCreated = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";

  for (const handler of [createAnother, continueHandler]) {
    assert.match(handler, /if \(confirmationActionTakenRef\.current\) return;/);
    assert.match(handler, /confirmationActionTakenRef\.current = true;/);
  }
});

test("EVT-015: the guard is reset fresh each time a NEW confirmation is shown", () => {
  const focusEffect = stepFour.match(/useFocusEffect\(\s*React\.useCallback\(\(\) => \{[\s\S]*?\n    \}, \[\]\),\s*\n  \);/)?.[0] ?? "";
  assert.match(focusEffect, /confirmationActionTakenRef\.current = false;/);
});

// ── 13/14: existing ticket-submit protections remain intact ────────────────

test("EVT-015: ticketSubmitInFlightRef and isSaving disable protections are untouched", () => {
  assert.match(ticketDetails, /const ticketSubmitInFlightRef = useRef\(false\);/);
  assert.match(ticketDetails, /if \(isSaving \|\| ticketSubmitInFlightRef\.current\) \{\s*return;\s*\}/);
  assert.match(ticketDetails, /disabled={isSaving}/);
});

// ── 15: existing failure rollback in the store is untouched ────────────────

test("EVT-015: saveTicket's existing rollback-on-failure behavior is untouched", () => {
  const saveTicketBody = store.match(/saveTicket: async \(ticket\)[\s\S]*?\n  \},/)?.[0] ?? "";
  const catchInStore = saveTicketBody.match(/\} catch \(error\) \{[\s\S]*?\n    \}/)?.[0] ?? "";
  assert.match(catchInStore, /set\(\{ tickets: previousTickets \}\);/);
  assert.match(catchInStore, /throw error;/);
});

// ── 17: the existing Step 4 "Create Ticket" button still works normally ────

test("EVT-015: the main Create Ticket button is unchanged apart from reusing the shared navigation handler", () => {
  assert.match(stepFour, /style={\[\s*styles\.createTicketButton,/);
  assert.match(stepFour, /onPress={navigateToCreateTicket}\s*\n\s*disabled={ticketCreationCutoffReached}/);
});

// ── ephemeral signal is never persisted/sent to the API ────────────────────

test("EVT-015: newlyCreatedTicketLocalId is reset on resetDraft/startCreateSession via the shared initial-state factory (never leaks across sessions)", () => {
  assert.match(store, /newlyCreatedTicketLocalId: null,/);
});

test("EVT-015: the ticket write-payload builder does not reference the ephemeral signal (never sent to the API)", () => {
  const eventTicketPayload = read("lib/eventTicketPayload.ts");
  assert.doesNotMatch(eventTicketPayload, /newlyCreatedTicketLocalId/);
});
