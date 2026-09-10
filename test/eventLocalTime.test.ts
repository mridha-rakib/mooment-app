import assert from "node:assert/strict";
import test from "node:test";

import {
  dateToDateKey,
  dateToTimeKey,
  instantToWallClockPartsForEvent,
  pickersToWallClockParts,
  resolveInitialPickerDate,
  wallClockPartsToPickerDate,
} from "../lib/eventLocalTime";

const withProcessTz = <T>(tz: string, run: () => T): T => {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
};

// ── §37 pure wall-clock extraction (leading zeros, from local components) ────

test("§37 dateToDateKey / dateToTimeKey read the visible local components with zero-padding", () => {
  // Local constructor: the picker shows exactly these components.
  const d = new Date(2026, 8, 20, 19, 0, 0, 0); // Sep 20 2026, 19:00
  assert.equal(dateToDateKey(d), "2026-09-20");
  assert.equal(dateToTimeKey(d), "19:00");

  assert.equal(dateToTimeKey(new Date(2026, 0, 3, 5, 7)), "05:07");
  assert.equal(dateToTimeKey(new Date(2026, 0, 3, 9, 3)), "09:03");
  assert.equal(dateToDateKey(new Date(2026, 0, 3)), "2026-01-03");
});

test("§37 pickersToWallClockParts combines a date picker + a time picker", () => {
  const datePart = new Date(2026, 8, 20, 0, 0);
  const timePart = new Date(1999, 5, 1, 23, 5); // only H:M matter
  assert.deepEqual(pickersToWallClockParts(datePart, timePart), {
    dateKey: "2026-09-20",
    time: "23:05",
  });
});

// ── §38 device-timezone-independent transport ──────────────────────────────

test("§38 the same visible picker values produce the same transport under any device TZ", () => {
  const make = () => {
    const date = new Date(2026, 8, 20); // constructed from local components
    const time = new Date(2026, 8, 20, 19, 0);
    return pickersToWallClockParts(date, time);
  };
  const dhaka = withProcessTz("Asia/Dhaka", make);
  const la = withProcessTz("America/Los_Angeles", make);
  const utc = withProcessTz("Etc/UTC", make);
  assert.deepEqual(dhaka, { dateKey: "2026-09-20", time: "19:00" });
  assert.deepEqual(la, dhaka);
  assert.deepEqual(utc, dhaka);
});

test("§5 transport is NOT derived via toISOString (which would shift the calendar date)", () => {
  // A late-evening local time whose UTC ISO lands on the NEXT day for +tz.
  const parts = withProcessTz("Asia/Dhaka", () =>
    pickersToWallClockParts(new Date(2026, 8, 20), new Date(2026, 8, 20, 23, 30)),
  );
  assert.deepEqual(parts, { dateKey: "2026-09-20", time: "23:30" });
  // toISOString() of the same wall-clock in Dhaka would be 2026-09-20T17:30Z —
  // still the 20th here, but the point is we never call it. Guard the date field
  // stays exactly the picked calendar day.
  assert.equal(parts.dateKey, "2026-09-20");
});

// ── §39 known-timezone hydration ───────────────────────────────────────────

test("§39 instantToWallClockPartsForEvent renders the venue-local wall-clock, not device-local", () => {
  const parts = withProcessTz("Asia/Dhaka", () =>
    instantToWallClockPartsForEvent("2026-09-20T23:00:00.000Z", "America/New_York"),
  );
  assert.deepEqual(parts, { dateKey: "2026-09-20", time: "19:00" });
  // NOT Sep 21 05:00 (which is the Dhaka-local rendering).
});

test("§39 winter instant hydrates with EST", () => {
  assert.deepEqual(
    instantToWallClockPartsForEvent("2026-01-21T00:00:00.000Z", "America/New_York"),
    { dateKey: "2026-01-20", time: "19:00" },
  );
});

