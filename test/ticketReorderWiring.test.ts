import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-014 — Batch 5: ticket-tier reorder wiring. eventDraftStore.ts can't be
// imported directly under this repo's plain `bun test` runner (it
// transitively pulls in react-native), so the store/API wiring here is
// proven via source-text assertions — the pure swap logic itself is proven
// at runtime in ticketReorder.test.ts.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

const store = read("stores/eventDraftStore.ts");
const stepFour = read("app/create-event/step-4.tsx");
const eventsLib = read("lib/events.ts");
const eventTicketPayload = read("lib/eventTicketPayload.ts");

const moveTicketBody = store.match(/moveTicket: async \(localId, direction\) => \{[\s\S]*?\n  \},/)?.[0] ?? "";

// ── store action delegates to the pure helper, never reimplements swap logic

test("moveTicket delegates array-position logic to the pure moveTicketInArray helper", () => {
  assert.match(store, /import \{ moveTicketInArray \} from "@\/lib\/ticketReorder";/);
  assert.match(moveTicketBody, /moveTicketInArray\(tickets, localId, direction\)/);
});

test("moveTicket is a no-op (returns early) when the pure helper reports no change", () => {
  assert.match(moveTicketBody, /if \(nextTickets === tickets\) \{/);
});

// ── draft-only: purely local, no API call ──────────────────────────────────

test("draft reorder (not editing a published event, or no draftId yet) never calls the reorder API", () => {
  const draftBranch = moveTicketBody.match(/if \(!state\.isEditingPublishedEvent \|\| !state\.draftId\) \{[\s\S]*?\n      return;\n    \}/)?.[0] ?? "";
  assert.ok(draftBranch.length > 0, "expected to find the draft-only early-return branch");
  assert.doesNotMatch(draftBranch, /reorderEventTickets/);
});

// ── published: optimistic persist via the dedicated reorder endpoint ───────

test("published reorder calls the dedicated IDs-only reorderEventTickets API, not the general update-event path", () => {
  assert.match(moveTicketBody, /await reorderEventTickets\(draftId, orderedIds\)/);
  assert.doesNotMatch(moveTicketBody, /updateEvent\(/);
});

test("published reorder submits ticket IDs only, never full ticket objects", () => {
  const orderedIdsLine = moveTicketBody.match(/const orderedIds = nextTickets\s*\n\s*\.map\(\(ticket\) => ticket\.id\)/)?.[0];
  assert.ok(orderedIdsLine, "expected orderedIds to be built from ticket.id only");
});

test("reorderEventTickets (lib/events.ts) sends only { ticketIds } to the dedicated reorder route", () => {
  const fn = eventsLib.match(/export const reorderEventTickets = async \([\s\S]*?\n\};/)?.[0] ?? "";
  assert.ok(fn.length > 0, "expected to find reorderEventTickets in lib/events.ts");
  assert.match(fn, /\/tickets\/reorder/);
  assert.match(fn, /\{ ticketIds \}/);
  assert.doesNotMatch(fn, /price|capacity|availableCount|salesEndAt/);
});

// ── failure rollback ─────────────────────────────────────────────────────

test("a failed published reorder rolls back to the pre-move ticket array and rethrows", () => {
  const catchBlock = moveTicketBody.match(/\} catch \(error\) \{[\s\S]*?\n        \}/)?.[0] ?? "";
  assert.ok(catchBlock.length > 0, "expected to find the reorder API catch block");
  assert.match(catchBlock, /set\(\{ tickets \}\);/);
  assert.match(catchBlock, /throw error;/);
});

// ── rapid-action / race protection ──────────────────────────────────────

test("published reorder API calls are serialized through a dedicated queue (no overlapping/out-of-order writes)", () => {
  assert.match(store, /let ticketReorderQueue: Promise<unknown> = Promise\.resolve\(\);/);
  assert.match(moveTicketBody, /ticketReorderQueue\s*\n\s*\.catch\(\(\) => undefined\)/);
  assert.match(moveTicketBody, /ticketReorderQueue = operation;/);
});

test("Step 4 guards the reorder buttons against rapid taps while a published reorder is in flight", () => {
  const handler = stepFour.match(/const handleMoveTicket = async \([\s\S]*?\n  \};/)?.[0] ?? "";
  assert.ok(handler.length > 0, "expected to find handleMoveTicket");
  assert.match(handler, /if \(isReorderInFlight\) return;/);
  assert.match(handler, /setIsReorderInFlight\(true\);/);
  assert.match(handler, /setIsReorderInFlight\(false\);/);
});

// ── UI: disabled-at-boundaries + accessibility, no interference with edit/delete

test("Step 4 disables Move Up on the first ticket and Move Down on the last, and disables both while a reorder is in flight", () => {
  assert.match(stepFour, /disabled={isFirstTicket \|\| isReorderInFlight}/);
  assert.match(stepFour, /disabled={isLastTicket \|\| isReorderInFlight}/);
});

test("Step 4's reorder buttons have descriptive accessibility labels naming the ticket and direction", () => {
  assert.match(stepFour, /accessibilityLabel={`Move \$\{ticketLabel\} up`}/);
  assert.match(stepFour, /accessibilityLabel={`Move \$\{ticketLabel\} down`}/);
});

test("reorder buttons stop propagation so they never trigger the card's own onPress (ticket preview)", () => {
  const reorderColumnMatch = stepFour.match(/<View style={styles\.reorderColumn}>[\s\S]*?<\/View>\s*\n\s*<View style={styles\.ticketTitleContainer}>/)?.[0] ?? "";
  assert.ok(reorderColumnMatch.length > 0, "expected to find the reorder column JSX");
  const stopPropagationCount = (reorderColumnMatch.match(/event\.stopPropagation\(\);/g) ?? []).length;
  assert.equal(stopPropagationCount, 2, "both Move Up and Move Down must stopPropagation");
});

test("Step 4's existing edit and delete buttons are untouched by the reorder addition", () => {
  assert.match(stepFour, /router\.push\(\{ pathname: '\/create-event\/ticket-details', params: \{ localId: ticket\.localId \} \}\);/);
  assert.match(stepFour, /setTicketToDeleteId\(ticket\.localId\);/);
  assert.match(stepFour, /setIsDeleteModalVisible\(true\);/);
});

// ── hydration: server array order preserved, no sort ────────────────────

test("mergeTicketsFromEvent (hydration) preserves the server's tickets array order and never sorts", () => {
  const fn = store.match(/const mergeTicketsFromEvent = \([\s\S]*?\n  \}\);/)?.[0] ?? "";
  assert.ok(fn.length > 0, "expected to find mergeTicketsFromEvent");
  assert.match(fn, /eventTickets\.map\(\(ticket, index\)/);
  assert.doesNotMatch(fn, /\.sort\(/);
});

// ── draft persistence: Save Draft resends the CURRENT (possibly reordered)
//    array order — no separate reorder-only draft path needed ────────────

test("Save Draft / publish payloads are built from the live state.tickets array (in whatever order it currently holds)", () => {
  const buildEventPayloadFn = store.match(/const buildEventPayload = async \([\s\S]*?\n\};/)?.[0] ?? "";
  assert.match(buildEventPayloadFn, /tickets: toEventTicketInputs\(state\.tickets\)/);
});

// ── sanitizer is untouched by the reorder addition ──────────────────────

test("reorder introduces no new field into the ticket write-payload sanitizer", () => {
  assert.doesNotMatch(eventTicketPayload, /order|position|sortIndex|displayOrder/i);
});

test("toEventTicketInput's allowlist is unchanged (name, description, salesEndAt, type, price, capacity, id only)", () => {
  const fn = eventTicketPayload.match(/export const toEventTicketInput = \([\s\S]*?\n\}\);/)?.[0] ?? "";
  assert.ok(fn.length > 0, "expected to find toEventTicketInput");
  assert.match(fn, /ticket\.id !== undefined \? \{ id: ticket\.id \} : \{\}/);
  assert.match(fn, /name: ticket\.name,/);
  assert.match(fn, /description: ticket\.description,/);
  assert.match(fn, /salesEndAt: ticket\.salesEndAt,/);
  assert.match(fn, /type: ticket\.type,/);
  assert.match(fn, /price: ticket\.price,/);
  assert.match(fn, /capacity: ticket\.capacity,/);
  assert.doesNotMatch(fn, /order|position|sortIndex/i);
});
