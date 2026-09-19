import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Bug fix wiring — confirms every ticket write path in eventDraftStore.ts
// routes through the new allowlist sanitizer (toEventTicketInput) instead of
// the old exclusion-list destructure that let `salesEnded` leak through. The
// store itself can't be imported at runtime under `bun test` (it pulls in
// @/lib/events -> @/lib/api -> react-native), so this is a source-text guard,
// matching this repo's established convention; app/test/eventTicketPayload.test.ts
// covers the actual sanitizer logic at runtime.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const draftStoreSource = read("stores/eventDraftStore.ts");
const eventsLibSource = read("lib/events.ts");

test("eventDraftStore imports the allowlist sanitizer from eventTicketPayload.ts", () => {
  assert.match(draftStoreSource, /import \{ toEventTicketInput \} from "@\/lib\/eventTicketPayload";/);
});

test("the old exclusion-list ticket stripper is gone (it's what let salesEnded through)", () => {
  assert.doesNotMatch(draftStoreSource, /availableCount: _availableCount/);
  assert.doesNotMatch(draftStoreSource, /stripLocalTicketField/);
});

test("Save Draft's outbound ticket array is built via the allowlist sanitizer", () => {
  const buildEventPayload = draftStoreSource.slice(
    draftStoreSource.indexOf("const buildEventPayload"),
  );
  assert.match(buildEventPayload, /tickets: toEventTicketInputs\(state\.tickets\)/);
});

test("publish()'s outbound ticket array is built via the allowlist sanitizer", () => {
  const publishFn = draftStoreSource.slice(
    draftStoreSource.indexOf("publish: async () => {"),
    draftStoreSource.indexOf("loadFromEvent: (event) => {"),
  );
  assert.match(publishFn, /tickets: toEventTicketInputs\(state\.tickets\)/);
});

test("per-ticket create/update (saveTicket) routes through the allowlist sanitizer, both for published-event and draft ticket writes", () => {
  const saveTicketFn = draftStoreSource.slice(
    draftStoreSource.indexOf("saveTicket: async (ticket) => {"),
    draftStoreSource.indexOf("removeTicket: async"),
  );
  const occurrences = saveTicketFn.match(/toEventTicketInput\(nextTicket\)/g) ?? [];

  assert.equal(occurrences.length, 2, "expected both the published-event and draft ticket branches to sanitize the ticket");
});

test("the baseline comparison payload (draft-vs-published no-op check) also excludes salesEnded/availableCount", () => {
  assert.match(draftStoreSource, /tickets: toEventTicketInputs\(state\.tickets\),/);
  assert.match(draftStoreSource, /tickets: toEventTicketInputs\(mergeTicketsFromEvent\(event\.tickets, \[\]\)\),/);
});

test("EventTicketRequestPayload (the write-model type) explicitly excludes both server-owned fields", () => {
  assert.match(
    eventsLibSource,
    /export type EventTicketRequestPayload = Omit<EventTicketPayload, "availableCount" \| "salesEnded">;/,
  );
});

test("salesEnded is documented as response-only/server-derived on the response type (not silently ambiguous)", () => {
  const responseType = eventsLibSource.slice(
    eventsLibSource.indexOf("export type EventTicketPayload = {"),
    eventsLibSource.indexOf("export type EventTicketRequestPayload"),
  );
  assert.match(responseType, /Response-only, server-derived/);
});
