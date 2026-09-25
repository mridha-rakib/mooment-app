import assert from "node:assert/strict";
import test from "node:test";
import { moveTicketInArray } from "../lib/ticketReorder";

// EVT-014 — Batch 5, Part N: pure array-position reorder. This is a real
// runtime unit test (not a source-scan) since moveTicketInArray has zero
// dependencies and can be imported directly, unlike eventDraftStore.ts
// itself (which transitively pulls in react-native and can't be imported
// under this repo's plain `bun test` runner).

const A = { localId: "a", name: "General", price: 10, capacity: 100, id: "id-a" };
const B = { localId: "b", name: "VIP", price: 50, capacity: 20, id: "id-b" };
const C = { localId: "c", name: "Early Bird", price: 0, capacity: 30, id: "id-c" };

test("1: [A, B, C] move B up -> [B, A, C]", () => {
  const result = moveTicketInArray([A, B, C], "b", "up");
  assert.deepEqual(result.map((t) => t.localId), ["b", "a", "c"]);
});

test("2: move B down (from [B, A, C]) returns to original order", () => {
  const afterUp = moveTicketInArray([A, B, C], "b", "up");
  const afterDown = moveTicketInArray(afterUp, "b", "down");
  assert.deepEqual(afterDown.map((t) => t.localId), ["a", "b", "c"]);
});

test("3: the first item's Move Up is a no-op (returns the SAME array reference)", () => {
  const input = [A, B, C];
  const result = moveTicketInArray(input, "a", "up");
  assert.equal(result, input);
  assert.deepEqual(result.map((t) => t.localId), ["a", "b", "c"]);
});

test("4: the last item's Move Down is a no-op", () => {
  const input = [A, B, C];
  const result = moveTicketInArray(input, "c", "down");
  assert.equal(result, input);
  assert.deepEqual(result.map((t) => t.localId), ["a", "b", "c"]);
});

test("5: reordering preserves each ticket object's data untouched", () => {
  const result = moveTicketInArray([A, B, C], "c", "up");
  const byId = new Map(result.map((t) => [t.localId, t]));

  // Same object references — not just equal values — proving no field was
  // reconstructed or mutated during reorder.
  assert.equal(byId.get("a"), A);
  assert.equal(byId.get("b"), B);
  assert.equal(byId.get("c"), C);
});

test("6: no duplicate ticket is created by a reorder", () => {
  const result = moveTicketInArray([A, B, C], "b", "down");
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map((t) => t.localId)).size, 3);
});

test("7: no ticket is removed by a reorder", () => {
  const result = moveTicketInArray([A, B, C], "a", "down");
  assert.deepEqual(new Set(result.map((t) => t.localId)), new Set(["a", "b", "c"]));
});

test("8: ticket localIds/backend ids are unchanged by a reorder", () => {
  const result = moveTicketInArray([A, B, C], "c", "up");
  for (const ticket of result) {
    const original = [A, B, C].find((t) => t.localId === ticket.localId)!;
    assert.equal(ticket.localId, original.localId);
    assert.equal(ticket.id, original.id);
  }
});

test("moving the middle item up then down returns to the exact original array order", () => {
  const start = [A, B, C];
  const up = moveTicketInArray(start, "b", "up");
  const down = moveTicketInArray(up, "b", "down");
  assert.deepEqual(down.map((t) => t.localId), start.map((t) => t.localId));
});

test("an unknown localId is a no-op (returns the same reference)", () => {
  const input = [A, B, C];
  const result = moveTicketInArray(input, "does-not-exist", "up");
  assert.equal(result, input);
});

test("moving C up twice in sequence: [A, B, C] -> [A, C, B] -> [C, A, B]", () => {
  const once = moveTicketInArray([A, B, C], "c", "up");
  assert.deepEqual(once.map((t) => t.localId), ["a", "c", "b"]);

  const twice = moveTicketInArray(once, "c", "up");
  assert.deepEqual(twice.map((t) => t.localId), ["c", "a", "b"]);
});
