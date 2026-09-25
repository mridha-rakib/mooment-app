import assert from "node:assert/strict";
import test from "node:test";

import { classifyEventRelativeDay, formatEventTimeDisplay } from "../lib/eventTimeDisplay";

const withDeviceTz = <T>(tz: string, run: () => T): T => {
  const original = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
};

const NY = "America/New_York";
const LA = "America/Los_Angeles";
const DHAKA = "Asia/Dhaka";
const LONDON = "Europe/London";
const TOKYO = "Asia/Tokyo";

// The canonical example: New York venue, Sep 20 2026 7:00 PM local = 23:00Z.
const NY_EVENING = "2026-09-20T23:00:00.000Z";

// ── §5 primary is Event-local, not device-local ─────────────────────────

test("§5/§20 New York 7 PM event on a Dhaka device → primary is Sep 20 · 7:00 PM (event-local)", () => {
  const model = withDeviceTz(DHAKA, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.hasKnownZone, true);
  assert.equal(model.primaryDateText, "Sun, Sep 20");
  assert.equal(model.primaryTimeText, "7:00 PM");
  assert.ok(model.primaryZoneText, "a short zone label is present");
  assert.match(model.primaryDateTimeText, /^Sun, Sep 20 · 7:00 PM/);
});

test("§41 the primary result is identical under Dhaka / London / Los Angeles / UTC devices", () => {
  const primaries = [DHAKA, LONDON, LA, "Etc/UTC"].map((tz) =>
    withDeviceTz(tz, () => {
      const m = formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY });
      return `${m.primaryDateText}|${m.primaryTimeText}|${m.primaryZoneText}`;
    }),
  );
  assert.equal(new Set(primaries).size, 1, primaries.join(" ; "));
});

// ── §9/§20 secondary shown when the viewer wall-clock differs ───────────

test("§20 Dhaka viewer → secondary 'Sep 21 · 5:00 AM your time'", () => {
  const model = withDeviceTz(DHAKA, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.showViewerEquivalent, true);
  assert.equal(model.viewerDateText, "Mon, Sep 21");
  assert.equal(model.viewerTimeText, "5:00 AM");
  assert.equal(model.viewerDateTimeText, "Mon, Sep 21 · 5:00 AM your time");
});

test("§21 Los Angeles viewer → same date, earlier clock: 'Sep 20 · 4:00 PM your time'", () => {
  const model = withDeviceTz(LA, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.showViewerEquivalent, true);
  assert.equal(model.viewerDateText, "Sun, Sep 20");
  assert.equal(model.viewerTimeText, "4:00 PM");
  assert.equal(model.viewerDateTimeText, "Sun, Sep 20 · 4:00 PM your time");
});

test("§22 London viewer secondary is derived from Intl (DST-aware), not a static offset", () => {
  const model = withDeviceTz(LONDON, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  // Sep 2026: London is BST (UTC+1) → 23:00Z = 00:00 Sep 21.
  assert.equal(model.showViewerEquivalent, true);
  assert.equal(model.viewerDateTimeText, "Mon, Sep 21 · 12:00 AM your time");
});

test("§23 Tokyo viewer → next calendar day communicated in the secondary", () => {
  const model = withDeviceTz(TOKYO, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.showViewerEquivalent, true);
  assert.match(model.viewerDateTimeText ?? "", /Sep 21 · 8:00 AM your time/);
});

// ── §24 Dhaka Event viewed elsewhere ──────────────────────────────────

test("§24 Asia/Dhaka event local Sep 20 7 PM → primary stays event-local for any viewer", () => {
  const dhakaEvening = "2026-09-20T13:00:00.000Z"; // 19:00 Dhaka
  for (const tz of [NY, LONDON, TOKYO, "Etc/UTC"]) {
    const model = withDeviceTz(tz, () =>
      formatEventTimeDisplay({ scheduledAt: dhakaEvening, timezone: DHAKA }),
    );
    assert.equal(model.primaryDateText, "Sun, Sep 20");
    assert.equal(model.primaryTimeText, "7:00 PM");
  }
});

// ── §3/§25 no redundant secondary when the clocks already agree ────────

test("§25 viewer device already in the Event zone → primary only, no secondary", () => {
  const model = withDeviceTz(NY, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.showViewerEquivalent, false);
  assert.equal(model.viewerDateTimeText, null);
});

test("§9 two different zones sharing the same wall-clock → no secondary", () => {
  // A device in Toronto (America/Toronto) shares NY's wall-clock.
  const model = withDeviceTz("America/Toronto", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.showViewerEquivalent, false);
});

// ── §4/§26 timezone-null fallback: pre-3C device-local rendering ───────

test("§26 timezone null → device-local primary, no zone label, no secondary", () => {
  const dhaka = withDeviceTz(DHAKA, () => formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: null }));
  assert.equal(dhaka.hasKnownZone, false);
  assert.equal(dhaka.primaryDateText, "Mon, Sep 21"); // 23:00Z rendered in Dhaka
  assert.equal(dhaka.primaryTimeText, "5:00 AM");
  assert.equal(dhaka.primaryZoneText, null);
  assert.equal(dhaka.showViewerEquivalent, false);
  assert.equal(dhaka.viewerDateTimeText, null);

  const utc = withDeviceTz("Etc/UTC", () => formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: undefined }));
  assert.equal(utc.primaryDateText, "Sun, Sep 20");
  assert.equal(utc.primaryTimeText, "11:00 PM");
});

