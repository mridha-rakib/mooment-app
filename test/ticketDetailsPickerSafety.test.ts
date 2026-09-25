import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-013 — Batch 2, Part C (tests 22-23): the ticket sales-end date/time
// pickers must keep their maximumDate bound AND keep the post-selection
// validator, since native picker maximumDate behavior for a "time" mode
// picker differs by platform and can still allow an equal-to-event-end
// selection. The instant-based equality-is-invalid rule itself is proven at
// the pure-function level in ticketAvailability.test.ts
// ("equal instant returns the time-specific error").

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

const ticketDetails = read("app/create-event/ticket-details.tsx");

test("EVT-013: maximumSalesEndAt remains tied to the Event end date", () => {
  assert.match(
    ticketDetails,
    /const maximumSalesEndAt = eventEndDate && eventEndDate >= new Date\(\) \? eventEndDate : null;/,
  );
});

test("EVT-013: both the sales-end date picker and time picker are wired to maximumSalesEndAt", () => {
  const matches = ticketDetails.match(/maximumDate={maximumSalesEndAt \?\? undefined}/g) ?? [];
  assert.equal(matches.length, 2, "expected both the date-mode and time-mode pickers to use maximumSalesEndAt");
});

test("EVT-013: the post-selection validator still runs on submit, not relying only on the native picker constraint", () => {
  const submitTicketMatch = ticketDetails.match(/const submitTicket = async \(\)[\s\S]*?\n  \};\n/);
  assert.ok(submitTicketMatch, "expected to find the submitTicket function body");
  const body = submitTicketMatch![0];

  assert.match(body, /getTicketSalesEndEventEndError\(salesEndAt, eventEndDate, eventTimeZone\)/);
});

test("EVT-013: the Event's timezone is threaded into the post-selection validator (Part B wiring)", () => {
  assert.match(ticketDetails, /const eventTimeZone = useEventDraftStore\(\(state\) => state\.timezone\);/);
});
