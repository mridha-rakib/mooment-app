import assert from "node:assert/strict";
import test from "node:test";
import {
  getTicketSalesEndEventEndError,
  isTicketCreationCutoffReached,
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
