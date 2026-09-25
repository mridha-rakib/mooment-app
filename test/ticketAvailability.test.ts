import assert from "node:assert/strict";
import test from "node:test";
import {
  getTicketDeadlineConflicts,
  getTicketDeadlineDependencyMessage,
  getTicketSalesEndEventEndError,
  isTicketCreationCutoffReached,
  TICKET_DEADLINE_DEPENDENCY_MESSAGE,
  TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE,
  TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
} from "../lib/ticketAvailability";

test("ticket creation cutoff is open before the exact 30-minute boundary", () => {
  assert.equal(
    isTicketCreationCutoffReached(
      new Date("2026-07-28T23:00:00.000Z"),
      new Date("2026-07-28T22:29:59.000Z").getTime(),
    ),
    false,
  );
});

test("ticket creation cutoff is reached at the exact 30-minute boundary", () => {
  assert.equal(
    isTicketCreationCutoffReached(
      new Date("2026-07-28T23:00:00.000Z"),
      new Date("2026-07-28T22:30:00.000Z").getTime(),
    ),
    true,
  );
});

test("sales end date after event end date returns the date-specific error", () => {
  const error = getTicketSalesEndEventEndError(
    new Date(2026, 6, 29, 0, 0, 0),
    new Date(2026, 6, 28, 23, 0, 0),
  );

  assert.deepEqual(error, {
    field: "salesEndDate",
    message: TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE,
  });
});

test("sales end time equal to event end time returns the time-specific error", () => {
  const error = getTicketSalesEndEventEndError(
    new Date(2026, 6, 28, 23, 0, 0),
    new Date(2026, 6, 28, 23, 0, 0),
  );

  assert.deepEqual(error, {
    field: "salesEndTime",
    message: TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
  });
});

test("sales end time after event end time on the same date returns the time-specific error", () => {
  const error = getTicketSalesEndEventEndError(
    new Date(2026, 6, 28, 23, 1, 0),
    new Date(2026, 6, 28, 23, 0, 0),
  );

  assert.deepEqual(error, {
    field: "salesEndTime",
    message: TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
  });
});

// ---------------------------------------------------------------------------
// EVT-013 — Batch 2, Part B/G: Event-timezone-aware classification. The
// pass/fail rule is always the absolute instant comparison; a timezone only
// changes which of the two error messages/fields is reported.
// ---------------------------------------------------------------------------

test("valid before-end case (strictly before, instant-based) returns no error regardless of timezone", () => {
  const eventEndAt = new Date("2026-07-28T22:00:00.000Z");
  const salesEndAt = new Date("2026-07-28T21:59:00.000Z");

  assert.equal(getTicketSalesEndEventEndError(salesEndAt, eventEndAt, "America/New_York"), null);
  assert.equal(getTicketSalesEndEventEndError(salesEndAt, eventEndAt, null), null);
});

test("equal instant returns the time-specific error (equality is invalid), using the Event's local day", () => {
  const eventEndAt = new Date("2026-07-28T22:00:00.000Z");
  const salesEndAt = new Date("2026-07-28T22:00:00.000Z");

  const error = getTicketSalesEndEventEndError(salesEndAt, eventEndAt, "America/New_York");

  assert.deepEqual(error, {
    field: "salesEndTime",
    message: TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
  });
});

test("after-end on the same Event-local calendar day returns the time-specific error", () => {
  // 22:30 UTC and 23:00 UTC are both 18:30/19:00 in America/New_York on the
  // same local calendar day (2026-07-28) — same-day violation, "time" error.
  const eventEndAt = new Date("2026-07-28T23:00:00.000Z");
  const salesEndAt = new Date("2026-07-28T23:30:00.000Z");

  const error = getTicketSalesEndEventEndError(salesEndAt, eventEndAt, "America/New_York");

  assert.deepEqual(error, {
    field: "salesEndTime",
    message: TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
  });
});

test("after-end on a DIFFERENT Event-local calendar day returns the date-specific error", () => {
  // Event ends 2026-07-28T23:30:00-04:00 (America/New_York, EDT) i.e. 2026-07-29T03:30:00Z.
  // Ticket sales end 2026-07-29T00:30:00-04:00 i.e. 2026-07-29T04:30:00Z — later
  // instant AND a later New York-local calendar day (07-29 vs 07-28).
  const eventEndAt = new Date("2026-07-29T03:30:00.000Z");
  const salesEndAt = new Date("2026-07-29T04:30:00.000Z");

  const error = getTicketSalesEndEventEndError(salesEndAt, eventEndAt, "America/New_York");

  assert.deepEqual(error, {
    field: "salesEndDate",
    message: TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE,
  });
});

