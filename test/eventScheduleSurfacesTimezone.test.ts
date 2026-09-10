import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { classifyEventRelativeDay, formatEventTimeDisplay } from "../lib/eventTimeDisplay";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const search = read("app/discover-screen/search.tsx");
const hashtag = read("app/discover-screen/hashtag.tsx");
const dashboard = read("app/profile-screen/creator-dashboard.tsx");
const nowMode = read("components/home/NowModeScreen.tsx");
const ticketDetail = read("app/event-screen/ticket-detail.tsx");
const wallet = read("app/event-screen/wallet.tsx");
const participatedScreen = read("app/event-screen/participated-windows.tsx");
const participatedList = read("components/home/ParticipatedWindowsList.tsx");
const paymentsLib = read("lib/payments.ts");
const eventWindowsLib = read("lib/eventWindows.ts");

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
const NY_EVENING = "2026-09-20T23:00:00.000Z"; // Sep 20 7:00 PM New York

// ── §46 cross-timezone: the compact date short field is Event-local ───────

test("§46 primaryDateShortText + primaryTimeText are Event-local for a NY event on a Dhaka device", () => {
  const model = withDeviceTz("Asia/Dhaka", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.primaryDateShortText, "Sep 20");
  assert.equal(model.primaryTimeText, "7:00 PM");
  assert.ok(model.primaryZoneText);
});

test("§46 primaryDateShortText is device-tz-independent (Dhaka / Tokyo / LA / UTC)", () => {
  const shorts = ["Asia/Dhaka", "Asia/Tokyo", "America/Los_Angeles", "Etc/UTC"].map((tz) =>
    withDeviceTz(tz, () => formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }).primaryDateShortText),
  );
  assert.deepEqual(new Set(shorts), new Set(["Sep 20"]));
});

// ── §47 timezone-null fallback for the compact field ────────────────────

test("§47 timezone null → primaryDateShortText is device-local (unchanged pre-3C)", () => {
  const dhaka = withDeviceTz("Asia/Dhaka", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: null }),
  );
  assert.equal(dhaka.hasKnownZone, false);
  assert.equal(dhaka.primaryDateShortText, "Sep 21"); // 23:00Z in Dhaka
  assert.equal(dhaka.primaryZoneText, null);
});

// ── §38 Search rows ────────────────────────────────────────────────────

test("§38 Search event subtitle uses the shared helper, primary = Event-local, no local Intl", () => {
  assert.match(search, /import \{ formatEventTimeDisplay \} from '@\/lib\/eventTimeDisplay'/);
  assert.match(search, /const model = formatEventTimeDisplay\(\{ scheduledAt: event\.scheduledAt, timezone: event\.timezone \}\)/);
  assert.match(search, /\$\{model\.primaryDateShortText\} • \$\{time\}/);
  assert.match(search, /model\.primaryZoneText[\s\S]*model\.primaryTimeText/);
  // no per-surface Intl date/time formatter left
  assert.doesNotMatch(search, /new Intl\.DateTimeFormat\("en-US", \{\s*month: "short",\s*day: "numeric",\s*\}\)/);
});

// ── §39 Hashtag rows ──────────────────────────────────────────────────

test("§39 Hashtag event subtitle uses the shared helper identically to Search", () => {
  assert.match(hashtag, /import \{ formatEventTimeDisplay \} from '@\/lib\/eventTimeDisplay'/);
  assert.match(hashtag, /const model = formatEventTimeDisplay\(\{ scheduledAt: event\.scheduledAt, timezone: event\.timezone \}\)/);
  assert.match(hashtag, /\$\{model\.primaryDateShortText\} • \$\{time\}/);
  assert.doesNotMatch(hashtag, /new Intl\.DateTimeFormat\('en-US', \{ month: 'short', day: 'numeric' \}\)/);
});

// ── §40 Creator Dashboard ─────────────────────────────────────────────

