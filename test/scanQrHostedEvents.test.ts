import assert from "node:assert/strict";
import test from "node:test";
import type { EventResponse } from "../lib/events";
import {
  __resetPendingScannerHostedEventsForTests,
  createInitialHostedEventsSnapshot,
  resolveHostedEventsSnapshot,
  setPendingScannerHostedEvents,
  takePendingScannerHostedEvents,
  toScannerHostedEvents,
  type ScannerHostedEvent,
} from "../lib/scanQrHostedEvents";

const event = (id: string, name: string | null = "Event"): ScannerHostedEvent => ({ id, name });

// ── toScannerHostedEvents: minimum-data mapping ─────────────────────────────

test("toScannerHostedEvents keeps only id and name, dropping every other event field", () => {
  const fullEvents = [
    { id: "evt-1", name: "Launch Night", userId: "host-1", status: "published", privacy: "public" },
    { id: "evt-2", name: null, userId: "host-1", status: "live", privacy: "locked" },
  ] as unknown as EventResponse[];

  const minimal = toScannerHostedEvents(fullEvents);

  assert.deepEqual(minimal, [
    { id: "evt-1", name: "Launch Night" },
    { id: "evt-2", name: null },
  ]);
  for (const item of minimal) {
    assert.deepEqual(Object.keys(item).sort(), ["id", "name"]);
  }
});

// ── createInitialHostedEventsSnapshot: handoff-driven initial state ────────

test("no handoff (direct-link access) starts in loading with no selection", () => {
  assert.deepEqual(createInitialHostedEventsSnapshot(null), {
    status: "loading",
    events: [],
    selectedEventId: "",
  });
});

test("an empty handoff array is treated the same as no handoff", () => {
  assert.deepEqual(createInitialHostedEventsSnapshot([]), {
    status: "loading",
    events: [],
    selectedEventId: "",
  });
});

test("a valid handoff resolves immediately to ready with the first event selected", () => {
  const handoff = [event("evt-1", "Launch Night"), event("evt-2", "Afterparty")];

  assert.deepEqual(createInitialHostedEventsSnapshot(handoff), {
    status: "ready",
    events: handoff,
    selectedEventId: "evt-1",
  });
});

// ── resolveHostedEventsSnapshot: the pure fetch-outcome reducer ────────────

test("a successful fetch with events selects the first event when nothing was selected", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: true, events: [event("evt-1"), event("evt-2")] },
    { events: [], selectedEventId: "", hasLoadedOnce: false },
  );

  assert.deepEqual(next, {
    status: "ready",
    events: [event("evt-1"), event("evt-2")],
    selectedEventId: "evt-1",
  });
});

test("a successful refresh preserves the current selection when it is still present", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: true, events: [event("evt-1"), event("evt-2")] },
    { events: [event("evt-1")], selectedEventId: "evt-2", hasLoadedOnce: true },
  );

  assert.equal(next.selectedEventId, "evt-2");
  assert.equal(next.status, "ready");
});

test("a successful refresh falls back to the first available event when the selection no longer exists", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: true, events: [event("evt-3"), event("evt-4")] },
    { events: [event("evt-1")], selectedEventId: "evt-1", hasLoadedOnce: true },
  );

  assert.equal(next.selectedEventId, "evt-3");
});

test("a successful fetch with a genuinely empty active list clears the selection", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: true, events: [] },
    { events: [event("evt-1")], selectedEventId: "evt-1", hasLoadedOnce: true },
  );

  assert.deepEqual(next, { status: "ready", events: [], selectedEventId: "" });
});

test("a failed fetch with no prior successful load enters the blocking error state", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: false },
    { events: [], selectedEventId: "", hasLoadedOnce: false },
  );

  assert.deepEqual(next, { status: "error", events: [], selectedEventId: "" });
});

test("a failed refresh after valid data was already loaded preserves the existing events and selection", () => {
  const previousEvents = [event("evt-1"), event("evt-2")];
  const next = resolveHostedEventsSnapshot(
    { ok: false },
    { events: previousEvents, selectedEventId: "evt-2", hasLoadedOnce: true },
  );

  assert.deepEqual(next, { status: "ready", events: previousEvents, selectedEventId: "evt-2" });
});

test("a failed refresh never downgrades a successful load into the blocking error message", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: false },
    { events: [event("evt-1")], selectedEventId: "evt-1", hasLoadedOnce: true },
  );

  assert.notEqual(next.status, "error");
});

test("a failed refresh after a genuine empty load stays on the empty state, not the error state", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: false },
    { events: [], selectedEventId: "", hasLoadedOnce: true },
  );

  assert.deepEqual(next, { status: "ready", events: [], selectedEventId: "" });
});

test("retrying after an error with events available restores a selected event", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: true, events: [event("evt-9")] },
    { events: [], selectedEventId: "", hasLoadedOnce: false },
  );

  assert.equal(next.status, "ready");
  assert.equal(next.selectedEventId, "evt-9");
});

test("retrying after an error with a genuine empty result shows the empty state, not another error", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: true, events: [] },
    { events: [], selectedEventId: "", hasLoadedOnce: false },
  );

  assert.deepEqual(next, { status: "ready", events: [], selectedEventId: "" });
});

test("retrying and failing again stays in the error state", () => {
  const next = resolveHostedEventsSnapshot(
    { ok: false },
    { events: [], selectedEventId: "", hasLoadedOnce: false },
  );

  assert.equal(next.status, "error");
});

// ── Handoff singleton: one-time, minimal, non-authoritative transport ──────

test("a pending handoff is consumed exactly once", () => {
  __resetPendingScannerHostedEventsForTests();
  setPendingScannerHostedEvents([event("evt-1")]);

  assert.deepEqual(takePendingScannerHostedEvents(), [event("evt-1")]);
  assert.equal(takePendingScannerHostedEvents(), null);
});

test("no pending handoff returns null", () => {
  __resetPendingScannerHostedEventsForTests();
  assert.equal(takePendingScannerHostedEvents(), null);
});
