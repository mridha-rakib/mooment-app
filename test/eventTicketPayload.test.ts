import assert from "node:assert/strict";
import test from "node:test";
import { toEventTicketInput } from "../lib/eventTicketPayload";

// Bug: "Unrecognized key(s) in object: 'salesEnded'" on Save Draft. Root
// cause: a server-loaded ticket (EventTicketPayload, which carries the
// response-only/computed `salesEnded` field, and server-owned
// `availableCount`) was spread wholesale into the draft store and then only
// `localId`/`availableCount` were stripped before the write request — never
// `salesEnded` — so it reached the backend's `.strict()` ticket schema and
// was rejected. `toEventTicketInput` is the fix: an explicit allowlist of
// only the fields the write contract actually accepts.

test("payload assertion: strips salesEnded and availableCount, keeps every writable field", () => {
  const input = {
    id: "ticket-1",
    name: "General",
    description: "Standing room",
    salesEndAt: "2026-09-01T00:00:00.000Z",
    type: "free" as const,
    price: 0,
    capacity: 100,
    availableCount: 42,
    salesEnded: false,
  };

  const output = toEventTicketInput(input);

  assert.deepEqual(output, {
    id: "ticket-1",
    name: "General",
    description: "Standing room",
    salesEndAt: "2026-09-01T00:00:00.000Z",
    type: "free",
    price: 0,
    capacity: 100,
  });
  assert.equal("availableCount" in output, false);
  assert.equal("salesEnded" in output, false);
});

test("salesEnded: true is also stripped (not just the false case)", () => {
  const output = toEventTicketInput({
    name: "Early Bird",
    type: "pay",
    price: 25,
    capacity: 50,
    salesEnded: true,
    availableCount: 0,
  } as never);

  assert.equal("salesEnded" in output, false);
  assert.equal("availableCount" in output, false);
});

test("a fresh, never-server-loaded ticket (no salesEnded/availableCount at all) round-trips cleanly", () => {
  const output = toEventTicketInput({
    name: "New Ticket",
    type: "free",
    price: 0,
    capacity: 10,
  } as never);

  assert.deepEqual(output, {
    name: "New Ticket",
    description: undefined,
    salesEndAt: undefined,
    type: "free",
    price: 0,
    capacity: 10,
  });
  assert.equal("id" in output, false);
});

test("a ticket with no id omits the id field entirely (never sends id: undefined as an own key)", () => {
  const output = toEventTicketInput({
    name: "No Id Yet",
    type: "free",
    price: 0,
    capacity: 5,
  } as never);

  assert.equal(Object.prototype.hasOwnProperty.call(output, "id"), false);
});

test("existing ticket id is preserved exactly", () => {
  const output = toEventTicketInput({
    id: "existing-ticket-id",
    name: "VIP",
    type: "pay",
    price: 100,
    capacity: 20,
  } as never);

  assert.equal(output.id, "existing-ticket-id");
});

test("null description/salesEndAt are preserved as null, not dropped", () => {
  const output = toEventTicketInput({
    name: "Ticket",
    description: null,
    salesEndAt: null,
    type: "free",
    price: 0,
    capacity: 1,
  } as never);

  assert.equal(output.description, null);
  assert.equal(output.salesEndAt, null);
});