test("§40 Creator Dashboard schedule rows go through the shared helper (host sees venue-local)", () => {
  assert.match(dashboard, /import \{ formatEventTimeDisplay \} from "@\/lib\/eventTimeDisplay"/);
  assert.match(dashboard, /formatEventTimeDisplay\(\{ scheduledAt: event\.scheduledAt, timezone: event\.timezone \}\)\.primaryDateText/);
  assert.match(dashboard, /model\.primaryZoneText \? `\$\{model\.primaryTimeText\} \$\{model\.primaryZoneText\}`/);
  assert.match(dashboard, /const dateStr = formatEventDate\(event\);/);
  assert.doesNotMatch(dashboard, /toLocaleDateString\("en-US", \{ weekday: "short"/);
});

// ── §43 NowMode ──────────────────────────────────────────────────────

test("§43 NowMode schedule text is venue-local; countdown/status untouched", () => {
  assert.match(nowMode, /import \{ formatEventTimeDisplay \} from "@\/lib\/eventTimeDisplay"/);
  assert.match(nowMode, /formatEventTimeDisplay\(\{ scheduledAt: event\.scheduledAt, timezone: event\.timezone \}\)\.primaryDateText \|\| "Date TBA"/);
  assert.match(nowMode, /<Text style=\{styles\.metaText\}>\{formatEventDate\(event\)\}<\/Text>/);
  // status / countdown code path is not touched by this batch
  assert.doesNotMatch(nowMode, /formatEventTimeDisplay[\s\S]{0,120}nowStatus/);
});

// ── §42 Ticket Detail agrees with Event Detail ─────────────────────────

test("§42 Ticket Detail Event start/end use the venue-local helper (agree with Event Detail)", () => {
  assert.match(ticketDetail, /import \{ formatEventTimeDisplay \} from "@\/lib\/eventTimeDisplay"/);
  assert.match(ticketDetail, /label: "Event start", value: formatEventScheduleValue\(event, "start"\)/);
  assert.match(ticketDetail, /label: "Event end", value: formatEventScheduleValue\(event, "end"\)/);
  // `Sales end` (a deadline) stays on the device-local formatter — unchanged.
  assert.match(ticketDetail, /label: "Sales end", value: formatDateTime\(ticket\?\.salesEndAt\)/);
});

test("§42 the Event-Detail and Ticket-Detail primary represent the SAME venue-local wall-clock", () => {
  // Both screens format `event.scheduledAt` + `event.timezone` through the one
  // helper, so a NY 7 PM event reads "7:00 PM" on both, never 7 PM vs 5 AM.
  const model = withDeviceTz("Asia/Dhaka", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }),
  );
  assert.equal(model.primaryTimeText, "7:00 PM");
});

// ── §48 no network / location in the touched wiring ───────────────────