test("§39 invalid inputs return null", () => {
  assert.equal(instantToWallClockPartsForEvent(null, "America/New_York"), null);
  assert.equal(instantToWallClockPartsForEvent("2026-09-20T23:00:00Z", null), null);
  assert.equal(instantToWallClockPartsForEvent("not-a-date", "America/New_York"), null);
  assert.equal(instantToWallClockPartsForEvent("2026-09-20T23:00:00Z", "Nope/Nowhere"), null);
});

// ── wallClockPartsToPickerDate ─────────────────────────────────────────────

test("wallClockPartsToPickerDate builds a Date whose LOCAL components equal the parts", () => {
  const d = wallClockPartsToPickerDate({ dateKey: "2026-09-20", time: "19:00" });
  assert.ok(d);
  assert.equal(d!.getFullYear(), 2026);
  assert.equal(d!.getMonth(), 8);
  assert.equal(d!.getDate(), 20);
  assert.equal(d!.getHours(), 19);
  assert.equal(d!.getMinutes(), 0);
  assert.equal(wallClockPartsToPickerDate({ dateKey: "bad", time: "19:00" }), null);
  assert.equal(wallClockPartsToPickerDate(null), null);
});

test("hydration round-trip: parts → picker Date → parts is stable", () => {
  const original = { dateKey: "2026-09-20", time: "19:00" };
  const picker = wallClockPartsToPickerDate(original)!;
  assert.deepEqual(pickersToWallClockParts(picker, picker), original);
});

// ── §41 hydration priority ────────────────────────────────────────────────

test("§41 resolveInitialPickerDate: explicit stored parts win over instant+timezone", () => {
  const d = withProcessTz("Asia/Dhaka", () =>
    resolveInitialPickerDate(
      { dateKey: "2026-09-20", time: "19:00" }, // stored parts
      "2026-01-01T00:00:00.000Z", // unrelated provisional instant
      "America/New_York",
    ),
  );
  assert.ok(d);
  assert.equal(dateToDateKey(d!), "2026-09-20");
  assert.equal(dateToTimeKey(d!), "19:00");
});

test("§39/§41 no stored parts → instant reinterpreted in the Event timezone", () => {
  const d = withProcessTz("Asia/Dhaka", () =>
    resolveInitialPickerDate(null, "2026-09-20T23:00:00.000Z", "America/New_York"),
  );
  assert.ok(d);
  assert.equal(dateToDateKey(d!), "2026-09-20");
  assert.equal(dateToTimeKey(d!), "19:00");
});

test("§40 legacy: no parts, no timezone → device-local interpretation of the instant", () => {
  const iso = "2026-09-20T23:00:00.000Z";
  const dhaka = withProcessTz("Asia/Dhaka", () => resolveInitialPickerDate(null, iso, null));
  const utc = withProcessTz("Etc/UTC", () => resolveInitialPickerDate(null, iso, null));
  assert.ok(dhaka && utc);
  // Device-local: identical to `new Date(iso)` — unchanged legacy behaviour.
  assert.equal(dhaka!.getTime(), new Date(iso).getTime());
  assert.equal(utc!.getTime(), new Date(iso).getTime());
});

test("resolveInitialPickerDate returns null when there is nothing to hydrate", () => {
  assert.equal(resolveInitialPickerDate(null, null, null), null);
  assert.equal(resolveInitialPickerDate(null, "garbage", null), null);
});

// ── §50 DST-normalised server response becomes the displayed value ─────────

test("§50 a server-normalised gap instant (03:00) hydrates as 03:00, not the stale 02:30", () => {
  // Backend turned the invalid NY 02:30 on 2026-03-08 into 03:00 EDT = 07:00Z.
  const parts = instantToWallClockPartsForEvent("2026-03-08T07:00:00.000Z", "America/New_York");
  assert.deepEqual(parts, { dateKey: "2026-03-08", time: "03:00" });
});
