import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const stepTwo = read("app/create-event/step-2.tsx");
const draftStore = read("stores/eventDraftStore.ts");
const eventsLib = read("lib/events.ts");

// ── §31 request types carry the transport-only wall-clock fields ────────────

test("§31 EventPayload gains optional transport-only wall-clock + timezone fields", () => {
  for (const field of [
    "scheduledLocalDate?: string",
    "scheduledLocalTime?: string",
    "endLocalDate?: string",
    "endLocalTime?: string",
  ]) {
    assert.ok(eventsLib.includes(field), `EventPayload missing ${field}`);
  }
  assert.match(eventsLib, /timezone\?: string \| null;/);
});

test("§2 EventResponse gains additive timezone?: string | null", () => {
  const responseBlock = eventsLib.slice(
    eventsLib.indexOf("export type EventResponse = {"),
    eventsLib.indexOf("tickets: EventTicketPayload[];"),
  );
  assert.match(responseBlock, /timezone\?: string \| null;/);
});

// ── §3 / §4 / §5 wall-clock comes from picker components, never toISOString ──

test("§4/§5 Step 2 derives local parts from picker components via dateToDateKey/dateToTimeKey", () => {
  assert.match(stepTwo, /import \{ dateToDateKey, dateToTimeKey, resolveInitialPickerDate \} from '@\/lib\/eventLocalTime'/);
  assert.match(stepTwo, /scheduledLocalDate = dateToDateKey\(startPickerDate\)/);
  assert.match(stepTwo, /scheduledLocalTime = dateToTimeKey\(startPickerTime\)/);
  assert.match(stepTwo, /endLocalDate = dateToDateKey\(endPickerDate\)/);
  assert.match(stepTwo, /endLocalTime = dateToTimeKey\(endPickerTime\)/);
});

test("§5 no *Local* field is ever derived from toISOString()", () => {
  // Every toISOString() in Step 2 must feed scheduledAt / endAt (legacy compat),
  // never a *LocalDate/*LocalTime assignment.
  assert.doesNotMatch(stepTwo, /Local(Date|Time)\s*=\s*[^;]*toISOString\(\)/);
  assert.doesNotMatch(draftStore, /Local(Date|Time)[^;\n]*toISOString\(\)/);
});

// ── §7 absolute ISO fields kept for backward compatibility ─────────────────