test("classification follows the Event timezone even when it differs from device-local calendar-day framing", () => {
  // eventEndAt 2026-07-28T14:30:00Z is 10:30 EDT (same NY day, 07-28) and
  // 23:30 JST (same Tokyo day, 07-28). salesEndAt one hour later,
  // 2026-07-28T15:30:00Z, is 11:30 EDT — still NY day 07-28 — but 00:30 JST
  // on 2026-07-29 — the NEXT Tokyo day. Same pair of instants, different
  // classification depending on which Event timezone frames it.
  const eventEndAt = new Date("2026-07-28T14:30:00.000Z");
  const salesEndAt = new Date("2026-07-28T15:30:00.000Z");

  const nyError = getTicketSalesEndEventEndError(salesEndAt, eventEndAt, "America/New_York");
  assert.equal(nyError?.field, "salesEndTime");

  const tokyoError = getTicketSalesEndEventEndError(salesEndAt, eventEndAt, "Asia/Tokyo");
  assert.equal(tokyoError?.field, "salesEndDate");
});

test("legacy/null Event timezone falls back to the existing device-local calendar-day classification", () => {
  const eventEndAt = new Date(2026, 6, 28, 23, 0, 0);
  const salesEndAt = new Date(2026, 6, 29, 0, 0, 0);

  const withNullTimeZone = getTicketSalesEndEventEndError(salesEndAt, eventEndAt, null);
  const withNoTimeZoneArg = getTicketSalesEndEventEndError(salesEndAt, eventEndAt);

  assert.deepEqual(withNullTimeZone, {
    field: "salesEndDate",
    message: TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE,
  });
  assert.deepEqual(withNoTimeZoneArg, withNullTimeZone);
});

// ---------------------------------------------------------------------------
// EVT-013 — Batch 2, Part D/F: Event End change dependency detection.
// getTicketDeadlineConflicts must check EVERY tier (not just tickets[0]) and
// never mutate anything — it only reports which tiers would become invalid.
// ---------------------------------------------------------------------------

const generalTicket = { localId: "general", name: "General", salesEndAt: "2026-07-20T20:00:00.000Z" };
const vipTicket = { localId: "vip", name: "VIP", salesEndAt: "2026-07-20T22:00:00.000Z" };

test("Event End changed but all ticket deadlines still valid: no conflicts reported", () => {
  // Event end shortened from 23:00 to 22:30 — both tiers (20:00 and 22:00) remain valid.
  const proposedEndAt = new Date("2026-07-20T22:30:00.000Z");

  const conflicts = getTicketDeadlineConflicts([generalTicket, vipTicket], proposedEndAt);

  assert.deepEqual(conflicts, []);
  assert.equal(getTicketDeadlineDependencyMessage(conflicts), null);
});

test("one ticket becomes invalid: a dependency error is reported for it", () => {
  // Event end shortened to 21:00 — General (20:00) stays valid, VIP (22:00) is now invalid.
  const proposedEndAt = new Date("2026-07-20T21:00:00.000Z");

  const conflicts = getTicketDeadlineConflicts([generalTicket, vipTicket], proposedEndAt);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0]?.ticketName, "VIP");
  assert.equal(getTicketDeadlineDependencyMessage(conflicts), "VIP ticket sales end after the new Event end time.");
});

test("the SECOND of multiple tiers becoming invalid is still detected (not just tickets[0])", () => {
  // General is tickets[0] and stays valid; VIP is tickets[1] and becomes invalid.
  // Confirms the check does not stop after the first tier.
  const proposedEndAt = new Date("2026-07-20T21:30:00.000Z");

  const conflicts = getTicketDeadlineConflicts([generalTicket, vipTicket], proposedEndAt);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0]?.ticketName, "VIP");
});

test("both tiers invalid produces the generic multi-conflict message", () => {
  const proposedEndAt = new Date("2026-07-20T19:00:00.000Z");

  const conflicts = getTicketDeadlineConflicts([generalTicket, vipTicket], proposedEndAt);

  assert.equal(conflicts.length, 2);
  assert.equal(getTicketDeadlineDependencyMessage(conflicts), TICKET_DEADLINE_DEPENDENCY_MESSAGE);
});

test("fixing the invalid tier's salesEndAt clears the dependency error", () => {
  const proposedEndAt = new Date("2026-07-20T21:00:00.000Z");
  const fixedVipTicket = { ...vipTicket, salesEndAt: "2026-07-20T20:30:00.000Z" };

  const conflicts = getTicketDeadlineConflicts([generalTicket, fixedVipTicket], proposedEndAt);

  assert.deepEqual(conflicts, []);
});

test("a ticket with no salesEndAt set never produces a conflict", () => {
  const noDeadlineTicket = { localId: "open", name: "Open", salesEndAt: null };
  const proposedEndAt = new Date("2026-07-20T19:00:00.000Z");

  const conflicts = getTicketDeadlineConflicts([noDeadlineTicket], proposedEndAt);

  assert.deepEqual(conflicts, []);
});

test("no proposed Event End (null) reports no conflicts (nothing to compare against)", () => {
  const conflicts = getTicketDeadlineConflicts([generalTicket, vipTicket], null);

  assert.deepEqual(conflicts, []);
});
