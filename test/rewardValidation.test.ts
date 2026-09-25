import assert from "node:assert/strict";
import test from "node:test";
import {
  getRewardTicketSalesEndError,
  REWARD_END_DATE_AFTER_TICKET_SALES_END_MESSAGE,
  REWARD_END_TIME_AFTER_TICKET_SALES_END_MESSAGE,
} from "../lib/rewardValidation";

test("reward expiry before ticket sales end is accepted", () => {
  const error = getRewardTicketSalesEndError(
    new Date(2026, 6, 29, 6, 30, 0),
    new Date(2026, 6, 29, 7, 5, 0),
  );

  assert.equal(error, null);
});

test("reward expiry exactly equal to ticket sales end is accepted", () => {
  const salesEndAt = new Date(2026, 6, 29, 7, 5, 0);
  const error = getRewardTicketSalesEndError(salesEndAt, salesEndAt);

  assert.equal(error, null);
});

test("reward expiry on an earlier calendar date is accepted", () => {
  const error = getRewardTicketSalesEndError(
    new Date(2026, 6, 28, 23, 30, 0),
    new Date(2026, 6, 29, 7, 5, 0),
  );

  assert.equal(error, null);
});

test("reward expiry on a later calendar date returns the date-specific error", () => {
  const error = getRewardTicketSalesEndError(
    new Date(2026, 6, 30, 1, 0, 0),
    new Date(2026, 6, 29, 7, 5, 0),
  );

  assert.deepEqual(error, {
    field: "endDate",
    message: REWARD_END_DATE_AFTER_TICKET_SALES_END_MESSAGE,
  });
});

test("same-date reward expiry after ticket sales end returns the time-specific error", () => {
  const error = getRewardTicketSalesEndError(
    new Date(2026, 6, 29, 7, 6, 0),
    new Date(2026, 6, 29, 7, 5, 0),
  );

  assert.deepEqual(error, {
    field: "endTime",
    message: REWARD_END_TIME_AFTER_TICKET_SALES_END_MESSAGE,
  });
});

test("missing or invalid ticket sales end does not create a ticket-bound error", () => {
  assert.equal(getRewardTicketSalesEndError(new Date(2026, 6, 29, 7, 6, 0), null), null);
  assert.equal(getRewardTicketSalesEndError(new Date(2026, 6, 29, 7, 6, 0), "not-a-date"), null);
});