test("§48 no touched surface adds fetch / expo-location / a timezone lookup for schedule display", () => {
  for (const [name, src] of [
    ["search", search],
    ["hashtag", hashtag],
    ["dashboard", dashboard],
    ["nowMode", nowMode],
    ["ticketDetail", ticketDetail],
  ] as const) {
    // the shared helper is pure; the schedule formatters must not introduce IO
    const formatterBlock =
      src.slice(src.indexOf("formatEventTimeDisplay"), src.indexOf("formatEventTimeDisplay") + 600);
    assert.doesNotMatch(formatterBlock, /fetch\(|expo-location|tz-lookup|getCurrentPosition/, name);
  }
});

// ── Batch 3C.2 — Wallet / Participated Windows ───────────────────────────

test("§2/§10 frontend narrow Event types gained additive timezone", () => {
  assert.match(paymentsLib, /event: \{[\s\S]*?timezone\?: string \| null;/);
  assert.match(eventWindowsLib, /export type ParticipatedEvent = \{[\s\S]*?timezone\?: string \| null;/);
});

test("§3/§33 Wallet Event schedule uses the shared helper (venue-local primary)", () => {
  assert.match(wallet, /from "@\/lib\/eventTimeDisplay"/);
  assert.match(wallet, /const formatWalletEventSchedule = \(/);
  assert.match(wallet, /formatEventTimeDisplay\(\{\s*scheduledAt: event\.scheduledAt,\s*endAt: event\.endAt,\s*timezone: event\.timezone,/);
  assert.match(wallet, /\{formatWalletEventSchedule\(item\.event, "start"\)\}/);
  // the old device-local formatter is gone
  assert.doesNotMatch(wallet, /const formatDateTime = \(/);
});

test("§7/§35 Wallet → Ticket Detail route params come from the same helper", () => {
  assert.match(wallet, /dateTime: formatWalletEventSchedule\(item\.event, "start"\)/);
  assert.match(wallet, /eventStartDateTime: formatWalletEventSchedule\(item\.event, "start"\)/);
  assert.match(wallet, /eventEndDateTime: formatWalletEventSchedule\(item\.event, "end"\)/);
});

test("§13/§14 Wallet 'tonight' grouping migrated to Event-local calendar (semantics only)", () => {
  // Batch 3C.3 — the viewer-local `isSameDay` day-basis is replaced by the
  // Event-local classifier; the section structure / "tonight" meaning is kept.
  assert.match(
    wallet,
    /classifyEventRelativeDay\(item\.event\.scheduledAt, item\.event\.timezone, now\) === "today"/,
  );
  assert.match(wallet, /const tonight: TicketWalletItem\[\] = \[\];/);
  assert.match(wallet, /const upcoming: TicketWalletItem\[\] = \[\];/);
});

test("§11/§12 Participated Windows: EVENT date uses the helper; WINDOW range stays device-local", () => {
  // screen
  assert.match(participatedScreen, /import \{ formatEventTimeDisplay \} from "@\/lib\/eventTimeDisplay"/);
  assert.match(participatedScreen, /const formatEventScheduleDate = \([\s\S]*?\)\.primaryDateMediumText \|\| null/);
  assert.match(participatedScreen, /\{formatEventScheduleDate\(event\)\}/);
  // window-range formatting still uses the local device-local helpers
  assert.match(participatedScreen, /const formatWindowRange = \(/);
  assert.match(participatedScreen, /const formatDate = \(value\?: string \| null\)/); // retained for window range
  // list
  assert.match(participatedList, /const formatEventScheduleDate = \([\s\S]*?\)\.primaryDateMediumText \|\| null/);
  assert.match(participatedList, /const dateLabel = formatEventScheduleDate\(event\);/);
});

test("§43/§44 primaryDateMediumText is Event-local + device-tz-independent (with year)", () => {
  const dhaka = withDeviceTz("Asia/Dhaka", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }).primaryDateMediumText,
  );
  const la = withDeviceTz("America/Los_Angeles", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: NY }).primaryDateMediumText,
  );
  assert.equal(dhaka, "Sep 20, 2026");
  assert.equal(la, "Sep 20, 2026");
});

test("§34 timezone null → Wallet/Participated fall back to device-local (medium date)", () => {
  const dhaka = withDeviceTz("Asia/Dhaka", () =>
    formatEventTimeDisplay({ scheduledAt: NY_EVENING, timezone: null }),
  );
  assert.equal(dhaka.hasKnownZone, false);
  assert.equal(dhaka.primaryDateMediumText, "Sep 21, 2026");
});

// ── Batch 3C.3 — relative-day semantics (EventPicker + Wallet grouping) ──

const eventPicker = read("components/post/EventPickerModal.tsx");

test("§6/§9 EventPickerModal relative day + time both go through the shared Event-timezone helpers", () => {
  assert.match(eventPicker, /import \{ classifyEventRelativeDay, formatEventTimeDisplay \} from '@\/lib\/eventTimeDisplay'/);
  assert.match(eventPicker, /const relativeDay = classifyEventRelativeDay\(event\.scheduledAt, event\.timezone, now\)/);
  assert.match(eventPicker, /const model = formatEventTimeDisplay\(\{ scheduledAt: event\.scheduledAt, timezone: event\.timezone \}\)/);
  assert.match(eventPicker, /relativeDay === 'today' \? 'Tonight' : relativeDay === 'tomorrow' \? 'Tomorrow'/);
  assert.match(eventPicker, /model\.primaryZoneText[\s\S]*model\.primaryTimeText/);
  // the old viewer/device-local Date math is gone
  assert.doesNotMatch(eventPicker, /date\.toDateString\(\) === now\.toDateString\(\)/);
  assert.doesNotMatch(eventPicker, /tomorrow\.setDate\(tomorrow\.getDate\(\) \+ 1\)/);
  assert.doesNotMatch(eventPicker, /date\.toLocaleTimeString/);
});

test("§20 EventPickerModal captures one `now` for the classification pass", () => {
  assert.match(eventPicker, /const classificationNow = new Date\(\);/);
  assert.match(eventPicker, /formatEventMeta\(item, classificationNow\)/);
  // formatEventMeta takes `now` as a parameter rather than calling new Date() itself
  assert.match(eventPicker, /function formatEventMeta\(event: PostTagEvent, now: Date\)/);
});

test("§13/§14 Wallet 'Tonight' grouping uses classifyEventRelativeDay in the Event timezone", () => {
  assert.match(wallet, /import \{ classifyEventRelativeDay, formatEventTimeDisplay \} from "@\/lib\/eventTimeDisplay"/);
  assert.match(
    wallet,
    /classifyEventRelativeDay\(item\.event\.scheduledAt, item\.event\.timezone, now\) === "today"/,
  );
  // section titles / structure unchanged (§15/§31)
  assert.match(wallet, /\{ title: "Tonight", items: tonight \}/);
  assert.match(wallet, /\{ title: "Upcoming", items: upcoming \}/);
  // the old viewer-local same-day helper is gone
  assert.doesNotMatch(wallet, /const isSameDay = \(left: Date, right: Date\) =>/);
});

test("§20 Wallet captures one `now` for the whole grouping pass", () => {
  assert.match(wallet, /const getTicketSections = \(items: TicketWalletItem\[\]\): WalletSection\[\] => \{\s*\n(\s*\/\/[^\n]*\n)*\s*const now = new Date\(\);/);
});

// ── §42/§43 Wallet grouping behaviour (via the shared helper) ───────────

test("§42 Wallet: a NY event on NY's current day groups as 'today' even when the viewer is next-day", () => {
  const now = new Date("2026-09-20T23:30:00.000Z"); // Sep 20 19:30 NY = Sep 21 05:30 Dhaka
  const result = withDeviceTz("Asia/Dhaka", () =>
    classifyEventRelativeDay("2026-09-20T23:00:00.000Z", "America/New_York", now),
  );
  assert.equal(result, "today");
});

test("§43 Wallet: a NY event on NY's next day groups as 'upcoming' regardless of viewer date", () => {
  const now = new Date("2026-09-20T18:00:00.000Z"); // Sep 20 14:00 NY
  const result = classifyEventRelativeDay("2026-09-22T00:00:00.000Z", "America/New_York", now); // Sep 21 20:00 NY
  assert.notEqual(result, "today");
});

// ── §44 mixed-timezone Wallet: each Event classified in its OWN zone ────

test("§44 two events, same instant, different timezone → classified independently", () => {
  const now = new Date("2026-09-20T14:00:00.000Z"); // NY: Sep 20 10:00 ; Tokyo: Sep 20 23:00
  const instant = "2026-09-20T23:30:00.000Z"; // NY: Sep 20 19:30 ; Tokyo: Sep 21 08:30
  assert.equal(classifyEventRelativeDay(instant, "America/New_York", now), "today");
  assert.equal(classifyEventRelativeDay(instant, "Asia/Tokyo", now), "tomorrow");
});