// ── §27 invalid zone → graceful device-local fallback ────────────────

test("§27 unparseable timezone → falls back to device-local, never throws", () => {
  const model = withDeviceTz("Etc/UTC", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: "Not/AZone" }),
  );
  assert.equal(model.hasKnownZone, false);
  assert.equal(model.primaryTimeText, "11:00 PM");
  assert.equal(model.showViewerEquivalent, false);
});

// ── §43/§44 DST summer vs winter, label from Intl ─────────────────────

test("§43/§44 NY 7 PM in July and in January both render as 7:00 PM with a (different) Intl zone label", () => {
  const summer = withDeviceTz("Etc/UTC", () =>
    formatEventTimeDisplay({ scheduledAt: "2026-07-15T23:00:00.000Z", timezone: NY }),
  );
  const winter = withDeviceTz("Etc/UTC", () =>
    formatEventTimeDisplay({ scheduledAt: "2026-01-15T00:00:00.000Z", timezone: NY }),
  );
  assert.equal(summer.primaryTimeText, "7:00 PM");
  assert.equal(winter.primaryTimeText, "7:00 PM");
  assert.ok(summer.primaryZoneText && winter.primaryZoneText);
  assert.notEqual(summer.primaryZoneText, winter.primaryZoneText); // EDT vs EST (or GMT-4 vs GMT-5)
});

// ── §6/§17 same-day range ───────────────────────────────────────────

test("§17 same-day range → '7:00 – 9:00 PM' in the Event zone", () => {
  const model = withDeviceTz("Etc/UTC", () =>
    formatEventTimeDisplay({
      scheduledAt: NY_EVENING,
      endAt: "2026-09-21T01:00:00.000Z", // 9:00 PM NY
      timezone: NY,
    }),
  );
  assert.equal(model.primaryTimeRangeText, "7:00 PM – 9:00 PM");
  assert.equal(model.primaryEndDateText, null);
});

// ── §45 cross-midnight range ────────────────────────────────────────

test("§45 cross-midnight Event → primary keeps the date transition; viewer keeps its own", () => {
  const model = withDeviceTz(LA, () =>
    formatEventTimeDisplay({
      scheduledAt: "2026-09-21T03:00:00.000Z", // 11:00 PM Sep 20 NY
      endAt: "2026-09-21T05:00:00.000Z", // 1:00 AM Sep 21 NY
      timezone: NY,
    }),
  );
  assert.equal(model.primaryDateText, "Sun, Sep 20");
  assert.equal(model.primaryTimeText, "11:00 PM");
  assert.equal(model.primaryEndDateText, "Mon, Sep 21"); // end is the next Event-local day
  // LA viewer: 03:00Z = 8:00 PM Sep 20; 05:00Z = 10:00 PM Sep 20 — same viewer day.
  assert.equal(model.showViewerEquivalent, true);
  assert.equal(model.viewerDateText, "Sun, Sep 20");
  assert.equal(model.viewerTimeText, "8:00 PM");
  assert.equal(model.viewerEndDateText, null);
});

// ── §40 no scheduledAt ─────────────────────────────────────────────

test("§34/§40 missing scheduledAt → empty model, no crash", () => {
  const model = formatEventTimeDisplay({ scheduledAt: null, timezone: NY });
  assert.equal(model.primaryDateText, "");
  assert.equal(model.primaryTimeText, "");
  assert.equal(model.showViewerEquivalent, false);
});

// ── §42 display / filter alignment ─────────────────────────────────