test("§7 Step 2 still sends scheduledAt/endAt ISO alongside the new parts", () => {
  assert.match(stepTwo, /combineLocalDateAndTime\(values\.startDate, values\.startTime\)\.toISOString\(\)/);
  assert.match(stepTwo, /setStepTwo\(\{[\s\S]*scheduledAt,[\s\S]*endAt: eventEndAt,/);
});

// ── §8 draft store carries wall-clock state + a schedule-touched flag ──────

test("§8 draft store state + initial state include the wall-clock fields and dirty flag", () => {
  for (const field of [
    "scheduledLocalDate: string | null;",
    "scheduledLocalTime: string | null;",
    "endLocalDate: string | null;",
    "endLocalTime: string | null;",
    "timezone: string | null;",
    "scheduleWallClockDirty: boolean;",
  ]) {
    assert.ok(draftStore.includes(field), `draft state missing ${field}`);
  }
  const initial = draftStore.slice(
    draftStore.indexOf("const createInitialState"),
    draftStore.indexOf("const isRemoteUri"),
  );
  assert.match(initial, /scheduledLocalDate: null,/);
  assert.match(initial, /scheduleWallClockDirty: false,/);
  assert.match(initial, /timezone: null,/);
});

// ── §9 / §19 / §20 parts survive into the outgoing payload, gated correctly ─

test("§9/§20 buildEventPayload attaches wall-clock fields; gate = new Event OR touched", () => {
  assert.match(draftStore, /\.\.\.buildWallClockTransportFields\(state\)/);
  assert.match(
    draftStore,
    /const includeWallClock = !state\.isExistingEventSession \|\| state\.scheduleWallClockDirty;/,
  );
  assert.match(draftStore, /if \(!includeWallClock\) \{\s*return \{\};/);
});

// ── §12 / §21 edit hydration reconstructs from instant + timezone ──────────

test("§12/§21 loadFromEvent + save-sync rebuild local parts from scheduledAt + timezone", () => {
  assert.match(draftStore, /const deriveEventWallClockParts = \(/);
  assert.match(draftStore, /instantToWallClockPartsForEvent\(\s*event\.scheduledAt \?\? null,\s*event\.timezone,?\s*\)/);
  // loadFromEvent seeds picker hydration + resets the dirty flag.
  const load = draftStore.slice(
    draftStore.indexOf("loadFromEvent: (event) =>"),
    draftStore.indexOf("discardDraft: async"),
  );
  assert.match(load, /timezone: event\.timezone \?\? null,/);
  assert.match(load, /scheduledLocalDate: wallClock\?\.scheduledLocalDate \?\? null,/);
  assert.match(load, /scheduleWallClockDirty: false,/);
});

// ── §17 / §41 Step 2 hydration priority ───────────────────────────────────

test("§17/§41 Step 2 hydrates via resolveInitialPickerDate (stored parts > instant+tz > legacy)", () => {
  assert.match(
    stepTwo,
    /resolveInitialPickerDate\(\s*draftScheduledLocalDate && draftScheduledLocalTime[\s\S]*draftScheduledAt,\s*draftTimezone,\s*\)/,
  );
  assert.match(stepTwo, /const draftTimezone = useEventDraftStore\(\(state\) => state\.timezone\)/);
});

// ── §23 / §24 / §45 venue-only edit must not look like a schedule edit ────

test("§23/§24 Step 2 tracks explicit start/end touch and only emits parts when explicit", () => {
  assert.match(stepTwo, /const startScheduleTouchedRef = useRef\(false\)/);
  assert.match(stepTwo, /const endScheduleTouchedRef = useRef\(false\)/);
  assert.match(stepTwo, /startScheduleTouchedRef\.current = true;/);
  assert.match(stepTwo, /endScheduleTouchedRef\.current = true;/);
  assert.match(
    stepTwo,
    /const emitSchedule = isNewEvent \|\| startTouched \|\| endTouched;/,
  );
  // Untouched existing-Event pass leaves the fields undefined so setStepTwo keeps
  // the hydrated values and the payload gate (dirty=false) suppresses them.
  assert.match(stepTwo, /scheduleWallClockDirty: emitSchedule \? true : undefined,/);
});

// ── §27 ongoing-Event start lock preserved ────────────────────────────────

test("§27 ongoing edit never emits start local parts", () => {
  assert.match(
    stepTwo,
    /if \(isOngoingEdit\) \{\s*scheduledLocalDate = null;\s*scheduledLocalTime = null;\s*\}/,
  );
});

// ── §30 / §50 server response becomes authoritative after save ────────────

test("§30/§50 successful save/publish adopts server parts and clears the dirty flag", () => {
  const occurrences = draftStore.match(/\.\.\.\(deriveEventWallClockParts\(event\) \?\? \{\}\),\s*\n\s*scheduleWallClockDirty: false,/g) ?? [];
  assert.ok(occurrences.length >= 2, `expected save + publish to adopt server parts, found ${occurrences.length}`);
});

// ── §32 no client-side timezone resolution ───────────────────────────────

test("§32 the app never resolves a timezone from coordinates", () => {
  assert.doesNotMatch(draftStore, /tz-lookup|tzLookup|resolveEventTimeZoneFromCoordinates/);
  assert.doesNotMatch(stepTwo, /tz-lookup|tzLookup|resolveEventTimeZoneFromCoordinates/);
  assert.doesNotMatch(read("lib/eventLocalTime.ts"), /tz-lookup|tzLookup|latitude|longitude/);
});

// ── §33 combineLocalDateAndTime not deleted / still legacy-only ───────────

test("§33 combineLocalDateAndTime is still used only for the legacy ISO fields", () => {
  assert.ok(read("lib/eventDateRange.ts").includes("export const combineLocalDateAndTime"));
  assert.match(stepTwo, /import \{ combineLocalDateAndTime \} from '@\/lib\/eventDateRange'/);
});

// ── §34 filter request timezone offset untouched ─────────────────────────

test("§34 eventFilters.ts timezoneOffsetMinutes fallback is unchanged", () => {
  const filters = read("lib/eventFilters.ts");
  assert.match(filters, /params\.timezoneOffsetMinutes = \(date \?\? new Date\(\)\)\.getTimezoneOffset\(\)/);
});