test("§42 NY event local Sep 20 19:00 → display model represents Sep 20 / 19:00 (matches 3B evening)", () => {
  const model = withDeviceTz(DHAKA, () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.primaryDateText, "Sun, Sep 20");
  // 7:00 PM is inside the evening bucket [17:00, 21:00) — same Event-local wall-clock 3B filters on.
  assert.equal(model.primaryTimeText, "7:00 PM");
});

// ── Batch 3C.3 — Event-local relative-day classification ────────────────

const NYZ = "America/New_York";

test("§32 same Event-local day → 'today', independent of the device timezone", () => {
  const now = new Date("2026-09-20T22:00:00.000Z"); // Sep 20 18:00 New York
  const event = "2026-09-20T23:00:00.000Z"; // Sep 20 19:00 New York
  for (const tz of ["Asia/Dhaka", "America/Los_Angeles", "Etc/UTC"]) {
    const result = withDeviceTz(tz, () => classifyEventRelativeDay(event, NYZ, now));
    assert.equal(result, "today", tz);
  }
});

test("§33 cross-viewer-date: NY event 'today' even when the viewer is already on the next day", () => {
  // now: Sep 20 19:30 New York  =  Sep 21 05:30 Dhaka
  const now = new Date("2026-09-20T23:30:00.000Z");
  const event = "2026-09-20T23:00:00.000Z"; // Sep 20 19:00 New York
  assert.equal(
    withDeviceTz("Asia/Dhaka", () => classifyEventRelativeDay(event, NYZ, now)),
    "today",
  );
});

test("§34 'tomorrow' by Event-local calendar, not by viewer date", () => {
  const now = new Date("2026-09-20T18:00:00.000Z"); // Sep 20 14:00 New York
  const event = "2026-09-22T00:00:00.000Z"; // Sep 21 20:00 New York
  assert.equal(
    withDeviceTz("Asia/Tokyo", () => classifyEventRelativeDay(event, NYZ, now)),
    "tomorrow",
  );
});

test("§35 a further-out Event-local date → 'later'", () => {
  const now = new Date("2026-09-20T18:00:00.000Z");
  const event = "2026-09-24T00:00:00.000Z"; // Sep 23 20:00 New York
  assert.equal(classifyEventRelativeDay(event, NYZ, now), "later");
});

test("§36 DST spring-forward: next calendar date is 'tomorrow' (not now + 24h)", () => {
  // America/New_York 2026-03-08 has a 23-hour local day.
  const now = new Date("2026-03-08T18:00:00.000Z"); // Mar 8 13:00 EST/14:00 EDT — still Mar 8
  const event = "2026-03-10T00:00:00.000Z"; // Mar 9 20:00 New York
  assert.equal(classifyEventRelativeDay(event, NYZ, now), "tomorrow");
  // and a same-Mar-8 event is still "today"
  assert.equal(classifyEventRelativeDay("2026-03-08T23:00:00.000Z", NYZ, now), "today");
});

test("§37 DST fall-back: a 25-hour local day still classifies the next date as 'tomorrow'", () => {
  const now = new Date("2026-11-01T18:00:00.000Z"); // Nov 1 13:00 EST
  const event = "2026-11-03T00:00:00.000Z"; // Nov 2 19:00 EST
  assert.equal(classifyEventRelativeDay(event, NYZ, now), "tomorrow");
});

test("§40/§18 timezone null → device-local classification is preserved", () => {
  const now = new Date("2026-09-20T20:00:00.000Z");
  const event = "2026-09-20T23:00:00.000Z";
  // On a UTC device both are Sep 20 → "today".
  assert.equal(withDeviceTz("Etc/UTC", () => classifyEventRelativeDay(event, null, now)), "today");
  // On a Dhaka device both instants land on Sep 21 → still "today" (device calendar).
  assert.equal(withDeviceTz("Asia/Dhaka", () => classifyEventRelativeDay(event, null, now)), "today");
  // A next-device-day event → "tomorrow" on that device.
  assert.equal(
    withDeviceTz("Etc/UTC", () => classifyEventRelativeDay("2026-09-21T12:00:00.000Z", null, now)),
    "tomorrow",
  );
});

test("§12 invalid timezone falls back to device-local classification, never throws", () => {
  const now = new Date("2026-09-20T20:00:00.000Z");
  assert.equal(
    withDeviceTz("Etc/UTC", () => classifyEventRelativeDay("2026-09-20T23:00:00.000Z", "Not/AZone", now)),
    "today",
  );
});

test("missing scheduledAt → null", () => {
  assert.equal(classifyEventRelativeDay(null, NYZ, new Date()), null);
  assert.equal(classifyEventRelativeDay("nonsense", NYZ, new Date()), null);
});
